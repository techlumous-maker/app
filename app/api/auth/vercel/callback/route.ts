import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import {
  VERCEL_STATE_COOKIE,
  buildVercelCredentials,
  exchangeVercelCode,
  type VercelTokenResponse,
} from "@/lib/vercel/oauth"
import {
  createUserIntegration,
  getUserIntegrationByProvider,
  updateUserIntegration,
} from "@/services/user-integration"
import {
  createVaultSecret,
  deleteVaultSecret,
  updateVaultSecret,
} from "@/services/vault-secret"

const PROVIDER = "vercel"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const configurationId = searchParams.get("configurationId")
  const teamId = searchParams.get("teamId")
  const source = searchParams.get("source")

  const cookieStore = await cookies()
  const storedState = cookieStore.get(VERCEL_STATE_COOKIE)?.value

  // Redirect helper that always clears the one-time state cookie.
  const redirectClearing = (path: string) => {
    const res = NextResponse.redirect(`${origin}${path}`)
    res.cookies.set(VERCEL_STATE_COOKIE, "", { maxAge: 0, path: "/" })
    return res
  }

  // 1. CSRF: `state` must be present and match the cookie.
  if (!state || !storedState || state !== storedState) {
    return redirectClearing("/integration?error=invalid_state")
  }

  // 2. Authorization code must be present.
  if (!code) {
    return redirectClearing("/integration?error=missing_code")
  }

  // 3. Must be authenticated so auth.uid() populates user_id and scopes the row.
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims) {
    return redirectClearing("/login?next=/integration")
  }

  // 4. Exchange the code for an access token (server-side only).
  let token: VercelTokenResponse
  try {
    token = await exchangeVercelCode(code)
  } catch (error) {
    console.error(error)
    return redirectClearing("/integration?error=token_exchange_failed")
  }
  if (!token.access_token) {
    return redirectClearing("/integration?error=token_exchange_failed")
  }

  console.log("Vercel credentials:", token)

  // 5. Assemble non-secret metadata for the credentials column.
  const credentials = buildVercelCredentials(token, {
    configurationId,
    teamId,
    source,
  })

  // 6. Upsert, keyed on (current user, provider="vercel").
  try {
    const existing = await getUserIntegrationByProvider()

    if (existing) {
      // Reconnect: reuse the row and rotate the existing vault secret in place.
      await updateVaultSecret(existing.token, token.access_token)
      await updateUserIntegration(existing.id, {
        status: "CONNECTED",
        credentials,
      })
    } else {
      const uid = await createVaultSecret(token.access_token)

      try {
        await createUserIntegration({
          provider: PROVIDER,
          token: uid,
          status: "CONNECTED",
          credentials,
        })
      } catch (error) {
        // Avoid leaking an orphan secret; fall back to update on a unique race.
        await deleteVaultSecret(uid).catch(() => {})
        const again = await getUserIntegrationByProvider()
        if (!again) throw error
        await updateVaultSecret(again.token, token.access_token)
        await updateUserIntegration(again.id, {
          status: "CONNECTED",
          credentials,
        })
      }
    }
  } catch (error) {
    console.error(error)
    return redirectClearing("/integration?error=persist_failed")
  }

  // 7. Done.
  return redirectClearing("/integration")
}
