import { notFound, redirect } from "next/navigation"

import { ProjectEditorWorkspace } from "@/components/project-editor-workspace"
import { createClient } from "@/lib/supabase/server"
import { getProject } from "@/services/project"
import { getTemplateById } from "@/services/template"
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

  const template = project.template_id
    ? await getTemplateById(project.template_id)
    : null
  const integration = await getUserIntegrationByProvider({
    validateToken: false,
  })

  return (
    <div className="sm:-m-4 lg:-m-6">
      <ProjectEditorWorkspace
        projectId={project.id}
        projectName={project.name}
        initialDeployment={{
          status: project.deploy_status ?? "not_deployed",
          liveUrl: project.deployment_url,
          inspectorUrl: null,
          errorText: project.deploy_error,
          lastDeployedAt: project.last_deployed_at,
        }}
        isVercelConnected={integration?.status === "CONNECTED"}
        template={
          template
            ? {
                name: template.name,
                slug: template.slug,
                initialContent:
                  project.content && Object.keys(project.content).length > 0
                    ? project.content
                    : (template.default_content ?? {}),
              }
            : null
        }
      />
    </div>
  )
}
