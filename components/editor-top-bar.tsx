"use client"

import {
  DeviceMobileCameraIcon,
  DeviceTabletCameraIcon,
  MonitorIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react"

import {
  DeploymentStatus,
  normalizeDeploymentUrl,
  resolveDeploymentState,
} from "@/components/deployment-status"
import { IconButton } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switcher, type SwitcherOption } from "@/components/ui/switcher"

export type PreviewViewportPreset = "desktop" | "tablet" | "mobile"
export type PreviewViewport = PreviewViewportPreset | "custom"

const viewportOptions: readonly SwitcherOption[] = [
  {
    value: "desktop",
    icon: <MonitorIcon />,
    ariaLabel: "Desktop preview",
  },
  {
    value: "tablet",
    icon: <DeviceTabletCameraIcon />,
    ariaLabel: "Tablet preview",
  },
  {
    value: "mobile",
    icon: <DeviceMobileCameraIcon />,
    ariaLabel: "Mobile preview",
  },
]

interface EditorTopBarProps {
  title: string
  projectStatus?: string
  liveUrl?: string | null
  viewport: PreviewViewport
  onViewportChange: (viewport: PreviewViewportPreset) => void
  isSchemaFormOpen?: boolean
  onToggleSchemaForm?: () => void
}

export function EditorTopBar({
  title,
  projectStatus,
  liveUrl,
  viewport,
  onViewportChange,
  isSchemaFormOpen,
  onToggleSchemaForm,
}: EditorTopBarProps) {
  const deploymentState = projectStatus
    ? resolveDeploymentState(projectStatus)
    : null
  const normalizedLiveUrl = normalizeDeploymentUrl(liveUrl)
  const isLive = deploymentState === "ready" && normalizedLiveUrl

  return (
    <Card
      role="banner"
      className="relative flex min-h-12 w-full flex-row items-center justify-between gap-3 rounded-2xl bg-background px-4 py-0"
    >
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <span className="truncate">{title}</span>
        {projectStatus && (
          <DeploymentStatus status={projectStatus} className="shrink-0 py-0" />
        )}
      </div>

      <Switcher
        aria-label="Preview viewport"
        value={viewport}
        options={viewportOptions}
        onValueChange={(value) =>
          onViewportChange(value as PreviewViewportPreset)
        }
        className="absolute left-1/2 -translate-x-1/2"
      />

      <div className="flex shrink-0 items-center gap-2">
        {isLive && (
          <IconButton
            render={
              <a
                href={normalizedLiveUrl}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            // icon={ArrowSquareOutIcon}
            iconPosition="end"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full"
          >
            Visit website
          </IconButton>
        )}
        {onToggleSchemaForm && (
          <IconButton
            type="button"
            icon={SidebarSimpleIcon}
            variant="ghost"
            size="icon"
            className="rounded-full"
            iconClassName="text-foreground/70 rotate-180"
            onClick={onToggleSchemaForm}
            aria-label="Toggle edit content sidebar"
            aria-expanded={isSchemaFormOpen}
            title="Toggle edit content sidebar"
          />
        )}
      </div>
    </Card>
  )
}
