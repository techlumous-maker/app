"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import {
  ArrowsInSimpleIcon,
  DesktopIcon,
  DeviceMobileIcon,
  CaretUpDownIcon,
} from "@phosphor-icons/react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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

const ZOOM_MS = 450
const ZOOM_TRANSITION = `transform ${ZOOM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`

/** Transform that maps the full-viewport stage onto the given windowed rect. */
function rectToTransform(rect: DOMRect) {
  return `translate(${rect.left}px, ${rect.top}px) scale(${rect.width / window.innerWidth}, ${rect.height / window.innerHeight})`
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function TrafficLights({
  fullscreen,
  onFullscreenToggle,
}: {
  fullscreen: boolean
  onFullscreenToggle: () => void
}) {
  const GreenGlyph = fullscreen ? ArrowsInSimpleIcon : CaretUpDownIcon
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
        className="flex size-2.5 items-center justify-center rounded-full bg-green-500 text-green-950 outline-none hover:brightness-90 focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-90"
      >
        <GreenGlyph
          weight="fill"
          className="size-2 -translate-y-px rotate-45 opacity-0 transition-opacity group-focus-within/lights:opacity-100 group-hover/lights:opacity-100"
        />
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

/**
 * Renders a live template preview by embedding the standalone renderer route
 * (/render/<slug>) in an iframe. The iframe boundary isolates the template's
 * markup and styles from the studio app.
 *
 * The chrome mimics a macOS window: traffic lights on the left (only the
 * green full-screen button is active), the template name centered in the
 * title bar, and the viewport switch on the right. Full screen shows the
 * template alone; exit with Escape or the hover-reveal bar at the top edge.
 */
export function TemplatePreview({
  slug,
  name,
  className,
}: TemplatePreviewProps) {
  const [viewport, setViewport] = useState<Viewport>("desktop")
  const [fullscreen, setFullscreen] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const stageSlotRef = useRef<HTMLDivElement>(null)
  const zoomFromRect = useRef<DOMRect | null>(null)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fullscreenRef = useRef(false)
  const prevOverflow = useRef<{ html: string; body: string } | null>(null)

  useEffect(() => {
    fullscreenRef.current = fullscreen
  }, [fullscreen])

  // Hide the page scrollbar while in full screen. html is included because
  // when it is the scroll container a body-only lock leaves the root
  // scrollbar visible next to the fixed overlay.
  const lockScroll = () => {
    if (prevOverflow.current) return
    prevOverflow.current = {
      html: document.documentElement.style.overflow,
      body: document.body.style.overflow,
    }
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
  }

  const unlockScroll = useCallback(() => {
    const prev = prevOverflow.current
    if (!prev) return
    prevOverflow.current = null
    document.documentElement.style.overflow = prev.html
    document.body.style.overflow = prev.body
  }, [])

  const enterFullscreen = () => {
    // Lock first: removing the scrollbar reflows the page, so the zoom's
    // start rect has to be measured after the shift.
    lockScroll()
    zoomFromRect.current = stageRef.current?.getBoundingClientRect() ?? null
    setFullscreen(true)
  }

  // macOS-style zoom: once the stage is fixed, start it at its windowed rect
  // and let it expand to the viewport (FLIP). When leaving full screen the
  // inline styles from the exit animation are cleared here, in the same
  // commit as the class switch, so no intermediate frame can paint.
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
    stage.getBoundingClientRect() // flush styles so the zoom starts from the windowed rect
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
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [fullscreen, exitFullscreen])

  useEffect(() => {
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current)
      unlockScroll()
    }
  }, [unlockScroll])

  // /render is same-origin, so the preview can reach into the template page:
  // forward Escape for exiting full screen, and hide the template's own
  // scrollbar (scrolling still works) so it runs edge to edge like a mac
  // window instead of showing a Windows-style scrollbar strip.
  const wireIframeDocument = (
    event: React.SyntheticEvent<HTMLIFrameElement>
  ) => {
    try {
      const frame = event.currentTarget
      frame.contentWindow?.addEventListener("keydown", (keyEvent) => {
        if (keyEvent.key === "Escape" && fullscreenRef.current) {
          exitFullscreen()
        }
      })
      const doc = frame.contentDocument
      if (doc?.head && !doc.getElementById("studio-preview-chrome")) {
        const style = doc.createElement("style")
        style.id = "studio-preview-chrome"
        style.textContent =
          "html{scrollbar-width:none}html::-webkit-scrollbar{display:none}"
        doc.head.appendChild(style)
      }
    } catch {
      // cross-origin content — Escape then only works when the studio has
      // focus, and the template keeps its own scrollbar
    }
  }

  return (
    <section
      className={cn(
        // 1512px = logical screen width of the 14" MacBook Pro
        "mx-auto w-full max-w-[1512px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl",
        className
      )}
    >
      <header className="relative flex h-9 items-center justify-between border-b border-border bg-muted/50 px-3">
        <TrafficLights
          fullscreen={false}
          onFullscreenToggle={enterFullscreen}
        />

        <WindowTitle name={name} />

        <ToggleGroup
          aria-label="Preview viewport"
          value={[viewport]}
          onValueChange={(value) => {
            const next = value[0] as Viewport | undefined
            if (next) setViewport(next)
          }}
          variant="outline"
          size="sm"
          spacing={1}
        >
          {(Object.keys(VIEWPORTS) as Viewport[]).map((key) => {
            const { label, icon: Icon } = VIEWPORTS[key]
            return (
              <ToggleGroupItem key={key} value={key} aria-label={label}>
                <Icon />
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </header>

      <div ref={stageSlotRef} className="h-[70vh]">
        <div
          ref={stageRef}
          className={cn(
            "flex justify-center overflow-hidden bg-background",
            fullscreen ? "fixed inset-0 z-50" : "size-full"
          )}
        >
          <iframe
            title={`${name} preview`}
            src={`/render/${slug}`}
            onLoad={wireIframeDocument}
            className="h-full border-0 bg-white transition-[width] duration-300"
            style={{ width: VIEWPORTS[viewport].width }}
          />
        </div>
      </div>

      {fullscreen && (
        <div className="group/exit fixed inset-x-0 top-0 z-[60] h-1.5">
          <div className="relative flex h-9 -translate-y-full items-center border-b border-border bg-muted/80 px-3 backdrop-blur-sm transition-transform duration-200 group-hover/exit:translate-y-0">
            <TrafficLights fullscreen onFullscreenToggle={exitFullscreen} />
            <WindowTitle name={name} />
          </div>
        </div>
      )}
    </section>
  )
}
