import { redirect } from "next/navigation"

import { TemplatePreview } from "@/components/template-preview"
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

  const notFound = (slug?: string) => (
    <div className="page">
      <p className="text-card-foreground/60">
        {slug ? `No template found for "${slug}"` : "Please select a template."}
      </p>
    </div>
  )

  const { template: requested } = await searchParams
  const slug = requested

  if (!slug) return notFound()

  const template = await getTemplate(slug)

  if (!template) {
    return notFound(slug)
  }

  return (
    <div className="page">
      <TemplatePreview slug={template.slug} name={template.name} />
    </div>
  )
}
