import { createAdminClient } from "@/lib/supabase/server"
import type { VercelDeploymentEvent } from "@/lib/webhooks/vercel/event"
import {
  buildVercelEventOrderFilter,
  buildVercelProjectUpdate,
  shouldProcessVercelEvent,
} from "@/lib/webhooks/vercel/state"

const TABLE = "projects"

export type VercelWebhookProcessingResult = "processed" | "ignored"

export async function processVercelDeploymentEvent(
  event: VercelDeploymentEvent
): Promise<VercelWebhookProcessingResult> {
  const supabase = await createAdminClient()

  const { data: project, error: lookupError } = await supabase
    .from(TABLE)
    .select("id, last_deployed_at")
    .eq("vercel_project_id", event.projectId)
    .maybeSingle()

  if (lookupError) {
    throw new Error(
      `Failed to locate project for Vercel event: ${lookupError.message}`
    )
  }
  if (
    !project ||
    !shouldProcessVercelEvent(project.last_deployed_at, event.createdAt)
  ) {
    return "ignored"
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(buildVercelProjectUpdate(event))
    .eq("id", project.id)
    .eq("vercel_project_id", event.projectId)
    .or(buildVercelEventOrderFilter(event.createdAt))
    .select("id")

  if (error) {
    throw new Error(
      `Failed to process Vercel deployment event: ${error.message}`
    )
  }

  return data.length === 0 ? "ignored" : "processed"
}
