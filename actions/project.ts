"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createProject, getProject, updateProject } from "@/services/project"
import { insertProjectSchema } from "@/services/project.schema"
import { CreateProjectState, SelectTemplateState } from "@/types/project"

const selectTemplateSchema = z.object({
  projectId: z.uuid(),
  templateId: z.uuid(),
})

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
