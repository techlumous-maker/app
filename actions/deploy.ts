"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { getDeploymentState, type DeploymentState } from "@/services/deployment"
import {
  orchestrateProjectDeployment,
  type DeploymentOrchestratorCode,
} from "@/services/deployment-orchestrator"
import type { DeploymentStatus } from "@/types/deployment"

const projectIdSchema = z.uuid()

export type DeploymentActionSnapshot = {
  status: DeploymentStatus
  liveUrl: string | null
  inspectorUrl: string | null
  errorText: string | null
  lastDeployedAt: string | null
}

export type DeployProjectActionResult = {
  status: "success" | "error"
  code: DeploymentOrchestratorCode | "INVALID_PROJECT" | null
  message: string
  deployment: DeploymentActionSnapshot | null
}

function snapshot(
  deployment: DeploymentState | null,
  inspectorUrl: string | null = null
): DeploymentActionSnapshot | null {
  if (!deployment) return null

  return {
    status: deployment.deploy_status ?? "not_deployed",
    liveUrl: deployment.deployment_url,
    inspectorUrl,
    errorText: deployment.deploy_error,
    lastDeployedAt: deployment.last_deployed_at,
  }
}

export async function deployProjectAction(
  projectId: string
): Promise<DeployProjectActionResult> {
  const parsedProjectId = projectIdSchema.safeParse(projectId)
  if (!parsedProjectId.success) {
    return {
      status: "error",
      code: "INVALID_PROJECT",
      message: "Invalid project.",
      deployment: null,
    }
  }

  try {
    const result = await orchestrateProjectDeployment(parsedProjectId.data)
    revalidatePath(`/preview/${parsedProjectId.data}/edit`)
    revalidatePath("/")

    return {
      status: result.ok ? "success" : "error",
      code: result.code,
      message: result.message,
      deployment: snapshot(result.deployment, result.inspectorUrl),
    }
  } catch (error) {
    console.error("Failed to deploy project", error)
    return {
      status: "error",
      code: "DEPLOYMENT_FAILED",
      message: "Failed to start the deployment.",
      deployment: null,
    }
  }
}

export async function getProjectDeploymentAction(
  projectId: string
): Promise<DeploymentActionSnapshot | null> {
  const parsedProjectId = projectIdSchema.safeParse(projectId)
  if (!parsedProjectId.success) return null

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims.sub
  if (!userId) return null

  const deployment = await getDeploymentState(parsedProjectId.data, userId)
  return snapshot(deployment)
}
