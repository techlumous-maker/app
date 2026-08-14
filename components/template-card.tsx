"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowUpRightIcon } from "@phosphor-icons/react/ssr"

import { TemplateSelectDialog } from "@/components/template-select-dialog"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { useTemplateById } from "@/components/templates-provider"
import { cn } from "@/lib/utils"

interface TemplateCardProps {
  templateId: string
  projectId?: string
  className?: string
}

function formatCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

export function TemplateCard({
  templateId,
  projectId,
  className,
}: TemplateCardProps) {
  const template = useTemplateById(templateId)

  if (!template) return null

  const { name: title, thumbnail: image, category, slug } = template
  const card = (
    <Card
      variant="template"
      className="group relative gap-2 rounded-3xl p-1.5 hover:shadow-card-foreground/65"
    >
      <div className="px-2 pt-2">
        <CardTitle className="text-[22px] leading-5">{title}</CardTitle>
        <span className="font-mono text-xs font-light text-card-foreground/40">
          {formatCategory(category)}
        </span>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-2xl">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
          className="object-cover transition-transform duration-300 ease-out group-hover/card:scale-105"
        />
      </div>

      {/* Decorative: the whole card is the trigger/link, so this must not be a real button */}
      <span
        className={cn(
          buttonVariants({ variant: "secondary" }),
          "absolute right-3 bottom-3 rounded-full bg-card py-4 backdrop-blur"
        )}
      >
        <span className="hidden pl-1 font-mono group-hover:inline">
          {projectId ? "Select & Preview" : "Preview"}
        </span>
        <ArrowUpRightIcon className="size-4 transition-all group-hover:rotate-45" />
      </span>
    </Card>
  )

  // With a project in context, clicking opens the select/preview
  // confirmation dialog instead of navigating directly.
  if (projectId) {
    return (
      <TemplateSelectDialog
        templateId={templateId}
        projectId={projectId}
        className={className}
      >
        {card}
      </TemplateSelectDialog>
    )
  }

  return (
    <Link
      href={`/preview?template=${slug}`}
      aria-label={`Preview ${title}`}
      className={cn(
        "block rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
    >
      {card}
    </Link>
  )
}
