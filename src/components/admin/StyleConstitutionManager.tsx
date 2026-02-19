"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  EditPencil,
  ClockRotateRight,
  SwitchOn,
  SwitchOff,
  Trash,
  Journal,
  InfoCircle,
  Download,
  WarningCircle,
  Settings,
  NavArrowLeft,
  NavArrowRight,
} from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"
import { StyleConstitutionVersionHistoryDialog } from "./StyleConstitutionVersionHistoryDialog"

interface StyleConstitution {
  _id: Id<"styleConstitutions">
  name: string
  content: string
  description?: string
  version: number
  isActive: boolean
  type?: "naturalness" | "style"
  createdBy: Id<"users">
  createdAt: number
  updatedAt: number
  creatorEmail: string
}

interface StyleConstitutionManagerProps {
  userId: Id<"users">
}

type ConstitutionDynamicColumnKey =
  | "version"
  | "status"
  | "creator"
  | "updatedAt"
  | "actions"

const CONSTITUTION_DYNAMIC_COLUMNS: Array<{
  key: ConstitutionDynamicColumnKey
  label: string
}> = [
  { key: "version", label: "Versi" },
  { key: "status", label: "Status" },
  { key: "creator", label: "Dibuat Oleh" },
  { key: "updatedAt", label: "Update Terakhir" },
  { key: "actions", label: "Aksi" },
]

