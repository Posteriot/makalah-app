"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useUser, useClerk } from "@clerk/nextjs"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import {
  Settings,
  LogOut,
  NavArrowDown,
  RefreshDouble,
  User,
  CreditCard,
} from "iconoir-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function UserDropdown() {
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  const [isOpen, setIsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get Convex user for role and subscription status
  const { user: convexUser } = useCurrentUser()

  // Prevent hydration mismatch - only render after mount
  /* eslint-disable react-hooks/set-state-in-effect -- Standard pattern for hydration safety */
  useEffect(() => {
    setMounted(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

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

  // Return null consistently on server and before mount to prevent hydration mismatch
  if (!mounted || !clerkUser) return null

  const firstName = clerkUser.firstName || "User"
  const lastName = clerkUser.lastName || ""
  const fullName = `${firstName} ${lastName}`.trim()

  // isAdmin berdasarkan ROLE untuk menampilkan Admin Panel link
  const isAdmin = convexUser?.role === "admin" || convexUser?.role === "superadmin"

  const handleSignOut = async () => {
    if (isSigningOut) return

    setIsSigningOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error("Sign out failed:", error)
      toast.error("Gagal keluar. Silakan coba lagi.")
      setIsSigningOut(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
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
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-dense p-dense text-sm font-medium text-narrative text-foreground dark:text-slate-50 hover:bg-slate-900 hover:text-slate-50 transition-colors rounded-action dark:hover:bg-slate-100 dark:hover:text-slate-900"
            >
              <Settings className="icon-interface" />
              <span>Admin Panel</span>
            </Link>
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
