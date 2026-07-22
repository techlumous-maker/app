"use client"

import Link from "next/link"
import type { RefObject } from "react"
import { WarningOctagonIcon } from "@phosphor-icons/react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface PreviewEmptyStateProps {
  containerRef: RefObject<HTMLDivElement | null>
  requestedTemplate?: string
}

export function PreviewEmptyState({
  containerRef,
  requestedTemplate,
}: PreviewEmptyStateProps) {
  const message = requestedTemplate
    ? `The “${requestedTemplate}” template could not be found.
        Choose another from the template library.
        Your preview will appear in this window.`
    : "No template is selected for this preview. Choose one from the template library. Your preview will appear in this window."

  return (
    <AlertDialog open>
      <AlertDialogContent
        variant="macos-error"
        portalProps={{ container: containerRef }}
        overlayClassName="absolute bg-foreground/10 supports-backdrop-filter:backdrop-blur-none"
      >
        <AlertDialogHeader className="block border-b border-border px-5 py-2 text-left">
          <AlertDialogTitle className="text-sm font-medium text-card-foreground/65">
            Preview Unavailable
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="grid grid-cols-[3.5rem_1fr] items-center gap-4 px-5 py-4">
          <AlertDialogMedia className="m-0 size-14 rounded-none bg-transparent *:[svg:not([class*='size-'])]:size-14">
            <WarningOctagonIcon
              weight="duotone"
              className="text-card-foreground [&_path:first-child]:fill-destructive [&_path:first-child]:opacity-100 [&_path:last-child]:fill-white"
            />
          </AlertDialogMedia>
          <AlertDialogDescription className="text-xs/5 text-card-foreground">
            <span className="block">{message}</span>
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter className="flex-row justify-end px-5 pb-4">
          <AlertDialogAction
            variant="secondary"
            nativeButton={false}
            render={<Link href="/templates" />}
            className="min-w-24"
          >
            View Templates
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
