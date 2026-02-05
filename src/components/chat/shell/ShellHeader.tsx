"use client"

import Image from "next/image"
import Link from "next/link"
import { useTheme } from "next-themes"
import { SunLight, HalfMoon, SidebarExpand, SidebarCollapse } from "iconoir-react"
import { cn } from "@/lib/utils"
import { SegmentBadge } from "@/components/ui/SegmentBadge"
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
 * Height: 72px (56px content + 16px stripes/spacing)
 *
 * Components:
 * - Logo + brand text (left)
 * - Segment badge (left, next to logo)
 * - Notifications dropdown (right)
 * - Theme toggle (right)
 * - Panel expand button (right, visible when panel collapsed)
 * - User dropdown (right)
 *
 * Features:
 * - Diagonal stripes separator (10px height, industrial accent)
 * - Horizontal line border below stripes
 * - Reuses existing UserDropdown component
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
        "relative flex items-center justify-between",
        "h-[var(--shell-header-h,72px)] px-4 pt-3 pb-4",
        "bg-background"
      )}
      style={{
        // CSS variable for header height
        "--shell-header-h": "72px",
      } as React.CSSProperties}
    >
      {/* Left Section: Logo + Brand + Segment Badge */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          {/* Light logo icon (for dark mode) */}
          <Image
            src="/logo/makalah_logo_light.svg"
            alt="Makalah"
            width={24}
            height={24}
            className="logo-img logo-img-light"
          />
          {/* Dark logo icon (for light mode) */}
          <Image
            src="/logo/makalah_logo_dark.svg"
            alt="Makalah"
            width={24}
            height={24}
            className="logo-img logo-img-dark"
          />
          {/* White brand text (for dark mode) */}
          <Image
            src="/logo-makalah-ai-white.svg"
            alt="Makalah"
            width={80}
            height={18}
            className="logo-brand-text logo-brand-light"
          />
          {/* Black brand text (for light mode) */}
          <Image
            src="/logo-makalah-ai-black.svg"
            alt="Makalah"
            width={80}
            height={18}
            className="logo-brand-text logo-brand-dark"
          />
        </Link>

        {/* Segment Badge */}
        {!isLoading && user && (
          <SegmentBadge
            role={user.role}
            subscriptionStatus={user.subscriptionStatus}
          />
        )}
      </div>

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
                  "w-9 h-9 rounded-lg",
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
                  "w-9 h-9 rounded-lg",
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

      {/* Diagonal Stripes Separator (Industrial Accent) */}
      <svg
        className={cn(
          "absolute bottom-0 left-0 right-0",
          "w-full h-[10px]",
          "text-muted-foreground opacity-30",
          "pointer-events-none"
        )}
        aria-hidden="true"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="shell-diagonal-stripes"
            x="0"
            y="0"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="10" x2="10" y2="0" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#shell-diagonal-stripes)" />
      </svg>

      {/* Horizontal line border below stripes */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0",
          "h-px bg-border"
        )}
      />
    </header>
  )
}

export default ShellHeader
