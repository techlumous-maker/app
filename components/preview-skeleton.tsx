import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { WarningIcon } from "@phosphor-icons/react/dist/ssr"

export function PreviewSkeleton() {
  return (
    <Card className="relative w-full max-w-xs gap-2 rounded-4xl bg-background p-2 ring-foreground/5!">
      <div className="flex items-center gap-1 px-2 py-1">
        <Skeleton className="size-2 rounded-full" />
        <Skeleton className="size-2 rounded-full bg-muted-foreground/10" />
        <Skeleton className="ml-1 h-2 w-20 bg-muted-foreground/10" />
      </div>
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <WarningIcon className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/4 text-foreground/10" />
    </Card>
  )
}
