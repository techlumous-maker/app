import type { ReactElement } from "react"

export interface TemplateMeta {
  slug: string
  name: string
  type: string
}

export type TemplateComponent<TContent> = (props: {
  content: TContent
}) => ReactElement

export interface TemplateModule<TContent = unknown> {
  meta: TemplateMeta
  defaultContent: TContent
  Template: TemplateComponent<TContent>
}
