"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { signOut, useSession } from "@/lib/auth-client"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import {
  Activity,
  Settings,
  LogOut,
  NavArrowDown,
  RefreshDouble,
  User,
  CreditCard,
  Journal,
  WarningTriangle,
} from "iconoir-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthButton } from "@/components/ui/auth-button"

interface UserDropdownProps {
  /** "default" = text + chevron (marketing/dashboard), "compact" = compact trigger */
  variant?: "default" | "compact"
  /** Compact trigger label mode */
  compactLabel?: "icon-only" | "first-name"
  /** Additional classes for compact trigger only */
  compactTriggerClassName?: string
  /** Stretch compact trigger to parent width (used in mobile sidebar footer) */
  compactFill?: boolean
  /** Dropdown placement relative to trigger */
  placement?: "bottom-end" | "top-start" | "top-end"
  /** Optional callback after menu action completes (e.g., close mobile sheet) */
  onActionComplete?: () => void
  /** Parent-provided display name to avoid local auth gating */
  displayName?: string
  /** Parent-provided admin override */
  isAdminOverride?: boolean
  /** Parent-provided sign out handler */
  onSignOutOverride?: () => Promise<void> | void
  /** Disable trigger and actions */
  disabled?: boolean
}

export function UserDropdown({
  variant = "default",
  compactLabel = "icon-only",
  compactTriggerClassName,
  compactFill = false,
  placement = "bottom-end",
  onActionComplete,
  displayName,
  isAdminOverride,
  onSignOutOverride,
  disabled = false,
}: UserDropdownProps) {
  const { data: session, isPending: isSessionPending } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get Convex user for role and subscription status
  const { user: convexUser } = useCurrentUser()

  // Prevent hydration mismatch: server always renders skeleton,
  // client also renders skeleton on first paint, then swaps after mount.
  useEffect(() => {
    // Intentionally set after mount so initial client paint matches SSR skeleton.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Close on ESC key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  useEffect(() => {
    if (disabled) {
      setIsOpen(false)
    }
  }, [disabled])

  const canRenderFromParent = typeof displayName === "string" && displayName.trim().length > 0

  // Show skeleton on SSR + first client paint, while auth session is still pending,
  // or when standalone usage has no authenticated session.
  if (!hasMounted || isSessionPending || (!canRenderFromParent && !session)) {
    return variant === "compact"
      ? compactLabel === "first-name"
        ? <Skeleton className={cn("rounded-action", compactFill ? "h-11 w-full" : "h-8 w-[132px]")} />
        : <Skeleton className="w-8 h-8 rounded-full" />
      : <Skeleton className="h-[30px] w-[100px] rounded-action" />
  }

  const firstName = displayName || convexUser?.firstName || session?.user?.name?.split(" ")[0] || "User"

  // isAdmin berdasarkan ROLE untuk menampilkan Admin Panel link
  const isAdmin =
    isAdminOverride ?? (convexUser?.role === "admin" || convexUser?.role === "superadmin")

  const closeAfterAction = () => {
    setIsOpen(false)
    onActionComplete?.()
  }

  const menuPositionClass = (() => {
    if (placement === "top-start") return "left-0 bottom-full mb-2"
    if (placement === "top-end") return "right-0 bottom-full mb-2"
    return "right-0 top-full mt-2"
  })()
  const menuItemClassName =
    "flex items-center gap-dense rounded-action p-dense text-sm font-medium text-narrative text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"

  const handleSignOut = async () => {
    if (isSigningOut || disabled) return
    setIsSigningOut(true)
    closeAfterAction()

    if (onSignOutOverride) {
      await onSignOutOverride()
      return
    }

    // Clear browser cookie first — crossDomainClient clears localStorage
    // in its init hook (before POST), which can unmount this component.
    document.cookie =
      "ba_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"

    try {
      await signOut()
    } catch {
      // Expected: component may unmount during sign-out, response can abort.
      // Session is already cleared client-side.
    }

    window.location.href = "/"
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      {variant === "compact" ? (
        compactLabel === "first-name" ? (
          <button
            onClick={() => {
              if (disabled) return
              setIsOpen(!isOpen)
            }}
            className={cn(
              "group relative inline-flex items-center gap-2 rounded-action border border-border bg-popover px-2.5",
              "text-sm font-medium text-foreground transition-colors duration-150 focus-ring",
              "hover:bg-accent",
              compactFill ? "min-h-11 w-full py-2 justify-start" : "h-8 max-w-[156px] py-1",
              isOpen && "bg-accent",
              disabled && "cursor-not-allowed opacity-60",
              compactTriggerClassName
            )}
            aria-expanded={isOpen}
            aria-haspopup="true"
            aria-label="User menu"
            disabled={disabled}
          >
            <span className="relative inline-flex h-5 w-5 items-center justify-center text-foreground">
              <User className="h-4 w-4" />
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-success"
                aria-hidden="true"
              />
            </span>
            <span className={cn("truncate text-left", compactFill ? "max-w-[96px]" : "max-w-[90px]")}>{firstName}</span>
            <NavArrowDown
              className={cn(
                "ml-auto h-4 w-4 shrink-0 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </button>
        ) : (
          <button
            onClick={() => {
              if (disabled) return
              setIsOpen(!isOpen)
            }}
            className={cn(
              "relative flex items-center justify-center",
              "w-8 h-8 rounded-full",
              "text-muted-foreground hover:text-foreground hover:bg-accent/80",
              "transition-colors duration-150",
              isOpen && "text-foreground bg-accent/80",
              disabled && "cursor-not-allowed opacity-60"
            )}
            aria-expanded={isOpen}
            aria-haspopup="true"
            aria-label="User menu"
            disabled={disabled}
          >
            <User className="h-[18px] w-[18px]" />
            <span
              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-success"
              aria-hidden="true"
            />
          </button>
        )
      ) : (
        <AuthButton
          onClick={() => {
            if (disabled) return
            setIsOpen(!isOpen)
          }}
          className="inline-flex"
          contentClassName="text-sm font-medium text-narrative"
          active={isOpen}
          disabled={disabled}
          ariaExpanded={isOpen}
          ariaHaspopup="menu"
        >
          {/* Name (hidden on mobile) */}
          <span className="max-w-[120px] truncate">
            {firstName}
          </span>

          {/* Chevron */}
          <NavArrowDown
            className={cn(
              "icon-interface transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </AuthButton>
      )}

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className={cn("absolute z-drawer w-48 rounded-md border border-border bg-popover px-2 py-2 shadow-md", menuPositionClass)}>
          <Link
            href="/settings"
            onClick={closeAfterAction}
            className={cn(menuItemClassName, "w-full")}
          >
            <User className="icon-interface" />
            <span>Atur Akun</span>
          </Link>

          {/* Subscription Link */}
          <Link
            href="/subscription/overview"
            onClick={closeAfterAction}
            className={menuItemClassName}
          >
            <CreditCard className="icon-interface" />
            <span>Subskripsi</span>
          </Link>

          <Link
            href="/support/technical-report?source=support-page"
            onClick={closeAfterAction}
            className={menuItemClassName}
          >
            <WarningTriangle className="icon-interface" />
            <span>Lapor Masalah</span>
          </Link>

          {/* Admin Panel Link (conditional) */}
          {isAdmin && (
            <>
              <Link
                href="/dashboard"
                onClick={closeAfterAction}
                className={menuItemClassName}
              >
                <Settings className="icon-interface" />
                <span>Admin Panel</span>
              </Link>
              <Link
                href="/cms"
                onClick={closeAfterAction}
                className={menuItemClassName}
              >
                <Journal className="icon-interface" />
                <span>Content CMS</span>
              </Link>
              <Link
                href="/ai-ops"
                onClick={closeAfterAction}
                className={menuItemClassName}
              >
                <Activity className="icon-interface" />
                <span>AI Ops</span>
              </Link>
            </>
          )}

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={cn(
              "w-full flex items-center gap-dense p-dense text-sm font-medium text-narrative transition-colors rounded-action",
              isSigningOut
                ? "text-muted-foreground cursor-not-allowed"
                : "text-destructive hover:bg-destructive/10 hover:text-destructive"
            )}
          >
            {isSigningOut ? (
              <RefreshDouble className="icon-interface animate-spin" />
            ) : (
              <LogOut className="icon-interface" />
            )}
            <span>{isSigningOut ? "Keluar..." : "Sign out"}</span>
          </button>
        </div>
      )}

    </div>
  )
}
