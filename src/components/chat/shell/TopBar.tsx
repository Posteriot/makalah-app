// src/components/chat/shell/TopBar.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
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
  /** Number of artifacts (0 = panel toggle disabled) */
  artifactCount: number
  /** Current conversation id when inside a conversation-scoped page */
  conversationId?: string | null
  /** Whether naskah is available for this session */
  naskahAvailable?: boolean
  /** Whether a newer naskah snapshot exists */
  naskahUpdatePending?: boolean
  /** Which page context is active inside the chat shell */
  routeContext?: "chat" | "naskah"
  /** Callback to toggle artifact panel */
  onArtifactToggle?: () => void
  /** Whether artifact panel is currently open */
  isArtifactPanelOpen?: boolean
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
  artifactCount,
  conversationId,
  naskahAvailable = false,
  naskahUpdatePending = false,
  routeContext = "chat",
  onArtifactToggle,
  isArtifactPanelOpen = false,
}: TopBarProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const { user, isLoading } = useCurrentUser()

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  const hasArtifacts = artifactCount > 0
  const compactArtifactCount = artifactCount > 99 ? "99+" : `${artifactCount}`
  const showNaskahLink =
    routeContext === "chat" && Boolean(conversationId)
  const showChatLink = routeContext === "naskah" && Boolean(conversationId)

  // Auto-show tooltip when naskahAvailable transitions false → true.
  // Fires once per transition, auto-closes after 5 seconds.
  const prevAvailableRef = useRef(naskahAvailable)
  const [showNaskahTooltip, setShowNaskahTooltip] = useState(false)

  useEffect(() => {
    const wasAvailable = prevAvailableRef.current
    prevAvailableRef.current = naskahAvailable

    if (!wasAvailable && naskahAvailable) {
      // Sync external state change (prop transition) into local UI
      // state — the canonical exception to the "no setState in effect"
      // rule. The tooltip is a transient UI reaction to a prop event.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowNaskahTooltip(true)
      const timer = setTimeout(() => setShowNaskahTooltip(false), 5_000)
      return () => clearTimeout(timer)
    }
  }, [naskahAvailable])

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
          {showNaskahLink && conversationId && (
            naskahAvailable ? (
              <Link
                href={`/naskah/${conversationId}`}
                target="_blank"
                className={cn(
                  "inline-flex items-center gap-2 rounded-action px-3 py-1.5 text-xs font-medium",
                  "bg-[var(--chat-info)] text-white",
                  "hover:bg-[oklch(0.53_0.158_241.966)]",
                  "transition-all duration-150",
                  showNaskahTooltip && "animate-pulse",
                )}
              >
                <span>Naskah jadi</span>
                {naskahUpdatePending && (
                  <span
                    data-testid="naskah-update-dot"
                    className="inline-flex h-2 w-2 rounded-full bg-white/80"
                  />
                )}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className={cn(
                  "inline-flex items-center rounded-action px-3 py-1.5 text-xs font-medium",
                  "bg-[var(--chat-muted)] text-[var(--chat-muted-foreground)]",
                  "cursor-default select-none",
                )}
              >
                Naskah jadi
              </span>
            )
          )}

          {showChatLink && conversationId && (
            <Link
              href={`/chat/${conversationId}`}
              target="_blank"
              className={cn(
                "inline-flex items-center rounded-action px-3 py-1.5 text-sm",
                "text-[var(--chat-foreground)] hover:bg-[var(--chat-accent)]",
                "transition-colors duration-150",
              )}
            >
              Percakapan
            </Link>
          )}

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
          <button
            type="button"
            onClick={hasArtifacts ? onArtifactToggle : undefined}
            disabled={!hasArtifacts}
            className={cn(
              "relative mr-0.5 inline-flex h-8 min-w-[2.4rem] items-center justify-center rounded-action px-1",
              "transition-colors duration-150",
              hasArtifacts && isArtifactPanelOpen
                ? "bg-[var(--chat-info)] text-white hover:bg-[oklch(0.53_0.158_241.966)] cursor-pointer"
                : hasArtifacts
                  ? "text-[color:color-mix(in_oklab,var(--chat-foreground)_88%,var(--chat-muted-foreground))] hover:bg-[var(--chat-accent)] cursor-pointer"
                  : "text-[var(--chat-muted-foreground)] opacity-45 cursor-default",
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
                hasArtifacts && isArtifactPanelOpen
                  ? "bg-white text-[var(--chat-info)]"
                  : hasArtifacts
                    ? "bg-[var(--chat-info)] text-white dark:text-[color:color-mix(in_oklab,var(--chat-foreground)_92%,white)]"
                    : "bg-[var(--chat-muted)] text-[var(--chat-muted-foreground)]"
              )}
            >
              {compactArtifactCount}
            </span>
          </button>

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
