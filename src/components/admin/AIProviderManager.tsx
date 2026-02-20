"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
  CheckCircle,
  Globe,
  ServerConnection,
} from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"

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
  maxTokens?: number
  primaryContextWindow?: number
  fallbackContextWindow?: number
  primaryWebSearchEnabled?: boolean
  fallbackWebSearchEnabled?: boolean
  fallbackWebSearchEngine?: string
  fallbackWebSearchMaxResults?: number
  version: number
  isActive: boolean
  createdAt: number
  updatedAt: number
  creatorEmail: string
}

interface AIProviderManagerProps {
  userId: Id<"users">
}

const PROVIDER_LABELS: Record<string, string> = {
  "vercel-gateway": "Vercel AI Gateway",
  openrouter: "OpenRouter",
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export function AIProviderManager({ userId }: AIProviderManagerProps) {
  const router = useRouter()
  const configs = useQuery(api.aiProviderConfigs.listConfigs, {
    requestorUserId: userId,
  })

  const [deleteConfig, setDeleteConfig] = useState<AIProviderConfig | null>(null)
  const [activateConfig, setActivateConfig] = useState<AIProviderConfig | null>(null)
  const [swapConfig, setSwapConfig] = useState<AIProviderConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const activateMutation = useMutation(api.aiProviderConfigs.activateConfig)
  const swapMutation = useMutation(api.aiProviderConfigs.swapProviders)
  const deleteMutation = useMutation(api.aiProviderConfigs.deleteConfigChain)

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
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan")
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
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan")
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
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan")
    } finally {
      setIsLoading(false)
      setDeleteConfig(null)
    }
  }

  const handleReloadConfig = () => {
    toast.success(
      "Config cache akan di-refresh otomatis dalam 5 menit, atau segera di request chat berikutnya"
    )
  }

  // Loading skeleton
  if (configs === undefined) {
    return (
      <div className="rounded-[16px] border border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/90">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 rounded-[8px] bg-slate-200 dark:bg-slate-700" />
            <div className="h-64 rounded-[8px] bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-[16px] border border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/90 overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <h3 className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                  AI Provider Configuration
                </h3>
              </div>
              <p className="font-sans text-xs text-slate-500 dark:text-slate-400">
                Kelola provider AI, model, dan API key. Hanya satu konfigurasi aktif untuk produksi.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-slate-200 px-3 py-1.5 font-mono text-xs text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={handleReloadConfig}
              >
                <Refresh className="h-3.5 w-3.5" />
                <span>Reload Cache</span>
              </button>
              <button
                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-slate-900 px-3 py-1.5 font-mono text-xs font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                onClick={() => router.push("/dashboard/ai-config/new")}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Buat Config Baru</span>
              </button>
            </div>
          </div>
        </div>

        {/* Config Cards */}
        {configs.length === 0 ? (
          <div className="p-10 text-center">
            <Settings className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-2 font-sans text-sm text-slate-500 dark:text-slate-400">
              Belum ada config. Klik &quot;Buat Config Baru&quot; untuk memulai.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {configs.map((config) => (
              <ConfigCard
                key={config._id}
                config={config as AIProviderConfig}
                onEdit={() => router.push(`/dashboard/ai-config/${config._id}/edit`)}
                onSwap={() => setSwapConfig(config as AIProviderConfig)}
                onActivate={() => setActivateConfig(config as AIProviderConfig)}
                onDelete={() => setDeleteConfig(config as AIProviderConfig)}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/50">
          <div className="flex items-start gap-3">
            <ServerConnection className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
            <div className="space-y-0.5">
              <span className="block font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                Sistem Fallback & Cache
              </span>
              <p className="font-sans text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Jika tidak ada config aktif, sistem AI memakai fallback bawaan.
                Cache config akan refresh otomatis tiap 5 menit.
              </p>
            </div>
          </div>
        </div>
      </div>

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
              (v{swapConfig && swapConfig.version + 1}).
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
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {isLoading ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*  ConfigCard — all info visible at once, no column scrolling           */
/* ────────────────────────────────────────────────────────────────────── */

function ConfigCard({
  config,
  onEdit,
  onSwap,
  onActivate,
  onDelete,
}: {
  config: AIProviderConfig
  onEdit: () => void
  onSwap: () => void
  onActivate: () => void
  onDelete: () => void
}) {
  return (
    <div className="px-5 py-5">
      {/* Row 1: Title + Status + Version */}
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-sans text-sm font-semibold text-slate-900 dark:text-slate-100">
          {config.name}
        </h4>
        {config.isActive ? (
          <span className="inline-flex items-center gap-1 rounded-[6px] border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-3 w-3" />
            Aktif
          </span>
        ) : (
          <span className="inline-flex items-center rounded-[6px] border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Nonaktif
          </span>
        )}
        <span className="inline-flex items-center rounded-[6px] border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          v{config.version}
        </span>
      </div>

      {config.description && (
        <p className="mt-1 font-sans text-xs text-slate-500 dark:text-slate-400">
          {config.description}
        </p>
      )}

      {/* Row 2: Primary + Fallback — side by side on desktop, stacked on mobile */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ProviderSlot
          label="Primary"
          provider={config.primaryProvider}
          model={config.primaryModel}
          contextWindow={config.primaryContextWindow}
        />
        <ProviderSlot
          label="Fallback"
          provider={config.fallbackProvider}
          model={config.fallbackModel}
          contextWindow={config.fallbackContextWindow}
        />
      </div>

      {/* Row 3: Settings + Web Search */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <SettingChip label="Temp" value={config.temperature.toFixed(1)} />
        {config.topP !== undefined && (
          <SettingChip label="Top P" value={config.topP.toFixed(1)} />
        )}
        {config.maxTokens !== undefined && (
          <SettingChip label="Max Tokens" value={config.maxTokens.toLocaleString()} />
        )}
        <WebSearchChip
          primaryEnabled={config.primaryWebSearchEnabled ?? true}
          fallbackEnabled={config.fallbackWebSearchEnabled ?? true}
          engine={config.fallbackWebSearchEngine ?? "auto"}
        />
      </div>

      {/* Row 4: Actions + Metadata */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/60 pt-3 dark:border-slate-700/60">
        <div className="flex flex-wrap items-center gap-1.5">
          <ActionButton icon={EditPencil} label="Edit" onClick={onEdit} />
          <ActionButton
            icon={DataTransferBoth}
            label="Swap"
            onClick={onSwap}
            className="text-sky-600 dark:text-sky-400"
          />
          {config.isActive ? (
            <span className="inline-flex h-7 items-center gap-1 rounded-[8px] border border-slate-200 px-2 font-mono text-[10px] text-emerald-500/40 dark:border-slate-700">
              <SwitchOn className="h-3.5 w-3.5" />
              Aktif
            </span>
          ) : (
            <>
              <ActionButton
                icon={SwitchOn}
                label="Aktifkan"
                onClick={onActivate}
                className="text-emerald-600 dark:text-emerald-400"
              />
              <ActionButton
                icon={Trash}
                label="Hapus"
                onClick={onDelete}
                className="text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
              />
            </>
          )}
        </div>
        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
          {formatDate(config.updatedAt)} · {config.creatorEmail}
        </span>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Sub-components                                                       */
/* ────────────────────────────────────────────────────────────────────── */

function ProviderSlot({
  label,
  provider,
  model,
  contextWindow,
}: {
  label: string
  provider: string
  model: string
  contextWindow?: number
}) {
  return (
    <div className="rounded-[8px] border border-slate-200 bg-slate-50/70 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50">
      <span className="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <span className="mt-1 block font-sans text-xs font-medium text-slate-700 dark:text-slate-200">
        {PROVIDER_LABELS[provider] ?? provider}
      </span>
      <span className="mt-1 inline-flex items-center rounded-[6px] border border-slate-300 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
        {model}
      </span>
      {contextWindow != null && contextWindow > 0 && (
        <span className="ml-2 font-mono text-[10px] text-slate-400 dark:text-slate-500">
          {formatTokenCount(contextWindow)} ctx
        </span>
      )}
    </div>
  )
}

function SettingChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <span className="font-mono text-xs text-slate-700 dark:text-slate-200">
        {value}
      </span>
    </div>
  )
}

function WebSearchChip({
  primaryEnabled,
  fallbackEnabled,
  engine,
}: {
  primaryEnabled: boolean
  fallbackEnabled: boolean
  engine: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Globe className="h-3 w-3 text-slate-400 dark:text-slate-500" />
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        Search
      </span>
      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
        {primaryEnabled ? "P:on" : "P:off"}{" "}
        {fallbackEnabled ? `F:on (${engine})` : "F:off"}
      </span>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 items-center gap-1 rounded-[8px] border border-slate-200 px-2 font-mono text-[10px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${className}`}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
