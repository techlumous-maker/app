"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { selectTemplateAction } from "@/actions/project"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TemplateSelectDialogProps {
  templateId: string
  projectId: string
  slug: string
  title: string
  className?: string
  children: React.ReactNode
}

// Confirmation dialog shown when a template card is clicked while a project
// is being configured (?project= present). "Only Preview" navigates without
// touching the DB; "Select & Preview" assigns the template to the project
// first, then navigates.
export function TemplateSelectDialog({
  templateId,
  projectId,
  slug,
  title,
  className,
  children,
}: TemplateSelectDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const previewHref = `/preview?template=${slug}&project=${projectId}`

  function handleSelect() {
    startTransition(async () => {
      const result = await selectTemplateAction(projectId, templateId)
      if (result.status === "success") {
        toast.success(result.message)
        router.push(previewHref)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <AlertDialog>
      {/* The card contains block-level content, so the trigger can't be a
          native <button>. */}
      <AlertDialogTrigger
        render={<div role="button" tabIndex={0} />}
        nativeButton={false}
        aria-label={`Select and preview ${title}`}
        className={cn(
          "block cursor-pointer rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          className
        )}
      >
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            Select this template?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to select &quot;{title}&quot; for this
            project? You can also preview it first without changing the project.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            render={<Link href={previewHref} />}
            nativeButton={false}
          >
            Only Preview
          </Button>
          <AlertDialogAction onClick={handleSelect} disabled={isPending}>
            {isPending ? "Selecting…" : "Select & Preview"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
