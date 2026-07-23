import { redirect } from "next/navigation"
import Link from "next/link"
import { WarningOctagonIcon } from "@phosphor-icons/react/ssr"

import { TemplatePreviewWindow } from "@/components/template-preview-window"
import { buttonVariants } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { getTemplate } from "@/services/template"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect("/login")

  const emptyState = (slug?: string) => (
    <div className="page">
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <WarningOctagonIcon
          weight="duotone"
          className="size-14 text-muted-foreground"
        />
        <p className="max-w-75 text-sm/6 text-card-foreground">
          {slug
            ? `The "${slug}" template could not be found. Choose another from the template library.`
            : "No template is selected for this preview. Choose one from the template library."}
        </p>
        <Link href="/templates" className={cn(buttonVariants())}>
          View Templates
        </Link>
      </div>
    </div>
  )

  const { template: requested } = await searchParams
  const slug = requested

  if (!slug) return emptyState()

  const template = await getTemplate(slug)

  if (!template) {
    return emptyState(slug)
  }

  return (
    <div className="page">
      <TemplatePreviewWindow slug={template.slug} name={template.name} />
    </div>
  )
}
