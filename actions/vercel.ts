"use server"

import { randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import type { ActionState } from "@/types/integration"
import { VERCEL_STATE_COOKIE } from "@/lib/vercel/oauth"

// Starts the Vercel OAuth handshake: generate a CSRF `state`, stash it in an
// httpOnly cookie, then redirect the browser to Vercel's install screen. Invoked
// from the integrations page via <form action={connectVercel}>.
export async function connectVercel(
  prevState: ActionState
): Promise<ActionState> {
  const slug = process.env.VERCEL_INTEGRATION_SLUG
  if (!slug) return { error: "Missing VERCEL_INTEGRATION_SLUG env var" }

  const state = randomBytes(32).toString("hex")

  const cookieStore = await cookies()
  cookieStore.set(VERCEL_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  })

  redirect(`https://vercel.com/integrations/${slug}/new?state=${state}`)
}
