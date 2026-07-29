export const deploymentStatuses = [
  "not_deployed",
  "preparing",
  "uploading",
  "queued",
  "initializing",
  "building",
  "ready",
  "error",
  "canceled",
  "timeout",
] as const

export type DeploymentStatus = (typeof deploymentStatuses)[number]

export const activeDeploymentStatuses = [
  "preparing",
  "uploading",
  "queued",
  "initializing",
  "building",
] as const satisfies readonly DeploymentStatus[]

export type ActiveDeploymentStatus = (typeof activeDeploymentStatuses)[number]

const deploymentTransitions = {
  not_deployed: ["preparing"],
  preparing: ["uploading", "error", "canceled", "timeout"],
  uploading: [
    "queued",
    "initializing",
    "building",
    "ready",
    "error",
    "canceled",
    "timeout",
  ],
  queued: ["initializing", "building", "ready", "error", "canceled", "timeout"],
  initializing: ["building", "ready", "error", "canceled", "timeout"],
  building: ["ready", "error", "canceled", "timeout"],
  ready: ["preparing"],
  error: ["preparing"],
  canceled: ["preparing"],
  timeout: ["preparing"],
} as const satisfies Record<DeploymentStatus, readonly DeploymentStatus[]>

export function isActiveDeploymentStatus(
  status: DeploymentStatus | null | undefined
): status is ActiveDeploymentStatus {
  return (
    status !== null &&
    status !== undefined &&
    activeDeploymentStatuses.some((activeStatus) => activeStatus === status)
  )
}

export function canTransitionDeployment(
  from: DeploymentStatus | null | undefined,
  to: DeploymentStatus
): boolean {
  const current = from ?? "not_deployed"

  return deploymentTransitions[current].some((nextStatus) => nextStatus === to)
}
