"use client"

import { TemplateCard } from "@/components/template-card"
import { useTemplates } from "@/components/templates-provider"

export function TemplateGallery({ projectId }: { projectId?: string }) {
  const { templates } = useTemplates()

  if (templates.length === 0) {
    return (
      <p className="font-mono text-sm text-card-foreground/40">
        No templates available yet.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          templateId={template.id}
          projectId={projectId}
        />
      ))}
    </div>
  )
}
