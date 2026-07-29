"use client"

import { useTransition } from "react"
import {
  ArrowClockwiseIcon,
  CircleNotchIcon,
  PlugsConnectedIcon,
} from "@phosphor-icons/react/ssr"

import { IconButton } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface DeploymentButtonProps {
  onRetry?: () => void | Promise<void>
  onReconnect?: () => void | Promise<void>
  retryPending?: boolean
  reconnectPending?: boolean
  disabled?: boolean
  className?: string
}

interface DeploymentControlStateInput {
  hasRetry: boolean
  hasReconnect: boolean
  retryPending: boolean
  reconnectPending: boolean
  disabled: boolean
}

export function getDeploymentControlState({
  hasRetry,
  hasReconnect,
  retryPending,
  reconnectPending,
  disabled,
}: DeploymentControlStateInput) {
  return {
    shouldRender: hasRetry || hasReconnect,
    controlsDisabled: disabled || retryPending || reconnectPending,
  }
}

export function DeploymentButton({
  onRetry,
  onReconnect,
  retryPending = false,
  reconnectPending = false,
  disabled = false,
  className,
}: DeploymentButtonProps) {
  const [retryTransitionPending, startRetryTransition] = useTransition()
  const [reconnectTransitionPending, startReconnectTransition] = useTransition()
  const isRetryPending = retryPending || retryTransitionPending
  const isReconnectPending = reconnectPending || reconnectTransitionPending
  const { shouldRender, controlsDisabled } = getDeploymentControlState({
    hasRetry: !!onRetry,
    hasReconnect: !!onReconnect,
    retryPending: isRetryPending,
    reconnectPending: isReconnectPending,
    disabled,
  })

  if (!shouldRender) return null

  function handleRetry() {
    if (!onRetry) return
    startRetryTransition(async () => {
      await onRetry()
    })
  }

  function handleReconnect() {
    if (!onReconnect) return
    startReconnectTransition(async () => {
      await onReconnect()
    })
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {onRetry && (
        <IconButton
          type="button"
          icon={isRetryPending ? CircleNotchIcon : ArrowClockwiseIcon}
          iconPosition="start"
          iconClassName={cn(isRetryPending && "animate-spin")}
          variant="secondary"
          size="lg"
          onClick={handleRetry}
          disabled={controlsDisabled}
          aria-busy={isRetryPending}
          className="rounded-full px-3"
        >
          {isRetryPending ? "Retrying..." : "Retry deployment"}
        </IconButton>
      )}
      {onReconnect && (
        <IconButton
          type="button"
          icon={isReconnectPending ? CircleNotchIcon : PlugsConnectedIcon}
          iconPosition="start"
          iconClassName={cn(isReconnectPending && "animate-spin")}
          variant="outline"
          size="lg"
          onClick={handleReconnect}
          disabled={controlsDisabled}
          aria-busy={isReconnectPending}
          className="rounded-full px-3"
        >
          {isReconnectPending ? "Reconnecting..." : "Reconnect Vercel"}
        </IconButton>
      )}
    </div>
  )
}
