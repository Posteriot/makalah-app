"use client"

import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { WaitlistDashboard } from "@/components/admin/WaitlistDashboard"

export default function WaitlistDashboardPage() {
  const { user, isLoading } = useCurrentUser()
  const router = useRouter()
  const isAdmin = user?.role === "admin" || user?.role === "superadmin"

  useEffect(() => {
    if (!isLoading && user && !isAdmin) {
      router.replace("/")
    }
  }, [isLoading, user, isAdmin, router])

  if (isLoading || !user || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-interface text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return <WaitlistDashboard userId={user._id} />
}
