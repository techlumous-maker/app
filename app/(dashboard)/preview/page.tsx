import { redirect } from "next/navigation"

import { TemplatePreview } from "@/components/template-preview"
import { createClient } from "@/lib/supabase/server"
import { getTemplate, listTemplates } from "@/templates/registry"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect("/login")

  const { template: requested } = await searchParams
  const fallback = listTemplates()[0]
  const template = (requested && getTemplate(requested)) || fallback

  if (!template) {
    return (
      <div className="page">
        <h1>Preview</h1>
        <p className="text-card-foreground/60">No templates registered yet.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Preview</h1>
      <TemplatePreview slug={template.meta.slug} name={template.meta.name} />
    </div>
  )
}
