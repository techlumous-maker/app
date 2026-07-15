"use client"

import * as React from "react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export interface SwitcherOption {
  value: string
  label?: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
  ariaLabel?: string
}

interface SwitcherProps extends Omit<
  React.ComponentProps<typeof ToggleGroup>,
  | "children"
  | "defaultValue"
  | "multiple"
  | "onValueChange"
  | "spacing"
  | "value"
> {
  value: string
  options: readonly SwitcherOption[]
  onValueChange: (value: string) => void
}

function Switcher({
  value,
  options,
  onValueChange,
  className,
  size = "sm",
  ...props
}: SwitcherProps) {
  return (
    <ToggleGroup
      {...props}
      value={[value]}
      onValueChange={(values) => {
        const nextValue = values[0]
        if (nextValue) onValueChange(nextValue)
      }}
      multiple={false}
      spacing={0}
      size={size}
      className={cn(
        "gap-px rounded-full! border border-border/70 bg-muted p-0.5 shadow-inner",
        className
      )}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          aria-label={option.ariaLabel}
          className="rounded-full! border-0 bg-transparent px-3 py-1 text-muted-foreground shadow-none hover:bg-background/60 hover:text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:shadow-sm"
        >
          {option.icon && (
            <span data-icon="inline-start" aria-hidden="true">
              {option.icon}
            </span>
          )}
          {option.label && <span>{option.label}</span>}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export { Switcher }
