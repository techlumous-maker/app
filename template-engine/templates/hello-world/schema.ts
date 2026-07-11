import { z } from "zod"

// The Zod schema is the single source of truth: it drives both the content
// type (via z.infer) and the generated edit form. `.meta()` carries UI intent
// — the schema-form engine reads `label` / `widget` / `format` to pick a widget,
// falling back to structural defaults when they are absent.
export const contentSchema = z.object({
  landingPage: z.object({
    message: z.string().meta({ label: "Headline" }),
    tagline: z.string().meta({ label: "Tagline", widget: "textarea" }),
  }),
  theme: z.enum(["dark", "light"]).meta({ label: "Theme" }),
  ctaLabel: z.string().meta({ label: "Button label" }),
  ctaUrl: z.string().meta({ label: "Button URL", format: "url" }),
  links: z
    .array(
      z.object({
        label: z.string().meta({ label: "Label" }),
        href: z.string().meta({ label: "URL", format: "url" }),
      })
    )
    .meta({ label: "Footer links" }),
})

export type HelloWorldContent = z.infer<typeof contentSchema>

export const defaultContent: HelloWorldContent = {
  landingPage: {
    message: "Hello World",
    tagline: "A bare starter template used to smoke-test the render pipeline.",
  },
  theme: "dark",
  ctaLabel: "Get started",
  ctaUrl: "https://example.com",
  links: [
    { label: "Docs", href: "https://example.com/docs" },
    { label: "GitHub", href: "https://github.com" },
  ],
}
