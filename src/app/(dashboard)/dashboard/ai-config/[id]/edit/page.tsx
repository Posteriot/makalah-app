"use client"

import { use } from "react"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { AIProviderConfigEditor } from "@/components/admin/AIProviderConfigEditor"

export default function EditAIConfigPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { user, isLoading: userLoading } = useCurrentUser()
  const isAdmin = user?.role === "admin" || user?.role === "superadmin"

  const config = useQuery(
    api.aiProviderConfigs.getConfig,
    user && isAdmin
      ? {
          configId: id as Id<"aiProviderConfigs">,
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

  if (config === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-mono">Memuat config...</p>
        </div>
      </div>
    )
  }

  if (config === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Config tidak ditemukan.</p>
      </div>
    )
  }

  return <AIProviderConfigEditor userId={user._id} config={config} />
}
