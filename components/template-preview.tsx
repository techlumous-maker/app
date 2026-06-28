"use client"

import { useState } from "react"
import { DesktopIcon, DeviceMobileIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TemplatePreviewProps {
  slug: string
  name: string
  className?: string
}

const VIEWPORTS = {
  desktop: { label: "Desktop", width: "100%", icon: DesktopIcon },
  mobile: { label: "Mobile", width: "390px", icon: DeviceMobileIcon },
} as const

type Viewport = keyof typeof VIEWPORTS

/**
 * Renders a live template preview by embedding the standalone renderer route
 * (/render/<slug>) in an iframe. The iframe boundary isolates the template's
 * markup and styles from the studio app.
 */
export function TemplatePreview({
  slug,
  name,
  className,
}: TemplatePreviewProps) {
  const [viewport, setViewport] = useState<Viewport>("desktop")

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-3xl border border-border bg-muted/30 p-3",
        className
      )}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col">
          <span className="font-heading text-lg leading-tight">{name}</span>
          <span className="font-mono text-xs text-card-foreground/40">
            /render/{slug}
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {(Object.keys(VIEWPORTS) as Viewport[]).map((key) => {
            const { label, icon: Icon } = VIEWPORTS[key]
            return (
              <Button
                key={key}
                size="icon-sm"
                variant={viewport === key ? "secondary" : "ghost"}
                aria-label={label}
                aria-pressed={viewport === key}
                onClick={() => setViewport(key)}
              >
                <Icon />
              </Button>
            )
          })}
        </div>
      </div>

      <div className="flex justify-center overflow-hidden rounded-2xl bg-background">
        <iframe
          key={viewport}
          title={`${name} preview`}
          src={`/render/${slug}`}
          className="h-[70vh] border-0 bg-white transition-all duration-300"
          style={{ width: VIEWPORTS[viewport].width }}
        />
      </div>
    </div>
  )
}