export function StyleConstitutionManager({ userId }: StyleConstitutionManagerProps) {
  const constitutions = useQuery(api.styleConstitutions.list, {
    requestorUserId: userId,
  })

  const naturalnessConstitutions = (constitutions ?? []).filter(
    (c) => (c as StyleConstitution).type === "naturalness"
  ) as StyleConstitution[]
  const styleConstitutions = (constitutions ?? []).filter(
    (c) => (c as StyleConstitution).type !== "naturalness"
  ) as StyleConstitution[]

  const [createType, setCreateType] = useState<"naturalness" | "style">("style")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingConstitution, setEditingConstitution] = useState<StyleConstitution | null>(null)
  const [historyConstitution, setHistoryConstitution] = useState<StyleConstitution | null>(null)
  const [deleteConstitution, setDeleteConstitution] = useState<StyleConstitution | null>(null)
  const [activateConstitution, setActivateConstitution] = useState<StyleConstitution | null>(null)
  const [deactivateConstitution, setDeactivateConstitution] = useState<StyleConstitution | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSeedingDefault, setIsSeedingDefault] = useState(false)
  const [dynamicColumnStart, setDynamicColumnStart] = useState(0)

  // Form state
  const [formName, setFormName] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formDescription, setFormDescription] = useState("")

  const activateMutation = useMutation(api.styleConstitutions.activate)
  const deactivateMutation = useMutation(api.styleConstitutions.deactivate)
  const deleteMutation = useMutation(api.styleConstitutions.deleteChain)
  const createMutation = useMutation(api.styleConstitutions.create)
  const updateMutation = useMutation(api.styleConstitutions.update)
  const seedDefaultMutation = useMutation(api.styleConstitutions.seedDefault)

  // Refrasa tool visibility toggle
  const isRefrasaEnabled = useQuery(api.aiProviderConfigs.getRefrasaEnabled)
  const setRefrasaEnabledMutation = useMutation(api.aiProviderConfigs.setRefrasaEnabled)
  const [isTogglingRefrasa, setIsTogglingRefrasa] = useState(false)

  // Reset form when dialog opens/closes or editing constitution changes
  useEffect(() => {
    if (isCreateDialogOpen || editingConstitution) {
      if (editingConstitution) {
        setFormName(editingConstitution.name)
        setFormContent(editingConstitution.content)
        setFormDescription(editingConstitution.description ?? "")
      } else {
        setFormName("")
        setFormContent("")
        setFormDescription("")
      }
    }
  }, [isCreateDialogOpen, editingConstitution])

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
    if (!activateConstitution) return

    setIsLoading(true)
    try {
      const result = await activateMutation({
        requestorUserId: userId,
        constitutionId: activateConstitution._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setActivateConstitution(null)
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateConstitution) return

    setIsLoading(true)
    try {
      const result = await deactivateMutation({
        requestorUserId: userId,
        constitutionId: deactivateConstitution._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setDeactivateConstitution(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteConstitution) return

    setIsLoading(true)
    try {
      const result = await deleteMutation({
        requestorUserId: userId,
        constitutionId: deleteConstitution._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setDeleteConstitution(null)
    }
  }

  const handleSeedDefault = async () => {
    setIsSeedingDefault(true)
    try {
      const result = await seedDefaultMutation({
        requestorUserId: userId,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsSeedingDefault(false)
    }
  }

  const handleToggleRefrasa = async (enabled: boolean) => {
    setIsTogglingRefrasa(true)
    try {
      const result = await setRefrasaEnabledMutation({
        requestorUserId: userId,
        enabled,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsTogglingRefrasa(false)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formContent.trim()) {
      toast.error("Konten constitution tidak boleh kosong")
      return
    }

    if (!editingConstitution && !formName.trim()) {
      toast.error("Nama constitution tidak boleh kosong")
      return
    }

    setIsLoading(true)
    try {
      if (editingConstitution) {
        // Update (creates new version)
        const result = await updateMutation({
          requestorUserId: userId,
          constitutionId: editingConstitution._id,
          content: formContent.trim(),
          description: formDescription.trim() || undefined,
        })
        toast.success(result.message)
      } else {
        // Create new constitution
        const result = await createMutation({
          requestorUserId: userId,
          name: formName.trim(),
          content: formContent.trim(),
          description: formDescription.trim() || undefined,
          type: createType,
        })
        toast.success(result.message)
      }
      handleCloseFormDialog()
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseFormDialog = () => {
    if (!isLoading) {
      setIsCreateDialogOpen(false)
      setEditingConstitution(null)
      setCreateType("style")
    }
  }

  const isEditing = !!editingConstitution
  const hasChanges = isEditing
    ? formContent !== editingConstitution.content || formDescription !== (editingConstitution.description ?? "")
    : formName.trim() !== "" && formContent.trim() !== ""

  const DESKTOP_DYNAMIC_COLUMN_COUNT = 2
  const MOBILE_DYNAMIC_COLUMN_COUNT = 1

  const visibleDynamicColumnsDesktop = Array.from(
    { length: DESKTOP_DYNAMIC_COLUMN_COUNT },
    (_, offset) =>
      CONSTITUTION_DYNAMIC_COLUMNS[
        (dynamicColumnStart + offset) % CONSTITUTION_DYNAMIC_COLUMNS.length
      ]
  )

  const visibleDynamicColumnsMobile = Array.from(
    { length: MOBILE_DYNAMIC_COLUMN_COUNT },
    (_, offset) =>
      CONSTITUTION_DYNAMIC_COLUMNS[
        (dynamicColumnStart + offset) % CONSTITUTION_DYNAMIC_COLUMNS.length
      ]
  )

  const goToPrevColumns = () => {
    setDynamicColumnStart(
      (prev) =>
        (prev - 1 + CONSTITUTION_DYNAMIC_COLUMNS.length) %
        CONSTITUTION_DYNAMIC_COLUMNS.length
    )
  }

  const goToNextColumns = () => {
    setDynamicColumnStart(
      (prev) => (prev + 1) % CONSTITUTION_DYNAMIC_COLUMNS.length
    )
  }

  const renderActionsCell = (constitution: StyleConstitution) => (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => setEditingConstitution(constitution)}
        title="Edit"
        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-muted-foreground transition-colors hover:bg-slate-200 hover:text-foreground dark:hover:bg-slate-800"
      >
        <EditPencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setHistoryConstitution(constitution)}
        title="Riwayat Versi"
        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-sky-600 transition-colors hover:bg-slate-200 dark:text-sky-400 dark:hover:bg-slate-800"
      >
        <ClockRotateRight className="h-4 w-4" />
      </button>
      {constitution.isActive ? (
        <button
          type="button"
          onClick={() => setDeactivateConstitution(constitution)}
          title="Nonaktifkan"
          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
        >
          <SwitchOff className="h-4 w-4" />
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setActivateConstitution(constitution)}
            title="Aktifkan"
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-emerald-600 transition-colors hover:bg-slate-200 dark:text-emerald-400 dark:hover:bg-slate-800"
          >
            <SwitchOn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteConstitution(constitution)}
            title="Hapus Semua Versi"
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
          >
            <Trash className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )

  const renderDynamicCell = (
    columnKey: ConstitutionDynamicColumnKey,
    constitution: StyleConstitution
  ) => {
    if (columnKey === "version") {
      return (
        <span className="inline-flex items-center rounded-badge border border-border bg-slate-200 px-2.5 py-1 text-[10px] font-bold tracking-wide text-slate-700 uppercase dark:bg-slate-700 dark:text-slate-100">
          v{constitution.version}
        </span>
      )
    }

    if (columnKey === "status") {
      return constitution.isActive ? (
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
          {constitution.creatorEmail}
        </span>
      )
    }

    if (columnKey === "updatedAt") {
      return (
        <span className="text-narrative text-xs text-muted-foreground">
          {formatDate(constitution.updatedAt ?? constitution.createdAt)}
        </span>
      )
    }

    return renderActionsCell(constitution)
  }

  if (constitutions === undefined) {
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
      {/* Refrasa Tool Status Toggle */}
      <div className="mb-4 overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
        <div className="border-b border-border bg-slate-200/45 px-4 py-3 dark:bg-slate-900/50">
          <h3 className="text-interface flex items-center gap-2 text-base font-medium text-foreground">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Status Tool Refrasa
          </h3>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="refrasa-toggle" className="text-sm font-medium">
                Aktifkan Refrasa Tool
              </Label>
              <p className="text-xs text-muted-foreground">
                Jika dinonaktifkan, tombol Refrasa tidak akan muncul di artifact viewer untuk semua user.
              </p>
            </div>
            <Switch
              id="refrasa-toggle"
              checked={isRefrasaEnabled ?? true}
              onCheckedChange={handleToggleRefrasa}
              disabled={isTogglingRefrasa || isRefrasaEnabled === undefined}
            />
          </div>
          {isRefrasaEnabled === false && (
            <div className="mt-3 rounded-action border border-amber-500/30 bg-amber-500/10 p-2">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Mode Maintenance:</strong> Tombol Refrasa saat ini disembunyikan dari semua user.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Naturalness Constitution Manager (Layer 1) */}
      <div className="mb-4 overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
        <div className="border-b border-border px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <h3 className="text-interface flex items-center gap-2 text-sm font-semibold text-foreground">
                <Journal className="h-4 w-4 text-muted-foreground" />
                Refrasa - Naturalness Constitution
              </h3>
              <p className="text-narrative text-xs text-muted-foreground">
                Kelola kriteria naturalness (Layer 1). Jika tidak ada yang aktif, menggunakan kriteria default.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCreateType("naturalness")
                setIsCreateDialogOpen(true)
              }}
              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Constitution Baru</span>
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {naturalnessConstitutions.length === 0 ? (
            <div className="rounded-shell border-main border border-border bg-card/80 px-4 py-10 text-center dark:bg-slate-900/80">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/10">
                <InfoCircle className="h-6 w-6 text-sky-600 dark:text-sky-400" />
              </div>
              <h3 className="text-interface mb-2 text-lg font-semibold text-foreground">
                Belum Ada Naturalness Constitution
              </h3>
              <p className="text-narrative mx-auto mb-6 max-w-md text-sm text-muted-foreground">
                Refrasa menggunakan kriteria naturalness default (hardcoded). Buat constitution baru untuk meng-override.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCreateType("naturalness")
                  setIsCreateDialogOpen(true)
                }}
                className="focus-ring inline-flex h-8 items-center justify-center gap-1.5 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Plus className="h-4 w-4" />
                <span>Buat Sendiri</span>
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
              <div className="hidden md:block">
                <table className="text-interface w-full table-fixed border-collapse text-left text-sm">
                  <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
                    <tr>
                      <th className="text-signal h-12 w-[36%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
                        Constitution
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
                          key={`nat-${column.key}`}
                          className="text-signal h-12 w-[28%] px-4 py-3 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {naturalnessConstitutions.map((constitution) => (
                      <tr key={constitution._id} className="group transition-colors hover:bg-muted/50">
                        <td className="bg-slate-200/35 px-4 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                          <div className="text-narrative font-medium text-foreground">
                            {constitution.name}
                          </div>
                          {constitution.description ? (
                            <div className="text-narrative mt-0.5 break-words text-xs text-muted-foreground">
                              {constitution.description}
                            </div>
                          ) : null}
                        </td>
                        <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-2 py-3 group-hover:from-slate-300/65 group-hover:to-muted/40 dark:from-slate-900/80 dark:to-slate-900/40 dark:group-hover:from-slate-800/95 dark:group-hover:to-slate-800/50" />
                        {visibleDynamicColumnsDesktop.map((column) => (
                          <td key={`${constitution._id}-nat-${column.key}`} className="px-4 py-3 text-center align-top">
                            <div className="inline-flex items-center justify-center">
                              {renderDynamicCell(column.key, constitution)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden">
                <table className="text-interface w-full table-fixed border-collapse text-left text-xs">
                  <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
                    <tr>
                      <th className="text-signal h-11 w-[44%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
                        Constitution
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
                          key={`nat-mobile-${column.key}`}
                          className="text-signal h-11 w-[38%] px-2 py-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {naturalnessConstitutions.map((constitution) => (
                      <tr key={constitution._id} className="group transition-colors hover:bg-muted/50">
                        <td className="bg-slate-200/35 px-2 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                          <div className="text-narrative text-xs font-medium text-foreground">
                            {constitution.name}
                          </div>
                          {constitution.description ? (
                            <div className="text-narrative mt-1 break-words text-[11px] text-muted-foreground">
                              {constitution.description}
                            </div>
                          ) : null}
                        </td>
                        <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-1 py-3 dark:from-slate-900/80 dark:to-slate-900/40" />
                        {visibleDynamicColumnsMobile.map((column) => (
                          <td key={`${constitution._id}-nat-mobile-${column.key}`} className="px-2 py-3 text-center align-top">
                            <div className="inline-flex items-center justify-center">
                              {renderDynamicCell(column.key, constitution)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Style Constitution Manager (Layer 2) */}
      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
        <div className="border-b border-border px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <h3 className="text-interface flex items-center gap-2 text-sm font-semibold text-foreground">
                <Journal className="h-4 w-4 text-muted-foreground" />
                Refrasa - Style Constitution
              </h3>
              <p className="text-narrative text-xs text-muted-foreground">
                Kelola panduan gaya penulisan (Layer 2) untuk Refrasa tool. Hanya satu constitution yang bisa aktif.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCreateType("style")
                setIsCreateDialogOpen(true)
              }}
              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Constitution Baru</span>
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {styleConstitutions.length === 0 ? (
            <div className="rounded-shell border-main border border-border bg-card/80 px-4 py-10 text-center dark:bg-slate-900/80">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
                <WarningCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-interface mb-2 text-lg font-semibold text-foreground">
                Belum Ada Style Constitution
              </h3>
              <p className="text-narrative mx-auto mb-6 max-w-md text-sm text-muted-foreground">
                Refrasa membutuhkan Style Constitution (Layer 2) untuk panduan gaya penulisan.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleSeedDefault}
                  disabled={isSeedingDefault}
                  className="focus-ring inline-flex h-8 items-center justify-center gap-1.5 rounded-action border-main border border-border bg-card px-3 py-1.5 text-xs font-mono text-foreground transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" />
                  <span>{isSeedingDefault ? "Memproses..." : "Gunakan Default"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreateType("style")
                    setIsCreateDialogOpen(true)
                  }}
                  className="focus-ring inline-flex h-8 items-center justify-center gap-1.5 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Plus className="h-4 w-4" />
                  <span>Buat Sendiri</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
              <div className="hidden md:block">
                <table className="text-interface w-full table-fixed border-collapse text-left text-sm">
                  <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
                    <tr>
                      <th className="text-signal h-12 w-[36%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
                        Constitution
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
                    {styleConstitutions.map((constitution) => (
                      <tr key={constitution._id} className="group transition-colors hover:bg-muted/50">
                        <td className="bg-slate-200/35 px-4 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                          <div className="text-narrative font-medium text-foreground">
                            {constitution.name}
                          </div>
                          {constitution.description ? (
                            <div className="text-narrative mt-0.5 break-words text-xs text-muted-foreground">
                              {constitution.description}
                            </div>
                          ) : null}
                        </td>
                        <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-2 py-3 group-hover:from-slate-300/65 group-hover:to-muted/40 dark:from-slate-900/80 dark:to-slate-900/40 dark:group-hover:from-slate-800/95 dark:group-hover:to-slate-800/50" />
                        {visibleDynamicColumnsDesktop.map((column) => (
                          <td key={`${constitution._id}-${column.key}`} className="px-4 py-3 text-center align-top">
                            <div className="inline-flex items-center justify-center">
                              {renderDynamicCell(column.key, constitution)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden">
                <table className="text-interface w-full table-fixed border-collapse text-left text-xs">
                  <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
                    <tr>
                      <th className="text-signal h-11 w-[44%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
                        Constitution
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
                    {styleConstitutions.map((constitution) => (
                      <tr key={constitution._id} className="group transition-colors hover:bg-muted/50">
                        <td className="bg-slate-200/35 px-2 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                          <div className="text-narrative text-xs font-medium text-foreground">
                            {constitution.name}
                          </div>
                          {constitution.description ? (
                            <div className="text-narrative mt-1 break-words text-[11px] text-muted-foreground">
                              {constitution.description}
                            </div>
                          ) : null}
                        </td>
                        <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-1 py-3 dark:from-slate-900/80 dark:to-slate-900/40" />
                        {visibleDynamicColumnsMobile.map((column) => (
                          <td key={`${constitution._id}-mobile-${column.key}`} className="px-2 py-3 text-center align-top">
                            <div className="inline-flex items-center justify-center">
                              {renderDynamicCell(column.key, constitution)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(styleConstitutions.length > 0 || naturalnessConstitutions.length > 0) && (
            <p className="text-narrative mt-4 text-xs text-muted-foreground">
              Catatan: Jika tidak ada naturalness constitution aktif, Refrasa menggunakan kriteria naturalness default (hardcoded). Jika tidak ada style constitution aktif, Layer 2 dilewati.
            </p>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || !!editingConstitution}
        onOpenChange={handleCloseFormDialog}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing
                ? `Edit Constitution: ${editingConstitution.name} (v${editingConstitution.version})`
                : "Buat Constitution Baru"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Perubahan akan membuat versi baru. Versi sebelumnya tetap tersimpan di riwayat."
                : `Buat ${createType === "naturalness" ? "naturalness" : "style"} constitution baru untuk Refrasa. Constitution baru akan tidak aktif secara default.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="name">Nama Constitution *</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Makalah Style Constitution"
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Deskripsi singkat tentang constitution ini"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Konten Constitution *</Label>
              <Textarea
                id="content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Tulis style constitution di sini (mendukung Markdown)..."
                rows={20}
                className="font-mono text-sm"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Gunakan format Markdown. {createType === "naturalness" || editingConstitution?.type === "naturalness" ? "Constitution berisi kriteria naturalness (Layer 1)." : "Constitution berisi panduan gaya penulisan (Layer 2)."}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseFormDialog}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={!hasChanges || isLoading}>
                {isLoading
                  ? "Menyimpan..."
                  : isEditing
                    ? `Simpan (Buat v${editingConstitution.version + 1})`
                    : "Buat Constitution"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <StyleConstitutionVersionHistoryDialog
        constitution={historyConstitution}
        userId={userId}
        onClose={() => setHistoryConstitution(null)}
      />

      {/* Activate Confirmation */}
      <AlertDialog
        open={!!activateConstitution}
        onOpenChange={(open) => !open && setActivateConstitution(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktifkan Constitution</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengaktifkan &quot;{activateConstitution?.name}&quot; v
              {activateConstitution?.version}? Constitution lain yang sedang aktif akan
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
        open={!!deactivateConstitution}
        onOpenChange={(open) => !open && setDeactivateConstitution(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan Constitution</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menonaktifkan &quot;{deactivateConstitution?.name}&quot;?
              Refrasa akan menggunakan hanya Layer 1 (Core Naturalness Criteria).
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
        open={!!deleteConstitution}
        onOpenChange={(open) => !open && setDeleteConstitution(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Constitution</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus &quot;{deleteConstitution?.name}&quot; beserta
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
