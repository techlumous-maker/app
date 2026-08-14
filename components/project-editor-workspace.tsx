"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  deployProjectAction,
  getProjectDeploymentAction,
  type DeploymentActionSnapshot,
} from "@/actions/deploy"
import { saveProjectContentAction } from "@/actions/project"
import {
  EditorTopBar,
  type PreviewViewport,
  type PreviewViewportPreset,
} from "@/components/editor-top-bar"
import { ResizableTemplatePreview } from "@/components/resizable-template-preview"
import { TemplateSchemaEditForm } from "@/components/template-schema-edit-form"
import { useTemplateById } from "@/components/templates-provider"
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
import { getTemplateContentSchema } from "@/templates/schema-registry"
import { isActiveDeploymentStatus } from "@/types/deployment"
import { cn } from "@/lib/utils"

interface ProjectEditorWorkspaceProps {
  projectId: string
  projectName: string
  templateId?: string | null
  initialDraftContent: unknown
  initialDeployment: DeploymentActionSnapshot
  hasLiveDeployment: boolean
  initialPublishedContent: unknown
  isVercelConnected: boolean
}

function hasContent(value: unknown): value is Record<string, unknown> {
  return (
    value !== null && typeof value === "object" && Object.keys(value).length > 0
  )
}

export function ProjectEditorWorkspace({
  projectId,
  projectName,
  templateId,
  initialDraftContent,
  initialDeployment,
  hasLiveDeployment: initialHasLiveDeployment,
  initialPublishedContent,
  isVercelConnected,
}: ProjectEditorWorkspaceProps) {
  const template = useTemplateById(templateId)
  const contentSchema = useMemo(
    () => (template ? getTemplateContentSchema(template.slug) : undefined),
    [template]
  )

  const initialContent = useMemo(
    () =>
      [initialDraftContent, initialPublishedContent].find(hasContent) ??
      template?.default_content ??
      {},
    [initialDraftContent, initialPublishedContent, template]
  )

  const [content, setContent] = useState<unknown>(() => initialContent)
  const [savedContent, setSavedContent] = useState<unknown>(
    () => initialContent
  )
  const [publishedContent, setPublishedContent] = useState<unknown>(
    () => initialPublishedContent
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
  const [viewport, setViewport] = useState<PreviewViewport>("desktop")
  const [isSchemaFormOpen, setIsSchemaFormOpen] = useState(true)
  const router = useRouter()
  const isDirty = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(savedContent),
    [content, savedContent]
  )
  const isContentValid = useMemo(
    () => !!contentSchema?.safeParse(content).success,
    [content, contentSchema]
  )
  const hasLiveDeployment =
    initialHasLiveDeployment ||
    (deployment.status === "ready" && !!deployment.liveUrl)
  const releaseOperation = hasLiveDeployment ? "publish" : "deploy"
  const hasUnpublishedChanges = useMemo(
    () => JSON.stringify(savedContent) !== JSON.stringify(publishedContent),
    [publishedContent, savedContent]
  )
  const hasActiveDeployment = isActiveDeploymentStatus(deployment.status)
  const canDeploy =
    !!template &&
    isContentValid &&
    !isDirty &&
    !isSaving &&
    !hasActiveDeployment &&
    (releaseOperation === "publish"
      ? hasUnpublishedChanges
      : !needsVercelReconnect)

  const deployDisabledReason = useMemo(() => {
    const operationLabel =
      releaseOperation === "publish" ? "publishing" : "deploying"

    if (!template) return `Select a template before ${operationLabel}`
    if (!isContentValid) return `Fix invalid content before ${operationLabel}`
    if (isDirty) return `Save changes before ${operationLabel}`
    if (isSaving) return "Wait for saving to finish"
    if (hasActiveDeployment) return "A deployment is already in progress"
    if (releaseOperation === "publish" && !hasUnpublishedChanges) {
      return "No unpublished changes"
    }
    if (releaseOperation === "deploy" && needsVercelReconnect) {
      return "Reconnect Vercel before deploying"
    }
    return undefined
  }, [
    hasActiveDeployment,
    hasUnpublishedChanges,
    isContentValid,
    isDirty,
    isSaving,
    needsVercelReconnect,
    releaseOperation,
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

    const isPublishing = releaseOperation === "publish"
    const previousDeployment = deployment
    setIsDeploying(true)
    if (!isPublishing) {
      setDeployment((current) => ({
        ...current,
        status: "preparing",
        errorText: null,
      }))
    }

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

      if (!isPublishing && result.code === "VERCEL_RECONNECT_REQUIRED") {
        setNeedsVercelReconnect(true)
      }

      if (result.status === "success") {
        setPublishedContent(savedContent)
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch {
      setDeployment(previousDeployment)
      toast.error(
        isPublishing
          ? "Failed to publish changes."
          : "Failed to start the deployment."
      )
    } finally {
      deployingRef.current = false
      setIsDeploying(false)
    }
  }, [deployment, projectId, releaseOperation, savedContent])

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

  const updateViewport = (nextViewport: PreviewViewportPreset) => {
    setViewport(nextViewport)
  }

  const markViewportAsCustom = () => {
    setViewport("custom")
  }

  return (
    <section
      aria-label={`${projectName} editor workspace`}
      data-project-id={projectId}
      className="relative isolate min-h-[calc(100dvh-4.2rem)]"
    >
      <div aria-hidden="true" className="editor-workspace-grid" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-4.2rem)] w-full max-w-7xl flex-col gap-3 p-3">
        <EditorTopBar
          title={projectName}
          projectStatus={deployment.status}
          liveUrl={deployment.liveUrl}
          viewport={viewport}
          onViewportChange={updateViewport}
          isSchemaFormOpen={isSchemaFormOpen}
          onToggleSchemaForm={() => setIsSchemaFormOpen((current) => !current)}
        />

        <div
          className={cn(
            "flex w-full min-w-0 flex-1 items-start transition-[gap] duration-200 ease-out",
            isSchemaFormOpen ? "gap-3" : "gap-0"
          )}
        >
          <div className="min-h-[calc(100dvh-6rem)] min-w-0 flex-1 overflow-hidden">
            {template ? (
              <ResizableTemplatePreview
                slug={template.slug}
                name={template.name}
                content={content}
                formReady={formReady}
                viewport={viewport}
                isSchemaFormOpen={isSchemaFormOpen}
                onManualResize={markViewportAsCustom}
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-card px-6 text-center text-sm text-muted-foreground">
                Select a template to start editing this project.
              </div>
            )}
          </div>

          <TemplateSchemaEditForm
            projectId={projectId}
            schema={contentSchema}
            value={content}
            onChange={setContent}
            onReady={handleFormReady}
            onSave={handleSave}
            onDeploy={handleDeploy}
            isDirty={isDirty}
            isSaving={isSaving}
            isDeploying={isDeploying}
            operation={releaseOperation}
            canDeploy={canDeploy}
            deployDisabledReason={deployDisabledReason}
            isOpen={isSchemaFormOpen}
          />
        </div>
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
