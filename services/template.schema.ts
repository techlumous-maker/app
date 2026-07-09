import { z } from "zod"

// Mirrors public.templates — a projection of each template's meta.ts (minus
// `status`) plus its defaultContent. All columns are NOT NULL in the DB.
// `default_content` holds the template's `defaultContent`, whose shape varies
// per template, so it stays a loose record at the service layer.
export const templateSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  version: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  description: z.string(),
  thumbnail: z.string(),
  default_content: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Template = z.infer<typeof templateSchema>
