"use server"

import { createClient } from "@/lib/supabase/server"
import {
  insertUserIntegrationSchema,
  updateUserIntegrationSchema,
  type InsertUserIntegration,
  type UpdateUserIntegration,
  type UserIntegration,
} from "./user-integration.schema"

const TABLE = "user_integration"

export async function createUserIntegration(
  input: InsertUserIntegration
): Promise<UserIntegration> {
  const payload = insertUserIntegrationSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`Failed to create integration: ${error.message}`)

  return data
}

export async function listUserIntegrations(): Promise<UserIntegration[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.from(TABLE).select()

  if (error) throw new Error(`Failed to list integrations: ${error.message}`)

  return data
}

export async function getUserIntegration(
  id: string
): Promise<UserIntegration | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("id", id)
    .maybeSingle()

  if (error) throw new Error(`Failed to get integration: ${error.message}`)

  return data
}

export async function getUserIntegrationByProvider(): Promise<UserIntegration | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from(TABLE).select().maybeSingle()

  if (error)
    throw new Error(`Failed to get integration by provider: ${error.message}`)

  return data
}

export async function updateUserIntegration(
  id: string,
  input: UpdateUserIntegration
): Promise<UserIntegration> {
  const payload = updateUserIntegrationSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update integration: ${error.message}`)

  return data
}

export async function deleteUserIntegration(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from(TABLE).delete().eq("id", id)

  if (error) throw new Error(`Failed to delete integration: ${error.message}`)
}
