// src/components/cms/CmsTopBar.tsx
"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { SunLight, HalfMoon, FastArrowRight, Dashboard } from "iconoir-react"
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

interface CmsTopBarProps {
  /** Whether sidebar is collapsed */
  isSidebarCollapsed: boolean
  /** Callback to toggle sidebar */
  onToggleSidebar: () => void
}

/**
 * CmsTopBar - Controls bar at the top of the CMS main content area
 *
 * Normal flow element (shrink-0) with solid background.
 * Forked from chat TopBar with admin dashboard link replacing artifact toggle.
 *
 * Left: Expand sidebar toggle (only when sidebar collapsed)
 * Right: Theme toggle, Admin Dashboard link, User dropdown
 */
export function CmsTopBar({
  isSidebarCollapsed,
  onToggleSidebar,
}: CmsTopBarProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const { user, isLoading } = useCurrentUser()

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex items-center justify-between",
          "pl-4 pr-6 py-0",
          "shrink-0 bg-white dark:bg-slate-900"
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
              <TooltipContent className="font-mono text-xs">
                Toggle theme
              </TooltipContent>
            </Tooltip>
          )}

          {/* Admin Dashboard Link */}
          {!isLoading && user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/dashboard"
                  className={cn(
                    "flex items-center justify-center",
                    "w-8 h-8 rounded-action",
                    "text-muted-foreground hover:text-foreground hover:bg-accent/80",
                    "transition-colors duration-150"
                  )}
                  aria-label="Admin Dashboard"
                >
                  <Dashboard className="h-4 w-4" aria-hidden="true" />
                </Link>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">
                Admin Dashboard
              </TooltipContent>
            </Tooltip>
          )}

          {/* User Dropdown */}
          <UserDropdown variant="compact" />
        </div>
      </div>
    </TooltipProvider>
  )
}

export default CmsTopBar
