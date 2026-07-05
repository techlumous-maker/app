"use server"

import { createClient } from "@/lib/supabase/server"
import { collectEngineFiles } from "@/lib/vercel/collect-files"
import { deployFiles } from "@/lib/vercel/deploy"
import { getUserIntegrationByProvider } from "@/services/user-integration"
import { getVaultSecret } from "@/services/vault-secret"

export type DeployActionState = {
  error: string | null
  url?: string | null
}

// Vercel project names must be lowercase alphanumeric/hyphens.
const toProjectName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")

/**
 * Deploys the template-engine (with the selected template) to the user's
 * Vercel account. Content is NOT bundled — the deployed site fetches the
 * user's published `site` row from Supabase at runtime, so later content
 * edits go live without another deploy.
 */
export async function deploySite(
  prevState: DeployActionState,
  formData: FormData
): Promise<DeployActionState> {
  const templateSlug = String(formData.get("templateSlug") ?? "hello-world")

  const supabase = await createClient()
  const { data: site, error: siteError } = await supabase
    .from("site")
    .select("id, name, status")
    .maybeSingle()

  if (siteError || !site) {
    return { error: "No site found for this account." }
  }
  if (site.status !== "published") {
    return { error: "Site content must be published before deploying." }
  }

  const integration = await getUserIntegrationByProvider()
  if (!integration || integration.status !== "CONNECTED") {
    return { error: "Connect your Vercel account first." }
  }

  try {
    const token = await getVaultSecret(integration.token)
    if (!token) return { error: "Vercel token not found. Reconnect Vercel." }

    const files = await collectEngineFiles({ templateSlug })
    const result = await deployFiles({
      token,
      teamId: (integration.credentials?.team_id as string | undefined) ?? undefined,
      name: toProjectName(site.name) || "techlumous-site",
      files,
      target: "production",
      env: {
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        SITE_ID: site.id,
        TEMPLATE_SLUG: templateSlug,
      },
    })

    if (result.status === "error") {
      return { error: result.errorMessage ?? "Deployment failed." }
    }

    return { error: null, url: result.url ?? null }
  } catch (err) {
    console.error("Error deploying site:", err)
    return { error: err instanceof Error ? err.message : "Deployment failed." }
  }
}
