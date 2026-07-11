# schema-form

Turn a Zod schema into a content edit form. You supply the schema + current
value; it renders the inputs and hands you the next value on every edit.

## Basic usage

```tsx
"use client"
import { useState } from "react"
import { SchemaForm } from "@/lib/schema-form"
import { contentSchema, defaultContent } from "@/templates/hello-world/schema"

export function Editor() {
  const [value, setValue] = useState(defaultContent)
  return <SchemaForm schema={contentSchema} value={value} onChange={setValue} />
}
```

`SchemaForm` is controlled: it holds no state of its own. Keep `value` in your
component and validate whenever you want with `contentSchema.safeParse(value)`.

## Choosing the input per field

Widget selection is driven by `.meta()` on the schema, resolved in this order
(first match wins):

```ts
z.object({
  title:   z.string().meta({ label: "Title" }),                    // -> text (default)
  bio:     z.string().meta({ label: "Bio", widget: "textarea" }),  // -> explicit widget
  site:    z.string().meta({ label: "Site", format: "url" }),      // -> url (semantic)
  theme:   z.enum(["dark", "light"]),                              // -> select (enum)
  links:   z.array(z.object({ /* ... */ })),                       // -> repeatable list
})
```

- `widget` — force a specific input (`"text" | "textarea" | "url" | "select"`).
- `format` — semantic hint (`"url"`); the resolver maps it to a widget.
- `label` — the field label. Omit it and the field renders with no label.
- Objects become groups, arrays become add/remove lists — automatically, no meta
  needed.

## Adding a new widget

1. Add its id to `WidgetId` in `types.ts`.
2. Register the component in `widgets.tsx` (receives `{ field, value, onChange }`).
3. (Optional) add a rule in `resolver.ts` to auto-select it from a `format`;
   skip this if authors will set `widget` explicitly.

The core (`SchemaForm`, `normalize`) never changes for a new leaf widget.

## Notes

- Client-only (`"use client"`) — it renders interactive inputs.
- Works with any Zod object schema; the type is yours via `z.infer`.
- Full design rationale: `docs/schema-form.md`.
```
