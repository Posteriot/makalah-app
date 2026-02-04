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
import { UserSettingsModal } from "@/components/settings/UserSettingsModal"

export function UserDropdown() {
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  const [isOpen, setIsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
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
        className="flex items-center gap-2 px-3 py-1 rounded-lg border border-black/50 dark:border-white/50 hover:bg-accent transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Name (hidden on mobile) */}
        <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
          {fullName}
        </span>

        {/* Badge dihapus - sudah ada di samping logo (SegmentBadge di GlobalHeader) */}

        {/* Chevron */}
        <NavArrowDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 py-1 bg-popover border border-border rounded-lg shadow-lg z-50">
          <button
            onClick={() => {
              setIsOpen(false)
              setIsSettingsOpen(true)
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors w-full"
            type="button"
          >
            <User className="h-4 w-4" />
            <span>Atur Akun</span>
          </button>

          {/* Subscription Link */}
          <Link
            href="/subscription/overview"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            <span>Subskripsi</span>
          </Link>

          {/* Admin Panel Link (conditional) */}
          {isAdmin && (
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Admin Panel</span>
            </Link>
          )}

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors",
              isSigningOut
                ? "text-muted-foreground cursor-not-allowed"
                : "text-destructive hover:bg-destructive/10"
            )}
          >
            {isSigningOut ? (
              <RefreshDouble className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span>{isSigningOut ? "Keluar..." : "Sign out"}</span>
          </button>
        </div>
      )}

      <UserSettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  )
}
