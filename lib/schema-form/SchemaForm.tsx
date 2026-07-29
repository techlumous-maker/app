"use client"

import * as React from "react"
import type { ZodType } from "zod"
import { PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { normalize } from "./normalize"
import { resolveWidget } from "./resolver"
import type { FieldDescriptor } from "./types"
import { widgets } from "./widgets"

function blankValue(field: FieldDescriptor): unknown {
  switch (field.kind) {
    case "object": {
      const obj: Record<string, unknown> = {}
      field.fields?.forEach((child) => {
        obj[child.key] = blankValue(child)
      })
      return obj
    }
    case "array":
      return []
    case "enum":
      return field.options?.[0] ?? ""
    case "number":
      return 0
    case "boolean":
      return false
    default:
      return ""
  }
}

interface FieldProps {
  field: FieldDescriptor
  value: unknown
  onChange: (next: unknown) => void
  layout?: SchemaFieldLayout
}

export type SchemaFieldLayout = "above" | "beside"

export function Field({
  field,
  value,
  onChange,
  layout = "above",
}: FieldProps) {
  const widget = resolveWidget(field)

  if (widget === "group") {
    const obj = (value ?? {}) as Record<string, unknown>
    return (
      <fieldset className="space-y-3 border-border/40 not-first:border-t">
        {field.label && (
          <Label className="pt-2 font-mono text-lg text-foreground">
            {field.label}
          </Label>
        )}
        {field.fields?.map((child) => (
          <Field
            key={child.key}
            field={child}
            value={obj[child.key]}
            onChange={(next) => onChange({ ...obj, [child.key]: next })}
            layout={layout}
          />
        ))}
      </fieldset>
    )
  }

  if (widget === "array") {
    const arr = (value ?? []) as unknown[]
    const item = field.item
    return (
      <div className="space-y-2 border-border/40 not-first:border-t">
        {field.label && (
          <Label className="pt-2 font-mono text-lg text-foreground">
            {field.label}
          </Label>
        )}
        {arr.map((entry, index) => (
          <div
            key={index}
            className="relative rounded-md border border-border/60 p-3"
          >
            <div className="flex-1 pr-4">
              {item && (
                <Field
                  field={item}
                  value={entry}
                  onChange={(next) =>
                    onChange(arr.map((it, i) => (i === index ? next : it)))
                  }
                  layout={layout}
                />
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove item"
              onClick={() => onChange(arr.filter((_, i) => i !== index))}
              className="absolute top-1 right-1 rounded-full text-foreground/40! hover:bg-destructive/5! hover:text-destructive!"
            >
              <TrashSimpleIcon />
            </Button>
          </div>
        ))}
        {item && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...arr, blankValue(item)])}
          >
            <PlusIcon /> Add
          </Button>
        )}
      </div>
    )
  }

  const Widget = widgets[widget] ?? widgets.text
  return (
    <div
      className={cn(
        layout === "above"
          ? "space-y-1"
          : "grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-2"
      )}
    >
      {field.label && (
        <Label
          className={cn(
            "pl-1 font-mono text-xs text-muted-foreground",
            layout === "beside" && "self-start pt-1.5"
          )}
        >
          {field.label}
        </Label>
      )}
      <Widget field={field} value={value} onChange={onChange} />
    </div>
  )
}

export function SchemaForm({
  schema,
  value,
  onChange,
  layout = "beside",
}: {
  schema: ZodType
  value: unknown
  onChange: (next: unknown) => void
  layout?: SchemaFieldLayout
}) {
  const root = React.useMemo(() => normalize(schema), [schema])
  return (
    <Field field={root} value={value} onChange={onChange} layout={layout} />
  )
}
