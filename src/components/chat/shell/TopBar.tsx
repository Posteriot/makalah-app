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

          {/* Panel Toggle — always visible, disabled when no artifacts */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={hasArtifacts ? onTogglePanel : undefined}
                disabled={!hasArtifacts}
                className={cn(
                  "relative flex items-center justify-center",
                  "w-8 h-8 rounded-action mr-1",
                  "text-muted-foreground hover:text-foreground hover:bg-accent/80",
                  "transition-colors duration-150",
                  !hasArtifacts && "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                )}
                aria-label={
                  !hasArtifacts
                    ? "No artifacts"
                    : isPanelCollapsed
                      ? `Open artifacts panel (${artifactCount})`
                      : "Close artifacts panel"
                }
              >
                {isPanelCollapsed ? (
                  <FastArrowRightSquare className="h-[18px] w-[18px] rotate-180" />
                ) : (
                  <FastArrowRightSquareSolid className="h-[18px] w-[18px]" />
                )}
                {hasArtifacts && isPanelCollapsed && (
                  <span
                    className={cn(
                      "absolute -bottom-1 -right-1",
                      "min-w-[16px] h-[16px] px-1",
                      "flex items-center justify-center",
                      "text-[9px] font-semibold font-mono leading-none",
                      "bg-emerald-500 text-white",
                      "rounded-full border border-[color:var(--section-bg-alt)]"
                    )}
                  >
                    {artifactCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">
              {!hasArtifacts
                ? "No artifacts"
                : isPanelCollapsed
                  ? `Open artifacts (${artifactCount})`
                  : "Close artifacts"}
            </TooltipContent>
          </Tooltip>

          {/* User Dropdown */}
          <UserDropdown variant="compact" />
        </div>
      </div>
    </TooltipProvider>
  )
}

export default TopBar
