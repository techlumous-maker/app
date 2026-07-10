import { CardSkeleton } from "@/components/card-skeleton"
import { CreateProjectDrawer } from "@/components/create-project-drawer"
import { ProjectCard } from "@/components/project-card"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { listProjects } from "@/services/project"
import { type Project } from "@/services/project.schema"
import { redirect } from "next/navigation"

const STATIC_IMAGES = [
  "/assets/static-test/template-1.jpg",
  "/assets/static-test/template-2.jpg",
]

const SKELETON_TRANSFORMS = [
  "-rotate-3 z-10",
  "-translate-x-4 -translate-y-20 -rotate-1 opacity-40 scale-80",
  "translate-x-8 -translate-y-10 rotate-6 opacity-70 scale-90",
]

function cardStatus(deployStatus: Project["deploy_status"]) {
  if (deployStatus === "ready") return "live" as const
  if (deployStatus === "error") return "offline" as const
  if (deployStatus) return "building" as const
  return "offline" as const
}

function formatCreatedAt(createdAt: Project["created_at"]) {
  if (!createdAt) return "—"
  return new Date(createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect("/login")

  const projects = await listProjects()

  return (
    <div className="page">
      <div className="flex items-center justify-between">
        <h1 className="max-sm:pl-2">Projects</h1>
        {projects.length > 0 && <CreateProjectDrawer buttonVariant="icon" />}
      </div>
      {projects.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center gap-10 overflow-x-clip">
          <div className="isolate grid w-full max-w-md grid-cols-1 pt-20">
            {Array.from({ length: 3 }).map((_, index) => (
              <CardSkeleton
                key={index}
                className={cn(
                  "col-start-1 row-start-1",
                  SKELETON_TRANSFORMS[index]
                )}
              />
            ))}
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-muted-foreground/60 max-sm:pl-2">
              No projects yet. How about creating a project to get started?
            </p>
            <CreateProjectDrawer />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              projectId={project.id}
              isTemplateSelected={!!project.template_id}
              image={STATIC_IMAGES[index % STATIC_IMAGES.length]}
              name={project.name}
              url={
                project.deployment_url?.replace(/^https?:\/\//, "") ??
                "Not deployed"
              }
              status={cardStatus(project.deploy_status)}
              createdAt={formatCreatedAt(project.created_at)}
              websiteUrl={project.deployment_url ?? "#"}
              vercelUrl="https://vercel.com"
            />
          ))}
        </div>
      )}
    </div>
  )
}
