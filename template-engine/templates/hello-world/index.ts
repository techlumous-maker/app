import type { TemplateModule } from "@/templates/types"

import { meta } from "./meta"
import { defaultContent, type HelloWorldContent } from "./schema"
import { Template } from "./Template"

export const helloWorld: TemplateModule<HelloWorldContent> = {
  meta,
  defaultContent,
  Template,
}
