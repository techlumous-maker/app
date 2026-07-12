import { z } from "zod"

// The Zod schema is the single source of truth: it drives both the content type
// (via z.infer) and the generated edit form. `.meta()` carries UI intent — the
// schema-form engine reads `label` / `widget` / `format` to pick a widget,
// falling back to structural defaults when they are absent.

const navLink = z.object({
  label: z.string().meta({ label: "Label" }),
  href: z.string().meta({ label: "URL", format: "url" }),
})

const featureMeta = z.object({
  label: z.string().meta({ label: "Label" }),
  value: z.string().meta({ label: "Value" }),
})

const feature = z.object({
  title: z.string().meta({ label: "Title" }),
  body: z.string().meta({ label: "Body", widget: "textarea" }),
  meta: z.array(featureMeta).meta({ label: "Meta" }),
})

const footerLink = z.object({
  label: z.string().meta({ label: "Label" }),
  href: z.string().meta({ label: "URL", format: "url" }),
})

const footerColumn = z.object({
  title: z.string().meta({ label: "Title" }),
  items: z.array(footerLink).meta({ label: "Items" }),
})

export const contentSchema = z.object({
  brand: z.string().meta({ label: "Brand" }),
  nav: z.array(navLink).meta({ label: "Nav links" }),
  hero: z
    .object({
      eyebrow: z.string().meta({ label: "Eyebrow" }),
      headlineTop: z.string().meta({ label: "Headline — top" }),
      headlineMid: z.string().meta({ label: "Headline — mid" }),
      headlineHighlight: z.string().meta({ label: "Headline — highlight" }),
      headlineEnd: z.string().meta({ label: "Headline — end" }),
      badgeText: z.string().meta({ label: "Badge text" }),
      // Up to 3 short strings, rendered joined by "·". Modeled as a bounded
      // array (not a tuple union) so the form renders it as an add/remove list.
      badgeMeta: z
        .array(z.string())
        .min(1)
        .max(3)
        .meta({ label: "Badge meta" }),
    })
    .meta({ label: "Hero" }),
  features: z
    .object({
      eyebrow: z.string().meta({ label: "Eyebrow" }),
      items: z.array(feature).meta({ label: "Items" }),
    })
    .meta({ label: "Features" }),
  about: z
    .object({
      eyebrow: z.string().meta({ label: "Eyebrow" }),
      statement: z.string().meta({ label: "Statement", widget: "textarea" }),
      statementMuted: z
        .string()
        .meta({ label: "Statement (muted)", widget: "textarea" }),
      imageUrl: z.string().meta({ label: "Image URL", format: "url" }),
      imageAlt: z.string().meta({ label: "Image alt" }),
    })
    .meta({ label: "About" }),
  contact: z
    .object({
      eyebrow: z.string().meta({ label: "Eyebrow" }),
      headline: z.string().meta({ label: "Headline" }),
      href: z.string().meta({ label: "URL", format: "url" }),
      contactLine: z.string().meta({ label: "Contact line" }),
    })
    .meta({ label: "Contact" }),
  footer: z
    .object({
      wordmark: z.string().meta({ label: "Wordmark" }),
      columns: z.array(footerColumn).meta({ label: "Columns" }),
      copyright: z.string().meta({ label: "Copyright" }),
      tagline: z.string().meta({ label: "Tagline" }),
    })
    .meta({ label: "Footer" }),
})

export type LumousMarkOneContent = z.infer<typeof contentSchema>

export const defaultContent: LumousMarkOneContent = {
  brand: "Lumous Mark",
  nav: [
    { label: "Instagram", href: "#" },
    { label: "LinkedIn", href: "#" },
  ],
  hero: {
    eyebrow: "Independent design studio — Est. 2016",
    headlineTop: "We build products",
    headlineMid: "that",
    headlineHighlight: "move",
    headlineEnd: "markets",
    badgeText: "Trusted by 2k+ product teams",
    badgeMeta: ["Strategy", "Design", "Engineering"],
  },
  features: {
    eyebrow: "What we do — 04 disciplines",
    items: [
      {
        title: "Brand Strategy",
        body: "We shape the story, positioning, and identity that make a product impossible to ignore — grounded in research, sharpened by taste.",
        meta: [
          { label: "Based in", value: "Remote — global" },
          { label: "Experience", value: "8+ yrs" },
        ],
      },
      {
        title: "Growth Marketing",
        body: "Full-funnel systems that turn attention into revenue — content, performance, and lifecycle engineered to compound.",
        meta: [
          { label: "Channels", value: "Owned + paid" },
          { label: "Focus", value: "Revenue, not vanity" },
        ],
      },
      {
        title: "Product Design",
        body: "Interfaces people feel before they understand — clarity, motion, and craft applied end to end across the experience.",
        meta: [
          { label: "Method", value: "Ship, learn, refine" },
          { label: "Tooling", value: "Design + code" },
        ],
      },
      {
        title: "Web Development",
        body: "Fast, resilient, accessible builds — hand-tuned front-end and pragmatic infrastructure that scales quietly in the background.",
        meta: [
          { label: "Stack", value: "Modern, boring, fast" },
          { label: "Perf", value: "100 Lighthouse" },
        ],
      },
    ],
  },
  about: {
    eyebrow: "Why teams choose us",
    statement:
      "We embed with founders and product leaders to turn ambitious ideas into shipped, category-defining products —",
    statementMuted:
      "from the first pixel to the launch that moves the number that matters.",
    imageUrl:
      "https://jspqdyqdbczgwyorxcvi.supabase.co/storage/v1/object/public/Techlumous%20Template/lumous-mark-one-image-1.jpg",
    imageAlt: "Studio at work",
  },
  contact: {
    eyebrow: "Have a project in mind?",
    headline: "Contact us",
    href: "#",
    contactLine: "hello@form.studio · +1 (415) 555-0148",
  },
  footer: {
    wordmark: "www.form.studio",
    columns: [
      {
        title: "What we do",
        items: [
          { label: "Brand Strategy", href: "#" },
          { label: "Growth Marketing", href: "#" },
          { label: "Product Design", href: "#" },
          { label: "Web Development", href: "#" },
        ],
      },
      {
        title: "Resources",
        items: [
          { label: "Case studies", href: "#" },
          { label: "Journal", href: "#" },
          { label: "Careers", href: "#" },
          { label: "Contact", href: "#" },
        ],
      },
      {
        title: "Address",
        items: [
          { label: "Remote — worldwide", href: "#" },
          { label: "hello@form.studio", href: "mailto:hello@form.studio" },
          { label: "+1 (415) 555-0148", href: "tel:+14155550148" },
        ],
      },
      {
        title: "Social",
        items: [
          { label: "Instagram", href: "#" },
          { label: "Dribbble", href: "#" },
          { label: "LinkedIn", href: "#" },
          { label: "X / Twitter", href: "#" },
        ],
      },
    ],
    copyright: "© 2026 Lumous Mark One — All rights reserved",
    tagline: "Made with intent, not templates",
  },
}
