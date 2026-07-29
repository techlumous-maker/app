import { createHash } from "node:crypto"

import { createClient } from "@/lib/supabase/server"
import { collectEngineFiles } from "@/lib/vercel/collect-files"
import { deployFiles, type DeployResult } from "@/lib/vercel/deploy"
import { resolveProject as resolveVercelProject } from "@/lib/vercel/projects"
import {
  getDeploymentState,
  hasActiveDeployment,
  markDeploymentFailure,
  markDeploymentSuccess,
  startDeployment,
  updateDeploymentState,
  type DeploymentState,
} from "@/services/deployment"
import { getProject, updateProject } from "@/services/project"
import type { Project } from "@/services/project.schema"
import { getTemplateById } from "@/services/template"
import { getUserIntegrationByProvider } from "@/services/user-integration"
import { getVaultSecret } from "@/services/vault-secret"
import { getTemplateContentSchema } from "@/template-engine/templates/schema-registry"
import {
  canTransitionDeployment,
  type DeploymentStatus,
} from "@/types/deployment"

const ACCEPTANCE_ONLY_TIMEOUT_MS = Number.EPSILON

export type DeploymentOrchestratorCode =
  | "NOT_AUTHENTICATED"
  | "PROJECT_NOT_FOUND"
  | "ACTIVE_DEPLOYMENT"
  | "MISSING_TEMPLATE"
  | "INVALID_CONTENT"
  | "VERCEL_RECONNECT_REQUIRED"
  | "VERCEL_PROJECT_FAILED"
  | "ENVIRONMENT_SYNC_FAILED"
  | "FILE_COLLECTION_FAILED"
  | "DEPLOYMENT_UPLOAD_FAILED"
  | "DEPLOYMENT_FAILED"

export type DeploymentOrchestratorResult = {
  ok: boolean
  code: DeploymentOrchestratorCode | null
  message: string
  deployment: DeploymentState | null
  inspectorUrl: string | null
}

type DeploymentOrchestratorDependencies = {
  getAuthenticatedUserId: () => Promise<string | null>
  getProject: typeof getProject
  updateProject: typeof updateProject
  getTemplateById: typeof getTemplateById
  getTemplateContentSchema: typeof getTemplateContentSchema
  getUserIntegrationByProvider: typeof getUserIntegrationByProvider
  getVaultSecret: typeof getVaultSecret
  resolveVercelProject: typeof resolveVercelProject
  collectEngineFiles: typeof collectEngineFiles
  deployFiles: typeof deployFiles
  getDeploymentState: typeof getDeploymentState
  startDeployment: typeof startDeployment
  updateDeploymentState: typeof updateDeploymentState
  markDeploymentSuccess: typeof markDeploymentSuccess
  markDeploymentFailure: typeof markDeploymentFailure
}

export type DeploymentOrchestratorOverrides =
  Partial<DeploymentOrchestratorDependencies>

const defaultDependencies: DeploymentOrchestratorDependencies = {
  getAuthenticatedUserId: async () => {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    return data?.claims.sub ?? null
  },
  getProject,
  updateProject,
  getTemplateById,
  getTemplateContentSchema,
  getUserIntegrationByProvider,
  getVaultSecret,
  resolveVercelProject,
  collectEngineFiles,
  deployFiles,
  getDeploymentState,
  startDeployment,
  updateDeploymentState,
  markDeploymentSuccess,
  markDeploymentFailure,
}

const publicErrorMessages: Record<DeploymentOrchestratorCode, string> = {
  NOT_AUTHENTICATED: "Sign in before deploying this project.",
  PROJECT_NOT_FOUND: "Project not found.",
  ACTIVE_DEPLOYMENT: "A deployment is already in progress.",
  MISSING_TEMPLATE: "Select a valid template before deploying.",
  INVALID_CONTENT: "Fix the template content before deploying.",
  VERCEL_RECONNECT_REQUIRED: "Reconnect Vercel before deploying.",
  VERCEL_PROJECT_FAILED: "Failed to prepare the Vercel project.",
  ENVIRONMENT_SYNC_FAILED: "Failed to configure the Vercel environment.",
  FILE_COLLECTION_FAILED: "Failed to prepare the template files.",
  DEPLOYMENT_UPLOAD_FAILED: "Failed to upload the deployment.",
  DEPLOYMENT_FAILED: "The Vercel deployment failed.",
}

function failure(
  code: DeploymentOrchestratorCode,
  deployment: DeploymentState | null = null,
  inspectorUrl: string | null = null
): DeploymentOrchestratorResult {
  return {
    ok: false,
    code,
    message: publicErrorMessages[code],
    deployment,
    inspectorUrl,
  }
}

function isContentRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function projectContent(project: Project, defaultContent: unknown) {
  if (project.content && Object.keys(project.content).length > 0) {
    return project.content
  }

  return defaultContent
}

function vercelProjectName(project: Project): string {
  const name = project.name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)

  return `${name || "techlumous-project"}-${project.id.slice(0, 8)}`
}

function contentHash(content: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(content)).digest("hex")
}

function teamIdFromCredentials(
  credentials: Record<string, unknown> | null
): string | undefined {
  const teamId = credentials?.team_id
  return typeof teamId === "string" && teamId.trim() ? teamId.trim() : undefined
}

function failureStatus(result: DeployResult): "error" | "canceled" | "timeout" {
  if (result.readyState === "CANCELED") return "canceled"
  if (result.errorCode?.toUpperCase().includes("TIMEOUT")) return "timeout"
  return "error"
}

function acceptedStatus(
  result: DeployResult
): Extract<DeploymentStatus, "queued" | "initializing" | "building"> | null {
  switch (result.readyState) {
    case "QUEUED":
      return "queued"
    case "INITIALIZING":
      return "initializing"
    case "BUILDING":
      return "building"
    default:
      return null
  }
}

async function currentDeployment(
  dependencies: DeploymentOrchestratorDependencies,
  projectId: string,
  userId: string
): Promise<DeploymentState | null> {
  return dependencies.getDeploymentState(projectId, userId)
}

async function recordFailure(
  dependencies: DeploymentOrchestratorDependencies,
  projectId: string,
  userId: string,
  status: "error" | "canceled" | "timeout",
  code: string,
  error: unknown
): Promise<DeploymentState | null> {
  const current = await currentDeployment(dependencies, projectId, userId)
  if (!current || !hasActiveDeployment(current)) return current

  return (
    (await dependencies.markDeploymentFailure(projectId, userId, {
      expectedUpdatedAt: current.updated_at,
      status,
      errorCode: code,
      errorMessage: error instanceof Error ? error.message : String(error),
    })) ?? current
  )
}

async function recordAcceptedDeployment(
  dependencies: DeploymentOrchestratorDependencies,
  projectId: string,
  userId: string,
  result: DeployResult
): Promise<DeploymentState | null> {
  const current = await currentDeployment(dependencies, projectId, userId)
  const status = acceptedStatus(result)
  if (
    !current ||
    !status ||
    !canTransitionDeployment(current.deploy_status, status)
  ) {
    return current
  }

  return (
    (await dependencies.updateDeploymentState(projectId, userId, {
      expectedUpdatedAt: current.updated_at,
      status,
    })) ?? current
  )
}

