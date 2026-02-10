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
  NavArrowLeft,
  NavArrowRight,
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

type ProviderDynamicColumnKey =
  | "primaryProvider"
  | "fallbackProvider"
  | "temperature"
  | "version"
  | "status"
  | "updatedAt"
  | "actions"

const PROVIDER_DYNAMIC_COLUMNS: Array<{
  key: ProviderDynamicColumnKey
  label: string
}> = [
  { key: "primaryProvider", label: "Primary Provider" },
  { key: "fallbackProvider", label: "Fallback Provider" },
  { key: "temperature", label: "Temp" },
  { key: "version", label: "Versi" },
  { key: "status", label: "Status" },
  { key: "updatedAt", label: "Update Terakhir" },
  { key: "actions", label: "Aksi" },
]

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
  const [dynamicColumnStart, setDynamicColumnStart] = useState(0)

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

  const DESKTOP_DYNAMIC_COLUMN_COUNT = 3
  const MOBILE_DYNAMIC_COLUMN_COUNT = 1

  const visibleDynamicColumnsDesktop = Array.from(
    { length: DESKTOP_DYNAMIC_COLUMN_COUNT },
    (_, offset) =>
      PROVIDER_DYNAMIC_COLUMNS[
        (dynamicColumnStart + offset) % PROVIDER_DYNAMIC_COLUMNS.length
      ]
  )

  const visibleDynamicColumnsMobile = Array.from(
    { length: MOBILE_DYNAMIC_COLUMN_COUNT },
    (_, offset) =>
      PROVIDER_DYNAMIC_COLUMNS[
        (dynamicColumnStart + offset) % PROVIDER_DYNAMIC_COLUMNS.length
      ]
  )

  const goToPrevColumns = () => {
    setDynamicColumnStart(
      (prev) =>
        (prev - 1 + PROVIDER_DYNAMIC_COLUMNS.length) %
        PROVIDER_DYNAMIC_COLUMNS.length
    )
  }

  const goToNextColumns = () => {
    setDynamicColumnStart(
      (prev) => (prev + 1) % PROVIDER_DYNAMIC_COLUMNS.length
    )
  }

  const renderProviderCell = (provider: string, model: string) => (
    <div className="flex flex-col items-start gap-1">
      <span className="text-narrative text-xs font-medium capitalize text-foreground">
        {provider.replace("-", " ")}
      </span>
      <span className="inline-flex items-center rounded-badge border border-border bg-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-700 dark:bg-slate-700 dark:text-slate-100">
        {model}
      </span>
    </div>
  )

  const renderActionsCell = (config: AIProviderConfig) => (
    <div className="flex items-center justify-center gap-1">
      <button
        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-muted-foreground transition-colors hover:bg-slate-200 hover:text-foreground dark:hover:bg-slate-800"
        onClick={() => setEditingConfig(config)}
        title="Edit"
      >
        <EditPencil className="h-4 w-4" />
      </button>
      <button
        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-sky-600 transition-colors hover:bg-slate-200 dark:text-sky-400 dark:hover:bg-slate-800"
        onClick={() => setSwapConfig(config)}
        title="Tukar Primary ↔ Fallback"
      >
        <DataTransferBoth className="h-4 w-4" />
      </button>
      {config.isActive ? (
        <button
          className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-action border-main border border-border text-emerald-500/45 dark:text-emerald-400/45"
          title="Config sedang aktif"
          disabled
        >
          <SwitchOn className="h-4 w-4" />
        </button>
      ) : (
        <>
          <button
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-emerald-600 transition-colors hover:bg-slate-200 dark:text-emerald-400 dark:hover:bg-slate-800"
            onClick={() => setActivateConfig(config)}
            title="Aktifkan"
          >
            <SwitchOn className="h-4 w-4" />
          </button>
          <button
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
            onClick={() => setDeleteConfig(config)}
            title="Hapus"
          >
            <Trash className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )

  const renderDynamicCell = (
    columnKey: ProviderDynamicColumnKey,
    config: AIProviderConfig
  ) => {
    if (columnKey === "primaryProvider") {
      return renderProviderCell(config.primaryProvider, config.primaryModel)
    }

    if (columnKey === "fallbackProvider") {
      return renderProviderCell(config.fallbackProvider, config.fallbackModel)
    }

    if (columnKey === "temperature") {
      return (
        <span className="text-interface font-mono text-xs text-foreground">
          {config.temperature.toFixed(1)}
        </span>
      )
    }

    if (columnKey === "version") {
      return (
        <span className="inline-flex items-center rounded-badge border border-border bg-slate-200 px-2.5 py-1 text-[10px] font-bold tracking-wide text-slate-700 uppercase dark:bg-slate-700 dark:text-slate-100">
          v{config.version}
        </span>
      )
    }

    if (columnKey === "status") {
      return config.isActive ? (
        <span className="inline-flex items-center rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
          Aktif
        </span>
      ) : (
        <span className="inline-flex items-center rounded-badge border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-600 uppercase dark:text-amber-400">
          Nonaktif
        </span>
      )
    }

    if (columnKey === "updatedAt") {
      return (
        <span className="text-narrative text-xs text-muted-foreground">
          {formatDate(config.updatedAt)}
        </span>
      )
    }

    return renderActionsCell(config)
  }

  if (configs === undefined) {
    return (
      <div className="rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 rounded bg-muted" />
            <div className="h-64 rounded bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
        <div className="border-b border-border px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-interface text-sm font-semibold text-foreground">
                  AI Provider Configuration
                </h3>
              </div>
              <p className="text-narrative text-xs text-muted-foreground">
                Kelola provider AI, model, dan API key. Hanya satu konfigurasi
                aktif untuk produksi.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action border-main border border-border px-3 py-1.5 text-xs font-mono text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                onClick={handleReloadConfig}
              >
                <Refresh className="h-4 w-4" />
                <span>Reload Cache</span>
              </button>
              <button
                className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span>Buat Config Baru</span>
              </button>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <table className="text-interface w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
              <tr>
                <th className="text-signal h-12 w-[26%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
                  Konfigurasi
                </th>
                <th className="h-12 w-[8%] border-l border-border bg-slate-200/75 px-2 py-2 dark:bg-slate-900/85">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={goToPrevColumns}
                      aria-label="Kolom sebelumnya"
                      className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      <NavArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={goToNextColumns}
                      aria-label="Kolom berikutnya"
                      className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      <NavArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </th>
                {visibleDynamicColumnsDesktop.map((column) => (
                  <th
                    key={column.key}
                    className="text-signal h-12 w-[22%] px-4 py-3 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {configs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Settings className="h-8 w-8 opacity-20" />
                      <span className="text-narrative">
                        Belum ada config. Klik &quot;Buat Config Baru&quot; untuk
                        memulai.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                configs.map((config) => (
                  <tr key={config._id} className="group transition-colors hover:bg-muted/50">
                    <td className="bg-slate-200/35 px-4 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                      <div className="text-narrative font-medium text-foreground">
                        {config.name}
                      </div>
                      {config.description ? (
                        <div className="text-narrative mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {config.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-2 py-3 group-hover:from-slate-300/65 group-hover:to-muted/40 dark:from-slate-900/80 dark:to-slate-900/40 dark:group-hover:from-slate-800/95 dark:group-hover:to-slate-800/50" />
                    {visibleDynamicColumnsDesktop.map((column) => (
                      <td key={`${config._id}-${column.key}`} className="px-4 py-3 text-center align-top">
                        <div className="inline-flex items-center justify-center">
                          {renderDynamicCell(column.key, config)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden">
          <table className="text-interface w-full table-fixed border-collapse text-left text-xs">
            <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
              <tr>
                <th className="text-signal h-11 w-[44%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
                  Konfigurasi
                </th>
                <th className="h-11 w-[18%] border-l border-border bg-slate-200/75 px-1 py-1 dark:bg-slate-900/85">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={goToPrevColumns}
                      aria-label="Kolom sebelumnya"
                      className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      <NavArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={goToNextColumns}
                      aria-label="Kolom berikutnya"
                      className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      <NavArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </th>
                {visibleDynamicColumnsMobile.map((column) => (
                  <th
                    key={`mobile-${column.key}`}
                    className="text-signal h-11 w-[38%] px-2 py-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {configs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Settings className="h-8 w-8 opacity-20" />
                      <span className="text-narrative">
                        Belum ada config. Klik &quot;Buat Config Baru&quot; untuk
                        memulai.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                configs.map((config) => (
                  <tr key={config._id} className="group transition-colors hover:bg-muted/50">
                    <td className="bg-slate-200/35 px-2 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                      <div className="text-narrative text-xs font-medium text-foreground">
                        {config.name}
                      </div>
                      {config.description ? (
                        <div className="text-narrative mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                          {config.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-1 py-3 dark:from-slate-900/80 dark:to-slate-900/40" />
                    {visibleDynamicColumnsMobile.map((column) => (
                      <td key={`${config._id}-mobile-${column.key}`} className="px-2 py-3 text-center align-top">
                        <div className="inline-flex items-center justify-center">
                          {renderDynamicCell(column.key, config)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border bg-slate-200/25 p-4 dark:bg-slate-900/25 md:p-6">
          <div className="flex items-start gap-3">
            <Settings className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-1">
              <span className="text-interface block text-sm font-medium text-foreground">
                Sistem Fallback & Cache
              </span>
              <p className="text-narrative text-xs leading-relaxed text-muted-foreground">
                Jika tidak ada config aktif, sistem AI memakai fallback bawaan.
                Cache config akan refresh otomatis tiap 5 menit.
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
