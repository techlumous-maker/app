const API_URL = "https://api.vercel.com"

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RETRIES = 3
const MAX_RETRY_DELAY_MS = 10_000

export interface VercelRequestOptions {
  token: string
  path: string
  operation: string
  teamId?: string
  method?: "GET" | "POST" | "PATCH"
  body?: unknown
  rawBody?: Uint8Array
  headers?: Record<string, string>
  acceptableStatuses?: number[]
  requestTimeoutMs?: number
  maxRetries?: number
}

export class VercelApiError extends Error {
  readonly status?: number
  readonly code?: string

  constructor(
    operation: string,
    options: { status?: number; code?: string; cause?: unknown } = {}
  ) {
    const status = options.status ? ` (${options.status})` : ""
    const code = options.code ? ` [${options.code}]` : ""

    super(`Vercel ${operation} failed${status}${code}`, {
      cause: options.cause,
    })
    this.name = "VercelApiError"
    this.status = options.status
    this.code = options.code
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isRetryableStatus = (status: number) =>
  status === 429 || (status >= 500 && status <= 599)

const retryDelay = (response: Response | undefined, attempt: number) => {
  const retryAfter = response?.headers.get("retry-after")
  if (retryAfter) {
    const seconds = Number(retryAfter)
    const parsedDate = Date.parse(retryAfter)
    const delay = Number.isFinite(seconds)
      ? seconds * 1000
      : Number.isNaN(parsedDate)
        ? 0
        : parsedDate - Date.now()

    if (delay > 0) return Math.min(delay, MAX_RETRY_DELAY_MS)
  }

  return Math.min(500 * 2 ** attempt, MAX_RETRY_DELAY_MS)
}

async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const payload = (await response.json()) as {
      error?: { code?: unknown }
      code?: unknown
    }
    const code = payload.error?.code ?? payload.code
    return typeof code === "string" ? code : undefined
  } catch {
    return undefined
  }
}

export function withTeamQuery(path: string, teamId?: string): string {
  if (!teamId) return path

  const separator = path.includes("?") ? "&" : "?"
  return `${path}${separator}teamId=${encodeURIComponent(teamId)}`
}

export async function vercelRequest(
  options: VercelRequestOptions
): Promise<Response> {
  const {
    token,
    operation,
    method = "GET",
    body,
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
  } = options

  if (!token) throw new Error("A Vercel access token is required")
  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new Error("Vercel request timeout must be greater than zero")
  }
  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new Error("Vercel max retries must be a non-negative integer")
  }
  if (body !== undefined && options.rawBody !== undefined) {
    throw new Error("A Vercel request cannot have both JSON and raw bodies")
  }

  const url = `${API_URL}${withTeamQuery(options.path, options.teamId)}`

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)
    let response: Response | undefined

    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body !== undefined && { "Content-Type": "application/json" }),
          ...options.headers,
        },
        body:
          options.rawBody === undefined
            ? body === undefined
              ? undefined
              : JSON.stringify(body)
            : Uint8Array.from(options.rawBody),
        signal: controller.signal,
      })

      if (
        response.ok ||
        options.acceptableStatuses?.includes(response.status)
      ) {
        return response
      }
      if (!isRetryableStatus(response.status) || attempt === maxRetries) {
        throw new VercelApiError(operation, {
          status: response.status,
          code: await readErrorCode(response),
        })
      }
    } catch (error) {
      if (error instanceof VercelApiError) throw error
      if (attempt === maxRetries) {
        throw new VercelApiError(operation, { cause: error })
      }
    } finally {
      clearTimeout(timeout)
    }

    await sleep(retryDelay(response, attempt))
  }

  throw new VercelApiError(operation)
}