export async function orchestrateProjectDeployment(
  projectId: string,
  overrides: DeploymentOrchestratorOverrides = {}
): Promise<DeploymentOrchestratorResult> {
  const dependencies = { ...defaultDependencies, ...overrides }

  // Stage 1: Authenticate the user and load the project.
  const userId = await dependencies.getAuthenticatedUserId()
  if (!userId) return failure("NOT_AUTHENTICATED")

  const project = await dependencies.getProject(projectId)
  if (!project || project.user_id !== userId) {
    return failure("PROJECT_NOT_FOUND")
  }

  // Stage 2: Confirm that the project can start a new deployment.
  const existingDeployment = await currentDeployment(
    dependencies,
    project.id,
    userId
  )
  if (!existingDeployment) return failure("PROJECT_NOT_FOUND")
  if (hasActiveDeployment(existingDeployment)) {
    return failure("ACTIVE_DEPLOYMENT", existingDeployment)
  }

  // Stage 3: Load the template and validate the project content.
  if (!project.template_id) {
    return failure("MISSING_TEMPLATE", existingDeployment)
  }
  const template = await dependencies.getTemplateById(project.template_id)
  if (!template) return failure("MISSING_TEMPLATE", existingDeployment)

  const schema = dependencies.getTemplateContentSchema(template.slug)
  if (!schema) return failure("MISSING_TEMPLATE", existingDeployment)

  const parsedContent = schema.safeParse(
    projectContent(project, template.default_content)
  )
  if (!parsedContent.success || !isContentRecord(parsedContent.data)) {
    return failure("INVALID_CONTENT", existingDeployment)
  }

  // Stage 4: Publish the validated content for the deployed template.
  await dependencies.updateProject(project.id, {
    content: parsedContent.data,
    status: "published",
  })

  // Stage 5: Load the connected Vercel account and credentials.
  const integration = await dependencies.getUserIntegrationByProvider()
  if (!integration || integration.status !== "CONNECTED") {
    return failure("VERCEL_RECONNECT_REQUIRED", existingDeployment)
  }

  const token = await dependencies.getVaultSecret(integration.token)
  if (!token) {
    return failure("VERCEL_RECONNECT_REQUIRED", existingDeployment)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return failure("ENVIRONMENT_SYNC_FAILED", existingDeployment)
  }

  const environmentVariables = {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseAnonKey,
    PROJECT_ID: project.id,
    TEMPLATE_SLUG: template.slug,
  }

  // Stage 6: Resolve the Vercel project and synchronize its environment.
  const teamId = teamIdFromCredentials(integration.credentials)
  let vercelProject
  try {
    vercelProject = await dependencies.resolveVercelProject({
      token,
      teamId,
      name: vercelProjectName(project),
      projectId: project.vercel_project_id ?? undefined,
      environmentVariables,
    })
  } catch {
    return failure("VERCEL_PROJECT_FAILED", existingDeployment)
  }

  // Stage 7: Atomically mark the deployment as preparing.
  const stateBeforeStart = await currentDeployment(
    dependencies,
    project.id,
    userId
  )
  if (!stateBeforeStart) return failure("PROJECT_NOT_FOUND")
  if (hasActiveDeployment(stateBeforeStart)) {
    return failure("ACTIVE_DEPLOYMENT", stateBeforeStart)
  }

  const preparing = await dependencies.startDeployment(project.id, userId, {
    expectedUpdatedAt: stateBeforeStart.updated_at,
    vercelProjectId: vercelProject.id,
  })
  if (!preparing) {
    const current = await currentDeployment(dependencies, project.id, userId)
    return failure("ACTIVE_DEPLOYMENT", current)
  }

  // Stage 8: Collect the template engine files for upload.
  let files
  try {
    files = await dependencies.collectEngineFiles({
      templateSlug: template.slug,
    })
  } catch (error) {
    const deployment = await recordFailure(
      dependencies,
      project.id,
      userId,
      "error",
      "FILE_COLLECTION_FAILED",
      error
    )
    return failure("FILE_COLLECTION_FAILED", deployment)
  }

  // Stage 9: Transition the deployment to uploading.
  const beforeUpload = await currentDeployment(dependencies, project.id, userId)
  if (!beforeUpload) return failure("PROJECT_NOT_FOUND")
  const uploading = await dependencies.updateDeploymentState(
    project.id,
    userId,
    {
      expectedUpdatedAt: beforeUpload.updated_at,
      status: "uploading",
    }
  )
  if (!uploading) {
    const current = await currentDeployment(dependencies, project.id, userId)
    return failure("ACTIVE_DEPLOYMENT", current)
  }

  // Stage 10: Upload the production deployment to Vercel.
  let result: DeployResult
  try {
    result = await dependencies.deployFiles({
      token,
      teamId,
      name: vercelProject.name,
      projectId: vercelProject.id,
      files,
      target: "production",
      // Stop SDK polling immediately after Vercel accepts the deployment.
      // Webhooks own all later provider state transitions.
      timeoutMs: ACCEPTANCE_ONLY_TIMEOUT_MS,
      pollIntervalMs: ACCEPTANCE_ONLY_TIMEOUT_MS,
    })
  } catch (error) {
    const deployment = await recordFailure(
      dependencies,
      project.id,
      userId,
      "error",
      "DEPLOYMENT_UPLOAD_FAILED",
      error
    )
    return failure("DEPLOYMENT_UPLOAD_FAILED", deployment)
  }

  // Stage 11: Record the provider result.
  const inspectorUrl = result.inspectorUrl ?? null
  const accepted = acceptedStatus(result)
  if (accepted) {
    const deployment = await recordAcceptedDeployment(
      dependencies,
      project.id,
      userId,
      result
    )
    return {
      ok: true,
      code: null,
      message: "Deployment accepted by Vercel.",
      deployment,
      inspectorUrl,
    }
  }

  if (result.status === "ready") {
    const current = await currentDeployment(dependencies, project.id, userId)
    const deployment =
      current && hasActiveDeployment(current) && result.url
        ? ((await dependencies.markDeploymentSuccess(project.id, userId, {
            expectedUpdatedAt: current.updated_at,
            productionUrl: result.url,
            contentHash: contentHash(parsedContent.data),
          })) ?? current)
        : current

    return {
      ok: true,
      code: null,
      message: "Deployment is live.",
      deployment,
      inspectorUrl,
    }
  }

  const deployment = await recordFailure(
    dependencies,
    project.id,
    userId,
    failureStatus(result),
    result.errorCode ?? "DEPLOYMENT_FAILED",
    result.errorMessage ?? "Vercel reported a deployment failure"
  )
  return failure("DEPLOYMENT_FAILED", deployment, inspectorUrl)
}
