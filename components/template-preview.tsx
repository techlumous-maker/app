"use client"

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ForwardedRef,
} from "react"

export interface TemplateRendererProps extends Omit<
  ComponentPropsWithoutRef<"iframe">,
  "src" | "title"
> {
  slug: string
  name: string
  title?: string
}

export const TemplateRenderer = forwardRef(function TemplateRenderer(
  { slug, name, title, ...iframeProps }: TemplateRendererProps,
  ref: ForwardedRef<HTMLIFrameElement>
) {
  return (
    <iframe
      {...iframeProps}
      ref={ref}
      title={title ?? `${name} preview`}
      src={`/render/${slug}`}
    />
  )
})

TemplateRenderer.displayName = "TemplateRenderer"
