"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import {
  createProject,
  deleteProject,
  getProject,
  updateProject,
} from "@/services/project"
import { insertProjectSchema } from "@/services/project.schema"
import {
  CreateProjectState,
  SelectTemplateState,
  DeleteProjectState,
} from "@/types/project"

const selectTemplateSchema = z.object({
  projectId: z.uuid(),
  templateId: z.uuid(),
})

const saveProjectContentSchema = z.object({
  projectId: z.uuid(),
  content: z.record(z.string(), z.unknown()),
})

export type SaveProjectContentState =
  { status: "success"; message: string } | { status: "error"; message: string }

export async function saveProjectContentAction(
  projectId: string,
  content: unknown
): Promise<SaveProjectContentState> {
  const parsed = saveProjectContentSchema.safeParse({ projectId, content })
  if (!parsed.success) {
    return { status: "error", message: "Invalid project content" }
  }

  try {
    await updateProject(parsed.data.projectId, { content: parsed.data.content })
    revalidatePath(`/preview/${parsed.data.projectId}/edit`)
    revalidatePath("/")
    return { status: "success", message: "Content saved" }
  } catch (err) {
    console.error("Failed to save project content", err)
    return {
      status: "error",
      message: "Failed to save content",
    }
  }
}

export async function createProjectAction(
  _prevState: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  const templateId = String(formData.get("template_id") ?? "").trim()

  const parsed = insertProjectSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    // The schema validates template_id as a UUID, so an empty field must be
    // omitted rather than sent as "".
    ...(templateId ? { template_id: templateId } : {}),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form")
      fieldErrors[key] ??= issue.message
    }
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    }
  }

  try {
    const project = await createProject(parsed.data)
    revalidatePath("/")
    return {
      status: "success",
      message: `Project "${project.name}" created`,
    }
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to create project",
    }
  }
}

export async function selectTemplateAction(
  projectId: string,
  templateId: string
): Promise<SelectTemplateState> {
  const parsed = selectTemplateSchema.safeParse({ projectId, templateId })
  if (!parsed.success) {
    return { status: "error", message: "Invalid project or template" }
  }

  try {
    const project = await getProject(parsed.data.projectId)
    if (!project) {
      return { status: "error", message: "Project not found" }
    }

    if (project.template_id) {
      return {
        status: "error",
        message: "Template already selected for this project",
      }
    }

    await updateProject(parsed.data.projectId, {
      template_id: parsed.data.templateId,
    })

    revalidatePath("/")
    return { status: "success", message: "Template selected" }
  } catch (err) {
    console.error("Failed to select template", err)
    return {
      status: "error",
      message: "Failed to select template",
    }
  }
}

export async function deleteProjectAction(
  projectId: string
): Promise<DeleteProjectState> {
  const parsed = z.uuid().safeParse(projectId)
  if (!parsed.success) {
    return { status: "error", message: "Invalid project" }
  }

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims.sub

  if (!userId) {
    return {
      status: "error",
      message: "You must be authenticated to delete a project",
    }
  }

  try {
    await deleteProject(parsed.data, userId)
    revalidatePath("/")
    return { status: "success", message: "Project deleted" }
  } catch (err) {
    console.error("Failed to delete project", err)
    return { status: "error", message: "Failed to delete project" }
  }
}
