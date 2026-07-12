# AGENTS.md

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
