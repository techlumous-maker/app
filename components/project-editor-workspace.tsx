"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  deployProjectAction,
  getProjectDeploymentAction,
  type DeploymentActionSnapshot,
} from "@/actions/deploy"
import { saveProjectContentAction } from "@/actions/project"
import { TemplateAutoHeightPreview } from "@/components/template-auto-height-preview"
import {
  TemplateSchemaEditForm,
  type TemplateSchemaEditFormPosition,
} from "@/components/template-schema-edit-form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { getTemplateContentSchema } from "@/templates/schema-registry"
import { isActiveDeploymentStatus } from "@/types/deployment"

type PanelPosition = TemplateSchemaEditFormPosition

interface ProjectEditorWorkspaceProps {
  projectId: string
  projectName: string
  template?: {
    name: string
    slug: string
    initialContent: unknown
  } | null
  initialDeployment: DeploymentActionSnapshot
  isVercelConnected: boolean
}

const PANEL_POSITION_KEY = "techlumous:editor-panel-position"
const PANEL_POSITION_EVENT = "techlumous:editor-panel-position-change"

function getPanelPosition(): PanelPosition {
  const savedPosition = window.localStorage.getItem(PANEL_POSITION_KEY)
  return savedPosition === "left" || savedPosition === "right"
    ? savedPosition
    : "right"
}

function subscribeToPanelPosition(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === PANEL_POSITION_KEY) onStoreChange()
  }

  window.addEventListener("storage", handleStorage)
  window.addEventListener(PANEL_POSITION_EVENT, onStoreChange)

  return () => {
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener(PANEL_POSITION_EVENT, onStoreChange)
  }
}

