import { createClient } from "@supabase/supabase-js"

/**
 * Fetches this site's published content from Supabase using the anon key.
 * Row access is enforced by RLS (anon may only read published rows) and
 * column grants (anon may only read id/template_slug/content/status/updated_at).
 *
 * Returns null when the env pointers are absent (local dev — caller falls
 * back to the template's defaultContent). Throws when the fetch fails so a
 * live site never silently renders defaults: at build time the deploy fails
 * loudly, at runtime a failed ISR regeneration keeps serving the last good
 * page.
 */
export async function fetchSiteContent(): Promise<unknown | null> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  const siteId = process.env.SITE_ID

  if (!url || !key || !siteId) return null

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  // Select only `content` — broader selects hit the anon column grant.
  const { data, error } = await supabase
    .from("site")
    .select("content")
    .eq("id", siteId)
    .eq("status", "published")
    .single()

  if (error) {
    throw new Error(`[template-engine] content fetch failed: ${error.message}`)
  }

  return data.content
}
