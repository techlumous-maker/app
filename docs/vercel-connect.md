# AI Guideline — Connect a Vercel Account (OAuth)

A prescriptive, copy-ready guideline for an AI agent implementing **only** the
"Connect a Vercel account" capability via Vercel's OAuth integration flow.

## Scope

**In scope** — everything needed to take a user from "not connected" to "we hold
a valid Vercel access token server-side":

- Start the OAuth handshake
- Hand off to Vercel's install screen
- Handle the callback and exchange the `code` for an access token
- Report connection state and allow disconnect

**Out of scope** (do **not** implement from this guide):

- How/where the access token is persisted (your storage/credential layer owns
  this — treat "save the token" as an abstract hand-off)
- Deploying sites, polling deployment status, or anything that _uses_ the token

> The single deliverable of this flow is: **a valid Vercel access token obtained
> server-side.** What happens to it afterwards is a separate concern.

---

## Mental model

OAuth "authorization code" handshake against a Vercel **integration**:

```
USER            BROWSER                 OUR SERVER                     VERCEL
 │ click Connect ──►│ GET /authorize ──────►│ make state, set cookie     │
 │                  │                       │ redirect ─────────────────►│ (install screen)
 │ click Install ──────────────────────────────────────────────────────►│
 │                  │   redirect back with ?code&state ◄──────────────── │
 │                  │ GET /callback ───────►│ verify state               │
 │                  │                       │ exchange code → token ────►│
 │                  │                       │ [hand token to storage]    │
 │                  │◄── redirect "done" ── │                            │
```

Two invariants that must hold no matter how you implement it:

1. **The access token never reaches the browser.** The code→token exchange
   happens server-side only. The browser sees redirects and status text — never
   the token.
2. **CSRF is guarded by `state`.** A random `state` is generated when the flow
   starts, stored in an httpOnly cookie, sent to Vercel, and verified on return.
   A missing or mismatched `state` aborts the flow.

---

## Prerequisites

These are **configuration**, not credentials-at-rest — they belong in env vars:

| Variable                  | Purpose                                                           |
| ------------------------- | ----------------------------------------------------------------- |
| `VERCEL_CLIENT_ID`        | OAuth app client id (from the Vercel integration)                 |
| `VERCEL_CLIENT_SECRET`    | OAuth app client secret — server-side only                        |
| `VERCEL_REDIRECT_URI`     | Must exactly match the callback URL registered on the integration |
| `VERCEL_INTEGRATION_SLUG` | Integration slug used to build the install URL                    |

Create the OAuth integration at <https://vercel.com/dashboard/integrations> and
register the redirect URI as `<origin>/api/auth/vercel/callback`.

---

## Implementation in this repo

This codebase starts the handshake as a **server action** (rather than a
`GET /authorize` route) and handles the callback as a **route handler**. The
token is persisted into Supabase Vault, referenced by a Vault secret UID stored
on the `user_integration` table.

### 1. Connect button (`components/integration-card.tsx`, `app/(dashboard)/integration/page.tsx`)

The Vercel card receives the `connectVercel` server action via an `action` prop
and renders its button inside a `<form action={connectVercel}>`, so clicking it
performs a full-page submit → redirect (no client fetch; the token never reaches
the browser):

```tsx
<IntegrationCard name="Vercel" status="none" action={connectVercel} />
```

### 2. Start the handshake — `connectVercel()` (`app/api/auth/vercel/actions.ts`)

1. Require an authenticated user (`supabase.auth.getClaims()`), else `redirect("/login")`.
2. Read `VERCEL_INTEGRATION_SLUG`; if missing, throw (surfaces as a 500).
3. Generate a random `state` (`randomBytes(32).toString("hex")`).
4. Store it in an httpOnly, `SameSite=Lax`, 10-minute cookie (`vercel_oauth_state`).
   `Lax` is required so the cookie survives the top-level redirect back from vercel.com.
5. `redirect("https://vercel.com/integrations/<slug>/new?state=<state>")`.

### 3. Callback — `GET /api/auth/vercel/callback` (`app/api/auth/vercel/callback/route.ts`)

Vercel redirects the browser here with `?code&state&configurationId&teamId&source&next`.

1. Verify `state` matches the cookie (else `?error=invalid_state`); always clear the cookie.
2. Require `code` (else `?error=missing_code`).
3. Require an authenticated user (else `/login?next=/integration`).
4. Exchange the code **server-side**:
   `POST https://api.vercel.com/v2/oauth/access_token`,
   `Content-Type: application/x-www-form-urlencoded`,
   body `client_id, client_secret, code, redirect_uri`. On failure → `?error=token_exchange_failed`.
5. Persist (below), then redirect to `/integration?connected=vercel`.

## Persistence (Vault + `user_integration`)

The raw access token is stored ONLY in Supabase Vault; `user_integration.token`
(a uuid) holds the Vault secret UID, and `credentials` (jsonb) holds non-secret
metadata only — never the token. Keyed on the current user + `provider="vercel"`:

```
existing = getUserIntegrationByProvider("vercel")    // RLS-scoped to the user
if existing:                                          // reconnect
  updateVaultSecret(existing.token, accessToken)      // rotate the secret in place
  updateUserIntegration(existing.id, { status: "CONNECTED", credentials })
else:                                                 // new connect
  uid = createVaultSecret(accessToken)                // create the secret FIRST (FK target)
  createUserIntegration({ provider, token: uid, status: "CONNECTED", credentials })
  // on insert failure: deleteVaultSecret(uid) to avoid an orphan, then retry as an update
```

Notes:

- FK `user_integration.token → vault.secrets(id) ON DELETE CASCADE` — create the
  secret before the row; deleting the secret cascade-deletes the row.
- Row writes use the cookie-based RLS client so `user_id` defaults to `auth.uid()`
  (never set it manually). This requires INSERT + UPDATE RLS policies on the table.
- Vault writes use the service-role admin client (`services/vault-secret.ts`).
- `credentials` fields: `provider_user_id`, `team_id`, `installation_id`,
  `configuration_id`, `token_type`, `source`, `connected_at`.

## Deferred (not yet implemented)

- `GET /api/auth/vercel/status` and a Disconnect action. The integrations page
  reads connection state server-side; disconnect + live-status wiring is a follow-up.
