export type WidgetId =
  | "text"
  | "textarea"
  | "url"
  | "select"
  | "group"
  | "array"

export interface FieldDescriptor {
  key: string
  label?: string
  kind: "string" | "number" | "boolean" | "object" | "array" | "enum"
  widget?: WidgetId
  format?: string
  options?: string[]
  fields?: FieldDescriptor[]
  item?: FieldDescriptor
}

export interface WidgetProps {
  field: FieldDescriptor
  value: unknown
  onChange: (next: unknown) => void
}
