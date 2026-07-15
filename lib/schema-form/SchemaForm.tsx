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
}

export function Field({ field, value, onChange }: FieldProps) {
  const widget = resolveWidget(field)

  if (widget === "group") {
    const obj = (value ?? {}) as Record<string, unknown>
    return (
      <fieldset className="space-y-3 border-border/40 not-first:border-t">
        {field.label && (
          <Label className="pt-2 text-lg text-foreground">{field.label}</Label>
        )}
        {field.fields?.map((child) => (
          <Field
            key={child.key}
            field={child}
            value={obj[child.key]}
            onChange={(next) => onChange({ ...obj, [child.key]: next })}
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
          <Label className="pt-2 text-lg text-foreground">{field.label}</Label>
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
    <div className={cn("space-y-1")}>
      {field.label && (
        <Label className="pl-1 text-xs text-muted-foreground">
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
}: {
  schema: ZodType
  value: unknown
  onChange: (next: unknown) => void
}) {
  const root = React.useMemo(() => normalize(schema), [schema])
  return <Field field={root} value={value} onChange={onChange} />
}
