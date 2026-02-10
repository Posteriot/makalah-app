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
  EditPencil,
  SwitchOn,
  Trash,
  DataTransferBoth,
  Settings,
  Refresh,
} from "iconoir-react"
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
      <div className="rounded-shell border border-hairline bg-slate-900/50">
        <div className="p-6">
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
      <div className="rounded-shell border border-hairline bg-slate-900/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-hairline">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Settings className="h-4 w-4 text-slate-400" />
                <h3 className="text-interface text-sm font-semibold text-slate-200">AI Provider Configuration</h3>
              </div>
              <p className="text-xs text-slate-500">
                Kelola provider AI, model, dan API keys. Hanya satu config yang
                bisa aktif untuk produksi.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-action border border-hairline text-xs font-mono text-slate-300 hover:bg-slate-800 focus-ring"
                onClick={handleReloadConfig}
              >
                <Refresh className="h-4 w-4" />
                <span>Reload Cache</span>
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-action bg-amber-500 text-slate-950 text-xs font-mono font-medium hover:bg-amber-400 focus-ring"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span>Buat Config Baru</span>
              </button>
            </div>
          </div>
        </div>

        {/* Full-width content area */}
        <div className="overflow-x-auto border-b border-hairline">
          <table className="w-full border-collapse text-left text-xs font-mono">
            <thead className="bg-slate-800/40 border-b border-hairline">
              <tr>
                <th className="w-[220px] px-6 py-3 text-slate-500 uppercase tracking-wider font-bold">Konfigurasi</th>
                <th className="px-4 py-3 text-slate-500 uppercase tracking-wider font-bold">Primary Provider</th>
                <th className="px-4 py-3 text-slate-500 uppercase tracking-wider font-bold">Fallback Provider</th>
                <th className="text-center px-4 py-3 text-slate-500 uppercase tracking-wider font-bold">Temp</th>
                <th className="text-center px-4 py-3 text-slate-500 uppercase tracking-wider font-bold">Versi</th>
                <th className="px-4 py-3 text-slate-500 uppercase tracking-wider font-bold">Status</th>
                <th className="px-4 py-3 text-slate-500 uppercase tracking-wider font-bold">Update Terakhir</th>
                <th className="text-right px-6 py-3 text-slate-500 uppercase tracking-wider font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {configs.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center text-slate-500 py-16"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Settings className="h-8 w-8 opacity-20" />
                      <span>Belum ada config. Klik &quot;Buat Config Baru&quot; untuk memulai.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                configs.map((config) => (
                  <tr key={config._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-semibold text-slate-200">{config.name}</div>
                      {config.description && (
                        <div className="text-[11px] text-slate-500 line-clamp-1 max-w-[220px]">
                          {config.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-xs text-slate-200 capitalize">
                          {config.primaryProvider.replace("-", " ")}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded-badge w-fit">
                          {config.primaryModel}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-xs text-slate-200 capitalize">
                          {config.fallbackProvider.replace("-", " ")}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded-badge w-fit">
                          {config.fallbackModel}
                        </span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 font-mono text-xs text-slate-200">
                      {config.temperature.toFixed(1)}
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-badge text-[10px] font-bold uppercase tracking-wide bg-slate-800 text-slate-300 border border-hairline">v{config.version}</span>
                    </td>
                    <td className="px-4 py-3">
                      {config.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-badge text-[10px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-badge text-[10px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {formatDate(config.updatedAt)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="inline-flex items-center justify-center h-8 w-8 rounded-action border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800 hover:border-border focus-ring"
                          onClick={() => setEditingConfig(config)}
                          title="Edit"
                        >
                          <EditPencil className="h-4 w-4" />
                        </button>
                        <button
                          className="inline-flex items-center justify-center h-8 w-8 rounded-action border border-transparent text-sky-400 hover:bg-slate-800 hover:border-border focus-ring"
                          onClick={() => setSwapConfig(config)}
                          title="Tukar Primary ↔ Fallback"
                        >
                          <DataTransferBoth className="h-4 w-4" />
                        </button>
                        {config.isActive ? (
                          <button
                            className="inline-flex items-center justify-center h-8 w-8 rounded-action border border-transparent text-emerald-400 opacity-40 cursor-not-allowed"
                            title="Config sedang aktif"
                            disabled
                          >
                            <SwitchOn className="h-4 w-4 text-success" />
                          </button>
                        ) : (
                          <>
                            <button
                              className="inline-flex items-center justify-center h-8 w-8 rounded-action border border-transparent text-emerald-400 hover:bg-slate-800 hover:border-border focus-ring"
                              onClick={() => setActivateConfig(config)}
                              title="Aktifkan"
                            >
                              <SwitchOn className="h-4 w-4" />
                            </button>
                            <button
                              className="inline-flex items-center justify-center h-8 w-8 rounded-action border border-transparent text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 focus-ring"
                              onClick={() => setDeleteConfig(config)}
                              title="Hapus"
                            >
                              <Trash className="h-4 w-4" />
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
        <div className="p-6 bg-slate-800/20">
          <div className="flex items-start gap-3">
            <Settings className="h-4 w-4 text-slate-500 mt-0.5" />
            <div className="space-y-1">
              <span className="font-medium text-sm text-slate-200 block">Sistem Fallback & Cache</span>
              <p className="text-xs text-slate-500 leading-relaxed">
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
