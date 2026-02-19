"use client"

import { use } from "react"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { ConstitutionEditor } from "@/components/admin/ConstitutionEditor"

export default function EditConstitutionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { user, isLoading: userLoading } = useCurrentUser()
  const isAdmin = user?.role === "admin" || user?.role === "superadmin"

  const constitution = useQuery(
    api.styleConstitutions.getById,
    user && isAdmin
      ? {
          constitutionId: id as Id<"styleConstitutions">,
          requestorUserId: user._id,
        }
      : "skip"
  )

  if (userLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-mono">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Akses ditolak.</p>
      </div>
    )
  }

  if (constitution === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-mono">Memuat constitution...</p>
        </div>
      </div>
    )
  }

  if (constitution === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Constitution tidak ditemukan.</p>
      </div>
    )
  }

  return <ConstitutionEditor userId={user._id} constitution={constitution} />
}
