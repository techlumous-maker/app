"use client"

import * as React from "react"
import { DotsThreeIcon } from "@phosphor-icons/react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export interface SwitcherOption {
  value: string
  label?: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
  ariaLabel?: string
}

export interface SwitcherProps extends Omit<
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
  moreOptions?: readonly SwitcherOption[]
  moreOptionsAriaLabel?: string
}

function Switcher({
  value,
  options,
  onValueChange,
  moreOptions = [],
  moreOptionsAriaLabel = "More options",
  className,
  size = "sm",
  disabled,
  ...props
}: SwitcherProps) {
  const hasMoreOptions = moreOptions.length > 0
  const hasSelectedMoreOption = moreOptions.some(
    (option) => option.value === value
  )

  return (
    <div
      data-slot="switcher"
      data-size={size}
      className={cn(
        "inline-flex w-fit overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-xs",
        className
      )}
    >
      <ToggleGroup
        {...props}
        value={[value]}
        onValueChange={(values) => {
          const nextValue = values[0]
          if (nextValue) onValueChange(nextValue)
        }}
        disabled={disabled}
        multiple={false}
        spacing={0}
        size={size}
        className="gap-0 rounded-none! bg-transparent"
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            aria-label={option.ariaLabel}
            className={cn(
              "items-center justify-center rounded-none! border-0 border-r border-border bg-transparent px-3 text-muted-foreground shadow-none hover:bg-muted/60 hover:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground",
              !hasMoreOptions && "last:border-r-0"
            )}
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

      {hasMoreOptions && (
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            aria-label={moreOptionsAriaLabel}
            data-selected={hasSelectedMoreOption || undefined}
            className={cn(
              "inline-flex shrink-0 items-center justify-center bg-transparent text-muted-foreground transition-colors outline-none hover:bg-muted/60 hover:text-foreground focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-popup-open:bg-muted data-popup-open:text-foreground data-selected:bg-muted data-selected:text-foreground",
              size === "lg"
                ? "h-8 min-w-9 px-2.5"
                : size === "default"
                  ? "h-7 min-w-8 px-2"
                  : "h-6 min-w-7 px-2"
            )}
          >
            <DotsThreeIcon
              aria-hidden="true"
              className="size-4"
              weight="bold"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-40">
            <DropdownMenuRadioGroup
              value={value}
              onValueChange={(nextValue) => {
                if (typeof nextValue === "string") onValueChange(nextValue)
              }}
            >
              {moreOptions.map((option) => (
                <DropdownMenuRadioItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  aria-label={option.ariaLabel}
                >
                  {option.icon && <span aria-hidden="true">{option.icon}</span>}
                  <span>
                    {option.label ?? option.ariaLabel ?? option.value}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export { Switcher }
