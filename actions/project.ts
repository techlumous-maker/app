"use server"

import { revalidatePath } from "next/cache"

import { createProject } from "@/services/project"
import { insertProjectSchema } from "@/services/project.schema"
import { CreateProjectState } from "@/types/project"

// Server action invoked on project-creation form submit. Validates the user
// input against insertProjectSchema, creates the row, and revalidates the
// projects page so the new project shows up without a manual refresh.
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
