import type { ZodType } from "zod"

import { contentSchema as helloWorldSchema } from "./hello-world/schema"
import { contentSchema as lumousMarkOneSchema } from "./lumous-mark-one/schema"

const templateContentSchemas: Record<string, ZodType> = {
  "hello-world": helloWorldSchema,
  "lumous-mark-one": lumousMarkOneSchema,
}

export function getTemplateContentSchema(slug: string): ZodType | undefined {
  return templateContentSchemas[slug]
}
