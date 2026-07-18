"use client"

import { useEffect, useRef, useState } from "react"

import {
  isTemplateLiveMessage,
  TEMPLATE_LIVE_CHANNEL,
} from "@/components/template-live-protocol"
import { getTemplate } from "@/templates/registry"

interface LiveTemplateRendererProps {
  slug: string
  initialContent: unknown
}

export function LiveTemplateRenderer({
  slug,
  initialContent,
}: LiveTemplateRendererProps) {
  const template = getTemplate(slug)
  const [content, setContent] = useState(initialContent)
  const rendererReadyRef = useRef(false)
  const formReadyRef = useRef(false)

  useEffect(() => {
    const parent = window.parent
    if (parent === window) return

    const sendRendererReady = () => {
      parent.postMessage(
        {
          channel: TEMPLATE_LIVE_CHANNEL,
          type: "renderer-ready",
          slug,
        },
        window.location.origin
      )
    }

    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== parent ||
        !isTemplateLiveMessage(event.data) ||
        event.data.slug !== slug
      ) {
        return
      }

      if (event.data.type === "form-ready") {
        formReadyRef.current = true
        sendRendererReady()
        return
      }

      if (
        event.data.type === "content-update" &&
        rendererReadyRef.current &&
        formReadyRef.current
      ) {
        setContent(event.data.content)
      }
    }

    window.addEventListener("message", handleMessage)
    rendererReadyRef.current = true
    sendRendererReady()

    return () => {
      window.removeEventListener("message", handleMessage)
      rendererReadyRef.current = false
      formReadyRef.current = false
    }
  }, [slug])

  if (!template) return null

  const { Template } = template
  return <Template content={content} />
}
