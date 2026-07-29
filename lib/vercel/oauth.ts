export const VERCEL_STATE_COOKIE = "vercel_oauth_state"

const TOKEN_ENDPOINT = "https://api.vercel.com/v2/oauth/access_token"

export interface VercelTokenResponse {
  access_token: string
  token_type?: string
  installation_id?: string
  user_id?: string
  team_id?: string | null
}

export interface VercelCallbackParams {
  configurationId?: string | null
  teamId?: string | null
  source?: string | null
}

export type VercelTokenVerification =
  | { valid: true }
  | {
      valid: false
      reason: "revoked_token" | "invalid_team" | "disabled_configuration"
    }

type VercelOAuthErrorCode =
  | "configuration_error"
  | "exchange_failed"
  | "invalid_response"
  | "verification_failed"

export class VercelOAuthError extends Error {
  readonly code: VercelOAuthErrorCode
  readonly status?: number

  constructor(code: VercelOAuthErrorCode, status?: number) {
    super(`Vercel OAuth ${code.replaceAll("_", " ")}`)
    this.name = "VercelOAuthError"
    this.code = code
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new VercelOAuthError("invalid_response")
  }

  return value
}

export function parseVercelTokenResponse(value: unknown): VercelTokenResponse {
  if (!isRecord(value)) {
    throw new VercelOAuthError("invalid_response")
  }

  if (
    typeof value.access_token !== "string" ||
    value.access_token.trim().length === 0
  ) {
    throw new VercelOAuthError("invalid_response")
  }

  const teamId = value.team_id === null ? null : optionalString(value.team_id)

  return {
    access_token: value.access_token,
    token_type: optionalString(value.token_type),
    installation_id: optionalString(value.installation_id),
    user_id: optionalString(value.user_id),
    team_id: teamId,
  }
}

function vercelErrorCode(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined

  if (typeof value.code === "string") return value.code
  if (!isRecord(value.error)) return undefined

  return typeof value.error.code === "string" ? value.error.code : undefined
}

export function resolveVercelTeamId(
  tokenTeamId?: string | null,
  callbackTeamId?: string | null
): string | null {
  if (
    tokenTeamId !== undefined &&
    callbackTeamId != null &&
    (tokenTeamId ?? null) !== callbackTeamId
  ) {
    throw new Error("Vercel OAuth team ID mismatch")
  }

  return tokenTeamId === undefined
    ? (callbackTeamId ?? null)
    : (tokenTeamId ?? null)
}

export async function exchangeVercelCode(
  code: string
): Promise<VercelTokenResponse> {
  const clientId = process.env.VERCEL_CLIENT_ID
  const clientSecret = process.env.VERCEL_CLIENT_SECRET
  const redirectUri = process.env.VERCEL_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new VercelOAuthError("configuration_error")
  }

  let res: Response
  try {
    res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })
  } catch {
    throw new VercelOAuthError("exchange_failed")
  }

  if (!res.ok) {
    throw new VercelOAuthError("exchange_failed", res.status)
  }

  let payload: unknown
  try {
    payload = await res.json()
  } catch {
    throw new VercelOAuthError("invalid_response")
  }

  return parseVercelTokenResponse(payload)
}

export async function verifyVercelToken(
  token: string,
  teamId?: string | null
): Promise<VercelTokenVerification> {
  const url = new URL("https://api.vercel.com/v2/user")
  if (teamId) url.searchParams.set("teamId", teamId)

  let res: Response
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new VercelOAuthError("verification_failed")
  }

  if (res.ok) return { valid: true }
  if (res.status === 401) {
    return { valid: false, reason: "revoked_token" }
  }

  let payload: unknown
  try {
    payload = await res.json()
  } catch {
    payload = null
  }
  const code = vercelErrorCode(payload)

  if (code === "integration_configuration_disabled") {
    return { valid: false, reason: "disabled_configuration" }
  }
  if (res.status === 403 && teamId) {
    return { valid: false, reason: "invalid_team" }
  }

  throw new VercelOAuthError("verification_failed", res.status)
}

export function buildVercelCredentials(
  token: VercelTokenResponse,
  cb: VercelCallbackParams
): Record<string, unknown> {
  return {
    provider_user_id: token.user_id ?? null,
    team_id: resolveVercelTeamId(token.team_id, cb.teamId),
    installation_id: token.installation_id ?? null,
    configuration_id: cb.configurationId ?? null,
    token_type: token.token_type ?? null,
    source: cb.source ?? null,
    connected_at: new Date().toISOString(),
  }
}
