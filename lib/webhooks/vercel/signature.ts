import { createHmac, timingSafeEqual } from "node:crypto"

const SHA1_HEX_PATTERN = /^[a-f0-9]{40}$/i

export function verifyVercelWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !SHA1_HEX_PATTERN.test(signature)) return false

  const expected = createHmac("sha1", secret).update(rawBody).digest()
  const received = Buffer.from(signature, "hex")

  return timingSafeEqual(expected, received)
}
