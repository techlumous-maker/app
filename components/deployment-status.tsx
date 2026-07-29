import { ArrowSquareOutIcon } from "@phosphor-icons/react/ssr"

import { DeploymentButton } from "@/components/deployment-button"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type DeploymentState =
  | "preparing"
  | "initializing"
  | "uploading"
  | "queued"
  | "building"
  | "ready"
  | "error"
  | "canceled"
  | "timeout"
  | "not_deployed"

export interface DeploymentStatusProps {
  status: DeploymentState | string
  liveUrl?: string | null
  inspectorUrl?: string | null
  lastDeployedAt?: string | null
  errorText?: string | null
  onRetry?: () => void | Promise<void>
  onReconnect?: () => void | Promise<void>
  retryPending?: boolean
  reconnectPending?: boolean
  controlsDisabled?: boolean
  className?: string
}

type StatusConfig = {
  label: string
  variant: "default" | "success" | "destructive" | "muted"
  className?: string
  active?: boolean
}

const DEPLOYMENT_STATES = new Set<DeploymentState>([
  "preparing",
  "initializing",
  "uploading",
  "queued",
  "building",
  "ready",
  "error",
  "canceled",
  "timeout",
  "not_deployed",
])

const STATUS_ALIASES: Record<string, DeploymentState> = {
  live: "ready",
  failed: "error",
}

const STATUS: Record<DeploymentState, StatusConfig> = {
  preparing: {
    label: "Preparing",
    variant: "muted",
    className: "text-foreground/70",
    active: true,
  },
  initializing: {
    label: "Initializing",
    variant: "muted",
    className: "text-foreground/70",
    active: true,
  },
  uploading: {
    label: "Uploading",
    variant: "default",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    active: true,
  },
  queued: {
    label: "Queued",
    variant: "default",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    active: true,
  },
  building: {
    label: "Building",
    variant: "default",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    active: true,
  },
  ready: { label: "Ready", variant: "success" },
  error: { label: "Error", variant: "destructive" },
  canceled: {
    label: "Canceled",
    variant: "muted",
    className: "text-foreground/70",
  },
  timeout: { label: "Timeout", variant: "destructive" },
  not_deployed: {
    label: "Not deployed",
    variant: "muted",
  },
}

const deployedAtFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
})

export function resolveDeploymentState(status: string) {
  const normalizedStatus = status.trim().toLowerCase()
  const resolvedStatus = STATUS_ALIASES[normalizedStatus] ?? normalizedStatus

  return DEPLOYMENT_STATES.has(resolvedStatus as DeploymentState)
    ? (resolvedStatus as DeploymentState)
    : null
}

export function deploymentStatusLabel(status: string) {
  const normalizedStatus = status.trim().toLowerCase()

  return (
    normalizedStatus
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase()) || "Unknown"
  )
}

function isValidHostname(hostname: string) {
  if (hostname.startsWith("[") && hostname.endsWith("]")) return true

  const normalizedHostname = hostname.endsWith(".")
    ? hostname.slice(0, -1)
    : hostname

  return (
    normalizedHostname.length > 0 &&
    normalizedHostname.length <= 253 &&
    normalizedHostname
      .split(".")
      .every(
        (label) =>
          label.length > 0 &&
          label.length <= 63 &&
          /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label)
      )
  )
}

export function normalizeDeploymentUrl(value?: string | null) {
  const input = value?.trim()
  if (!input) return null

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(input)
  const candidate = hasScheme ? input : `https://${input}`

  try {
    const url = new URL(candidate)
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      !isValidHostname(url.hostname)
    ) {
      return null
    }

    return url.href
  } catch {
    return null
  }
}

function statusConfig(status: string): StatusConfig {
  const resolvedStatus = resolveDeploymentState(status)
  const knownStatus = resolvedStatus ? STATUS[resolvedStatus] : null
  if (knownStatus) return knownStatus

  return {
    label: deploymentStatusLabel(status),
    variant: "muted",
  }
}

function formatDeployedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : deployedAtFormatter.format(date)
}

export function DeploymentStatus({
  status,
  liveUrl,
  inspectorUrl,
  lastDeployedAt,
  errorText,
  onRetry,
  onReconnect,
  retryPending,
  reconnectPending,
  controlsDisabled,
  className,
}: DeploymentStatusProps) {
  const normalizedStatus = status.trim().toLowerCase()
  const config = statusConfig(normalizedStatus)
  const normalizedLiveUrl = normalizeDeploymentUrl(liveUrl)
  const normalizedInspectorUrl = normalizeDeploymentUrl(inspectorUrl)

  return (
    <div
      className={cn("flex min-w-0 flex-col items-start gap-2 py-1", className)}
    >
      <Badge
        variant={config.variant}
        className={config.className}
        role="status"
        aria-live={config.active ? "polite" : undefined}
      >
        <span
          className={cn(
            "size-1.5 rounded-full bg-current",
            config.active && "animate-pulse"
          )}
        />
        {config.label || "Unknown"}
      </Badge>

      {lastDeployedAt && (
        <span className="font-mono text-xs text-muted-foreground">
          Last deployed{" "}
          <time dateTime={lastDeployedAt}>
            {formatDeployedAt(lastDeployedAt)}
          </time>
        </span>
      )}

      {errorText && (
        <p
          className="max-w-full rounded-lg bg-destructive/10 px-3 py-2 font-sans text-xs/relaxed break-words text-destructive"
          role="alert"
        >
          {errorText}
        </p>
      )}

      {(normalizedLiveUrl || normalizedInspectorUrl) && (
        <div className="flex flex-wrap gap-1">
          {normalizedLiveUrl && (
            <a
              href={normalizedLiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "rounded-full px-2"
              )}
            >
              Live site
              <ArrowSquareOutIcon data-icon="inline-end" />
            </a>
          )}
          {normalizedInspectorUrl && (
            <a
              href={normalizedInspectorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "rounded-full px-2"
              )}
            >
              Vercel inspector
              <ArrowSquareOutIcon data-icon="inline-end" />
            </a>
          )}
        </div>
      )}

      <DeploymentButton
        onRetry={onRetry}
        onReconnect={onReconnect}
        retryPending={retryPending}
        reconnectPending={reconnectPending}
        disabled={controlsDisabled}
      />
    </div>
  )
}
