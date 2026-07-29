import { createHash } from "node:crypto"

import { VercelApiError, vercelRequest } from "./api"
import {
  findOrCreateProject,
  resolveProject,
  type FindOrCreateProjectParams,
} from "./projects"

export { findOrCreateProject, type FindOrCreateProjectParams }

export interface DeployFile {
  /** Path within the deployment, e.g. "index.html" or "assets/app.js" */
  file: string
  /** Raw file content */
  data: string | Uint8Array
}

export interface DeployFilesParams {
  /** Vercel access token (Bearer) */
  token: string
  /** Project slug; the project is created when it does not exist */
  name: string
  /** Stable Vercel project ID stored after the first deployment */
  projectId?: string
  /** Files to deploy */
  files: DeployFile[]
  /** Team id; omit for a personal account */
  teamId?: string
  /** "production" for a production deploy; omit for a preview */
  target?: "production"
  /** Env vars applied to this deployment at runtime and build time */
  env?: Record<string, string>
  /** Give up polling after this long (default 10 min) */
  timeoutMs?: number
  /** Delay between status polls (default 5s) */
  pollIntervalMs?: number
  /** Maximum simultaneous file uploads (default 5) */
  uploadConcurrency?: number
  /** Timeout for each Vercel API request (default 30s) */
  requestTimeoutMs?: number
  /** Retries for rate limits, server errors, and network failures (default 3) */
  maxRetries?: number
}

export interface DeployResult {
  status: "ready" | "error"
  projectId: string
  deploymentId: string
  url: string | undefined
  inspectorUrl: string | undefined
  readyState: VercelReadyState
  errorCode: string | undefined
  errorMessage: string | undefined
}

interface FileRef {
  file: string
  sha: string
  size: number
}

export type VercelReadyState =
  "QUEUED" | "INITIALIZING" | "BUILDING" | "READY" | "ERROR" | "CANCELED"

interface VercelDeployment {
  id: string
  url?: string
  readyState: VercelReadyState
  inspectorUrl?: string
  errorMessage?: string
  errorCode?: string
}

const DEFAULT_TIMEOUT_MS = 10 * 60_000
const DEFAULT_POLL_INTERVAL_MS = 5000
const DEFAULT_UPLOAD_CONCURRENCY = 5

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isTerminal = (state: VercelReadyState) =>
  state === "READY" || state === "ERROR" || state === "CANCELED"

const apiOptions = (params: DeployFilesParams) => ({
  token: params.token,
  teamId: params.teamId,
  requestTimeoutMs: params.requestTimeoutMs,
  maxRetries: params.maxRetries,
})

const readDeployment = async (response: Response) => {
  const deployment = (await response.json()) as Partial<VercelDeployment>
  if (!deployment.id || !deployment.readyState) {
    throw new Error(
      "Vercel deployment response did not include an ID and ready state"
    )
  }
  return deployment as VercelDeployment
}

function validateFiles(files: DeployFile[]): void {
  if (files.length === 0) {
    throw new Error("Cannot create an empty Vercel deployment")
  }

  const paths = new Set<string>()
  for (const file of files) {
    const segments = file.file.split("/")
    if (
      !file.file ||
      file.file.startsWith("/") ||
      file.file.includes("\\") ||
      segments.includes("..") ||
      segments.includes("")
    ) {
      throw new Error(`Invalid deployment file path "${file.file}"`)
    }
    if (paths.has(file.file)) {
      throw new Error(`Duplicate deployment file path "${file.file}"`)
    }
    paths.add(file.file)
  }
}

async function uploadFile(
  params: DeployFilesParams,
  file: DeployFile
): Promise<FileRef> {
  const bytes =
    typeof file.data === "string"
      ? Buffer.from(file.data, "utf8")
      : Buffer.from(file.data)
  const sha = createHash("sha1").update(bytes).digest("hex")

  await vercelRequest({
    ...apiOptions(params),
    path: "/v2/files",
    operation: `file upload for "${file.file}"`,
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "x-vercel-digest": sha,
    },
    rawBody: bytes,
    acceptableStatuses: [409],
  })

  return { file: file.file, sha, size: bytes.length }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length)
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < values.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(values[index])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker)
  )
  return results
}

