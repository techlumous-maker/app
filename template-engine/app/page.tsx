import type { Metadata } from "next"

import { getTemplate, listTemplates } from "@/templates/registry"

function resolveTemplate() {
  const slug =
    process.env.TEMPLATE_SLUG?.trim() || listTemplates()[0]?.meta.slug
  const template = slug ? getTemplate(slug) : undefined

  if (!template) {
    const available =
      listTemplates()
        .map((t) => t.meta.slug)
        .join(", ") || "none registered"
    throw new Error(
      `[template-engine] TEMPLATE_SLUG "${slug ?? ""}" was not found. ` +
        `Available templates: ${available}.`
    )
  }

  return template
}

export function generateMetadata(): Metadata {
  return { title: resolveTemplate().meta.name }
}

export default function Page() {
  const template = resolveTemplate()
  console.log(
    `[template-engine] building "${template.meta.slug}" (${template.meta.name})`
  )

  const { Template, defaultContent } = template
  return <Template content={defaultContent} />
}
