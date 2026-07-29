import { z } from "zod"
import { deploymentStatuses } from "@/types/deployment"

const deploymentStatusSchema = z.enum(deploymentStatuses)

export const projectSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  template_id: z.uuid().nullable(),
  name: z.string(),
  content: z.record(z.string(), z.unknown()).nullable(),
  status: z.string().nullable(),
  vercel_project_id: z.string().nullable(),
  deployment_url: z.string().nullable(),
  deploy_status: deploymentStatusSchema.nullable(),
  deploy_error: z.string().nullable(),
  deployed_content_hash: z.string().nullable(),
  last_deployed_at: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
})

export const insertProjectSchema = z.object({
  name: z.string().min(1),
  template_id: z.uuid().nullable().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  status: z.string().optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  template_id: z.uuid().nullable().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  status: z.string().optional(),
})

export type Project = z.infer<typeof projectSchema>
export type InsertProject = z.infer<typeof insertProjectSchema>
export type UpdateProject = z.infer<typeof updateProjectSchema>
