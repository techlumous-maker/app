import type { FieldDescriptor, WidgetId } from "./types"

type Rule = (field: FieldDescriptor) => WidgetId | null

const rules: Rule[] = [
  (f) => f.widget ?? null,
  (f) => (f.format === "url" ? "url" : null),
  (f) => (f.kind === "enum" ? "select" : null),
  (f) => (f.kind === "object" ? "group" : null),
  (f) => (f.kind === "array" ? "array" : null),
  () => "text",
]

export function resolveWidget(field: FieldDescriptor): WidgetId {
  for (const rule of rules) {
    const hit = rule(field)
    if (hit) return hit
  }
  return "text"
}
