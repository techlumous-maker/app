"use client"

import { useEffect } from "react"
import type { ZodType } from "zod"
import {
  CircleNotchIcon,
  RocketLaunchIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
} from "@phosphor-icons/react"

import type { DeploymentActionSnapshot } from "@/actions/deploy"
import { DeploymentStatus } from "@/components/deployment-status"
import { Button, IconButton } from "@/components/ui/button"
import { Card, CardFooter, CardTitle } from "@/components/ui/card"
import { Switcher, type SwitcherOption } from "@/components/ui/switcher"
import { SchemaForm } from "@/lib/schema-form"
import { cn } from "@/lib/utils"

export type TemplateSchemaEditFormPosition = "left" | "right"

const positionOptions: readonly SwitcherOption[] = [
  {
    value: "left",
    icon: <TextAlignLeftIcon />,
    ariaLabel: "Place form on the left",
  },
  {
    value: "right",
    icon: <TextAlignRightIcon />,
    ariaLabel: "Place form on the right",
  },
]

interface TemplateSchemaEditFormProps {
  position: TemplateSchemaEditFormPosition
  onPositionChange: (position: TemplateSchemaEditFormPosition) => void
  schema?: ZodType
  value?: unknown
  onChange: (next: unknown) => void
  onReady?: () => void
  onSave: () => void
  onDeploy: () => void
  onRetry: () => void
  onReconnect: () => void
  isDirty: boolean
  isSaving: boolean
  isDeploying: boolean
  canDeploy: boolean
  deployDisabledReason?: string
  deployment: DeploymentActionSnapshot
  needsVercelReconnect: boolean
  className?: string
}

export function TemplateSchemaEditForm({
  position,
  onPositionChange,
  schema,
  value,
  onChange,
  onReady,
  onSave,
  onDeploy,
  onRetry,
  onReconnect,
  isDirty,
  isSaving,
  isDeploying,
  canDeploy,
  deployDisabledReason,
  deployment,
  needsVercelReconnect,
  className,
}: TemplateSchemaEditFormProps) {
  useEffect(() => {
    if (schema) onReady?.()
  }, [onReady, schema])

  return (
    <Card
      className={cn(
        "sticky top-17 flex h-[calc(100dvh-6rem)] min-h-0 w-[clamp(14rem,28vw,22rem)] shrink-0 flex-col gap-0 overflow-hidden rounded-2xl bg-background p-3",
        position === "left" && "order-1",
        className
      )}
    >
      <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium">
        Edit Content
        <div className="flex shrink-0 justify-end">
          <span id="schema-form-position-label" className="sr-only">
            Arrange template schema edit form
          </span>
          <Switcher
            aria-labelledby="schema-form-position-label"
            value={position}
            options={positionOptions}
            onValueChange={(nextPosition) =>
              onPositionChange(nextPosition as TemplateSchemaEditFormPosition)
            }
          />
        </div>
      </CardTitle>

      <div className="min-h-0 flex-1 overflow-y-auto pt-3">
        {schema ? (
          <SchemaForm schema={schema} value={value} onChange={onChange} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a template to edit its content.
          </p>
        )}
      </div>

      <CardFooter className="flex-col items-stretch gap-2 border-t border-accent-foreground/20 pt-2!">
        <DeploymentStatus
          status={deployment.status}
          liveUrl={deployment.liveUrl}
          inspectorUrl={deployment.inspectorUrl}
          lastDeployedAt={deployment.lastDeployedAt}
          errorText={deployment.errorText}
          onRetry={
            ["error", "canceled", "timeout"].includes(deployment.status)
              ? onRetry
              : undefined
          }
          onReconnect={needsVercelReconnect ? onReconnect : undefined}
          retryPending={isDeploying}
          controlsDisabled={isSaving}
        />

        <div className="flex justify-end gap-2">
          <Button onClick={onSave} disabled={!isDirty || isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <IconButton
            type="button"
            icon={isDeploying ? CircleNotchIcon : RocketLaunchIcon}
            iconPosition="start"
            iconClassName={cn(isDeploying && "animate-spin")}
            onClick={onDeploy}
            disabled={!canDeploy || isDeploying}
            aria-busy={isDeploying}
            title={deployDisabledReason}
          >
            {isDeploying ? "Deploying..." : "Deploy"}
          </IconButton>
        </div>
      </CardFooter>
    </Card>
  )
}
