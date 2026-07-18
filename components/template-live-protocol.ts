export const TEMPLATE_LIVE_CHANNEL = "techlumous:template-live" as const

export type TemplateLiveMessage =
  | {
      channel: typeof TEMPLATE_LIVE_CHANNEL
      type: "form-ready"
      slug: string
    }
  | {
      channel: typeof TEMPLATE_LIVE_CHANNEL
      type: "renderer-ready"
      slug: string
    }
  | {
      channel: typeof TEMPLATE_LIVE_CHANNEL
      type: "content-update"
      slug: string
      content: unknown
    }

export function isTemplateLiveMessage(
  value: unknown
): value is TemplateLiveMessage {
  if (typeof value !== "object" || value === null) return false

  const message = value as {
    channel?: unknown
    type?: unknown
    slug?: unknown
  }

  return (
    message.channel === TEMPLATE_LIVE_CHANNEL &&
    typeof message.slug === "string" &&
    (message.type === "form-ready" ||
      message.type === "renderer-ready" ||
      message.type === "content-update")
  )
}
