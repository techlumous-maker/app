"use client"

import {
  AlignLeftSimpleIcon,
  AlignRightSimpleIcon,
} from "@phosphor-icons/react"

import { Card } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export type TemplateSchemaEditFormPosition = "left" | "right"

interface TemplateSchemaEditFormProps {
  position: TemplateSchemaEditFormPosition
  onPositionChange: (position: TemplateSchemaEditFormPosition) => void
  className?: string
}

export function TemplateSchemaEditForm({
  position,
  onPositionChange,
  className,
}: TemplateSchemaEditFormProps) {
  return (
    <Card
      className={cn(
        "sticky top-[5.1rem] h-[calc(100dvh-6rem)] min-h-0 w-[clamp(14rem,28vw,22rem)] shrink-0 gap-0 overflow-hidden rounded-2xl p-3",
        position === "left" && "order-1",
        className
      )}
    >
      <div className="flex justify-end">
        <span id="schema-form-position-label" className="sr-only">
          Arrange template schema edit form
        </span>
        <ToggleGroup
          aria-labelledby="schema-form-position-label"
          value={[position]}
          onValueChange={(value) => {
            const nextPosition = value[0] as
              | TemplateSchemaEditFormPosition
              | undefined
            if (nextPosition) onPositionChange(nextPosition)
          }}
          variant="outline"
          size="sm"
          spacing={1}
        >
          <ToggleGroupItem
            value="left"
            aria-label="Place form on the left"
            title="Place form on the left"
            className="aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            <AlignLeftSimpleIcon />
            <span>Left</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="right"
            aria-label="Place form on the right"
            title="Place form on the right"
            className="aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            <AlignRightSimpleIcon />
            <span>Right</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </Card>
  )
}
