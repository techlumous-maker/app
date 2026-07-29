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
import { DeploymentButton } from "@/components/deployment-button"
import {
  DeploymentStatus,
  normalizeDeploymentUrl,
} from "@/components/deployment-status"
import { cn } from "@/lib/utils"

interface ProjectCardProps {
  projectId: string
  name: string
  url: string
  image: string
  status?: string | null
  createdAt: string
  websiteUrl?: string | null
  lastDeployedAt?: string | null
  onRetry?: () => void | Promise<void>
  onReconnect?: () => void | Promise<void>
  retryPending?: boolean
  reconnectPending?: boolean
  deploymentControlsDisabled?: boolean
  onDelete?: () => void
  className?: string
  isTemplateSelected?: boolean
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

const deployedAtFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
})

function formatDeployedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const elapsedMinutes = Math.floor((Date.now() - date.getTime()) / 60_000)
  const elapsedHours = Math.floor(elapsedMinutes / 60)

  if (elapsedHours >= 0 && elapsedHours < 24) {
    if (elapsedHours === 0) {
      if (elapsedMinutes <= 0) return "Just now"
      return `${elapsedMinutes} ${elapsedMinutes === 1 ? "minute" : "minutes"} ago`
    }
    return `${elapsedHours} ${elapsedHours === 1 ? "hour" : "hours"} ago`
  }

  return deployedAtFormatter.format(date)
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
            {isPending ? "Deleting..." : "Delete Project"}
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
  status,
  createdAt,
  websiteUrl,
  lastDeployedAt,
  onRetry,
  onReconnect,
  retryPending,
  reconnectPending,
  deploymentControlsDisabled,
  onDelete,
  className,
  isTemplateSelected,
}: ProjectCardProps) {
  const normalizedWebsiteUrl = normalizeDeploymentUrl(websiteUrl)
  const normalizedProjectUrl = normalizeDeploymentUrl(url)
  const vercelProjectName = normalizedProjectUrl
    ? new URL(normalizedProjectUrl).hostname.replace(/\.vercel\.app$/i, "")
    : null

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

        {normalizedWebsiteUrl && (
          <a
            href={normalizedWebsiteUrl}
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
        <div className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-3 sm:pr-10">
          <InfoItem label="Project Name">{name}</InfoItem>
          <InfoItem label="Status">
            {status ? (
              <DeploymentStatus status={status} />
            ) : (
              <span className="text-muted-foreground">Not deployed</span>
            )}
          </InfoItem>
          <InfoItem label="Project URL">
            {normalizedProjectUrl && vercelProjectName ? (
              <a
                href={normalizedProjectUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={normalizedProjectUrl}
                className="inline-flex max-w-full items-center gap-1 hover:underline"
              >
                <span className="truncate">{vercelProjectName}</span>
                <ArrowUpRightIcon className="size-5 shrink-0" />
              </a>
            ) : (
              <span className="text-muted-foreground">{url}</span>
            )}
          </InfoItem>
          <InfoItem label="Created">{createdAt}</InfoItem>
          <InfoItem label="Last Deployment">
            {lastDeployedAt ? (
              <time dateTime={lastDeployedAt}>
                {formatDeployedAt(lastDeployedAt)}
              </time>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </InfoItem>
        </div>

        <div className="flex flex-wrap gap-3">
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
          <DeploymentButton
            onRetry={onRetry}
            onReconnect={onReconnect}
            retryPending={retryPending}
            reconnectPending={reconnectPending}
            disabled={deploymentControlsDisabled}
          />
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
