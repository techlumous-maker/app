# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Version control policy

Do not run `git commit`, `git push`, `git merge`, or open a PR on your own
initiative in this repository, even when a prompt asks for or implies a code
change — this overrides any default (including a background/autonomous
session's default of committing and pushing without asking). Prepare and show
the change, then stop and wait for the user's explicit, separate instruction
to commit, push, or open a PR. A prior instruction to make a change is not
itself authorization to commit or push it. This applies to any AI assistant
working in this repo, not only Claude.

## Worktree policy

Do not use the EnterWorktree tool (or otherwise create a separate git
worktree) on your own initiative for a code change. Ask first whether to
create a worktree or continue directly in the current branch/repo — do not
default to isolating automatically, including under a background/autonomous
session's default of isolating before every change. Rely on the user's own
prompt to say when a worktree is wanted; in most cases none is, so do not
assume one is needed unless the user says so. When a worktree is created,
name it after the change using this repo's existing branch-prefix convention
(`feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`, `ui/`, `design/`,
`mig/`, `agent/`) rather than a generic "worktree" label — note that the
EnterWorktree tool itself still prefixes the underlying branch name with
`worktree-`, which cannot be changed from here, so this only controls the
segment after that prefix.

## Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # TypeScript type check (no emit)
npm run format     # Prettier format all .ts/.tsx files
```

## Architecture

Next.js 16 App Router project with React 19, TypeScript (strict mode), Tailwind CSS v4, and shadcn/ui.

**Key conventions:**
- Path alias `@/` maps to the repo root
- UI components live in `components/ui/` — added via `npx shadcn@latest add <component>`
- `lib/utils.ts` exports `cn()` (clsx + tailwind-merge) — always use it for conditional class names
- Tailwind classes should pass through `cn()` or `cva()` so `prettier-plugin-tailwindcss` sorts them correctly (configured in `.prettierrc` via `tailwindFunctions`)

**Styling:**
- Design tokens are CSS custom properties defined in `app/globals.css` using `oklch()` color values
- Dark mode uses the `.dark` class variant (`@custom-variant dark (&:is(.dark *))`); toggled by pressing `d` (implemented in `components/theme-provider.tsx`)
- Fonts: `Inter` → `--font-sans`, `Manrope` → `--font-heading`, `Geist Mono` → `--font-mono`

**Component pattern:**
- `components/ui/` components wrap `@base-ui/react` primitives with `cva` variants and the `cn` utility
- Icons come from `@phosphor-icons/react`

**Prettier config (`.prettierrc`):** no semicolons, double quotes, 2-space indent, LF line endings, trailing commas (ES5).
