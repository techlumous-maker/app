import { createAdminClient } from "@/lib/supabase/server"
import {
  canTransitionDeployment,
  isActiveDeploymentStatus,
  type ActiveDeploymentStatus,
  type DeploymentStatus,
} from "@/types/deployment"
import type { Project } from "./project.schema"

const TABLE = "projects"

export type DeploymentState = Pick<
  Project,
  | "id"
  | "user_id"
  | "vercel_project_id"
  | "deployment_url"
  | "deploy_status"
  | "deploy_error"
  | "deployed_content_hash"
  | "last_deployed_at"
  | "updated_at"
>

type ExpectedDeploymentState = {
  expectedUpdatedAt: string | null
}

export type StartDeploymentInput = ExpectedDeploymentState & {
  vercelProjectId: string
}

export type UpdateDeploymentStateInput = ExpectedDeploymentState & {
  status: ActiveDeploymentStatus
}

export type MarkDeploymentSuccessInput = ExpectedDeploymentState & {
  productionUrl: string
  contentHash: string
  completedAt?: string
}

export type MarkDeploymentFailureInput = ExpectedDeploymentState & {
  status: Extract<DeploymentStatus, "error" | "canceled" | "timeout">
  errorCode?: string | null
  errorMessage?: string | null
}

function nextTimestamp(
  expectedUpdatedAt: string | null,
  candidate = new Date().toISOString()
): string {
  if (expectedUpdatedAt === null) return candidate

  const expectedTime = Date.parse(expectedUpdatedAt)
  const candidateTime = Date.parse(candidate)

  if (
    Number.isNaN(expectedTime) ||
    Number.isNaN(candidateTime) ||
    candidateTime > expectedTime
  ) {
    return candidate
  }

  return new Date(expectedTime + 1).toISOString()
}

function formatDeploymentError(
  errorCode?: string | null,
  errorMessage?: string | null
): string | null {
  const code = errorCode ? `[${errorCode}]` : null
  return [code, errorMessage].filter(Boolean).join(" ") || null
}

export async function getDeploymentState(
  projectId: string,
  userId: string
): Promise<DeploymentState | null> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "id, user_id, vercel_project_id, deployment_url, deploy_status, deploy_error, deployed_content_hash, last_deployed_at, updated_at"
    )
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to read deployment state: ${error.message}`)
  }

  return data
}

export function hasActiveDeployment(
  state: Pick<DeploymentState, "deploy_status">
): boolean {
  return isActiveDeploymentStatus(state.deploy_status)
}

async function transitionDeployment(
  projectId: string,
  userId: string,
  expectedUpdatedAt: string | null,
  status: DeploymentStatus,
  payload: Record<string, string | null> = {}
): Promise<DeploymentState | null> {
  const current = await getDeploymentState(projectId, userId)

  if (!current || current.updated_at !== expectedUpdatedAt) return null

  if (current.deploy_status === status && Object.keys(payload).length === 0) {
    return current
  }

  if (!canTransitionDeployment(current.deploy_status, status)) {
    throw new Error(
      `Invalid deployment transition: ${current.deploy_status ?? "not_deployed"} -> ${status}`
    )
  }

  const updatedAt = nextTimestamp(expectedUpdatedAt)
  const supabase = await createAdminClient()
  const update = supabase
    .from(TABLE)
    .update({ ...payload, deploy_status: status, updated_at: updatedAt })
    .eq("id", projectId)
    .eq("user_id", userId)

  const query =
    expectedUpdatedAt === null
      ? update.is("updated_at", null)
      : update.eq("updated_at", expectedUpdatedAt)

  const { data, error } = await query
    .select(
      "id, user_id, vercel_project_id, deployment_url, deploy_status, deploy_error, deployed_content_hash, last_deployed_at, updated_at"
    )
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to update deployment: ${error.message}`)
  }

  return data
}

export async function startDeployment(
  projectId: string,
  userId: string,
  input: StartDeploymentInput
): Promise<DeploymentState | null> {
  return transitionDeployment(
    projectId,
    userId,
    input.expectedUpdatedAt,
    "preparing",
    {
      vercel_project_id: input.vercelProjectId,
      deploy_error: null,
    }
  )
}

export async function updateDeploymentState(
  projectId: string,
  userId: string,
  input: UpdateDeploymentStateInput
): Promise<DeploymentState | null> {
  return transitionDeployment(
    projectId,
    userId,
    input.expectedUpdatedAt,
    input.status
  )
}

export async function markDeploymentSuccess(
  projectId: string,
  userId: string,
  input: MarkDeploymentSuccessInput
): Promise<DeploymentState | null> {
  const completedAt = nextTimestamp(
    input.expectedUpdatedAt,
    input.completedAt ?? new Date().toISOString()
  )

  return transitionDeployment(
    projectId,
    userId,
    input.expectedUpdatedAt,
    "ready",
    {
      deployment_url: input.productionUrl,
      deployed_content_hash: input.contentHash,
      deploy_error: null,
      last_deployed_at: completedAt,
    }
  )
}

export async function markDeploymentFailure(
  projectId: string,
  userId: string,
  input: MarkDeploymentFailureInput
): Promise<DeploymentState | null> {
  return transitionDeployment(
    projectId,
    userId,
    input.expectedUpdatedAt,
    input.status,
    {
      deploy_error: formatDeploymentError(input.errorCode, input.errorMessage),
    }
  )
}
