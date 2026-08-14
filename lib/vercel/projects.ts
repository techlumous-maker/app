import { VercelApiError, vercelRequest } from "./api"
import {
  DEPLOYMENT_ENVIRONMENT_KEYS,
  type DeploymentEnvironmentVariables,
} from "./environment-variables"

export interface FindOrCreateProjectParams {
  token: string
  name: string
  environmentVariables?: DeploymentEnvironmentVariables
  /** Stable Vercel project ID previously stored for this application */
  projectId?: string
  teamId?: string
  requestTimeoutMs?: number
  maxRetries?: number
}

export interface DeleteProjectParams {
  token: string
  idOrName: string
  teamId?: string
  requestTimeoutMs?: number
  maxRetries?: number
}

export interface VercelProject {
  id: string
  name: string
}

const readProject = async (response: Response): Promise<VercelProject> => {
  const project = (await response.json()) as Partial<VercelProject>
  if (!project.id || !project.name) {
    throw new Error("Vercel project response did not include an ID and name")
  }
  return { id: project.id, name: project.name }
}

async function getStoredProject(
  params: FindOrCreateProjectParams,
  projectId: string
): Promise<VercelProject> {
  try {
    const response = await vercelRequest({
      ...params,
      path: `/v9/projects/${encodeURIComponent(projectId)}`,
      operation: "project lookup",
    })
    return await readProject(response)
  } catch (error) {
    if (error instanceof VercelApiError && error.status === 404) {
      throw new Error("The stored Vercel project is no longer available", {
        cause: error,
      })
    }
    throw error
  }
}

/**
 * Resolves a project by its previously stored stable ID, or creates a new
 * project when no ID has been stored. It never adopts an existing project by
 * name.
 */
export async function resolveProject(
  params: FindOrCreateProjectParams
): Promise<VercelProject> {
  const name = params.name.trim()
  if (!name) throw new Error("A Vercel project name is required")

  const normalized = { ...params, name }
  const projectId = params.projectId?.trim()
  if (projectId) return getStoredProject(normalized, projectId)

  const environmentVariables = params.environmentVariables
  const response = await vercelRequest({
    ...normalized,
    path: "/v11/projects",
    operation: "project creation",
    method: "POST",
    body: {
      name,
      framework: "nextjs",
      environmentVariables: environmentVariables
        ? DEPLOYMENT_ENVIRONMENT_KEYS.map((key) => ({
            key,
            value: environmentVariables[key],
            type: "encrypted",
            target: ["production", "preview", "development"],
          }))
        : undefined,
    },
    // Retrying a project-creation POST after an ambiguous response could leave
    // the caller without the stable ID of the project that was created.
    maxRetries: 0,
  })
  return readProject(response)
}

export async function findOrCreateProject(
  params: FindOrCreateProjectParams
): Promise<string> {
  return (await resolveProject(params)).id
}

export async function deleteProject(
  params: DeleteProjectParams
): Promise<void> {
  const idOrName = params.idOrName.trim()
  if (!idOrName) throw new Error("A Vercel project ID or name is required")

  await vercelRequest({
    ...params,
    path: `/v9/projects/${encodeURIComponent(idOrName)}`,
    operation: "project deletion",
    method: "DELETE",
  })
}
