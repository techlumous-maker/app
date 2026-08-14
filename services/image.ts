import "server-only"

import { createHash } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

import { normalize } from "@/lib/schema-form/normalize"
import { resolveWidget } from "@/lib/schema-form/resolver"
import type { FieldDescriptor } from "@/lib/schema-form/types"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { getTemplateContentSchema } from "@/templates/schema-registry"

import { getProject } from "./project"
import { getTemplateById } from "./template"

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET ?? "project-images"
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const STORAGE_LIST_PAGE_SIZE = 1000
const MAX_STORAGE_LIST_PAGES = 100
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
])

function imageField(schema: Parameters<typeof normalize>[0], path: string[]) {
  let field: FieldDescriptor | undefined = normalize(schema)

  for (const segment of path) {
    if (field.kind === "object") {
      field = field.fields?.find((child) => child.key === segment)
    } else if (field.kind === "array" && /^\d+$/.test(segment)) {
      field = field.item
    } else {
      field = undefined
    }

    if (!field) return null
  }

  return resolveWidget(field) === "image" ? field : null
}

function valueAtPath(value: unknown, path: string[]): unknown {
  return path.reduce<unknown>((current, segment) => {
    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      return current[Number(segment)]
    }

    if (typeof current === "object" && current !== null) {
      return (current as Record<string, unknown>)[segment]
    }

    return undefined
  }, value)
}

function storagePath(url: string): string | null {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname)
    const marker = `/storage/v1/object/public/${BUCKET}/`
    return pathname.startsWith(marker) ? pathname.slice(marker.length) : null
  } catch {
    return null
  }
}

function collectStoragePaths(value: unknown, paths = new Set<string>()) {
  if (typeof value === "string") {
    const path = storagePath(value)
    if (path) paths.add(path)
    return paths
  }

  if (Array.isArray(value)) {
    for (const item of value) collectStoragePaths(item, paths)
    return paths
  }

  if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) collectStoragePaths(item, paths)
  }

  return paths
}

function fieldFolder(userId: string, projectId: string, fieldPath: string[]) {
  const fieldId = createHash("sha256")
    .update(JSON.stringify(fieldPath))
    .digest("hex")
    .slice(0, 24)

  return `${userId}/${projectId}/${fieldId}`
}

function uploadSlot(publishedUrl: unknown, folder: string) {
  if (typeof publishedUrl !== "string") return "a"
  return storagePath(publishedUrl) === `${folder}/a` ? "b" : "a"
}

export async function uploadProjectImage(
  projectId: string,
  fieldPath: string[],
  file: File
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Upload a PNG, JPG, WebP, or AVIF image")
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image must be 5 MB or smaller")
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims.sub
  if (!userId) throw new Error("You must be authenticated to upload an image")

  const project = await getProject(projectId)
  if (!project || project.user_id !== userId || !project.template_id) {
    throw new Error("Project not found")
  }

  const template = await getTemplateById(project.template_id)
  const schema = template && getTemplateContentSchema(template.slug)
  if (!schema || !imageField(schema, fieldPath)) {
    throw new Error("Invalid image field")
  }

  const folder = fieldFolder(userId, project.id, fieldPath)
  const slot = uploadSlot(
    valueAtPath(project.published_content, fieldPath),
    folder
  )
  const path = `${folder}/${slot}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true,
  })

  if (error) throw new Error(`Failed to upload image: ${error.message}`)

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = new URL(publicUrl.publicUrl)
  url.searchParams.set("v", Date.now().toString())
  url.searchParams.set("name", file.name)
  return url.toString()
}

async function listProjectObjects(
  supabase: SupabaseClient,
  prefix: string
): Promise<{ path: string; modifiedAt: string | null }[]> {
  const objects: { path: string; modifiedAt: string | null }[] = []

  for (let page = 0; page < MAX_STORAGE_LIST_PAGES; page += 1) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: STORAGE_LIST_PAGE_SIZE,
      offset: page * STORAGE_LIST_PAGE_SIZE,
      sortBy: { column: "name", order: "asc" },
    })
    if (error)
      throw new Error(`Failed to list project images: ${error.message}`)

    for (const entry of data) {
      const path = `${prefix}/${entry.name}`
      if (entry.id) {
        objects.push({
          path,
          modifiedAt: entry.updated_at ?? entry.created_at,
        })
      } else {
        objects.push(...(await listProjectObjects(supabase, path)))
      }
    }

    if (data.length < STORAGE_LIST_PAGE_SIZE) return objects
  }

  throw new Error("Project image listing exceeded the safety limit")
}

export async function cleanupProjectImages(
  userId: string,
  projectId: string,
  publishedContent: unknown,
  modifiedBefore: Date
): Promise<void> {
  const supabase = await createAdminClient()
  const prefix = `${userId}/${projectId}`
  const referenced = collectStoragePaths(publishedContent)
  const stored = await listProjectObjects(supabase, prefix)
  const unused = stored
    .filter(
      (object) =>
        object.modifiedAt !== null &&
        new Date(object.modifiedAt) <= modifiedBefore &&
        !referenced.has(object.path)
    )
    .map((object) => object.path)

  for (let index = 0; index < unused.length; index += 1000) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove(unused.slice(index, index + 1000))
    if (error) {
      throw new Error(`Failed to clean up project images: ${error.message}`)
    }
  }
}
