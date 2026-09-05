# AGENTS.md

## Version control policy

Any AI coding assistant working in this repository — Claude, Codex, or any
other — must not run `git commit`, `git push`, `git merge`, or open a PR on
its own initiative, even when a prompt asks for or implies a code change.
Implementing an edit and persisting it in git are separate steps: prepare and
show the change, then stop and wait for the user's explicit, separate
instruction to commit, push, or open a PR. A prior instruction to make a
change is not itself authorization to commit or push it.

## Worktree policy

Do not create a separate git worktree (or other isolated workspace copy) on
your own initiative for a code change. Ask first whether to create a worktree
or continue directly in the current branch/repo — do not default to
isolating automatically, including under any autonomous or background
session's default of isolating before every change. Rely on the user's own
prompt to say when a worktree is wanted; in most cases none is, so do not
assume one is needed unless the user says so. When a worktree is created,
name/branch it after the change using this repo's existing branch-prefix
convention (`feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`, `ui/`,
`design/`, `mig/`, `agent/`) rather than a generic "worktree" label.

## Project overview

This is a Next.js 16 App Router project using React 19, TypeScript in strict mode, Tailwind CSS v4, and shadcn/ui.

## Commands

```bash
npm run dev        # Start the development server
npm run build      # Create a production build
npm run lint       # Run ESLint
npm run typecheck  # Run the TypeScript checker without emitting files
npm run format     # Format all TypeScript and TSX files with Prettier
```

## Architecture and conventions

- The `@/` path alias maps to the repository root.
- UI components live in `components/ui/`. Add shadcn components with `npx shadcn@latest add <component>`.
- Use the `cn()` helper from `lib/utils.ts` for conditional class names.
- Pass Tailwind classes through `cn()` or `cva()` so `prettier-plugin-tailwindcss` can sort them.
- Components in `components/ui/` wrap `@base-ui/react` primitives and use `cva` variants with `cn()`.
- Use icons from `@phosphor-icons/react`.

## Styling

- Design tokens are CSS custom properties in `app/globals.css` and use `oklch()` color values.
- Dark mode uses the `.dark` class variant: `@custom-variant dark (&:is(.dark *))`.
- The theme is toggled by pressing `d`; this behavior is implemented in `components/theme-provider.tsx`.
- Font variables:
  - Inter: `--font-sans`
  - Manrope: `--font-heading`
  - Geist Mono: `--font-mono`

## Formatting

Follow `.prettierrc`:

- No semicolons
- Double quotes
- 2-space indentation
- LF line endings
- Trailing commas where valid in ES5

## Validation

For code changes, run the checks relevant to the files touched. Prefer at least `npm run lint` and `npm run typecheck`; run `npm run build` when changes may affect production compilation or routing.
