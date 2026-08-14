"use client"

import { useEffect } from "react"
import { usePanelRef } from "react-resizable-panels"

import type { PreviewViewport } from "@/components/editor-top-bar"
import { TemplateAutoHeightPreview } from "@/components/template-auto-height-preview"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

const VIEWPORT_WIDTHS: Record<
  Exclude<PreviewViewport, "desktop" | "custom">,
  number
> = {
  tablet: 768,
  mobile: 390,
}

interface ResizableTemplatePreviewProps {
  slug: string
  name: string
  content: unknown
  formReady: boolean
  viewport: PreviewViewport
  isSchemaFormOpen: boolean
  onManualResize: () => void
}

export function ResizableTemplatePreview({
  slug,
  name,
  content,
  formReady,
  viewport,
  isSchemaFormOpen,
  onManualResize,
}: ResizableTemplatePreviewProps) {
  const previewPanelRef = usePanelRef()

  useEffect(() => {
    if (viewport === "custom") return

    previewPanelRef.current?.resize(
      viewport === "desktop" ? 100_000 : VIEWPORT_WIDTHS[viewport]
    )
  }, [isSchemaFormOpen, previewPanelRef, viewport])

  const templatePanel = (
    <ResizablePanel
      id="template-preview"
      panelRef={previewPanelRef}
      defaultSize="100%"
      minSize="380px"
      groupResizeBehavior={
        !isSchemaFormOpen && viewport === "desktop"
          ? "preserve-relative-size"
          : "preserve-pixel-size"
      }
      className="min-w-0 overflow-hidden bg-white"
    >
      <TemplateAutoHeightPreview
        slug={slug}
        name={name}
        content={content}
        formReady={formReady}
      />
    </ResizablePanel>
  )

  const workspacePanel = (
    <ResizablePanel
      id="template-workspace"
      defaultSize="0%"
      minSize="0%"
      className="min-w-0 bg-transparent"
    >
      <div aria-hidden="true" className="h-full min-h-[calc(100dvh-6rem)]" />
    </ResizablePanel>
  )

  const resizeHandle = (
    <ResizableHandle
      id="template-preview-handle"
      aria-label="Resize template preview"
      withHandle
      className={
        isSchemaFormOpen
          ? "[&>div]:bg-primary/80"
          : "pointer-events-none opacity-0"
      }
      onPointerDown={onManualResize}
      onKeyDown={(event) => {
        if (event.key.startsWith("Arrow")) onManualResize()
      }}
    />
  )

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="template-resize-mesh h-auto! min-h-[calc(100dvh-6rem)]"
    >
      {workspacePanel}
      {resizeHandle}
      {templatePanel}
    </ResizablePanelGroup>
  )
}
