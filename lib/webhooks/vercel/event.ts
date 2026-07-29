import { z } from "zod"

const supportedEventTypes = [
  "deployment.created",
  "deployment.ready",
  "deployment.succeeded",
  "deployment.error",
  "deployment.canceled",
] as const

const eventEnvelopeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  createdAt: z.union([z.number(), z.string()]),
  payload: z.unknown(),
})

const deploymentPayloadSchema = z.object({
  project: z
    .object({
      id: z.string().min(1),
    })
    .optional(),
  projectId: z.string().min(1).optional(),
  deployment: z.object({
    id: z.string().min(1),
    url: z.string().nullish(),
    inspectorUrl: z.string().nullish(),
    errorCode: z.string().nullish(),
    errorMessage: z.string().nullish(),
  }),
  links: z
    .object({
      deployment: z.string().nullish(),
    })
    .optional(),
  error: z
    .object({
      code: z.string().nullish(),
      message: z.string().nullish(),
    })
    .optional(),
})

export type VercelDeploymentEventType = (typeof supportedEventTypes)[number]

export interface VercelDeploymentEvent {
  id: string
  type: VercelDeploymentEventType
  createdAt: string
  projectId: string
  deploymentId: string
  status: "building" | "ready" | "error" | "canceled"
  url: string | null
  inspectorUrl: string | null
  errorCode: string | null
  errorMessage: string | null
}

export type ParseVercelEventResult =
  | { kind: "supported"; event: VercelDeploymentEvent }
  | { kind: "unsupported" }
  | { kind: "invalid" }

function isSupportedEventType(type: string): type is VercelDeploymentEventType {
  return supportedEventTypes.some((supportedType) => supportedType === type)
}

function normalizeTimestamp(value: number | string): string | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function statusForEvent(
  type: VercelDeploymentEventType
): VercelDeploymentEvent["status"] {
  switch (type) {
    case "deployment.created":
      return "building"
    case "deployment.succeeded":
    case "deployment.ready":
      return "ready"
    case "deployment.error":
      return "error"
    case "deployment.canceled":
      return "canceled"
  }
}

export function parseVercelDeploymentEvent(
  input: unknown
): ParseVercelEventResult {
  const envelopeResult = eventEnvelopeSchema.safeParse(input)
  if (!envelopeResult.success) return { kind: "invalid" }

  const envelope = envelopeResult.data
  if (!isSupportedEventType(envelope.type)) return { kind: "unsupported" }

  const payloadResult = deploymentPayloadSchema.safeParse(envelope.payload)
  const createdAt = normalizeTimestamp(envelope.createdAt)
  if (!payloadResult.success || !createdAt) return { kind: "invalid" }

  const { deployment, links, error } = payloadResult.data
  const projectId =
    payloadResult.data.project?.id ?? payloadResult.data.projectId
  if (!projectId) return { kind: "invalid" }

  return {
    kind: "supported",
    event: {
      id: envelope.id,
      type: envelope.type,
      createdAt,
      projectId,
      deploymentId: deployment.id,
      status: statusForEvent(envelope.type),
      url: normalizeUrl(deployment.url),
      inspectorUrl: normalizeUrl(deployment.inspectorUrl ?? links?.deployment),
      errorCode: deployment.errorCode ?? error?.code ?? null,
      errorMessage: deployment.errorMessage ?? error?.message ?? null,
    },
  }
}
