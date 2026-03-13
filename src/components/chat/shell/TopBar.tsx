// src/components/chat/shell/TopBar.tsx
"use client"

import { useTheme } from "next-themes"
import {
  SunLight,
  HalfMoon,
  FastArrowRight,
  Page,
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
 * Right: Theme toggle, file indicator, User dropdown
 */
export function TopBar({
  isSidebarCollapsed,
  onToggleSidebar,
  isPanelCollapsed: _isPanelCollapsed,
  onTogglePanel: _onTogglePanel,
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

          {/* Artifact File Indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "relative mr-0.5 inline-flex h-8 min-w-[2.4rem] items-center justify-center rounded-action px-1",
                  hasArtifacts
                    ? "text-[color:color-mix(in_oklab,var(--chat-foreground)_88%,var(--chat-muted-foreground))]"
                    : "text-[var(--chat-muted-foreground)] opacity-45"
                )}
                aria-label={
                  hasArtifacts
                    ? `${artifactCount} artifak tersedia`
                    : "Belum ada artifak"
                }
              >
                <Page className="h-[18px] w-[18px]" aria-hidden="true" />
                <span
                  className={cn(
                    "pointer-events-none absolute -bottom-0 -right-[0.12rem] inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1",
                    "text-[9px] font-semibold font-mono leading-none",
                    hasArtifacts
                      ? "bg-[var(--chat-info)] text-white dark:text-[color:color-mix(in_oklab,var(--chat-foreground)_92%,white)]"
                      : "bg-[var(--chat-muted)] text-[var(--chat-muted-foreground)]"
                  )}
                >
                  {compactArtifactCount}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">
              {!hasArtifacts
                ? "Belum ada artifak pada sesi ini"
                : `${artifactCount} artifak pada sesi ini`}
            </TooltipContent>
          </Tooltip>

          {/* User Dropdown / Settings entry */}
          <UserDropdown
            variant="compact"
            compactLabel="first-name"
            compactTriggerClassName="h-7 max-w-[116px] border-transparent bg-transparent px-1 text-xs hover:bg-transparent dark:hover:bg-transparent"
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
