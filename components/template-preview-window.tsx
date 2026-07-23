"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import {
  CaretLeftIcon,
  CaretRightIcon,
  DeviceMobileCameraIcon,
  MonitorIcon,
} from "@phosphor-icons/react"

import { TemplateRenderer } from "@/components/template-preview"
import { Switcher, type SwitcherOption } from "@/components/ui/switcher"
import { cn } from "@/lib/utils"

interface TemplatePreviewWindowProps {
  slug: string
  name: string
  className?: string
}

const VIEWPORTS = {
  desktop: { width: "100%" },
  mobile: { width: "390px" },
} as const

type Viewport = keyof typeof VIEWPORTS

const viewportOptions: readonly SwitcherOption[] = [
  {
    value: "desktop",
    icon: <MonitorIcon size={44} weight="light" />,
    ariaLabel: "Laptop preview",
  },
  {
    value: "mobile",
    icon: <DeviceMobileCameraIcon size={44} weight="light" />,
    ariaLabel: "Mobile preview",
  },
]

const ZOOM_MS = 450
const ZOOM_TRANSITION = `transform ${ZOOM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`

/** Transform that maps the full-viewport stage onto the given windowed rect. */
function rectToTransform(rect: DOMRect) {
  return `translate(${rect.left}px, ${rect.top}px) scale(${rect.width / window.innerWidth}, ${rect.height / window.innerHeight})`
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function FullscreenGlyph({ type }: { type: "maximize" | "minimize" }) {
  return (
    <div className="relative -translate-y-px -rotate-45 opacity-0 transition-all group-hover:opacity-100">
      <CaretRightIcon
        weight="fill"
        className={cn(
          `absolute top-1/2 left-1/2 size-2 -translate-y-1/2`,
          type === "maximize"
            ? "-translate-x-[calc(50%-0.15rem)]"
            : "-translate-x-[calc(50%+0.18rem)]"
        )}
      />
      <CaretLeftIcon
        weight="fill"
        className={cn(
          `absolute top-1/2 left-1/2 size-2 -translate-y-1/2`,
          type === "maximize"
            ? "-translate-x-[calc(50%+0.18rem)]"
            : "-translate-x-[calc(50%-0.15rem)]"
        )}
      />
    </div>
  )
}

function TrafficLights({
  fullscreen,
  onFullscreenToggle,
}: {
  fullscreen: boolean
  onFullscreenToggle: () => void
}) {
  return (
    <div className="group/lights flex items-center gap-1.5">
      <button
        type="button"
        disabled
        aria-label="Close"
        className="size-2.5 rounded-full bg-red-500 opacity-40"
      />
      <button
        type="button"
        disabled
        aria-label="Minimize"
        className="size-2.5 rounded-full bg-yellow-400 opacity-40"
      />
      <button
        type="button"
        aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
        onClick={onFullscreenToggle}
        className="group flex size-2.5 items-center justify-center rounded-full bg-green-500 text-green-950 outline-none hover:brightness-90 focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-90"
      >
        <FullscreenGlyph type={fullscreen ? "minimize" : "maximize"} />
      </button>
    </div>
  )
}

/** Centered address-bar-style pill showing the window title. */
function WindowTitle({ name }: { name: string }) {
  return (
    <span className="pointer-events-none absolute top-1/2 left-1/2 w-2/5 -translate-x-1/2 -translate-y-1/2 truncate rounded-xl border border-border/60 bg-background/70 px-3 py-1 text-center text-xs leading-4 text-muted-foreground">
      {name}
    </span>
  )
}

export function TemplatePreviewWindow({
  slug,
  name,
  className,
}: TemplatePreviewWindowProps) {
  const [viewport, setViewport] = useState<Viewport>("desktop")
  const [fullscreen, setFullscreen] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const stageSlotRef = useRef<HTMLDivElement>(null)
  const zoomFromRect = useRef<DOMRect | null>(null)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fullscreenRef = useRef(false)
  const iframeCleanupRef = useRef<(() => void) | null>(null)
  const prevOverflow = useRef<{ html: string; body: string } | null>(null)

  useEffect(() => {
    fullscreenRef.current = fullscreen
  }, [fullscreen])

  const lockScroll = useCallback(() => {
    if (prevOverflow.current) return
    prevOverflow.current = {
      html: document.documentElement.style.overflow,
      body: document.body.style.overflow,
    }
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
  }, [])

  const unlockScroll = useCallback(() => {
    const previousOverflow = prevOverflow.current
    if (!previousOverflow) return
    prevOverflow.current = null
    document.documentElement.style.overflow = previousOverflow.html
    document.body.style.overflow = previousOverflow.body
  }, [])

  const enterFullscreen = useCallback(() => {
    lockScroll()
    zoomFromRect.current = stageRef.current?.getBoundingClientRect() ?? null
    setFullscreen(true)
  }, [lockScroll])

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    if (!fullscreen) {
      stage.style.transformOrigin = ""
      stage.style.transition = ""
      stage.style.transform = ""
      return
    }

    const from = zoomFromRect.current
    zoomFromRect.current = null
    if (!from || prefersReducedMotion()) return

    stage.style.transformOrigin = "top left"
    stage.style.transition = "none"
    stage.style.transform = rectToTransform(from)
    stage.getBoundingClientRect() // Flush styles so the zoom starts from the windowed rect.
    stage.style.transition = ZOOM_TRANSITION
    stage.style.transform = ""
  }, [fullscreen])

  const exitFullscreen = useCallback(() => {
    const stage = stageRef.current
    const slot = stageSlotRef.current
    if (exitTimer.current) return

    // Unlock first for the same reason: the returning scrollbar reflows the
    // page, and the zoom must land on the slot's final position.
    unlockScroll()
    if (!stage || !slot || prefersReducedMotion()) {
      setFullscreen(false)
      return
    }

    stage.style.transformOrigin = "top left"
    stage.style.transition = ZOOM_TRANSITION
    stage.style.transform = rectToTransform(slot.getBoundingClientRect())
    exitTimer.current = setTimeout(() => {
      exitTimer.current = null
      setFullscreen(false)
    }, ZOOM_MS)
  }, [unlockScroll])

  useEffect(() => {
    if (!fullscreen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") exitFullscreen()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [fullscreen, exitFullscreen])

  useEffect(() => {
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current)
      iframeCleanupRef.current?.()
      unlockScroll()
    }
  }, [unlockScroll])

  // /render is same-origin, so the preview can receive Escape while the
  // template iframe has focus. The listener is replaced after every reload.
  const wireIframeDocument = useCallback(
    (event: React.SyntheticEvent<HTMLIFrameElement>) => {
      iframeCleanupRef.current?.()

      try {
        const frameWindow = event.currentTarget.contentWindow
        if (!frameWindow) return

        const onKeyDown = (keyEvent: KeyboardEvent) => {
          if (keyEvent.key === "Escape" && fullscreenRef.current) {
            exitFullscreen()
          }
        }

        frameWindow.addEventListener("keydown", onKeyDown)
        iframeCleanupRef.current = () => {
          frameWindow.removeEventListener("keydown", onKeyDown)
        }
      } catch {
        // Cross-origin content: Escape continues to work when the studio has focus.
      }
    },
    [exitFullscreen]
  )

  return (
    <section
      className={cn(
        // 1512px = logical screen width of the 14" MacBook Pro
        "mx-auto w-full max-w-315 overflow-hidden rounded-xl border border-border bg-card shadow-2xl",
        className
      )}
    >
      <header className="relative flex h-10 items-center justify-between border-b border-border bg-muted/50 px-3">
        <TrafficLights
          fullscreen={false}
          onFullscreenToggle={enterFullscreen}
        />

        <WindowTitle name={name} />

        <Switcher
          aria-label="Preview viewport"
          value={viewport}
          options={viewportOptions}
          onValueChange={(nextViewport) => {
            setViewport(nextViewport as Viewport)
          }}
        />
      </header>

      <div ref={stageSlotRef} className="h-[70vh]">
        <div
          ref={stageRef}
          className={cn(
            "flex justify-center overflow-hidden bg-background",
            fullscreen ? "fixed inset-0 z-50" : "size-full"
          )}
        >
          <TemplateRenderer
            slug={slug}
            name={name}
            onLoad={wireIframeDocument}
            className="h-full border-0 bg-white transition-[width] duration-300"
            style={{ width: VIEWPORTS[viewport].width }}
          />
        </div>
      </div>

      {fullscreen && (
        <div className="group/exit fixed inset-x-0 top-0 z-60 h-1.5">
          <div className="relative flex h-9 -translate-y-full items-center border-b border-border bg-muted/80 px-3 backdrop-blur-sm transition-transform duration-200 group-hover/exit:translate-y-0">
            <TrafficLights fullscreen onFullscreenToggle={exitFullscreen} />
            <WindowTitle name={name} />
          </div>
        </div>
      )}
    </section>
  )
}
