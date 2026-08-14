"use client"

import Link from "next/link"
import { useState } from "react"

import {
  EditorTopBar,
  type PreviewViewport,
  type PreviewViewportPreset,
} from "@/components/editor-top-bar"
import { PreviewSkeleton } from "@/components/preview-skeleton"
import { ResizableTemplatePreview } from "@/components/resizable-template-preview"
import { useTemplateBySlug } from "@/components/templates-provider"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TemplatePreviewWindowProps {
  slug?: string
  className?: string
}

export function TemplatePreviewWindow({
  slug,
  className,
}: TemplatePreviewWindowProps) {
  const template = useTemplateBySlug(slug)
  const [viewport, setViewport] = useState<PreviewViewport>("desktop")

  const updateViewport = (nextViewport: PreviewViewportPreset) => {
    setViewport(nextViewport)
  }

  if (!template) {
    return (
      <div className="page">
        <div className="mt-8 flex flex-col items-center justify-center gap-10 overflow-x-clip">
          <div className="flex w-full justify-center pt-20">
            <PreviewSkeleton />
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="max-w-75 text-muted-foreground/60 max-sm:pl-2">
              {slug
                ? `The "${slug}" template could not be found. Choose another from the template library.`
                : "No template is selected for this preview. Choose one from the template library."}
            </p>
            <Link href="/templates" className={cn(buttonVariants())}>
              View Templates
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { name, default_content: content } = template

  return (
    <section
      aria-label={`${name} preview`}
      className={cn(
        "relative isolate min-h-[calc(100dvh-4.2rem)] sm:-m-4 lg:-m-6",
        className
      )}
    >
      <div aria-hidden="true" className="editor-workspace-grid" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-4.2rem)] w-full max-w-7xl flex-col gap-3 p-3">
        <EditorTopBar
          title={name}
          viewport={viewport}
          onViewportChange={updateViewport}
        />

        <div className="min-h-[calc(100dvh-6rem)] min-w-0 flex-1 overflow-hidden">
          <ResizableTemplatePreview
            slug={template.slug}
            name={name}
            content={content}
            formReady
            viewport={viewport}
            isSchemaFormOpen={false}
            onManualResize={() => setViewport("custom")}
          />
        </div>
      </div>
    </section>
  )
}
