import { HouseIcon } from "@phosphor-icons/react/ssr"
import Link from "next/link"

import { IconButton } from "@/components/ui/button"

interface ErrorStateProps {
  code: "404" | "500"
  message: string
  actionHref: string
  actionLabel: string
}

export function ErrorState({
  code,
  message,
  actionHref,
  actionLabel,
}: ErrorStateProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="relative isolate flex w-full max-w-5xl items-center justify-center overflow-hidden py-24 text-center sm:py-32">
        <p
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center font-heading text-[clamp(14rem,45vw,36rem)] leading-none font-semibold tracking-tighter text-foreground/[0.035] select-none dark:text-secondary/45"
        >
          {code}
        </p>
        <div className="flex max-w-md flex-col items-center gap-2">
          <h1 className="font-mono text-3xl font-semibold tracking-tight sm:text-4xl">
            {code === "404" ? "Page not found" : "Something went wrong"}
          </h1>
          <p className="text-muted-foreground/60">{message}</p>
          <IconButton
            render={<Link href={actionHref} />}
            icon={HouseIcon}
            iconPosition="start"
            size="lg"
            className="mt-2 rounded-full px-3"
          >
            {actionLabel}
          </IconButton>
        </div>
      </div>
    </main>
  )
}
