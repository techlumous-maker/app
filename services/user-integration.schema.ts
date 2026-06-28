import { z } from "zod"

export const integrationStatusSchema = z.enum([
  "CONNECTED",
  "DISCONNECTED",
  "PENDING",
])

export const userIntegrationSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  provider: z.string().nullable(),
  token: z.uuid(),
  status: integrationStatusSchema.nullable(),
  created_at: z.string().nullable(),
  update_at: z.string().nullable(),
  credentials: z.record(z.string(), z.unknown()).nullable(),
})

export const insertUserIntegrationSchema = z.object({
  user_id: z.uuid().optional(),
  provider: z.string().optional(),
  token: z.uuid(),
  status: integrationStatusSchema.default("PENDING"),
  credentials: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const updateUserIntegrationSchema = z.object({
  user_id: z.uuid().optional(),
  provider: z.string().optional(),
  token: z.uuid().optional(),
  status: integrationStatusSchema.optional(),
  credentials: z.record(z.string(), z.unknown()).nullable().optional(),
})

export type IntegrationStatus = z.infer<typeof integrationStatusSchema>
export type UserIntegration = z.infer<typeof userIntegrationSchema>
export type InsertUserIntegration = z.infer<typeof insertUserIntegrationSchema>
export type UpdateUserIntegration = z.infer<typeof updateUserIntegrationSchema>
