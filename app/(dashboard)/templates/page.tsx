import { redirect } from "next/navigation"

import { TemplateCard } from "@/components/template-card"
import { createClient } from "@/lib/supabase/server"
import { listTemplates } from "@/services/template"

// Capitalize the closed-enum category slug for display (e.g. "landing" → "Landing").
function formatCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect("/login")

  const templates = await listTemplates()

  return (
    <div className="page">
      <h1>Templates</h1>
      <div>
        {templates.length === 0 ? (
          <p className="font-mono text-sm text-card-foreground/40">
            No templates available yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                title={template.name}
                type={formatCategory(template.category)}
                image={template.thumbnail}
                slug={template.slug}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
