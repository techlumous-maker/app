export const TEMPLATE_CATEGORIES = [
  "portfolio",
  "landing",
  "ecommerce",
  "blog",
  "saas",
  "resume",
  "docs",
  "starter", // dev scaffolds / examples — usually status: "draft"
] as const

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]

export const SUGGESTED_TAGS = [
  // style
  "dark",
  "light",
  "minimal",
  "bold",
  "animated",
  "gradient",
  // layout
  "one-page",
  "multi-page",
  "sidebar",
  // industry / audience
  "agency",
  "photography",
  "developer",
  "startup",
  "personal",
  // feature
  "contact-form",
  "gallery",
  "pricing",
  "cta",
] as const

export type SuggestedTag = (typeof SUGGESTED_TAGS)[number]
