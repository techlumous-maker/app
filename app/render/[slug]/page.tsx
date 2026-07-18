import { notFound } from "next/navigation"

import { LiveTemplateRenderer } from "./live-template-renderer"
import { getTemplate } from "@/templates/registry"

/**
 * Standalone renderer route. Renders a single template by slug. The studio
 * embeds this in an <iframe> so the template's markup/styles are isolated from
 * the studio app.
 */
export default async function RenderPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const template = getTemplate(slug)
  if (!template) notFound()

  return (
    <LiveTemplateRenderer
      slug={slug}
      initialContent={template.defaultContent}
    />
  )
}
