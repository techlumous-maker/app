export const VERCEL_STATE_COOKIE = "vercel_oauth_state"

const TOKEN_ENDPOINT = "https://api.vercel.com/v2/oauth/access_token"

export interface VercelTokenResponse {
  access_token: string
  token_type?: string
  installation_id?: string
  user_id?: string
  team_id?: string | null
  [key: string]: unknown
}

export interface VercelCallbackParams {
  configurationId?: string | null
  teamId?: string | null
  source?: string | null
}

export async function exchangeVercelCode(
  code: string
): Promise<VercelTokenResponse> {
  const clientId = process.env.VERCEL_CLIENT_ID
  const clientSecret = process.env.VERCEL_CLIENT_SECRET
  const redirectUri = process.env.VERCEL_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing Vercel OAuth env vars (VERCEL_CLIENT_ID / VERCEL_CLIENT_SECRET / VERCEL_REDIRECT_URI)"
    )
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Vercel token exchange failed (${res.status}): ${detail}`)
  }

  const token = (await res.json()) as VercelTokenResponse
  console.info("Vercel token response keys:", Object.keys(token))

  return token
}

export function buildVercelCredentials(
  token: VercelTokenResponse,
  cb: VercelCallbackParams
): Record<string, unknown> {
  return {
    provider_user_id: token.user_id ?? null,
    team_id: token.team_id ?? cb.teamId ?? null,
    installation_id: token.installation_id ?? null,
    configuration_id: cb.configurationId ?? null,
    token_type: token.token_type ?? null,
    source: cb.source ?? null,
    connected_at: new Date().toISOString(),
  }
}
