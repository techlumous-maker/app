import type { TemplateModule } from "@/templates/types"

import { helloWorld } from "./hello-world"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTemplateModule = TemplateModule<any>

export const templates: Record<string, AnyTemplateModule> = {
  [helloWorld.meta.slug]: helloWorld,
}

export function getTemplate(slug: string): AnyTemplateModule | undefined {
  return templates[slug]
}

export function listTemplates(): AnyTemplateModule[] {
  return Object.values(templates)
}
