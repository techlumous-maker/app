# Template Engine

A lightweight Next.js app that renders **one** template into a published site.
It owns the shared `templates/` library and acts as the renderer for published
sites.

The template is chosen at build time by the `TEMPLATE_SLUG` environment
variable. The site's content lives in Supabase and is fetched at runtime with
ISR (`revalidate = 60`), so content edits in the studio go live within a
minute — **no redeploy**.

## Layout

```
template-engine/
  templates/        ← the shared template library (single source of truth)
    registry.ts     ← slug -> template module
    types.ts
    hello-world/    ← meta.ts, schema.ts, Template.tsx, index.ts
  lib/
    content.ts      ← fetches the site's published content from Supabase
  app/
    page.tsx        ← reads TEMPLATE_SLUG, renders that template with content
    layout.tsx
    globals.css
  next.config.ts    ← pins turbopack.root to this folder
```

## How it works

- `templates/` lives **inside** this app, so the build compiles it with plain
  Turbopack — no copy, no webpack, no external-dir workaround.
- `app/page.tsx` reads `TEMPLATE_SLUG`, looks the template up in the registry,
  fetches the site's content via `lib/content.ts`, and renders the template.
- Content comes from the `site` table in Supabase, addressed by env pointers:
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SITE_ID`. The anon key is public by
  design; RLS lets it read **only published rows**, and column grants restrict
  it to the content columns.
- Failure semantics: if the env pointers are absent (local dev) the template
  renders its `defaultContent`. If they are present but the fetch fails, the
  page **throws** — at build time the deploy fails loudly, at runtime a failed
  ISR regeneration keeps serving the last good page. A live site never
  silently renders defaults.
- `next.config.ts` pins `turbopack.root` to this folder, so the surrounding
  studio app's root files (e.g. `proxy.ts`) are never pulled into the build.

## Shared with the studio

The studio app (repo root) imports the same registry directly — its
`@/templates/*` alias points at `./template-engine/templates/*`. Because this
folder sits inside the studio's directory, that import resolves normally. One
source of truth, no duplication.

## Deployment

The studio deploys this app **as source** to the user's Vercel account via the
file-upload API (`lib/vercel/collect-files.ts` + `lib/vercel/deploy.ts` in the
repo root) — no Git connection; Vercel runs the build. Only the selected
template's folder is uploaded, along with a generated single-template
`registry.ts`. The env pointers above are passed per deployment.

## Usage

```bash
# 1. Install this app's own (minimal) dependencies — once
npm install

# 2. Configure (all Supabase vars optional locally — defaults render instead)
cp .env.example .env.local

# 3. Run locally
npm run dev

# 4. Or build the same way Vercel does
npm run build
```

## Adding templates

Create a folder under `templates/` with `meta.ts`, `schema.ts`, `Template.tsx`,
and an `index.ts` that exports `template: TemplateModule<...>` (the uniform
export name is required — the deploy pipeline generates a single-template
registry from it). Register it in `templates/registry.ts`; the studio picks it
up automatically. An unknown `TEMPLATE_SLUG` fails the build with a message
listing the valid slugs.
