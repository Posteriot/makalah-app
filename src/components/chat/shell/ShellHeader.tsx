"use client"

import { useTheme } from "next-themes"
import { SunLight, HalfMoon, SidebarExpand, SidebarCollapse } from "iconoir-react"
import { cn } from "@/lib/utils"
import { NotificationDropdown } from "./NotificationDropdown"
import { UserDropdown } from "@/components/layout/header"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

interface ShellHeaderProps {
  /** Whether the artifact panel is collapsed */
  isPanelCollapsed: boolean
  /** Callback to toggle the panel (expand/collapse) */
  onTogglePanel: () => void
  /** Number of artifacts (for badge display) */
  artifactCount?: number
}

/**
 * ShellHeader - Standalone chat page header
 *
 * Components:
 * - Notifications dropdown (right)
 * - Theme toggle (right)
 * - Panel expand button (right, visible when panel collapsed)
 * - User dropdown (right)
 *
 * Note: Logo + brand moved to ActivityBar + ChatSidebar header
 */
export function ShellHeader({ isPanelCollapsed, onTogglePanel, artifactCount = 0 }: ShellHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const { user, isLoading } = useCurrentUser()

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <header
      className={cn(
        "relative flex items-center justify-end",
        "h-[var(--shell-header-h)] px-4 py-2",
        "bg-background"
      )}
    >
      {/* Right Section: Notifications, Theme Toggle, Panel Expand, User */}
      <div className="flex items-center gap-2">
        {/* Notifications Dropdown */}
        <NotificationDropdown />

        {/* Theme Toggle - Only visible for logged-in users */}
        {!isLoading && user && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className={cn(
                  "flex items-center justify-center",
                  "w-9 h-9 rounded-action",
                  "text-muted-foreground hover:text-foreground hover:bg-accent",
                  "transition-colors duration-150"
                )}
                aria-label="Toggle theme"
              >
                {/* Sun icon (visible in dark mode, clicking switches to light) */}
                <SunLight className="h-5 w-5 hidden dark:block" />
                {/* Moon icon (visible in light mode, clicking switches to dark) */}
                <HalfMoon className="h-5 w-5 block dark:hidden" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">Toggle theme</TooltipContent>
          </Tooltip>
        )}

        {/* Panel Toggle Button (always visible when has artifacts) */}
        {artifactCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onTogglePanel}
                className={cn(
                  "relative flex items-center justify-center",
                  "w-9 h-9 rounded-action",
                  "text-muted-foreground hover:text-foreground hover:bg-accent",
                  "transition-colors duration-150"
                )}
                aria-label={isPanelCollapsed ? `Open artifacts panel (${artifactCount} artifacts)` : "Close artifacts panel"}
                data-testid="panel-toggle-btn"
              >
                {/* Icon changes based on panel state */}
                {isPanelCollapsed ? (
                  <SidebarExpand className="h-5 w-5" />
                ) : (
                  <SidebarCollapse className="h-5 w-5" />
                )}
                {/* Artifact count badge - Amber per Mechanical Grace spec */}
                <span
                  className={cn(
                    "absolute -top-1 -right-1",
                    "min-w-[18px] h-[18px] px-1",
                    "flex items-center justify-center",
                    "text-[10px] font-semibold font-mono",
                    "bg-amber-500 text-white",
                    "rounded-full",
                    "transition-opacity duration-150",
                    isPanelCollapsed ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                >
                  {artifactCount}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">
              {isPanelCollapsed ? `Open artifacts panel (${artifactCount} artifacts)` : "Close artifacts panel"}
            </TooltipContent>
          </Tooltip>
        )}

        {/* User Dropdown */}
        <UserDropdown />
      </div>

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-border/50" />
    </header>
  )
}

export default ShellHeader