export function ProjectEditorWorkspace({
  projectId,
  projectName,
  template,
  initialDeployment,
  isVercelConnected,
}: ProjectEditorWorkspaceProps) {
  const contentSchema = useMemo(
    () => (template ? getTemplateContentSchema(template.slug) : undefined),
    [template]
  )

  const [content, setContent] = useState<unknown>(
    () => template?.initialContent
  )
  const [savedContent, setSavedContent] = useState<unknown>(
    () => template?.initialContent
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployment, setDeployment] =
    useState<DeploymentActionSnapshot>(initialDeployment)
  const [needsVercelReconnect, setNeedsVercelReconnect] =
    useState(!isVercelConnected)
  const deployingRef = useRef(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [formReady, setFormReady] = useState(false)
  const router = useRouter()
  const isDirty = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(savedContent),
    [content, savedContent]
  )
  const isContentValid = useMemo(
    () => !!contentSchema?.safeParse(content).success,
    [content, contentSchema]
  )
  const hasActiveDeployment = isActiveDeploymentStatus(deployment.status)
  const canDeploy =
    !!template &&
    isContentValid &&
    !isDirty &&
    !isSaving &&
    !hasActiveDeployment &&
    !needsVercelReconnect
  const deployDisabledReason = useMemo(() => {
    if (!template) return "Select a template before deploying"
    if (!isContentValid) return "Fix invalid content before deploying"
    if (isDirty) return "Save changes before deploying"
    if (isSaving) return "Wait for saving to finish"
    if (hasActiveDeployment) return "A deployment is already in progress"
    if (needsVercelReconnect) return "Reconnect Vercel before deploying"
    return undefined
  }, [
    hasActiveDeployment,
    isContentValid,
    isDirty,
    isSaving,
    needsVercelReconnect,
    template,
  ])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    const result = await saveProjectContentAction(projectId, content)
    setIsSaving(false)

    if (result.status === "success") {
      setSavedContent(content)
      toast.success(result.message)
    } else {
      toast.error(result.message)
    }
  }, [content, projectId])

  const handleDeploy = useCallback(async () => {
    if (deployingRef.current) return
    deployingRef.current = true

    const previousDeployment = deployment
    setIsDeploying(true)
    setDeployment((current) => ({
      ...current,
      status: "preparing",
      errorText: null,
    }))

    try {
      const result = await deployProjectAction(projectId)
      const nextDeployment = result.deployment

      if (nextDeployment) {
        setDeployment((current) => ({
          ...nextDeployment,
          inspectorUrl:
            nextDeployment.inspectorUrl ?? current.inspectorUrl ?? null,
        }))
      } else {
        setDeployment(previousDeployment)
      }

      if (result.code === "VERCEL_RECONNECT_REQUIRED") {
        setNeedsVercelReconnect(true)
      }

      if (result.status === "success") {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch {
      setDeployment(previousDeployment)
      toast.error("Failed to start the deployment.")
    } finally {
      deployingRef.current = false
      setIsDeploying(false)
    }
  }, [deployment, projectId])

  useEffect(() => {
    if (!isActiveDeploymentStatus(deployment.status)) return

    let cancelled = false
    const pollDeployment = async () => {
      try {
        const nextDeployment = await getProjectDeploymentAction(projectId)
        if (cancelled || !nextDeployment) return

        setDeployment((current) => ({
          ...nextDeployment,
          inspectorUrl:
            nextDeployment.inspectorUrl ?? current.inspectorUrl ?? null,
        }))
      } catch {
        // Keep the current status and retry on the next polling interval.
      }
    }

    const intervalId = window.setInterval(pollDeployment, 4000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [deployment.status, projectId])

  useEffect(() => {
    const editorUrl = window.location.href

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ""
    }

    const handlePopState = () => {
      if (!isDirty) return

      const destination =
        window.location.pathname + window.location.search + window.location.hash
      window.history.pushState(
        { ...(window.history.state ?? {}), unsavedChangesGuard: true },
        "",
        editorUrl
      )
      setPendingHref(destination)
      setShowLeaveDialog(true)
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (!isDirty || event.defaultPrevented || event.button !== 0) return

      const target = event.target
      if (!(target instanceof Element)) return
      const link = target.closest("a")
      if (!link || link.target === "_blank" || link.hasAttribute("download")) {
        return
      }

      const href = link.href
      if (!href || new URL(href).origin !== window.location.origin) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      event.preventDefault()
      setPendingHref(new URL(href).pathname + new URL(href).search)
      setShowLeaveDialog(true)
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    if (isDirty) {
      window.history.pushState(
        { ...(window.history.state ?? {}), unsavedChangesGuard: true },
        "",
        editorUrl
      )
      window.addEventListener("popstate", handlePopState)
    }
    document.addEventListener("click", handleDocumentClick, true)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("popstate", handlePopState)
      document.removeEventListener("click", handleDocumentClick, true)
    }
  }, [isDirty])

  const leavePage = () => {
    if (pendingHref) router.push(pendingHref)
    setPendingHref(null)
    setShowLeaveDialog(false)
  }

  const handleFormReady = useCallback(() => {
    setFormReady(true)
  }, [])

  const panelPosition = useSyncExternalStore<PanelPosition>(
    subscribeToPanelPosition,
    getPanelPosition,
    () => "right"
  )

  const updatePanelPosition = (position: PanelPosition) => {
    window.localStorage.setItem(PANEL_POSITION_KEY, position)
    window.dispatchEvent(new Event(PANEL_POSITION_EVENT))
  }

  const handleReconnect = useCallback(() => {
    router.push("/integration")
  }, [router])

  return (
    <section
      aria-label={`${projectName} editor workspace`}
      data-project-id={projectId}
      className="relative isolate min-h-[calc(100dvh-4.2rem)]"
    >
      <div aria-hidden="true" className="editor-workspace-grid" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-4.2rem)] w-full max-w-7xl items-start gap-3 p-3">
        <div
          className={cn(
            "min-h-[calc(100dvh-6rem)] min-w-0 flex-1 overflow-hidden bg-white",
            panelPosition === "left" && "order-2"
          )}
        >
          {template ? (
            <TemplateAutoHeightPreview
              slug={template.slug}
              name={template.name}
              content={content}
              formReady={formReady}
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-card px-6 text-center text-sm text-muted-foreground">
              Select a template to start editing this project.
            </div>
          )}
        </div>

        <TemplateSchemaEditForm
          position={panelPosition}
          onPositionChange={updatePanelPosition}
          schema={contentSchema}
          value={content}
          onChange={setContent}
          onReady={handleFormReady}
          onSave={handleSave}
          onDeploy={handleDeploy}
          onRetry={handleDeploy}
          onReconnect={handleReconnect}
          isDirty={isDirty}
          isSaving={isSaving}
          isDeploying={isDeploying}
          canDeploy={canDeploy}
          deployDisabledReason={deployDisabledReason}
          deployment={deployment}
          needsVercelReconnect={needsVercelReconnect}
        />
      </div>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-accent-foreground!">
              Leave without saving?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your changes will be lost if you leave this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingHref(null)}>
              Stay
            </AlertDialogCancel>
            <AlertDialogAction onClick={leavePage}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