async function createDeployment(
  params: DeployFilesParams,
  projectName: string,
  files: FileRef[]
): Promise<VercelDeployment> {
  const response = await vercelRequest({
    ...apiOptions(params),
    path: "/v13/deployments",
    operation: "deployment creation",
    method: "POST",
    body: {
      name: projectName,
      files,
      projectSettings: { framework: "nextjs" },
      ...(params.env && {
        env: params.env,
        build: { env: params.env },
      }),
      target: params.target,
    },
    // Deployment creation is not idempotent. A caller can reconcile an
    // ambiguous failure before explicitly trying again.
    maxRetries: 0,
  })

  return readDeployment(response)
}

async function getDeployment(
  params: DeployFilesParams,
  id: string
): Promise<VercelDeployment> {
  const response = await vercelRequest({
    ...apiOptions(params),
    path: `/v13/deployments/${encodeURIComponent(id)}`,
    operation: "deployment status fetch",
  })

  return readDeployment(response)
}

/**
 * Uploads files, creates a Vercel project/deployment, and waits for the build
 * to reach READY, ERROR, or CANCELED.
 */
export async function deployFiles(
  params: DeployFilesParams
): Promise<DeployResult> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    uploadConcurrency = DEFAULT_UPLOAD_CONCURRENCY,
  } = params

  validateFiles(params.files)
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Deployment timeout must be greater than zero")
  }
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs <= 0) {
    throw new Error("Deployment poll interval must be greater than zero")
  }
  if (!Number.isInteger(uploadConcurrency) || uploadConcurrency <= 0) {
    throw new Error("Upload concurrency must be a positive integer")
  }

  const project = await resolveProject({
    token: params.token,
    name: params.name,
    projectId: params.projectId,
    teamId: params.teamId,
    requestTimeoutMs: params.requestTimeoutMs,
    maxRetries: params.maxRetries,
  })
  const files = await mapWithConcurrency(
    params.files,
    uploadConcurrency,
    (file) => uploadFile(params, file)
  )
  const created = await createDeployment(params, project.name, files)

  const deadline = Date.now() + timeoutMs
  let deployment = created
  try {
    while (!isTerminal(deployment.readyState)) {
      const remaining = deadline - Date.now()
      if (remaining <= 0) {
        return failedPollResult(
          project.id,
          deployment,
          "DEPLOYMENT_POLL_TIMEOUT",
          `Vercel deployment polling timed out after ${timeoutMs}ms`
        )
      }

      await sleep(Math.min(pollIntervalMs, remaining))
      deployment = await getDeployment(params, created.id)
    }
  } catch (error) {
    return failedPollResult(
      project.id,
      deployment,
      error instanceof VercelApiError
        ? (error.code ?? "DEPLOYMENT_POLL_FAILED")
        : "DEPLOYMENT_POLL_FAILED",
      error instanceof Error
        ? error.message
        : "Vercel deployment polling failed"
    )
  }

  const ready = deployment.readyState === "READY"
  return {
    status: ready ? "ready" : "error",
    projectId: project.id,
    deploymentId: deployment.id,
    url: deployment.url
      ? deployment.url.startsWith("http")
        ? deployment.url
        : `https://${deployment.url}`
      : undefined,
    inspectorUrl: deployment.inspectorUrl,
    readyState: deployment.readyState,
    errorCode: ready ? undefined : deployment.errorCode,
    errorMessage: ready
      ? undefined
      : (deployment.errorMessage ??
        `Deployment ${deployment.readyState.toLowerCase()}`),
  }
}

function failedPollResult(
  projectId: string,
  deployment: VercelDeployment,
  errorCode: string,
  errorMessage: string
): DeployResult {
  return {
    status: "error",
    projectId,
    deploymentId: deployment.id,
    url: deployment.url
      ? deployment.url.startsWith("http")
        ? deployment.url
        : `https://${deployment.url}`
      : undefined,
    inspectorUrl: deployment.inspectorUrl,
    readyState: deployment.readyState,
    errorCode,
    errorMessage,
  }
}
