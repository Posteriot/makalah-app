"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Backward-compat redirect: /dashboard/waitlist → /dashboard?tab=waitlist
 * Waitlist is now embedded as a tab in the admin panel.
 */
export default function WaitlistRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard?tab=waitlist")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-interface text-sm text-muted-foreground">Memuat...</p>
    </div>
  )
}
