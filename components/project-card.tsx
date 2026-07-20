"use client"

import Link from "next/link"
import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowUpRightIcon,
  NotePencilIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react/ssr"

import { Button, buttonVariants, IconButton } from "@/components/ui/button"
import { deleteProjectAction } from "@/actions/project"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type ProjectStatus = "live" | "building" | "offline"

interface ProjectCardProps {
  projectId: string
  name: string
  url: string
  image: string
  status?: ProjectStatus
  createdAt: string
  websiteUrl?: string | null
  vercelUrl: string
  onDelete?: () => void
  className?: string
  isTemplateSelected?: boolean
}

const STATUS: Record<ProjectStatus, { label: string; dot: string }> = {
  live: { label: "Live", dot: "bg-green-500" },
  building: { label: "Building", dot: "bg-amber-500" },
  offline: { label: "Offline", dot: "bg-destructive" },
}

function InfoItem({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0">
      <span className="font-mono text-sm text-muted-foreground">{label}</span>
      <div className="font-heading text-2xl text-foreground">{children}</div>
    </div>
  )
}

function DeleteProjectDialog({
  projectId,
  name,
  onDelete,
  className,
}: {
  projectId: string
  name: string
  onDelete?: () => void
  className?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProjectAction(projectId)
      if (result.status === "success") {
        toast.success(result.message)
        onDelete?.()
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${name}`}
            className={cn(
              "rounded-full text-foreground/40! hover:bg-destructive/10! hover:text-destructive!",
              className
            )}
          />
        }
      >
        <TrashSimpleIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            Delete project?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the project &quot;{name}&quot;?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deleting…" : "Delete Project"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ProjectCard({
  projectId,
  name,
  url,
  image,
  status = "live",
  createdAt,
  websiteUrl,
  vercelUrl,
  onDelete,
  className,
  isTemplateSelected,
}: ProjectCardProps) {
  const statusConfig = STATUS[status]

  return (
    <Card
      variant="default"
      className={cn(
        "relative flex-col items-stretch gap-4 rounded-3xl p-1.5 ring-0! lg:flex-row lg:items-center lg:gap-6",
        className
      )}
    >
      <div className="group relative aspect-video w-full shrink-0 overflow-hidden rounded-2xl lg:w-64 lg:basis-1/3">
        <img src={image} alt={name} className="size-full object-cover" />

        {websiteUrl && (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${name} website`}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <span
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "pointer-events-none gap-2 rounded-full pl-3 text-white hover:bg-white/10! hover:text-white!"
              )}
            >
              Visit Website
              <ArrowUpRightIcon />
            </span>
          </a>
        )}

        <DeleteProjectDialog
          projectId={projectId}
          name={name}
          onDelete={onDelete}
          className="absolute top-4 right-4 flex lg:hidden"
        />
      </div>

      <div className="flex flex-1 flex-col gap-6 p-2 lg:p-0">
        <div className="grid grid-cols-2 gap-x-10 gap-y-4">
          <InfoItem label="Project Name">{name}</InfoItem>
          <InfoItem label="Status">
            <span className="inline-flex items-center gap-2">
              <span className={cn("size-1.5 rounded-full", statusConfig.dot)} />
              {statusConfig.label}
            </span>
          </InfoItem>
          <InfoItem label="Project URL">{url}</InfoItem>
          <InfoItem label="Created">{createdAt}</InfoItem>
        </div>

        <div className="flex gap-3">
          <IconButton
            render={
              isTemplateSelected ? (
                <Link href={`/preview/${projectId}/edit`} />
              ) : (
                <Link href={`/templates?project=${projectId}`} />
              )
            }
            icon={isTemplateSelected ? NotePencilIcon : undefined}
            iconPosition="end"
            variant="default"
            size="lg"
            className="rounded-full pl-3"
          >
            {isTemplateSelected ? "Edit Template" : "Select Template"}
          </IconButton>
          <IconButton
            render={
              <a href={vercelUrl} target="_blank" rel="noopener noreferrer" />
            }
            variant="ghost"
            size="lg"
            className="rounded-full pl-3 [&>svg]:transition-transform hover:[&>svg]:rotate-45"
          >
            Vercel Project
          </IconButton>
        </div>
      </div>

      <DeleteProjectDialog
        projectId={projectId}
        name={name}
        onDelete={onDelete}
        className="absolute top-2 right-2 hidden lg:flex"
      />
    </Card>
  )
}
