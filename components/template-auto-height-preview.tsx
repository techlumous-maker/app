"use client"

import { useCallback, useEffect, useRef } from "react"

import { TemplateRenderer } from "@/components/template-preview"
import {
  isTemplateLiveMessage,
  TEMPLATE_LIVE_CHANNEL,
  type TemplateLiveMessage,
} from "@/components/template-live-protocol"
import { cn } from "@/lib/utils"

interface TemplateAutoHeightPreviewProps {
  slug: string
  name: string
  content: unknown
  formReady: boolean
  className?: string
}

/**
 * Editor-oriented template preview that grows to fit its rendered document.
 */
export function TemplateAutoHeightPreview({
  slug,
  name,
  content,
  formReady,
  className,
}: TemplateAutoHeightPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const frameLoadedRef = useRef(false)
  const rendererReadyRef = useRef(false)

  const postToRenderer = useCallback((message: TemplateLiveMessage) => {
    const frame = iframeRef.current
    if (!frame?.contentWindow) return

    frame.contentWindow.postMessage(message, window.location.origin)
  }, [])

  const sendFormReady = useCallback(() => {
    if (!formReady || !frameLoadedRef.current) return

    postToRenderer({
      channel: TEMPLATE_LIVE_CHANNEL,
      type: "form-ready",
      slug,
    })
  }, [formReady, postToRenderer, slug])

  const sendContentUpdate = useCallback(() => {
    if (!formReady || !rendererReadyRef.current || !frameLoadedRef.current) {
      return
    }

    postToRenderer({
      channel: TEMPLATE_LIVE_CHANNEL,
      type: "content-update",
      slug,
      content,
    })
  }, [content, formReady, postToRenderer, slug])

  useEffect(() => {
    frameLoadedRef.current = false
    rendererReadyRef.current = false
  }, [slug])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const frame = iframeRef.current
      if (
        event.origin !== window.location.origin ||
        event.source !== frame?.contentWindow ||
        !isTemplateLiveMessage(event.data) ||
        event.data.slug !== slug ||
        event.data.type !== "renderer-ready"
      ) {
        return
      }

      rendererReadyRef.current = true
      sendFormReady()
      sendContentUpdate()
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [sendContentUpdate, sendFormReady, slug])

  useEffect(() => {
    if (!formReady) return
    sendFormReady()
    sendContentUpdate()
  }, [formReady, sendContentUpdate, sendFormReady])

  useEffect(() => {
    sendContentUpdate()
  }, [content, sendContentUpdate])

  const resizeFrame = useCallback(() => {
    const frame = iframeRef.current
    const doc = frame?.contentDocument
    if (!frame || !doc?.body) return

    // Temporarily shrinking the iframe changes the outer document's scroll
    // height. If the editor is currently scrolled below that temporary
    // height, the browser clamps the page to the top before the iframe is
    // restored. Keep the user's outer-page position across the measurement.
    const scrollX = window.scrollX
    const scrollY = window.scrollY

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
    window.scrollTo(scrollX, scrollY)
  }, [])

  const wireFrameHeight = useCallback(
    (event: React.SyntheticEvent<HTMLIFrameElement>) => {
      cleanupRef.current?.()

      const frame = event.currentTarget
      frameLoadedRef.current = true
      const doc = frame.contentDocument

      sendFormReady()
      sendContentUpdate()

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
    [resizeFrame, sendContentUpdate, sendFormReady]
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
