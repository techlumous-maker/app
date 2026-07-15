import { notFound, redirect } from "next/navigation"

import { ProjectEditorWorkspace } from "@/components/project-editor-workspace"
import { createClient } from "@/lib/supabase/server"
import { getProject } from "@/services/project"
import { getTemplateById } from "@/services/template"

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

  return (
    <div className="sm:-m-4 lg:-m-6">
      <ProjectEditorWorkspace
        projectId={project.id}
        projectName={project.name}
        template={
          template
            ? {
                name: template.name,
                slug: template.slug,
                initialContent: template.default_content ?? {},
              }
            : null
        }
      />
    </div>
  )
}
