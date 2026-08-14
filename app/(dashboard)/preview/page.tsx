import { redirect } from "next/navigation"

import { TemplatePreviewWindow } from "@/components/template-preview-window"
import { createClient } from "@/lib/supabase/server"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect("/login")

  const { template: requested } = await searchParams

  return <TemplatePreviewWindow slug={requested} />
}
