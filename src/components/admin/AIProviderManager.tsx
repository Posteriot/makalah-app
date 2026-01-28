"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  Pencil,
  Power,
  Trash2,
  ArrowLeftRight,
  Settings2,
  RefreshCw,
} from "lucide-react"
import type { Id } from "@convex/_generated/dataModel"
import { AIProviderFormDialog } from "./AIProviderFormDialog"

interface AIProviderConfig {
  _id: Id<"aiProviderConfigs">
  name: string
  description?: string
  primaryProvider: string
  primaryModel: string
  fallbackProvider: string
  fallbackModel: string
  temperature: number
  topP?: number
  version: number
  isActive: boolean
  createdAt: number
  updatedAt: number
  creatorEmail: string
}

interface AIProviderManagerProps {
  userId: Id<"users">
}

export function AIProviderManager({ userId }: AIProviderManagerProps) {
  const configs = useQuery(api.aiProviderConfigs.listConfigs, {
    requestorUserId: userId,
  })

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<AIProviderConfig | null>(
    null
  )
  const [deleteConfig, setDeleteConfig] = useState<AIProviderConfig | null>(
    null
  )
  const [activateConfig, setActivateConfig] = useState<AIProviderConfig | null>(
    null
  )
  const [swapConfig, setSwapConfig] = useState<AIProviderConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const activateMutation = useMutation(api.aiProviderConfigs.activateConfig)
  const swapMutation = useMutation(api.aiProviderConfigs.swapProviders)
  const deleteMutation = useMutation(api.aiProviderConfigs.deleteConfigChain)

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleActivate = async () => {
    if (!activateConfig) return

    setIsLoading(true)
    try {
      const result = await activateMutation({
        requestorUserId: userId,
        configId: activateConfig._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setActivateConfig(null)
    }
  }

  const handleSwap = async () => {
    if (!swapConfig) return

    setIsLoading(true)
    try {
      const result = await swapMutation({
        requestorUserId: userId,
        configId: swapConfig._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setSwapConfig(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfig) return

    setIsLoading(true)
    try {
      const result = await deleteMutation({
        requestorUserId: userId,
        configId: deleteConfig._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setDeleteConfig(null)
    }
  }

  const handleReloadConfig = async () => {
    toast.success(
      "Config cache akan di-refresh otomatis dalam 5 menit, atau segera di request chat berikutnya"
    )
  }

  if (configs === undefined) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-header-row">
            <div>
              <div className="card-title-row">
                <Settings2 className="card-icon" />
                <h3 className="card-title">AI Provider Configuration</h3>
              </div>
              <p className="card-description">
                Kelola provider AI, model, dan API keys. Hanya satu config yang
                bisa aktif untuk produksi.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn--secondary"
                onClick={handleReloadConfig}
              >
                <RefreshCw className="btn-icon" />
                <span>Reload Cache</span>
              </button>
              <button
                className="btn btn--primary"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="btn-icon" />
                <span>Buat Config Baru</span>
              </button>
            </div>
          </div>
        </div>

        {/* Full-width content area */}
        <div className="data-table-container border-b">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-[200px] pl-6">Konfigurasi</th>
                <th>Primary Provider</th>
                <th>Fallback Provider</th>
                <th className="text-center">Temp</th>
                <th className="text-center">Versi</th>
                <th>Status</th>
                <th>Update Terakhir</th>
                <th className="text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center text-muted-foreground py-16"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Settings2 className="h-8 w-8 opacity-20" />
                      <span>Belum ada config. Klik &quot;Buat Config Baru&quot; untuk memulai.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                configs.map((config) => (
                  <tr key={config._id}>
                    <td className="cell-name pl-6">
                      <div className="font-semibold">{config.name}</div>
                      {config.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]">
                          {config.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm capitalize">
                          {config.primaryProvider.replace("-", " ")}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded w-fit">
                          {config.primaryModel}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm capitalize">
                          {config.fallbackProvider.replace("-", " ")}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded w-fit">
                          {config.fallbackModel}
                        </span>
                      </div>
                    </td>
                    <td className="text-center font-mono text-sm">
                      {config.temperature.toFixed(1)}
                    </td>
                    <td className="text-center">
                      <span className="sub-badge">v{config.version}</span>
                    </td>
                    <td>
                      {config.isActive ? (
                        <span className="status-badge status-badge--verified">
                          Aktif
                        </span>
                      ) : (
                        <span className="status-badge status-badge--unverified">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {formatDate(config.updatedAt)}
                    </td>
                    <td className="pr-6">
                      <div className="action-icons justify-end">
                        <button
                          className="icon-btn"
                          onClick={() => setEditingConfig(config)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="icon-btn text-blue-500"
                          onClick={() => setSwapConfig(config)}
                          title="Tukar Primary ↔ Fallback"
                        >
                          <ArrowLeftRight className="h-4 w-4" />
                        </button>
                        {config.isActive ? (
                          <button
                            className="icon-btn opacity-40 cursor-not-allowed"
                            title="Config sedang aktif"
                            disabled
                          >
                            <Power className="h-4 w-4 text-success" />
                          </button>
                        ) : (
                          <>
                            <button
                              className="icon-btn text-success"
                              onClick={() => setActivateConfig(config)}
                              title="Aktifkan"
                            >
                              <Power className="h-4 w-4" />
                            </button>
                            <button
                              className="icon-btn text-destructive"
                              onClick={() => setDeleteConfig(config)}
                              title="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Note section - matching table width */}
        <div className="p-6 bg-accent/30">
          <div className="flex items-start gap-3">
            <Settings2 className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <span className="font-medium text-sm text-foreground block">Sistem Fallback & Cache</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Jika tidak ada config yang aktif, AI akan menggunakan hardcoded fallback config.
                Config cache akan otomatis refresh setiap 5 menit untuk menjaga performa sistem.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <AIProviderFormDialog
        open={isCreateDialogOpen || !!editingConfig}
        config={editingConfig}
        userId={userId}
        onClose={() => {
          setIsCreateDialogOpen(false)
          setEditingConfig(null)
        }}
      />

      {/* Activate Confirmation */}
      <AlertDialog
        open={!!activateConfig}
        onOpenChange={(open) => !open && setActivateConfig(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktifkan Config</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengaktifkan &quot;
              {activateConfig?.name}&quot; v{activateConfig?.version}? Config
              lain yang sedang aktif akan dinonaktifkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate} disabled={isLoading}>
              {isLoading ? "Memproses..." : "Aktifkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Swap Confirmation */}
      <AlertDialog
        open={!!swapConfig}
        onOpenChange={(open) => !open && setSwapConfig(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tukar Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menukar primary ↔ fallback provider di
              config &quot;{swapConfig?.name}&quot;? Ini akan membuat versi baru
              (v
              {swapConfig && swapConfig.version + 1}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleSwap} disabled={isLoading}>
              {isLoading ? "Memproses..." : "Tukar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfig}
        onOpenChange={(open) => !open && setDeleteConfig(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Config</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus &quot;{deleteConfig?.name}
              &quot; beserta seluruh riwayat versinya? Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
