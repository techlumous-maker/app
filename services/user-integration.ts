"use server"

import { createClient } from "@/lib/supabase/server"
import { verifyVercelToken } from "@/lib/vercel/oauth"
import { getVaultSecret } from "@/services/vault-secret"
import {
  insertUserIntegrationSchema,
  updateUserIntegrationSchema,
  type InsertUserIntegration,
  type UpdateUserIntegration,
  type UserIntegration,
} from "./user-integration.schema"

const TABLE = "user_integration"
const PROVIDER = "vercel"

interface GetUserIntegrationOptions {
  validateToken?: boolean
}

async function markIntegrationDisconnected(
  integration: UserIntegration
): Promise<UserIntegration> {
  const disconnected = {
    ...integration,
    status: "DISCONNECTED" as const,
  }

  try {
    return await updateUserIntegration(integration.id, {
      status: "DISCONNECTED",
    })
  } catch {
    console.error("Failed to persist disconnected Vercel integration status")
    return disconnected
  }
}

async function validateConnectedIntegration(
  integration: UserIntegration
): Promise<UserIntegration> {
  if (integration.status !== "CONNECTED") return integration

  let token: string | null
  try {
    token = await getVaultSecret(integration.token)
  } catch {
    console.error("Failed to read the connected Vercel credential")
    return integration
  }

  if (!token) {
    return markIntegrationDisconnected(integration)
  }

  const teamId =
    typeof integration.credentials?.team_id === "string"
      ? integration.credentials.team_id
      : null

  let verification
  try {
    verification = await verifyVercelToken(token, teamId)
  } catch {
    console.error("Failed to verify the connected Vercel credential")
    return integration
  }

  if (verification.valid) return integration

  return markIntegrationDisconnected(integration)
}

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

  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("provider", PROVIDER)

  if (error) throw new Error(`Failed to list integrations: ${error.message}`)

  return data
}

export async function getUserIntegration(): Promise<UserIntegration | null> {
  return getUserIntegrationByProvider()
}

export async function getUserIntegrationByProvider(
  options: GetUserIntegrationOptions = {}
): Promise<UserIntegration | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq("provider", PROVIDER)
    .maybeSingle()

  if (error)
    throw new Error(`Failed to get integration by provider: ${error.message}`)

  if (!data || options.validateToken === false) return data

  return validateConnectedIntegration(data)
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
    .eq("provider", PROVIDER)
    .select()
    .single()

  if (error) throw new Error(`Failed to update integration: ${error.message}`)

  return data
}

export async function deleteUserIntegration(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("provider", PROVIDER)

  console.log("HERER")

  if (error) throw new Error(`Failed to delete integration: ${error.message}`)
}
