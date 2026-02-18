"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWaitlistMode } from "@/lib/hooks/useWaitlistMode"
import SignUpPage from "@/app/(auth)/sign-up/[[...sign-up]]/page"

/**
 * Waitlist-only sign-up route.
 * Active when waitlist mode is ON — redirects to /sign-in when OFF.
 * Invite emails link here instead of /sign-up.
 */
export default function WaitlistSignUpPage() {
  const router = useRouter()
  const { isWaitlistMode, isLoading } = useWaitlistMode()

  useEffect(() => {
    if (!isLoading && !isWaitlistMode) {
      router.replace("/sign-in")
    }
  }, [isWaitlistMode, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-5 w-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isWaitlistMode) {
    return null
  }

  return <SignUpPage />
}
