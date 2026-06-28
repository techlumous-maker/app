import Image from "next/image"

import { Badge } from "@/components/ui/badge"
import { ArrowButton } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type IntegrationStatus = "none" | "connected" | "disconnected"

interface IntegrationCardProps {
  name: string
  description: string
  status?: IntegrationStatus
  action?: () => void | Promise<void>
  onConnect?: () => void
  onDisconnect?: () => void
  onReconnect?: () => void
  className?: string
}

const STATUS_BADGE = {
  connected: { label: "Connected", variant: "success" },
  disconnected: { label: "Disconnected", variant: "destructive" },
  none: { label: "Not connected", variant: "muted" },
} as const

const ACTION = {
  connected: {
    label: "Disconnect",
    variant: "destructive",
    badge: "bg-background text-foreground",
    extra: "text-foreground",
  },
  none: {
    label: "Connect",
    variant: "default",
    badge: "bg-primary-foreground text-black",
    extra: "",
  },
  disconnected: {
    label: "Reconnect",
    variant: "secondary",
    badge: "bg-secondary-foreground/10",
    extra: "",
  },
} as const

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

  const button = (
    <ArrowButton
      type={action ? "submit" : undefined}
      variant={cta.variant}
      badgeClassName={cta.badge}
      onClick={action ? undefined : handler}
      className={cn(cta.extra)}
    >
      {cta.label}
    </ArrowButton>
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

      <div>{action ? <form action={action}>{button}</form> : button}</div>
    </Card>
  )
}
