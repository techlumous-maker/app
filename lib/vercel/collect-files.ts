import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

import ignore from "ignore"

import type { DeployFile } from "./deploy"

// Collects the template-engine source for a Vercel file-upload deployment:
// everything in template-engine/ except files matched by its .gitignore, and
// only the selected template's folder. The shared registry.ts is replaced by
// a generated single-template registry so the build never references
// templates that weren't uploaded.

const SLUG_PATTERN = /^[a-z0-9-]+$/

export interface CollectEngineFilesParams {
  /** Template folder under templates/ to include (default "hello-world") */
  templateSlug?: string
  /** Absolute path to the template-engine folder (default: <cwd>/template-engine) */
  engineDir?: string
}

// Mirrors the shape of template-engine/templates/registry.ts, importing only
// the selected template. Relies on every template exporting `template`.
const registrySource = (
  slug: string
) => `import type { TemplateModule } from "@/templates/types"

import { template } from "./${slug}"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTemplateModule = TemplateModule<any>

export const templates: Record<string, AnyTemplateModule> = {
  [template.meta.slug]: template,
}

export function getTemplate(slug: string): AnyTemplateModule | undefined {
  return templates[slug]
}

export function listTemplates(): AnyTemplateModule[] {
  return Object.values(templates)
}
`

export async function collectEngineFiles(
  params: CollectEngineFilesParams = {}
): Promise<DeployFile[]> {
  const slug = params.templateSlug ?? "hello-world"
  const engineDir =
    params.engineDir ?? path.join(process.cwd(), "template-engine")

  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`Invalid template slug "${slug}"`)
  }

  const gitignore = await readFile(path.join(engineDir, ".gitignore"), "utf8")
  const ig = ignore().add(gitignore)

  // Fail fast if the selected template doesn't exist.
  try {
    await readFile(path.join(engineDir, "templates", slug, "index.ts"))
  } catch {
    throw new Error(
      `Template "${slug}" not found in ${path.join(engineDir, "templates")}`
    )
  }

  const files: DeployFile[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const abs = path.join(dir, entry.name)
      const rel = path.relative(engineDir, abs).split(path.sep).join("/")

      if (entry.isDirectory()) {
        // Prune ignored dirs (node_modules, .next) before descending.
        if (ig.ignores(`${rel}/`)) continue
        // Skip every template folder except the selected one.
        const segments = rel.split("/")
        if (
          segments[0] === "templates" &&
          segments.length === 2 &&
          segments[1] !== slug
        ) {
          continue
        }
        await walk(abs)
        continue
      }

      if (ig.ignores(rel)) continue
      // The shared registry imports all templates; replaced by a generated one.
      if (rel === "templates/registry.ts") continue

      files.push({ file: rel, data: await readFile(abs) })
    }
  }

  await walk(engineDir)

  files.push({ file: "templates/registry.ts", data: registrySource(slug) })

  return files.sort((a, b) => a.file.localeCompare(b.file))
}
