"use client"

import { useMemo, useState, useSyncExternalStore } from "react"

import { TemplateAutoHeightPreview } from "@/components/template-auto-height-preview"
import {
  TemplateSchemaEditForm,
  type TemplateSchemaEditFormPosition,
} from "@/components/template-schema-edit-form"
import { cn } from "@/lib/utils"
import { getTemplateContentSchema } from "@/templates/schema-registry"

type PanelPosition = TemplateSchemaEditFormPosition

interface ProjectEditorWorkspaceProps {
  projectId: string
  projectName: string
  template?: {
    name: string
    slug: string
    initialContent: unknown
  } | null
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
}: ProjectEditorWorkspaceProps) {
  const contentSchema = useMemo(
    () => (template ? getTemplateContentSchema(template.slug) : undefined),
    [template]
  )

  const [content, setContent] = useState<unknown>(
    () => template?.initialContent
  )

  const panelPosition = useSyncExternalStore<PanelPosition>(
    subscribeToPanelPosition,
    getPanelPosition,
    () => "right"
  )

  const updatePanelPosition = (position: PanelPosition) => {
    window.localStorage.setItem(PANEL_POSITION_KEY, position)
    window.dispatchEvent(new Event(PANEL_POSITION_EVENT))
  }

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
        />
      </div>
    </section>
  )
}
