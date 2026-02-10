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
  ClockRotateRight,
  SwitchOn,
  SwitchOff,
  Trash,
  Page,
  NavArrowLeft,
  NavArrowRight,
} from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"
import { SystemPromptFormDialog } from "./SystemPromptFormDialog"
import { VersionHistoryDialog } from "./VersionHistoryDialog"

interface SystemPrompt {
  _id: Id<"systemPrompts">
  name: string
  content: string
  description?: string
  version: number
  isActive: boolean
  createdBy: Id<"users">
  createdAt: number
  creatorEmail: string
}

interface SystemPromptsManagerProps {
  userId: Id<"users">
}

type PromptDynamicColumnKey =
  | "version"
  | "status"
  | "creator"
  | "updatedAt"
  | "actions"

const PROMPT_DYNAMIC_COLUMNS: Array<{
  key: PromptDynamicColumnKey
  label: string
}> = [
  { key: "version", label: "Versi" },
  { key: "status", label: "Status" },
  { key: "creator", label: "Dibuat Oleh" },
  { key: "updatedAt", label: "Update Terakhir" },
  { key: "actions", label: "Aksi" },
]

export function SystemPromptsManager({ userId }: SystemPromptsManagerProps) {
  const prompts = useQuery(api.systemPrompts.listSystemPrompts, {
    requestorUserId: userId,
  })

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null)
  const [historyPrompt, setHistoryPrompt] = useState<SystemPrompt | null>(null)
  const [deletePrompt, setDeletePrompt] = useState<SystemPrompt | null>(null)
  const [activatePrompt, setActivatePrompt] = useState<SystemPrompt | null>(null)
  const [deactivatePrompt, setDeactivatePrompt] = useState<SystemPrompt | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [dynamicColumnStart, setDynamicColumnStart] = useState(0)

  const activateMutation = useMutation(api.systemPrompts.activateSystemPrompt)
  const deactivateMutation = useMutation(api.systemPrompts.deactivateSystemPrompt)
  const deleteMutation = useMutation(api.systemPrompts.deletePromptChain)

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
    if (!activatePrompt) return

    setIsLoading(true)
    try {
      const result = await activateMutation({
        requestorUserId: userId,
        promptId: activatePrompt._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setActivatePrompt(null)
    }
  }

  const handleDeactivate = async () => {
    if (!deactivatePrompt) return

    setIsLoading(true)
    try {
      const result = await deactivateMutation({
        requestorUserId: userId,
        promptId: deactivatePrompt._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setDeactivatePrompt(null)
    }
  }

  const handleDelete = async () => {
    if (!deletePrompt) return

    setIsLoading(true)
    try {
      const result = await deleteMutation({
        requestorUserId: userId,
        promptId: deletePrompt._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setDeletePrompt(null)
    }
  }

  const DESKTOP_DYNAMIC_COLUMN_COUNT = 2
  const MOBILE_DYNAMIC_COLUMN_COUNT = 1

  const visibleDynamicColumnsDesktop = Array.from(
    { length: DESKTOP_DYNAMIC_COLUMN_COUNT },
    (_, offset) =>
      PROMPT_DYNAMIC_COLUMNS[
        (dynamicColumnStart + offset) % PROMPT_DYNAMIC_COLUMNS.length
      ]
  )

  const visibleDynamicColumnsMobile = Array.from(
    { length: MOBILE_DYNAMIC_COLUMN_COUNT },
    (_, offset) =>
      PROMPT_DYNAMIC_COLUMNS[
        (dynamicColumnStart + offset) % PROMPT_DYNAMIC_COLUMNS.length
      ]
  )

  const goToPrevColumns = () => {
    setDynamicColumnStart(
      (prev) =>
        (prev - 1 + PROMPT_DYNAMIC_COLUMNS.length) %
        PROMPT_DYNAMIC_COLUMNS.length
    )
  }

  const goToNextColumns = () => {
    setDynamicColumnStart((prev) => (prev + 1) % PROMPT_DYNAMIC_COLUMNS.length)
  }

  const renderActionsCell = (prompt: SystemPrompt) => (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => setEditingPrompt(prompt)}
        title="Edit"
        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-muted-foreground transition-colors hover:bg-slate-200 hover:text-foreground dark:hover:bg-slate-800"
      >
        <EditPencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setHistoryPrompt(prompt)}
        title="Riwayat Versi"
        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-sky-600 transition-colors hover:bg-slate-200 dark:text-sky-400 dark:hover:bg-slate-800"
      >
        <ClockRotateRight className="h-4 w-4" />
      </button>
      {prompt.isActive ? (
        <button
          type="button"
          onClick={() => setDeactivatePrompt(prompt)}
          title="Nonaktifkan"
          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
        >
          <SwitchOff className="h-4 w-4" />
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setActivatePrompt(prompt)}
            title="Aktifkan"
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-emerald-600 transition-colors hover:bg-slate-200 dark:text-emerald-400 dark:hover:bg-slate-800"
          >
            <SwitchOn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeletePrompt(prompt)}
            title="Hapus"
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
          >
            <Trash className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )

  const renderDynamicCell = (
    columnKey: PromptDynamicColumnKey,
    prompt: SystemPrompt
  ) => {
    if (columnKey === "version") {
      return (
        <span className="inline-flex items-center rounded-badge border border-border bg-slate-200 px-2.5 py-1 text-[10px] font-bold tracking-wide text-slate-700 uppercase dark:bg-slate-700 dark:text-slate-100">
          v{prompt.version}
        </span>
      )
    }

    if (columnKey === "status") {
      return prompt.isActive ? (
        <span className="inline-flex items-center rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
          Aktif
        </span>
      ) : (
        <span className="inline-flex items-center rounded-badge border border-slate-500/30 bg-slate-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-slate-600 uppercase dark:text-slate-300">
          Tidak Aktif
        </span>
      )
    }

    if (columnKey === "creator") {
      return (
        <span className="text-narrative text-xs text-muted-foreground">
          {prompt.creatorEmail}
        </span>
      )
    }

    if (columnKey === "updatedAt") {
      return (
        <span className="text-narrative text-xs text-muted-foreground">
          {formatDate(prompt.createdAt)}
        </span>
      )
    }

    return renderActionsCell(prompt)
  }

  if (prompts === undefined) {
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
                <Page className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-interface text-sm font-semibold text-foreground">
                  System Prompts
                </h3>
              </div>
              <p className="text-narrative text-xs text-muted-foreground">
                Kelola system prompt untuk AI chat. Hanya satu prompt yang bisa aktif.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateDialogOpen(true)}
              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Prompt Baru</span>
            </button>
          </div>
        </div>

        <div className="hidden md:block">
          <table className="text-interface w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
              <tr>
                <th className="text-signal h-12 w-[36%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
                  Nama Prompt
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
                    className="text-signal h-12 w-[28%] px-4 py-3 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {prompts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
                    Belum ada system prompt. Klik &quot;Buat Prompt Baru&quot; untuk memulai.
                  </td>
                </tr>
              ) : (
                prompts.map((prompt) => (
                  <tr key={prompt._id} className="group transition-colors hover:bg-muted/50">
                    <td className="bg-slate-200/35 px-4 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                      <div className="text-narrative font-medium text-foreground">
                        {prompt.name}
                      </div>
                      {prompt.description ? (
                        <div className="text-narrative mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {prompt.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-2 py-3 group-hover:from-slate-300/65 group-hover:to-muted/40 dark:from-slate-900/80 dark:to-slate-900/40 dark:group-hover:from-slate-800/95 dark:group-hover:to-slate-800/50" />
                    {visibleDynamicColumnsDesktop.map((column) => (
                      <td key={`${prompt._id}-${column.key}`} className="px-4 py-3 text-center align-top">
                        <div className="inline-flex items-center justify-center">
                          {renderDynamicCell(column.key, prompt)}
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
                  Nama Prompt
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
              {prompts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-muted-foreground">
                    Belum ada system prompt.
                  </td>
                </tr>
              ) : (
                prompts.map((prompt) => (
                  <tr key={prompt._id} className="group transition-colors hover:bg-muted/50">
                    <td className="bg-slate-200/35 px-2 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                      <div className="text-narrative text-xs font-medium text-foreground">
                        {prompt.name}
                      </div>
                      {prompt.description ? (
                        <div className="text-narrative mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                          {prompt.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-1 py-3 dark:from-slate-900/80 dark:to-slate-900/40" />
                    {visibleDynamicColumnsMobile.map((column) => (
                      <td key={`${prompt._id}-mobile-${column.key}`} className="px-2 py-3 text-center align-top">
                        <div className="inline-flex items-center justify-center">
                          {renderDynamicCell(column.key, prompt)}
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
          <p className="text-narrative text-xs text-muted-foreground">
            Catatan: Jika tidak ada prompt aktif, AI akan otomatis menggunakan fallback prompt default.
          </p>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <SystemPromptFormDialog
        open={isCreateDialogOpen || !!editingPrompt}
        prompt={editingPrompt}
        userId={userId}
        onClose={() => {
          setIsCreateDialogOpen(false)
          setEditingPrompt(null)
        }}
      />

      {/* Version History Dialog */}
      <VersionHistoryDialog
        prompt={historyPrompt}
        userId={userId}
        onClose={() => setHistoryPrompt(null)}
      />

      {/* Activate Confirmation */}
      <AlertDialog
        open={!!activatePrompt}
        onOpenChange={(open) => !open && setActivatePrompt(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktifkan Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengaktifkan &quot;{activatePrompt?.name}&quot; v
              {activatePrompt?.version}? Prompt lain yang sedang aktif akan
              dinonaktifkan.
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

      {/* Deactivate Confirmation */}
      <AlertDialog
        open={!!deactivatePrompt}
        onOpenChange={(open) => !open && setDeactivatePrompt(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menonaktifkan &quot;{deactivatePrompt?.name}&quot;?
              AI akan menggunakan fallback prompt default.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} disabled={isLoading}>
              {isLoading ? "Memproses..." : "Nonaktifkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletePrompt}
        onOpenChange={(open) => !open && setDeletePrompt(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus &quot;{deletePrompt?.name}&quot; beserta
              seluruh riwayat versinya? Tindakan ini tidak dapat dibatalkan.
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
