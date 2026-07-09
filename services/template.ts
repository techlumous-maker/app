"use server"

import { createClient } from "@/lib/supabase/server"
import type { Template } from "./template.schema"

const TABLE = "templates"

// Reads run as the authenticated user (templates RLS: SELECT for `authenticated`).
// Writes are service_role only, so this fetching service exposes reads exclusively.

export async function listTemplates(): Promise<Template[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .order("name", { ascending: true })

  if (error) throw new Error(`Failed to list templates: ${error.message}`)

  return data
}

export async function getTemplate(slug: string): Promise<Template | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("slug", slug)
    .maybeSingle()

  if (error) throw new Error(`Failed to get template: ${error.message}`)

  return data
}

export async function getTemplateById(id: string): Promise<Template | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("id", id)
    .maybeSingle()

  if (error) throw new Error(`Failed to get template by id: ${error.message}`)

  return data
}
