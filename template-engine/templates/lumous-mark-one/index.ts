import type { TemplateModule } from "@/templates/types"

import { meta } from "./meta"
import { defaultContent, type LumousMarkOneContent } from "./schema"
import { Template } from "./Template"

// Every template exports `template` — the uniform name lets the deploy
// pipeline generate a single-template registry from just the slug.
export const template: TemplateModule<LumousMarkOneContent> = {
  meta,
  defaultContent,
  Template,
}
