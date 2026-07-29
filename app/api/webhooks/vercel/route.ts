import { parseVercelDeploymentEvent } from "@/lib/webhooks/vercel/event"
import { verifyVercelWebhookSignature } from "@/lib/webhooks/vercel/signature"
import { processVercelDeploymentEvent } from "@/services/vercel-webhook"

function getWebhookSecret(): string | null {
  return (
    process.env.VERCEL_WEBHOOK_SECRET ??
    process.env.VERCEL_CLIENT_SECRET ??
    null
  )
}

export async function POST(request: Request) {
  const secret = getWebhookSecret()
  if (!secret) {
    return Response.json({ code: "webhook_not_configured" }, { status: 500 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get("x-vercel-signature")

  if (!verifyVercelWebhookSignature(rawBody, signature, secret)) {
    return Response.json({ code: "invalid_signature" }, { status: 403 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return Response.json({ code: "invalid_payload" }, { status: 400 })
  }

  const parsed = parseVercelDeploymentEvent(body)
  if (parsed.kind === "invalid") {
    return Response.json({ code: "invalid_payload" }, { status: 400 })
  }
  if (parsed.kind === "unsupported") {
    return Response.json({ received: true, processed: false })
  }

  try {
    const result = await processVercelDeploymentEvent(parsed.event)
    return Response.json({
      received: true,
      processed: result === "processed",
    })
  } catch {
    return Response.json({ code: "processing_failed" }, { status: 500 })
  }
}
