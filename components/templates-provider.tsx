"use client"

import { createContext, useContext, type ReactNode } from "react"

import type { Template } from "@/services/template.schema"

interface TemplatesContextValue {
  templates: Template[]
}

const TemplatesContext = createContext<TemplatesContextValue | null>(null)

export function TemplatesProvider({
  children,
  templates,
}: {
  children: ReactNode
  templates: Template[]
}) {
  return (
    <TemplatesContext.Provider value={{ templates }}>
      {children}
    </TemplatesContext.Provider>
  )
}

export function useTemplates() {
  const context = useContext(TemplatesContext)

  if (!context) {
    throw new Error("useTemplates must be used within a TemplatesProvider")
  }

  return context
}

export function useTemplateById(id?: string | null) {
  const { templates } = useTemplates()

  return id ? templates.find((template) => template.id === id) : undefined
}

export function useTemplateBySlug(slug?: string | null) {
  const { templates } = useTemplates()

  return slug ? templates.find((template) => template.slug === slug) : undefined
}
