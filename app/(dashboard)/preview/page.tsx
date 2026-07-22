import { redirect } from "next/navigation"

import { TemplatePreviewWindow } from "@/components/template-preview-window"
import { createClient } from "@/lib/supabase/server"
import { getTemplate } from "@/services/template"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect("/login")

  const { template: requested } = await searchParams
  const slug = requested

  if (!slug) {
    return (
      <div className="page">
        <TemplatePreviewWindow />
      </div>
    )
  }

  const template = await getTemplate(slug)

  if (!template) {
    return (
      <div className="page">
        <TemplatePreviewWindow requestedTemplate={slug} />
      </div>
    )
  }

  return (
    <div className="page">
      <TemplatePreviewWindow slug={template.slug} name={template.name} />
    </div>
  )
}
