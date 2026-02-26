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
} from "iconoir-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

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
}

export function UserDropdown({
  variant = "default",
  compactLabel = "icon-only",
  compactTriggerClassName,
  compactFill = false,
  placement = "bottom-end",
  onActionComplete,
}: UserDropdownProps) {
  const { data: session } = useSession()
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

  // Cache last session — prevents skeleton flash on tab refocus
  // when BetterAuth briefly re-validates session.
  // Uses setState-during-render pattern (React-supported derived state).
  const [lastSession, setLastSession] = useState(session)
  if (session && session !== lastSession) {
    setLastSession(session)
  }
  const stableSession = session ?? lastSession

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

  // Show skeleton on SSR + first client paint (hasMounted=false) OR when no session yet.
  // Both server and client render the same skeleton initially → no hydration mismatch.
  if (!hasMounted || !stableSession) {
    return variant === "compact"
      ? compactLabel === "first-name"
        ? <Skeleton className={cn("rounded-action", compactFill ? "h-11 w-full" : "h-8 w-[132px]")} />
        : <Skeleton className="w-8 h-8 rounded-full" />
      : <Skeleton className="h-[30px] w-[100px] rounded-action" />
  }

  const firstName = convexUser?.firstName || stableSession?.user?.name?.split(" ")[0] || "User"

  // isAdmin berdasarkan ROLE untuk menampilkan Admin Panel link
  const isAdmin = convexUser?.role === "admin" || convexUser?.role === "superadmin"

  const closeAfterAction = () => {
    setIsOpen(false)
    onActionComplete?.()
  }

  const menuPositionClass = (() => {
    if (placement === "top-start") return "left-0 bottom-full mb-2"
    if (placement === "top-end") return "right-0 bottom-full mb-2"
    return "right-0 top-full mt-2"
  })()

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    closeAfterAction()

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
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "group relative inline-flex items-center gap-2 rounded-action border border-border bg-popover px-2.5",
              "text-sm font-medium text-foreground transition-colors duration-150 focus-ring",
              "hover:bg-accent",
              compactFill ? "min-h-11 w-full py-2 justify-start" : "h-8 max-w-[156px] py-1",
              isOpen && "bg-accent",
              compactTriggerClassName
            )}
            aria-expanded={isOpen}
            aria-haspopup="true"
            aria-label="User menu"
          >
            <span className="relative inline-flex h-5 w-5 items-center justify-center text-foreground">
              <User className="h-4 w-4" />
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500"
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
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "relative flex items-center justify-center",
              "w-8 h-8 rounded-full",
              "text-muted-foreground hover:text-foreground hover:bg-accent/80",
              "transition-colors duration-150",
              isOpen && "text-foreground bg-accent/80"
            )}
            aria-expanded={isOpen}
            aria-haspopup="true"
            aria-label="User menu"
          >
            <User className="h-[18px] w-[18px]" />
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[color:var(--section-bg-alt)]"
              aria-hidden="true"
            />
          </button>
        )
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            // Structure for stripes animation
            "group relative overflow-hidden",
            // Base layout
            "flex items-center justify-center gap-2 rounded-action px-2 py-1",
            // Typography
            "text-sm font-medium text-narrative",
            // Light mode diam: dark button
            "border border-transparent bg-[color:var(--slate-800)] text-[color:var(--slate-100)]",
            // Light mode hover/expanded: text & border darken
            "hover:text-[color:var(--slate-800)] hover:border-[color:var(--slate-600)]",
            "aria-expanded:text-[color:var(--slate-800)] aria-expanded:border-[color:var(--slate-600)]",
            // Dark mode diam: light button
            "dark:bg-[color:var(--slate-100)] dark:text-[color:var(--slate-800)]",
            // Dark mode hover/expanded: text & border lighten
            "dark:hover:text-[color:var(--slate-100)] dark:hover:border-[color:var(--slate-400)]",
            "dark:aria-expanded:text-[color:var(--slate-100)] dark:aria-expanded:border-[color:var(--slate-400)]",
            // Transition & focus
            "transition-colors focus-ring"
          )}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {/* Diagonal stripes overlay - slides in on hover or when expanded */}
          <span
            className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0 group-aria-expanded:translate-x-0"
            aria-hidden="true"
          />

          {/* Name (hidden on mobile) */}
          <span className="relative z-10 hidden sm:block text-sm font-medium text-narrative max-w-[120px] truncate">
            {firstName}
          </span>

          {/* Chevron */}
          <NavArrowDown
            className={cn(
              "relative z-10 icon-interface transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={cn("absolute w-48 rounded-md border border-border bg-popover shadow-md z-drawer py-2 px-2", menuPositionClass)}>
          <Link
            href="/settings"
            onClick={closeAfterAction}
            className="flex items-center gap-dense p-dense text-sm font-medium text-narrative text-foreground dark:text-slate-50 hover:bg-slate-900 hover:text-slate-50 dark:hover:bg-slate-100 dark:hover:text-slate-900 transition-colors w-full rounded-action"
          >
            <User className="icon-interface" />
            <span>Atur Akun</span>
          </Link>

          {/* Subscription Link */}
          <Link
            href="/subscription/overview"
            onClick={closeAfterAction}
            className="flex items-center gap-dense p-dense text-sm font-medium text-narrative text-foreground text-foreground dark:text-slate-50 hover:bg-slate-900 hover:text-slate-50 dark:hover:bg-slate-100 dark:hover:text-slate-900 transition-colors rounded-action"
          >
            <CreditCard className="icon-interface" />
            <span>Subskripsi</span>
          </Link>

          {/* Admin Panel Link (conditional) */}
          {isAdmin && (
            <>
              <Link
                href="/dashboard"
                onClick={closeAfterAction}
                className="flex items-center gap-dense p-dense text-sm font-medium text-narrative text-foreground dark:text-slate-50 hover:bg-slate-900 hover:text-slate-50 transition-colors rounded-action dark:hover:bg-slate-100 dark:hover:text-slate-900"
              >
                <Settings className="icon-interface" />
                <span>Admin Panel</span>
              </Link>
              <Link
                href="/cms"
                onClick={closeAfterAction}
                className="flex items-center gap-dense p-dense text-sm font-medium text-narrative text-foreground dark:text-slate-50 hover:bg-slate-900 hover:text-slate-50 transition-colors rounded-action dark:hover:bg-slate-100 dark:hover:text-slate-900"
              >
                <Journal className="icon-interface" />
                <span>Content CMS</span>
              </Link>
              <Link
                href="/ai-ops"
                onClick={closeAfterAction}
                className="flex items-center gap-dense p-dense text-sm font-medium text-narrative text-foreground dark:text-slate-50 hover:bg-slate-900 hover:text-slate-50 transition-colors rounded-action dark:hover:bg-slate-100 dark:hover:text-slate-900"
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
                : "text-rose-400 hover:bg-rose-900 hover:text-rose-50"
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
