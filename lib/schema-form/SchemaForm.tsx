"use client"

import * as React from "react"
import type { ZodType } from "zod"
import { PlusIcon, TrashIcon } from "@phosphor-icons/react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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

function schemaGroupStyle(level: number): React.CSSProperties | undefined {
  if (level === 0) return undefined

  return {
    backgroundColor: "var(--editor-nested-group-overlay)",
  }
}

interface FieldProps {
  field: FieldDescriptor
  fieldPath?: string[]
  projectId?: string
  value: unknown
  onChange: (next: unknown) => void
  layout?: SchemaFieldLayout
  className?: string
  trailingAction?: React.ReactNode
  groupLevel?: number
  isRoot?: boolean
}

export type SchemaFieldLayout = "above" | "beside"

export function Field({
  field,
  fieldPath = [],
  projectId,
  value,
  onChange,
  layout = "above",
  className = "",
  trailingAction,
  groupLevel = 0,
  isRoot = false,
}: FieldProps) {
  const widget = resolveWidget(field)

  if (widget === "group") {
    const obj = (value ?? {}) as Record<string, unknown>
    const isVisibleGroup = !isRoot && Boolean(field.label)
    const childGroupLevel = isVisibleGroup ? groupLevel + 1 : groupLevel
    const fields = (
      <>
        {field.fields?.map((child, index) => (
          <Field
            key={child.key}
            field={child}
            fieldPath={[...fieldPath, child.key]}
            projectId={projectId}
            value={obj[child.key]}
            onChange={(next) => onChange({ ...obj, [child.key]: next })}
            layout={child.labelLayout ?? layout}
            groupLevel={childGroupLevel}
            trailingAction={
              !isVisibleGroup && index === 0 ? trailingAction : undefined
            }
          />
        ))}
      </>
    )

    if (!isVisibleGroup) {
      return (
        <div className="flex flex-col last:mb-1">
          {fields}
          {!field.fields?.length && trailingAction && (
            <div className="flex h-7 items-center justify-end px-1">
              {trailingAction}
            </div>
          )}
        </div>
      )
    }

    return (
      <Accordion variant="schema" defaultValue={[field.key]}>
        <AccordionItem
          variant="schema"
          value={field.key}
          style={schemaGroupStyle(groupLevel)}
        >
          <AccordionTrigger
            className="px-3"
            variant="schema"
            action={trailingAction}
          >
            {field.label}
          </AccordionTrigger>
          <AccordionContent variant="schema" className="last:mb-1">
            {fields}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )
  }

  if (widget === "array") {
    const arr = (value ?? []) as unknown[]
    const item = field.item
    const label = field.label ?? "Items"

    return (
      <Accordion variant="schema" defaultValue={[field.key]}>
        <AccordionItem
          variant="schema"
          value={field.key}
          style={schemaGroupStyle(groupLevel)}
        >
          <AccordionTrigger
            variant="schema"
            className="px-3"
            action={
              item || trailingAction ? (
                <div className="flex items-center">
                  {item && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Add ${label} item`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onChange([...arr, blankValue(item)])
                      }}
                      className="rounded-none text-muted-foreground hover:text-foreground"
                    >
                      <PlusIcon />
                    </Button>
                  )}
                  {trailingAction}
                </div>
              ) : null
            }
          >
            <span className="flex-1">{label}</span>
          </AccordionTrigger>
          <AccordionContent variant="schema" className="last:mb-1">
            <div className="flex flex-col gap-1">
              {arr.map((entry, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <Separator className="mx-3 data-horizontal:w-auto" />
                  )}
                  <div className="relative">
                    {item && (
                      <Field
                        field={item}
                        fieldPath={[...fieldPath, String(index)]}
                        projectId={projectId}
                        value={entry}
                        onChange={(next) =>
                          onChange(
                            arr.map((it, i) => (i === index ? next : it))
                          )
                        }
                        layout={field.labelLayout ?? layout}
                        groupLevel={groupLevel + 1}
                        trailingAction={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Remove item"
                            onClick={() =>
                              onChange(arr.filter((_, i) => i !== index))
                            }
                            className="rounded-none text-foreground/40! hover:bg-destructive/5! hover:text-destructive!"
                          >
                            <TrashIcon />
                          </Button>
                        }
                      />
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )
  }

  const Widget = widgets[widget] ?? widgets.text
  const labelLayout = field.labelLayout ?? layout
  return (
    <div
      className={cn(
        "relative px-3 py-1",
        className,
        labelLayout === "above" || !field.label
          ? "space-y-1"
          : "grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-2"
      )}
    >
      {field.label && (
        <Label
          className={cn(
            "pl-1 font-mono text-xs text-muted-foreground",
            labelLayout === "beside" && "self-start pt-1.5"
          )}
        >
          {field.label}
        </Label>
      )}
      <div className={cn("min-w-0", trailingAction && "pr-7")}>
        <Widget
          field={field}
          fieldPath={fieldPath}
          projectId={projectId}
          value={value}
          onChange={onChange}
        />
      </div>
      {trailingAction && (
        <div
          className={cn(
            "absolute right-1",
            labelLayout === "beside" ? "top-1/2 -translate-y-1/2" : "top-1"
          )}
        >
          {trailingAction}
        </div>
      )}
    </div>
  )
}

export function SchemaForm({
  schema,
  projectId,
  value,
  onChange,
  layout = "above",
}: {
  schema: ZodType
  projectId?: string
  value: unknown
  onChange: (next: unknown) => void
  layout?: SchemaFieldLayout
}) {
  const root = React.useMemo(() => normalize(schema), [schema])
  return (
    <Field
      field={root}
      projectId={projectId}
      value={value}
      onChange={onChange}
      layout={layout}
      isRoot
    />
  )
}
