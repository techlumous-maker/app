import { ErrorState } from "@/components/error-state"
import { createClient } from "@/lib/supabase/server"

export default async function NotFound() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const isAuthenticated = Boolean(data?.claims)

  return (
    <ErrorState
      code="404"
      message={
        isAuthenticated
          ? "The page you are looking for does not exist or may have been moved."
          : "Sign in to continue and access your projects."
      }
      actionHref={isAuthenticated ? "/" : "/login"}
      actionLabel={isAuthenticated ? "Back to home" : "Go to login"}
    />
  )
}
