import type { TemplateModule } from "@/templates/types"

import { meta } from "./meta"
import {
  contentSchema,
  defaultContent,
  type LumousMarkOneContent,
} from "./schema"
import { Template } from "./Template"

export const template: TemplateModule<LumousMarkOneContent> = {
  meta,
  contentSchema,
  defaultContent,
  Template,
}
