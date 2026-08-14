import { notFound, redirect } from "next/navigation"

import { ProjectEditorWorkspace } from "@/components/project-editor-workspace"
import { createClient } from "@/lib/supabase/server"
import { getProject } from "@/services/project"
import { getUserIntegrationByProvider } from "@/services/user-integration"

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect("/login")

  const { projectId } = await params
  const project = await getProject(projectId)
  if (!project) notFound()

  const integration = await getUserIntegrationByProvider({
    validateToken: false,
  })

  return (
    <div className="sm:-m-4 lg:-m-6">
      <ProjectEditorWorkspace
        projectId={project.id}
        projectName={project.name}
        templateId={project.template_id}
        initialDraftContent={project.draft_content}
        hasLiveDeployment={
          project.deploy_status === "ready" &&
          !!project.vercel_project_id &&
          !!project.deployment_url
        }
        initialPublishedContent={project.published_content}
        initialDeployment={{
          status: project.deploy_status ?? "not_deployed",
          liveUrl: project.deployment_url,
          inspectorUrl: null,
          errorText: project.deploy_error,
          lastDeployedAt: project.last_deployed_at,
        }}
        isVercelConnected={integration?.status === "CONNECTED"}
      />
    </div>
  )
}
