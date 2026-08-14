"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { VercelApiError } from "@/lib/vercel/api"
import { deleteProject as deleteVercelProject } from "@/lib/vercel/projects"
import {
  createProject,
  deleteProject,
  getProject,
  updateProject,
} from "@/services/project"
import { insertProjectSchema } from "@/services/project.schema"
import { getUserIntegrationByProvider } from "@/services/user-integration"
import { getVaultSecret } from "@/services/vault-secret"
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
  draftContent: z.record(z.string(), z.unknown()),
})

export type SaveProjectContentState =
  { status: "success"; message: string } | { status: "error"; message: string }

export async function saveProjectContentAction(
  projectId: string,
  content: unknown
): Promise<SaveProjectContentState> {
  const parsed = saveProjectContentSchema.safeParse({
    projectId,
    draftContent: content,
  })
  if (!parsed.success) {
    return { status: "error", message: "Invalid project content" }
  }

  try {
    await updateProject(parsed.data.projectId, {
      draft_content: parsed.data.draftContent,
    })
    revalidatePath(`/preview/${parsed.data.projectId}/edit`)
    revalidatePath("/")
    return { status: "success", message: "Draft saved" }
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
  return deleteProjectWithMode(projectId, true)
}

export async function deleteProjectFromAppAction(
  projectId: string
): Promise<DeleteProjectState> {
  return deleteProjectWithMode(projectId, false)
}

function clientSafeVercelDeleteError(error: VercelApiError): string {
  switch (error.status) {
    case 401:
    case 403:
      return "Vercel denied the deletion. Reconnect Vercel or check the token permissions."
    case 409:
      return "Vercel cannot delete this project while it is being transferred."
    case 429:
      return "Vercel's request limit was reached. Try again shortly."
    default:
      return error.status
        ? `Vercel could not delete the project (${error.status}${error.code ? `, ${error.code}` : ""}).`
        : "Vercel could not be reached, so the Vercel project may still exist."
  }
}

async function deleteProjectWithMode(
  projectId: string,
  deleteFromVercel: boolean
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
    const project = await getProject(parsed.data)
    if (!project || project.user_id !== userId) {
      return { status: "error", message: "Project not found" }
    }

    if (deleteFromVercel && project.vercel_project_id) {
      try {
        const integration = await getUserIntegrationByProvider({
          validateToken: false,
        })
        if (!integration || integration.user_id !== userId) {
          return {
            status: "vercel_error",
            message: "The connected Vercel account is not available.",
          }
        }

        const token = await getVaultSecret(integration.token)
        if (!token) {
          return {
            status: "vercel_error",
            message: "The connected Vercel credential is not available.",
          }
        }

        const teamId = integration.credentials?.team_id
        await deleteVercelProject({
          token,
          idOrName: project.vercel_project_id,
          teamId: typeof teamId === "string" ? teamId : undefined,
        })
      } catch (error) {
        // A missing Vercel project already satisfies the remote deletion.
        if (!(error instanceof VercelApiError && error.status === 404)) {
          console.error("Failed to delete Vercel project", error)
          return {
            status: "vercel_error",
            message:
              error instanceof VercelApiError
                ? clientSafeVercelDeleteError(error)
                : "Vercel deletion could not be completed, so the Vercel project may still exist.",
          }
        }
      }
    }

    await deleteProject(parsed.data, userId)
    revalidatePath("/")
    return {
      status: "success",
      message:
        deleteFromVercel && project.vercel_project_id
          ? "Project deleted from Techlumous and Vercel"
          : "Project deleted from Techlumous",
    }
  } catch (err) {
    console.error("Failed to delete project", err)
    return { status: "error", message: "Failed to delete project" }
  }
}
