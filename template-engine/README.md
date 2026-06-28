# Template Engine

A lightweight Next.js app that renders **one** template into a **static site**.
It owns the shared `templates/` library and acts as the renderer for published
sites.

The template is chosen at build time by the `TEMPLATE_SLUG` environment
variable. The output is a fully static export (no Node server) written to `out/`.

## Layout

```
template-engine/
  templates/        ← the shared template library (single source of truth)
    registry.ts     ← slug -> template module
    types.ts
    hello-world/    ← meta.ts, schema.ts, Template.tsx, index.ts
  app/
    page.tsx        ← reads TEMPLATE_SLUG, renders that template
    layout.tsx
    globals.css
  next.config.ts    ← output: "export"
```

## How it works

- `templates/` lives **inside** this app, so the static build compiles it with
  plain Turbopack — no copy, no webpack, no external-dir workaround.
- `app/page.tsx` reads `TEMPLATE_SLUG`, looks the template up in the registry,
  and renders it with its `defaultContent`.
- `next.config.ts` sets `output: "export"` and pins `turbopack.root` to this
  folder, so the surrounding studio app's root files (e.g. `proxy.ts`) are never
  pulled into the build.

## Shared with the studio

The studio app (repo root) imports the same registry directly — its
`@/templates/*` alias points at `./template-engine/templates/*`. Because this
folder sits inside the studio's directory, that import resolves normally. One
source of truth, no duplication.

## Usage

```bash
# 1. Install this app's own (minimal) dependencies — once
npm install

# 2. Pick a template (defaults to the first registered one if omitted)
echo "TEMPLATE_SLUG=hello-world" > .env.local

# 3. Build the static export -> ./out
npm run build

# 4. (optional) Preview the static output locally
npm run preview
```

Override the slug for a one-off build:

```bash
TEMPLATE_SLUG=hello-world npm run build
```

## Adding templates

Register a template in `templates/registry.ts`. It becomes buildable here by
setting `TEMPLATE_SLUG` to its slug — and the studio picks it up automatically.
An unknown slug fails the build with a message listing the valid slugs.
