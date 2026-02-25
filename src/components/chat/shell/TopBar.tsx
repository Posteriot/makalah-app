// src/components/chat/shell/TopBar.tsx
"use client"

import { useTheme } from "next-themes"
import {
  SunLight,
  HalfMoon,
  FastArrowRightSquare,
  FastArrowRight,
} from "iconoir-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
 * Right: Theme toggle, Panel toggle, User dropdown
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

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex items-center justify-between",
          "pl-4 pr-6 py-0",
          "shrink-0 bg-[var(--chat-background)]"
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
                    "text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)] hover:bg-[var(--chat-accent)]",
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
        <div className="flex items-center gap-2 pt-1">
          {/* Theme Toggle */}
          {!isLoading && user && (
            <button
              onClick={toggleTheme}
              className={cn(
                "flex items-center justify-center",
                "w-8 h-8 rounded-action",
                "text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)] hover:bg-[var(--chat-accent)]",
                "transition-colors duration-150"
              )}
              aria-label="Toggle theme"
            >
              <SunLight className="h-4 w-4 hidden dark:block" />
              <HalfMoon className="h-4 w-4 block dark:hidden" />
            </button>
          )}

          {/* Artifact Panel Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={hasArtifacts ? onTogglePanel : undefined}
                disabled={!hasArtifacts}
                className={cn(
                  "relative mr-1 inline-flex h-8 w-8 items-center justify-center rounded-action",
                  "transition-colors duration-150",
                  hasArtifacts &&
                    isPanelCollapsed &&
                    "border-transparent bg-transparent text-[var(--chat-muted-foreground)] hover:bg-transparent hover:text-[var(--chat-foreground)]",
                  hasArtifacts &&
                    !isPanelCollapsed &&
                    "border-transparent bg-transparent text-[var(--chat-foreground)] hover:bg-transparent hover:text-[var(--chat-foreground)]",
                  !hasArtifacts &&
                    "cursor-not-allowed border border-transparent bg-transparent text-[var(--chat-muted-foreground)] hover:bg-transparent hover:text-[var(--chat-muted-foreground)]"
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
                <FastArrowRightSquare
                  className={cn(
                    "h-[20px] w-[20px]",
                    isPanelCollapsed && "rotate-180"
                  )}
                />
                {hasArtifacts ? (
                  <span
                    className={cn(
                      "pointer-events-none absolute -bottom-0 -right-1 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1",
                      "text-[9px] font-semibold font-mono leading-none",
                      "bg-[var(--chat-info)] text-[var(--chat-info-foreground)]"
                    )}
                  >
                    {compactArtifactCount}
                  </span>
                ) : null}
              </button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">
              {!hasArtifacts
                ? "Belum ada artifak untuk dibuka"
                : `${isPanelCollapsed ? "Panel tertutup" : "Panel terbuka"} • ${artifactCount} artifak`}
            </TooltipContent>
          </Tooltip>

          {/* User Dropdown / Settings entry */}
          <UserDropdown variant="compact" />
        </div>
      </div>
    </TooltipProvider>
  )
}
