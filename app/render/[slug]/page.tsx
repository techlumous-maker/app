import { notFound } from "next/navigation"

import { getTemplate } from "@/templates/registry"

/**
 * Standalone renderer route. Renders a single template by slug using its
 * default content. The studio embeds this in an <iframe> so the template's
 * markup/styles are isolated from the studio app.
 *
 * Later this will accept content via postMessage (live preview) or from the
 * DB (published site); for now it renders the template's default content.
 */
export default async function RenderPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const template = getTemplate(slug)
  if (!template) notFound()

  const { Template, defaultContent } = template
  return <Template content={defaultContent} />
}
