import type { ReactElement } from "react"

import type { TemplateCategory } from "./taxonomy"

export interface TemplateMeta {
  slug: string
  name: string
  version: string
  category: TemplateCategory
  tags: string[]
  description: string
  thumbnail: string

  status: "published" | "draft" | "deprecated"
}

export type TemplateComponent<TContent> = (props: {
  content: TContent
}) => ReactElement

export interface TemplateModule<TContent = unknown> {
  meta: TemplateMeta
  defaultContent: TContent
  Template: TemplateComponent<TContent>
}
