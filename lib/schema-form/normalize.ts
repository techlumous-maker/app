import type { ZodType } from "zod"

import type { FieldDescriptor, WidgetId } from "./types"

interface FieldMeta {
  label?: string
  widget?: WidgetId
  format?: string
}

export function normalize(schema: ZodType, key = ""): FieldDescriptor {
  const s = schema as any
  const meta = (s.meta?.() ?? {}) as FieldMeta
  const def = s.def
  const base = {
    key,
    label: meta.label,
    widget: meta.widget,
    format: meta.format,
  }

  switch (def.type as string) {
    case "object":
      return {
        ...base,
        kind: "object",
        fields: Object.entries(def.shape).map(([childKey, child]) =>
          normalize(child as ZodType, childKey)
        ),
      }
    case "array":
      return { ...base, kind: "array", item: normalize(def.element, "") }
    case "enum":
      return { ...base, kind: "enum", options: Object.values(def.entries) }
    case "number":
    case "int":
      return { ...base, kind: "number" }
    case "boolean":
      return { ...base, kind: "boolean" }
    case "optional":
    case "nullable":
    case "default":
    case "prefault":
    case "readonly": {
      const inner = normalize(def.innerType, key)
      return {
        ...inner,
        key,
        label: base.label ?? inner.label,
        widget: base.widget ?? inner.widget,
        format: base.format ?? inner.format,
      }
    }
    default:
      return { ...base, kind: "string" }
  }
}
