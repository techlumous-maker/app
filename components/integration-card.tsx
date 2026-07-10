"use client"

import Image from "next/image"
import { useActionState, useEffect } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { IconButton } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { ActionState } from "@/types/integration"

type IntegrationStatus = "none" | "connected" | "disconnected"

interface IntegrationCardProps {
  name: string
  description: string
  status?: IntegrationStatus
  action?: (prevState: ActionState, formData: FormData) => Promise<ActionState>
  onConnect?: () => void
  onDisconnect?: () => void
  onReconnect?: () => void
  className?: string
}

export const initialActionState: ActionState = { error: null }

const STATUS_BADGE = {
  connected: { label: "Connected", variant: "success" },
  disconnected: { label: "Disconnected", variant: "destructive" },
  none: { label: "Not connected", variant: "muted" },
} as const

const ACTION = {
  connected: {
    label: "Disconnect",
    variant: "destructive",
    extra: "text-foreground",
  },
  none: {
    label: "Connect",
    variant: "default",
    extra: "",
  },
  disconnected: {
    label: "Reconnect",
    variant: "secondary",
    extra: "",
  },
} as const

// useActionState must be called unconditionally; stand in for cards
// rendered without a form `action` (e.g. onConnect/onDisconnect handlers).
async function noopAction(state: ActionState): Promise<ActionState> {
  return state
}

export function IntegrationCard({
  name,
  description,
  status = "none",
  action,
  onConnect,
  onDisconnect,
  onReconnect,
  className,
}: IntegrationCardProps) {
  const badge = STATUS_BADGE[status]
  const cta = ACTION[status]
  const handler =
    status === "connected"
      ? onDisconnect
      : status === "disconnected"
        ? onReconnect
        : onConnect

  const [state, formAction, isPending] = useActionState(
    action ?? noopAction,
    initialActionState
  )

  useEffect(() => {
    if (state.error && !isPending) toast.error(state.error)
  }, [isPending, state.error])

  const button = (
    <IconButton
      type={action ? "submit" : undefined}
      variant={cta.variant}
      size="lg"
      onClick={action ? undefined : handler}
      disabled={action ? isPending : undefined}
      className={cn(
        cta.extra,
        "rounded-full pl-3 [&>svg]:transition-transform hover:[&>svg]:rotate-45"
      )}
    >
      {cta.label}
    </IconButton>
  )

  return (
    <Card
      variant="integration"
      className={cn(
        "integration-card-glow flex flex-col gap-5 rounded-3xl p-6 ring-0",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-3">
          <Image
            src="/assets/integration-logo/vercel.svg"
            alt={name}
            width={40}
            height={40}
            className="fill-card-foreground!"
          />
          <span className="text-2xl font-medium text-foreground">{name}</span>
        </div>
        <Badge variant={badge.variant}>
          <span className="size-1.5 rounded-full bg-current" />
          {badge.label}
        </Badge>
      </div>

      <p className="flex-1 font-heading text-5xl font-medium text-card-foreground/15">
        {description}
      </p>

      <Separator />

      <div>{action ? <form action={formAction}>{button}</form> : button}</div>
    </Card>
  )
}
