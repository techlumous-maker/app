import type { VercelDeploymentEvent } from "./event"

export function buildVercelProjectUpdate(event: VercelDeploymentEvent) {
  let deployError = event.errorMessage
  if (event.errorCode && event.errorMessage) {
    deployError = `${event.errorCode}: ${event.errorMessage}`
  } else if (event.errorCode) {
    deployError = event.errorCode
  }

  return {
    deploy_status: event.status,
    deployment_url: event.url,
    deploy_error: deployError,
    last_deployed_at: event.createdAt,
  }
}

export function shouldProcessVercelEvent(
  lastDeployedAt: string | null,
  eventCreatedAt: string
): boolean {
  if (!lastDeployedAt) return true

  return new Date(eventCreatedAt).getTime() > new Date(lastDeployedAt).getTime()
}

export function buildVercelEventOrderFilter(eventCreatedAt: string): string {
  return `last_deployed_at.is.null,last_deployed_at.lt.${eventCreatedAt}`
}
