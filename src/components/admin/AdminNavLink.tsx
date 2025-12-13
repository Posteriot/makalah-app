"use client"

import Link from "next/link"
import { Shield } from "lucide-react"
import { usePermissions } from "@/lib/hooks/usePermissions"

export function AdminNavLink() {
  const { isAdmin } = usePermissions()

  // Don't show link if not admin
  if (!isAdmin()) return null

  return (
    <Link
      href="/admin"
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <Shield className="h-4 w-4" />
      <span>Admin Panel</span>
    </Link>
  )
}
