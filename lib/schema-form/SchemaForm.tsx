"use client"

import * as React from "react"
import type { ZodType } from "zod"
import { PlusIcon, TrashIcon } from "@phosphor-icons/react"

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
      <fieldset className="space-y-3">
        {field.label && (
          <legend className="text-sm font-medium text-foreground">
            {field.label}
          </legend>
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
      <div className="space-y-2">
        {field.label && (
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
        )}
        {arr.map((entry, index) => (
          <div
            key={index}
            className="flex items-start gap-2 rounded-md border border-border/60 p-3"
          >
            <div className="flex-1">
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
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove item"
              onClick={() => onChange(arr.filter((_, i) => i !== index))}
            >
              <TrashIcon />
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
        <Label className="text-xs text-muted-foreground">{field.label}</Label>
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
  console.log("SchemaForm", root)
  return <Field field={root} value={value} onChange={onChange} />
}
