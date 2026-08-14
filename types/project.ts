export type CreateProjectState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: Record<string, string>
}

export const initialCreateProjectState: CreateProjectState = {
  status: "idle",
}

export type SelectTemplateState = {
  status: "success" | "error"
  message: string
}

export type DeleteProjectState =
  | { status: "success"; message: string }
  | { status: "error"; message: string }
  | { status: "vercel_error"; message: string }
