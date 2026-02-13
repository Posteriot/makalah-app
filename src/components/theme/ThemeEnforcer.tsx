"use client"

import { useEffect } from "react"
import { useSession } from "@/lib/auth-client"
import { useTheme } from "next-themes"

/**
 * ThemeEnforcer - Forces dark mode for unauthenticated users
 *
 * Light mode is a feature only available for logged-in users.
 * When user is not signed in, this component ensures dark mode is always active.
 *
 * This handles the case where:
 * 1. User was logged in and set theme to "light"
 * 2. User logs out
 * 3. Theme preference persists in localStorage
 * 4. Without this component, logged-out user would see light mode
 */
export function ThemeEnforcer() {
  const { data: session, isPending } = useSession()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    // Wait for auth state to load
    if (isPending) return

    // Force dark mode for unauthenticated users
    if (!session && theme !== "dark") {
      setTheme("dark")
    }
  }, [session, isPending, theme, setTheme])

  // This component doesn't render anything
  return null
}
