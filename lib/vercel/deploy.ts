import { createHash } from "node:crypto"

// Standalone Vercel file-upload deployment of Next.js source — Vercel runs
// the build. No env/vault/db coupling — every input is passed in. Mirrors
// docs/vercel-deploy-files.md:
//   1. upload each file (SHA + bytes)  2. create deployment  3. poll readyState

const API = "https://api.vercel.com"

export interface DeployFile {
  /** Path within the deployment, e.g. "index.html" or "assets/app.js" */
  file: string
  /** Raw file content */
  data: string | Uint8Array
}

export interface DeployFilesParams {
  /** Vercel access token (Bearer) */
  token: string
  /** Project slug — becomes the deployment URL prefix */
  name: string
  /** Files to deploy */
  files: DeployFile[]
  /** Team id — omit for a personal account */
  teamId?: string
  /** "production" for a production deploy; omit for a preview */
  target?: "production"
  /** Env vars applied to the deployment (set as both runtime and build env) */
  env?: Record<string, string>
  /** Give up polling after this long (default 10 min) */
  timeoutMs?: number
  /** Delay between status polls (default 5s) */
  pollIntervalMs?: number
}

export interface DeployResult {
  status: "ready" | "error"
  deploymentId: string
  url?: string
  inspectorUrl?: string
  errorMessage?: string
  errorCode?: string
}

interface FileRef {
  file: string
  sha: string
  size: number
}

interface VercelDeployment {
  id: string
  url?: string
  readyState:
    | "QUEUED"
    | "INITIALIZING"
    | "BUILDING"
    | "READY"
    | "ERROR"
    | "CANCELED"
  inspectorUrl?: string
  errorMessage?: string
  errorCode?: string
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isTerminal = (state: VercelDeployment["readyState"]) =>
  state === "READY" || state === "ERROR" || state === "CANCELED"

const teamQuery = (teamId?: string) =>
  teamId ? `?teamId=${encodeURIComponent(teamId)}` : ""

// Step 1 — upload one file, returning its SHA reference. 409 = Vercel already
// has this content, which is a success.
async function uploadFile(token: string, file: DeployFile): Promise<FileRef> {
  const bytes =
    typeof file.data === "string"
      ? Buffer.from(file.data, "utf8")
      : Buffer.from(file.data)
  const sha = createHash("sha1").update(bytes).digest("hex")

  const res = await fetch(`${API}/v2/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "x-vercel-digest": sha,
    },
    body: bytes,
  })

  if (!res.ok && res.status !== 409) {
    const detail = await res.text()
    throw new Error(
      `Vercel file upload failed for "${file.file}" (${res.status}): ${detail}`
    )
  }

  return { file: file.file, sha, size: bytes.length }
}

// Step 2 — create the deployment referencing the uploaded files.
async function createDeployment(
  params: DeployFilesParams,
  files: FileRef[]
): Promise<VercelDeployment> {
  const res = await fetch(`${API}/v13/deployments${teamQuery(params.teamId)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: params.name,
      files,
      projectSettings: { framework: "nextjs" },
      ...(params.env && { env: params.env, build: { env: params.env } }),
      target: params.target,
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(
      `Vercel deployment create failed (${res.status}): ${detail}`
    )
  }

  return (await res.json()) as VercelDeployment
}

async function getDeployment(
  token: string,
  id: string,
  teamId?: string
): Promise<VercelDeployment> {
  const res = await fetch(`${API}/v13/deployments/${id}${teamQuery(teamId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Vercel deployment fetch failed (${res.status}): ${detail}`)
  }

  return (await res.json()) as VercelDeployment
}

/**
 * Deploy a set of files to Vercel and wait for the build to finish.
 * Uploads every file, creates the deployment, then polls until it is READY,
 * ERROR, or CANCELED. Throws on network/API errors or a poll timeout.
 */
export async function deployFiles(
  params: DeployFilesParams
): Promise<DeployResult> {
  const {
    token,
    teamId,
    timeoutMs = 10 * 60_000,
    pollIntervalMs = 5000,
  } = params

  // Step 1 — upload files, collecting their SHA references
  const files = await Promise.all(params.files.map((f) => uploadFile(token, f)))

  console.log("Uploaded files:", files)

  // Step 2 — create the deployment
  const created = await createDeployment(params, files)

  console.log("Created deployment:", created)

  // Step 3 — poll until the deployment settles (or we time out)
  const deadline = Date.now() + timeoutMs
  let deployment = created
  while (!isTerminal(deployment.readyState)) {
    if (Date.now() > deadline) {
      throw new Error(
        `Vercel deployment ${created.id} timed out after ${timeoutMs}ms (last state: ${deployment.readyState})`
      )
    }
    await sleep(pollIntervalMs)
    deployment = await getDeployment(token, created.id, teamId)
  }

  // Step 4 — surface the result
  if (deployment.readyState === "READY") {
    return {
      status: "ready",
      deploymentId: deployment.id,
      url: deployment.url ? `https://${deployment.url}` : undefined,
      inspectorUrl: deployment.inspectorUrl,
    }
  }

  return {
    status: "error",
    deploymentId: deployment.id,
    inspectorUrl: deployment.inspectorUrl,
    errorMessage:
      deployment.errorMessage ??
      `Deployment ${deployment.readyState.toLowerCase()}`,
    errorCode: deployment.errorCode,
  }
}
