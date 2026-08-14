"use server"

import { z } from "zod"

import { uploadProjectImage } from "@/services/image"

const uploadImageSchema = z.object({
  projectId: z.uuid(),
  fieldPath: z.array(z.string().min(1)).min(1),
})

export async function uploadProjectImageAction(
  projectId: string,
  fieldPath: string[],
  formData: FormData
): Promise<
  { status: "success"; url: string } | { status: "error"; message: string }
> {
  const parsed = uploadImageSchema.safeParse({ projectId, fieldPath })
  if (!parsed.success) {
    return { status: "error", message: "Invalid image upload" }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose an image to upload" }
  }

  try {
    const url = await uploadProjectImage(
      parsed.data.projectId,
      parsed.data.fieldPath,
      file
    )
    return { status: "success", url }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload image"
    console.error("Failed to upload project image", error)
    return { status: "error", message }
  }
}
