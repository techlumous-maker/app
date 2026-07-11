"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import type { WidgetId, WidgetProps } from "./types"

type LeafWidget = Exclude<WidgetId, "group" | "array">

function TextWidget({ value, onChange, field }: WidgetProps) {
  return (
    <Input
      value={String(value ?? "")}
      placeholder={field.label}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function TextareaWidget({ value, onChange, field }: WidgetProps) {
  return (
    <Textarea
      value={String(value ?? "")}
      placeholder={field.label}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function UrlWidget({ value, onChange, field }: WidgetProps) {
  return (
    <Input
      type="url"
      value={String(value ?? "")}
      placeholder={field.label}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function SelectWidget({ value, onChange, field }: WidgetProps) {
  return (
    <Select
      value={String(value ?? "")}
      onValueChange={(next) => onChange(next)}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {field.options?.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export const widgets: Record<
  LeafWidget,
  (props: WidgetProps) => React.ReactNode
> = {
  text: TextWidget,
  textarea: TextareaWidget,
  url: UrlWidget,
  select: SelectWidget,
}
