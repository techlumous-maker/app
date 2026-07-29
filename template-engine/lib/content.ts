import { createClient } from "@supabase/supabase-js"

/**
 * Fetches this project's published content from Supabase using the anon key.
 * Row access is enforced by RLS (anon may only read published rows) and
 * column grants (anon may only read id/content/status).
 *
 * Returns null when the env pointers are absent (local dev — caller falls
 * back to the template's defaultContent). Throws when the fetch fails so a
 * live site never silently renders defaults: at build time the deploy fails
 * loudly, at runtime a failed ISR regeneration keeps serving the last good
 * page.
 */
export async function fetchProjectContent(): Promise<unknown | null> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  const projectId = process.env.PROJECT_ID

  if (!url || !key || !projectId) return null

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  // Select only `content` — broader selects hit the anon column grant.
  const { data, error } = await supabase
    .from("projects")
    .select("content")
    .eq("id", projectId)
    .eq("status", "published")
    .single()

  if (error) {
    throw new Error(`[template-engine] content fetch failed: ${error.message}`)
  }

  return data.content
}
