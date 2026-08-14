import { redirect } from "next/navigation"

import { TemplateGallery } from "@/components/template-gallery"
import { createClient } from "@/lib/supabase/server"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect("/login")

  const { project: projectId } = await searchParams

  return (
    <div className="page">
      <h1>Templates</h1>
      <div>
        <TemplateGallery projectId={projectId} />
      </div>
    </div>
  )
}
