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
  /** "default" = full name + chevron (marketing/dashboard), "compact" = icon only (chat) */
  variant?: "default" | "compact"
}

export function UserDropdown({ variant = "default" }: UserDropdownProps) {
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
      ? <Skeleton className="w-8 h-8 rounded-full" />
      : <Skeleton className="h-[30px] w-[100px] rounded-action" />
  }

  const firstName = convexUser?.firstName || stableSession?.user?.name?.split(" ")[0] || "User"
  const lastName = convexUser?.lastName || stableSession?.user?.name?.split(" ").slice(1).join(" ") || ""
  const fullName = `${firstName} ${lastName}`.trim()

  // isAdmin berdasarkan ROLE untuk menampilkan Admin Panel link
  const isAdmin = convexUser?.role === "admin" || convexUser?.role === "superadmin"

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)

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
            {fullName}
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
        <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-border bg-popover shadow-md z-drawer py-2 px-2">
          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-dense p-dense text-sm font-medium text-narrative text-foreground dark:text-slate-50 hover:bg-slate-900 hover:text-slate-50 dark:hover:bg-slate-100 dark:hover:text-slate-900 transition-colors w-full rounded-action"
          >
            <User className="icon-interface" />
            <span>Atur Akun</span>
          </Link>

          {/* Subscription Link */}
          <Link
            href="/subscription/overview"
            onClick={() => setIsOpen(false)}
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
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-dense p-dense text-sm font-medium text-narrative text-foreground dark:text-slate-50 hover:bg-slate-900 hover:text-slate-50 transition-colors rounded-action dark:hover:bg-slate-100 dark:hover:text-slate-900"
              >
                <Settings className="icon-interface" />
                <span>Admin Panel</span>
              </Link>
              <Link
                href="/cms"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-dense p-dense text-sm font-medium text-narrative text-foreground dark:text-slate-50 hover:bg-slate-900 hover:text-slate-50 transition-colors rounded-action dark:hover:bg-slate-100 dark:hover:text-slate-900"
              >
                <Journal className="icon-interface" />
                <span>Content CMS</span>
              </Link>
              <Link
                href="/ai-ops"
                onClick={() => setIsOpen(false)}
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
