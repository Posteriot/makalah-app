// src/components/chat/shell/TopBar.tsx
"use client"

import { useTheme } from "next-themes"
import {
  SunLight,
  HalfMoon,
  FastArrowRightSquare,
  FastArrowRight,
} from "iconoir-react"
import { FastArrowRightSquare as FastArrowRightSquareSolid } from "iconoir-react/solid"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { NotificationDropdown } from "./NotificationDropdown"
import { UserDropdown } from "@/components/layout/header"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"

interface TopBarProps {
  /** Whether sidebar is collapsed */
  isSidebarCollapsed: boolean
  /** Callback to toggle sidebar */
  onToggleSidebar: () => void
  /** Whether the artifact panel is collapsed */
  isPanelCollapsed: boolean
  /** Callback to toggle the artifact panel */
  onTogglePanel: () => void
  /** Number of artifacts (0 = panel toggle disabled) */
  artifactCount: number
}

/**
 * TopBar - Controls bar at the top of the main chat area
 *
 * Normal flow element (shrink-0) with solid background matching chat area.
 * Content scrolls below it, not behind it.
 *
 * Left: Expand sidebar toggle (only when sidebar collapsed)
 * Right: Notification, Theme toggle, Panel toggle, Segment badge, User dropdown
 */
export function TopBar({
  isSidebarCollapsed,
  onToggleSidebar,
  isPanelCollapsed,
  onTogglePanel,
  artifactCount,
}: TopBarProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const { user, isLoading } = useCurrentUser()

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  const hasArtifacts = artifactCount > 0
  const compactArtifactCount = artifactCount > 99 ? "99+" : `${artifactCount}`
  const panelStateLabel = !hasArtifacts
    ? "Tanpa artifak"
    : isPanelCollapsed
      ? "Panel tertutup"
      : "Panel terbuka"

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex items-center justify-between",
          "pl-4 pr-6 py-0",
          "shrink-0 bg-slate-50 dark:bg-slate-900"
        )}
      >
        {/* Left: Expand sidebar toggle (only when collapsed) */}
        <div>
          {isSidebarCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-8 h-8 rounded-action",
                    "text-muted-foreground hover:text-foreground hover:bg-accent/80",
                    "transition-colors duration-150"
                  )}
                  onClick={onToggleSidebar}
                  aria-label="Expand sidebar"
                >
                  <FastArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-xs">
                Expand sidebar
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <NotificationDropdown />

          {/* Theme Toggle */}
          {!isLoading && user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleTheme}
                  className={cn(
                    "flex items-center justify-center",
                    "w-8 h-8 rounded-action",
                    "text-muted-foreground hover:text-foreground hover:bg-accent/80",
                    "transition-colors duration-150"
                  )}
                  aria-label="Toggle theme"
                >
                  <SunLight className="h-4 w-4 hidden dark:block" />
                  <HalfMoon className="h-4 w-4 block dark:hidden" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">Toggle theme</TooltipContent>
            </Tooltip>
          )}

          {/* Artifact Panel Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={hasArtifacts ? onTogglePanel : undefined}
                disabled={!hasArtifacts}
                className={cn(
                  "relative mr-1 inline-flex h-8 items-center gap-1.5 rounded-action border px-2",
                  "border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/80",
                  "transition-colors duration-150",
                  hasArtifacts && isPanelCollapsed && "bg-background/75",
                  hasArtifacts && !isPanelCollapsed && "border-primary/35 bg-primary/10 text-primary",
                  !hasArtifacts && "cursor-not-allowed border-border/45 bg-muted/60 text-muted-foreground/70 hover:bg-muted/60 hover:text-muted-foreground/70"
                )}
                aria-label={
                  !hasArtifacts
                    ? "Panel artifak nonaktif karena belum ada artifak"
                    : isPanelCollapsed
                      ? `Buka panel artifak (${artifactCount})`
                      : `Tutup panel artifak (${artifactCount})`
                }
                aria-pressed={hasArtifacts ? !isPanelCollapsed : undefined}
              >
                {isPanelCollapsed ? (
                  <FastArrowRightSquare className="h-[17px] w-[17px] rotate-180" />
                ) : (
                  <FastArrowRightSquareSolid className="h-[17px] w-[17px]" />
                )}
                <span className="hidden text-[10px] font-mono font-semibold uppercase tracking-wide sm:inline">
                  Artifak
                </span>
                {hasArtifacts && (
                  <span
                    className={cn(
                      "inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-badge border px-1",
                      "text-[9px] font-semibold font-mono leading-none",
                      isPanelCollapsed
                        ? "border-border/60 bg-muted/70 text-foreground"
                        : "border-primary/35 bg-primary text-primary-foreground"
                    )}
                  >
                    {compactArtifactCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">
              {!hasArtifacts
                ? "Belum ada artifak untuk dibuka"
                : `${panelStateLabel} • ${artifactCount} artifak`}
            </TooltipContent>
          </Tooltip>

          <span
            className={cn(
              "hidden rounded-badge border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide lg:inline-flex",
              hasArtifacts
                ? isPanelCollapsed
                  ? "border-border/60 bg-background/70 text-muted-foreground"
                  : "border-primary/30 bg-primary/10 text-primary"
                : "border-border/50 bg-muted/60 text-muted-foreground/75"
            )}
          >
            {panelStateLabel}
          </span>

          {/* User Dropdown */}
          <UserDropdown variant="compact" />
        </div>
      </div>
    </TooltipProvider>
  )
}

export default TopBar
