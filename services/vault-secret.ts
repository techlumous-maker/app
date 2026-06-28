"use server"

import { createAdminClient } from "@/lib/supabase/server"

export async function createVaultSecret(secret: string): Promise<string> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase.rpc("vault_create_secret", { secret })

  if (error) throw new Error(`Failed to create vault secret: ${error.message}`)

  return data
}

export async function getVaultSecret(secretId: string): Promise<string | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase.rpc("vault_get_secret", {
    secret_id: secretId,
  })

  if (error) throw new Error(`Failed to read vault secret: ${error.message}`)

  return data ?? null
}

export async function updateVaultSecret(
  secretId: string,
  secret: string
): Promise<void> {
  const supabase = await createAdminClient()

  const { error } = await supabase.rpc("vault_update_secret", {
    secret_id: secretId,
    secret,
  })

  if (error) throw new Error(`Failed to update vault secret: ${error.message}`)
}

export async function deleteVaultSecret(secretId: string): Promise<void> {
  const supabase = await createAdminClient()

  const { error } = await supabase.rpc("vault_delete_secret", {
    secret_id: secretId,
  })

  if (error) throw new Error(`Failed to delete vault secret: ${error.message}`)
}
