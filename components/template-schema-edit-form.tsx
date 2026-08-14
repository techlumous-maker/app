"use client"

import { useEffect } from "react"
import type { ZodType } from "zod"
import { CircleNotchIcon, ArrowCircleUpRightIcon } from "@phosphor-icons/react"

import { SchemaFormScrollArea } from "@/components/schema-form-scroll-area"
import { Button, IconButton } from "@/components/ui/button"
import { Card, CardFooter, CardTitle } from "@/components/ui/card"
import { SchemaForm } from "@/lib/schema-form"
import { cn } from "@/lib/utils"

interface TemplateSchemaEditFormProps {
  projectId: string
  schema?: ZodType
  value?: unknown
  onChange: (next: unknown) => void
  onReady?: () => void
  onSave: () => void
  onDeploy: () => void
  isDirty: boolean
  isSaving: boolean
  isDeploying: boolean
  operation: "deploy" | "publish"
  canDeploy: boolean
  deployDisabledReason?: string
  isOpen: boolean
  className?: string
}

export function TemplateSchemaEditForm({
  projectId,
  schema,
  value,
  onChange,
  onReady,
  onSave,
  onDeploy,
  isDirty,
  isSaving,
  isDeploying,
  operation,
  canDeploy,
  deployDisabledReason,
  isOpen,
  className,
}: TemplateSchemaEditFormProps) {
  useEffect(() => {
    if (schema) onReady?.()
  }, [onReady, schema])

  return (
    <Card
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={cn(
        "sticky top-17 flex h-[calc(100dvh-6rem)] min-h-0 shrink-0 flex-col gap-0 overflow-hidden rounded-2xl bg-background p-0 transition-[width,opacity,transform] duration-200 ease-out",
        isOpen
          ? "w-[clamp(14rem,28vw,22rem)] translate-x-0 opacity-100"
          : "pointer-events-none w-0 translate-x-2 opacity-0",
        className
      )}
    >
      <CardTitle className="p-3 text-base font-medium">Edit Content</CardTitle>

      <SchemaFormScrollArea
        aria-label="Schema fields"
        className="min-h-0 flex-1"
      >
        <div className="pt-3">
          {schema ? (
            <SchemaForm
              schema={schema}
              projectId={projectId}
              value={value}
              onChange={onChange}
              layout="beside"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a template to edit its content.
            </p>
          )}
        </div>
      </SchemaFormScrollArea>

      <CardFooter className="flex-col items-stretch gap-2 border-t border-accent-foreground/20 p-3 pt-3!">
        <div className="flex justify-end gap-2">
          <Button
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className="rounded-full px-3"
          >
            {isSaving ? "Saving..." : "Save draft"}
          </Button>
          <IconButton
            type="button"
            // variant="secondary"
            icon={isDeploying ? CircleNotchIcon : ArrowCircleUpRightIcon}
            iconPosition="end"
            iconClassName={cn(isDeploying && "animate-spin")}
            className="rounded-full pl-3"
            onClick={onDeploy}
            disabled={!canDeploy || isDeploying}
            aria-busy={isDeploying}
            title={deployDisabledReason}
          >
            {isDeploying
              ? operation === "publish"
                ? "Publishing..."
                : "Deploying..."
              : operation === "publish"
                ? "Publish changes"
                : "Deploy"}
          </IconButton>
        </div>
      </CardFooter>
    </Card>
  )
}
