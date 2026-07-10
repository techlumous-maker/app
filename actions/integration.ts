"use server"

import { revalidatePath } from "next/cache"

import type { ActionState } from "@/types/integration"
import { getUserIntegration } from "@/services/user-integration"
import { deleteVaultSecret } from "@/services/vault-secret"

export async function disconnectIntegration(
  prevState: ActionState
): Promise<ActionState> {
  const integration = await getUserIntegration()
  if (!integration) {
    return { error: "No active integration found to disconnect." }
  }

  try {
    await deleteVaultSecret(integration.token)
  } catch (err) {
    console.error("Error deleting vault secret:", err)
    return { error: "Failed to disconnect integration." }
  }

  revalidatePath("/integration")
  return { error: null }
}
