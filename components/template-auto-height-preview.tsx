"use client"

import { useCallback, useEffect, useRef } from "react"

import { TemplateRenderer } from "@/components/template-preview"
import { cn } from "@/lib/utils"

interface TemplateAutoHeightPreviewProps {
  slug: string
  name: string
  className?: string
}

/**
 * Editor-oriented template preview that grows to fit its rendered document.
 */
export function TemplateAutoHeightPreview({
  slug,
  name,
  className,
}: TemplateAutoHeightPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const resizeFrame = useCallback(() => {
    const frame = iframeRef.current
    const doc = frame?.contentDocument
    if (!frame || !doc?.body) return

    // Measure from the editor's available viewport height so template styles
    // such as min-height: 100vh do not create a height feedback loop.
    const minimumHeight = Math.max(window.innerHeight - 96, 320)
    frame.style.height = `${minimumHeight}px`

    const contentHeight = Math.max(
      doc.documentElement.scrollHeight,
      doc.documentElement.offsetHeight,
      doc.body.scrollHeight,
      doc.body.offsetHeight,
      minimumHeight
    )

    frame.style.height = `${contentHeight}px`
  }, [])

  const wireFrameHeight = useCallback(
    (event: React.SyntheticEvent<HTMLIFrameElement>) => {
      cleanupRef.current?.()

      const frame = event.currentTarget
      const doc = frame.contentDocument
      if (!doc?.body) return

      doc.documentElement.style.overflow = "hidden"
      doc.body.style.overflow = "hidden"

      let disposed = false
      let animationFrame: number | null = null
      const scheduleResize = () => {
        if (disposed || animationFrame !== null) return
        animationFrame = window.requestAnimationFrame(() => {
          animationFrame = null
          resizeFrame()
        })
      }

      const mutationObserver = new MutationObserver(scheduleResize)
      mutationObserver.observe(doc.body, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      })

      doc.addEventListener("load", scheduleResize, true)
      doc.addEventListener("transitionend", scheduleResize, true)
      window.addEventListener("resize", scheduleResize)
      void doc.fonts.ready.then(scheduleResize)

      resizeFrame()

      cleanupRef.current = () => {
        disposed = true
        mutationObserver.disconnect()
        doc.removeEventListener("load", scheduleResize, true)
        doc.removeEventListener("transitionend", scheduleResize, true)
        window.removeEventListener("resize", scheduleResize)
        if (animationFrame !== null) {
          window.cancelAnimationFrame(animationFrame)
        }
      }
    },
    [resizeFrame]
  )

  useEffect(() => {
    return () => cleanupRef.current?.()
  }, [])

  return (
    <TemplateRenderer
      ref={iframeRef}
      slug={slug}
      name={name}
      title={`${name} live preview`}
      scrolling="no"
      onLoad={wireFrameHeight}
      className={cn(
        "block min-h-[calc(100dvh-6rem)] w-full border-0 bg-white",
        className
      )}
    />
  )
}
