"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"
import { WaitlistStatusBadge } from "./WaitlistStatusBadge"
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
import { toast } from "sonner"
import {
  Mail,
  Trash,
  Refresh,
  Group,
  Clock,
  Send,
  CheckCircle,
  NavArrowLeft,
  NavArrowRight,
} from "iconoir-react"
import {
  sendBulkInviteEmails,
  sendSingleInviteEmail,
} from "@/app/(auth)/waiting-list/actions"

type WaitlistStatus = "pending" | "invited" | "registered"

type WaitlistDynamicColumnKey = "status" | "timeline" | "actions"

const WAITLIST_DYNAMIC_COLUMNS: Array<{
  key: WaitlistDynamicColumnKey
  label: string
}> = [
  { key: "status", label: "Status" },
  { key: "timeline", label: "Timeline" },
  { key: "actions", label: "Aksi" },
]

interface WaitlistManagerProps {
  userId: Id<"users">
}

export function WaitlistManager({ userId }: WaitlistManagerProps) {
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | undefined>(
    undefined
  )
  const [selectedIds, setSelectedIds] = useState<Set<Id<"waitlistEntries">>>(
    new Set()
  )
  const [isInviting, setIsInviting] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [deleteEntryId, setDeleteEntryId] = useState<Id<"waitlistEntries"> | null>(
    null
  )
  const [dynamicColumnStart, setDynamicColumnStart] = useState(0)

  const entries = useQuery(api.waitlist.getAll, {
    adminUserId: userId,
    statusFilter,
  })

  const stats = useQuery(api.waitlist.getStats, {
    adminUserId: userId,
  })

  const bulkInviteMutation = useMutation(api.waitlist.bulkInvite)
  const resendInviteMutation = useMutation(api.waitlist.resendInvite)
  const deleteEntryMutation = useMutation(api.waitlist.deleteEntry)

  const pendingEntries = entries?.filter((e) => e.status === "pending") ?? []
  const selectedPendingIds = [...selectedIds].filter((id) =>
    pendingEntries.some((e) => e._id === id)
  )

  const handleSelectAll = () => {
    if (selectedPendingIds.length === pendingEntries.length) {
      // Deselect all
      setSelectedIds(new Set())
    } else {
      // Select all pending
      setSelectedIds(new Set(pendingEntries.map((e) => e._id)))
    }
  }

  const handleToggleSelect = (entryId: Id<"waitlistEntries">) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(entryId)) {
      newSet.delete(entryId)
    } else {
      newSet.add(entryId)
    }
    setSelectedIds(newSet)
  }

  const handleBulkInvite = async () => {
    if (selectedPendingIds.length === 0) return

    setIsInviting(true)
    setShowInviteDialog(false)

    try {
      // Update status in Convex and get tokens
      const invitedEntries = await bulkInviteMutation({
        adminUserId: userId,
        entryIds: selectedPendingIds,
      })

      // Send invite emails
      const { success, failed } = await sendBulkInviteEmails(invitedEntries)

      setSelectedIds(new Set())

      if (failed > 0) {
        toast.warning(`${success} undangan terkirim, ${failed} gagal`, {
          description: "Beberapa email gagal dikirim. Coba kirim ulang nanti.",
        })
      } else {
        toast.success(`${success} undangan berhasil dikirim!`)
      }
    } catch (error) {
      console.error("Bulk invite error:", error)
      toast.error("Gagal mengirim undangan", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
      })
    } finally {
      setIsInviting(false)
    }
  }

  const handleResendInvite = async (entryId: Id<"waitlistEntries">) => {
    try {
      const result = await resendInviteMutation({
        adminUserId: userId,
        entryId,
      })

      await sendSingleInviteEmail(result.email, result.inviteToken, result.firstName)

      toast.success("Undangan berhasil dikirim ulang!")
    } catch (error) {
      console.error("Resend invite error:", error)
      toast.error("Gagal mengirim ulang undangan", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteEntryId) return

    try {
      await deleteEntryMutation({
        adminUserId: userId,
        entryId: deleteEntryId,
      })

      setSelectedIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(deleteEntryId)
        return newSet
      })

      toast.success("Entry berhasil dihapus")
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Gagal menghapus entry")
    } finally {
      setDeleteEntryId(null)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const DESKTOP_DYNAMIC_COLUMN_COUNT = 2
  const MOBILE_DYNAMIC_COLUMN_COUNT = 1

  const visibleDynamicColumnsDesktop = Array.from(
    { length: DESKTOP_DYNAMIC_COLUMN_COUNT },
    (_, offset) =>
      WAITLIST_DYNAMIC_COLUMNS[
        (dynamicColumnStart + offset) % WAITLIST_DYNAMIC_COLUMNS.length
      ]
  )

  const visibleDynamicColumnsMobile = Array.from(
    { length: MOBILE_DYNAMIC_COLUMN_COUNT },
    (_, offset) =>
      WAITLIST_DYNAMIC_COLUMNS[
        (dynamicColumnStart + offset) % WAITLIST_DYNAMIC_COLUMNS.length
      ]
  )

  const goToPrevColumns = () => {
    setDynamicColumnStart(
      (prev) =>
        (prev - 1 + WAITLIST_DYNAMIC_COLUMNS.length) %
        WAITLIST_DYNAMIC_COLUMNS.length
    )
  }

  const goToNextColumns = () => {
    setDynamicColumnStart((prev) => (prev + 1) % WAITLIST_DYNAMIC_COLUMNS.length)
  }

  const renderActionsCell = (entry: {
    _id: Id<"waitlistEntries">
    status: WaitlistStatus
  }) => (
    <div className="flex items-center justify-center gap-1">
      {entry.status === "invited" ? (
        <button
          type="button"
          onClick={() => handleResendInvite(entry._id)}
          title="Kirim ulang undangan"
          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-sky-600 transition-colors hover:bg-slate-200 dark:text-sky-400 dark:hover:bg-slate-800"
        >
          <Refresh className="h-4 w-4" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setDeleteEntryId(entry._id)}
        title="Hapus"
        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
      >
        <Trash className="h-4 w-4" />
      </button>
    </div>
  )

  const renderDynamicCell = (columnKey: WaitlistDynamicColumnKey, entry: {
    _id: Id<"waitlistEntries">
    status: WaitlistStatus
    createdAt: number
    invitedAt?: number
  }) => {
    if (columnKey === "status") {
      return <WaitlistStatusBadge status={entry.status} />
    }

    if (columnKey === "timeline") {
      return (
        <div className="text-center">
          <div className="text-narrative text-xs text-muted-foreground">
            {formatDate(entry.createdAt)}
          </div>
          {entry.invitedAt ? (
            <div className="text-signal mt-1 text-[10px] text-muted-foreground">
              Invite: {formatDate(entry.invitedAt)}
            </div>
          ) : null}
        </div>
      )
    }

    return renderActionsCell(entry)
  }

  if (entries === undefined || stats === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="h-20 rounded-shell bg-muted" />
          <div className="h-20 rounded-shell bg-muted" />
          <div className="h-20 rounded-shell bg-muted" />
          <div className="h-20 rounded-shell bg-muted" />
        </div>
        <div className="h-56 rounded-shell bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-shell border-main border border-border bg-card/90 p-3 dark:bg-slate-900/90">
          <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
            <Group className="h-3.5 w-3.5" />
            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">Total</span>
          </div>
          <p className="text-interface text-xl font-mono font-semibold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-shell border-main border border-border bg-card/90 p-3 dark:bg-slate-900/90">
          <div className="mb-1 flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">Menunggu</span>
          </div>
          <p className="text-interface text-xl font-mono font-semibold text-foreground">{stats.pending}</p>
        </div>
        <div className="rounded-shell border-main border border-border bg-card/90 p-3 dark:bg-slate-900/90">
          <div className="mb-1 flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
            <Send className="h-3.5 w-3.5" />
            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">Diundang</span>
          </div>
          <p className="text-interface text-xl font-mono font-semibold text-foreground">{stats.invited}</p>
        </div>
        <div className="rounded-shell border-main border border-border bg-card/90 p-3 dark:bg-slate-900/90">
          <div className="mb-1 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">Terdaftar</span>
          </div>
          <p className="text-interface text-xl font-mono font-semibold text-foreground">{stats.registered}</p>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="text-signal text-xs font-mono text-muted-foreground">Filter:</span>
          <select
            value={statusFilter ?? "all"}
            onChange={(e) =>
              setStatusFilter(
                e.target.value === "all"
                  ? undefined
                  : (e.target.value as WaitlistStatus)
              )
            }
            className="focus-ring h-8 rounded-action border-main border border-border bg-card px-3 text-xs font-mono text-foreground dark:bg-slate-900"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="invited">Diundang</option>
            <option value="registered">Terdaftar</option>
          </select>
        </div>

        {selectedPendingIds.length > 0 && (
          <button
            type="button"
            onClick={() => setShowInviteDialog(true)}
            disabled={isInviting}
            className="focus-ring inline-flex h-8 items-center gap-2 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-100 transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {isInviting ? (
              <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            Invite {selectedPendingIds.length} Terpilih
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
        <div className="hidden md:block">
          <table className="text-interface w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
              <tr>
                <th className="h-12 w-[8%] bg-slate-200/75 px-3 py-2 text-left dark:bg-slate-900/85">
                  <input
                    type="checkbox"
                    checked={
                      pendingEntries.length > 0 &&
                      selectedPendingIds.length === pendingEntries.length
                    }
                    onChange={handleSelectAll}
                    disabled={pendingEntries.length === 0}
                    className="h-3.5 w-3.5 rounded border-border bg-card dark:bg-slate-900"
                  />
                </th>
                <th className="text-signal h-12 w-[34%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
                  Email
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
                    className="text-signal h-12 w-[25%] px-4 py-3 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    Belum ada pendaftar di waiting list
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry._id} className="group transition-colors hover:bg-muted/50">
                    <td className="bg-slate-200/35 px-3 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(entry._id)}
                        onChange={() => handleToggleSelect(entry._id)}
                        disabled={entry.status !== "pending"}
                        className="h-3.5 w-3.5 rounded border-border bg-card disabled:opacity-30 dark:bg-slate-900"
                      />
                    </td>
                    <td className="bg-slate-200/35 px-4 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                      <span className="text-narrative break-all text-xs font-mono text-foreground">
                        {entry.email}
                      </span>
                    </td>
                    <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-2 py-3 group-hover:from-slate-300/65 group-hover:to-muted/40 dark:from-slate-900/80 dark:to-slate-900/40 dark:group-hover:from-slate-800/95 dark:group-hover:to-slate-800/50" />
                    {visibleDynamicColumnsDesktop.map((column) => (
                      <td key={`${entry._id}-${column.key}`} className="px-4 py-3 text-center align-top">
                        <div className="inline-flex items-center justify-center">
                          {renderDynamicCell(column.key, entry)}
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
                <th className="h-11 w-[10%] bg-slate-200/75 px-2 py-2 text-left dark:bg-slate-900/85">
                  <input
                    type="checkbox"
                    checked={
                      pendingEntries.length > 0 &&
                      selectedPendingIds.length === pendingEntries.length
                    }
                    onChange={handleSelectAll}
                    disabled={pendingEntries.length === 0}
                    className="h-3.5 w-3.5 rounded border-border bg-card dark:bg-slate-900"
                  />
                </th>
                <th className="text-signal h-11 w-[34%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
                  Email
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
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
                    Belum ada pendaftar di waiting list
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry._id} className="group transition-colors hover:bg-muted/50">
                    <td className="bg-slate-200/35 px-2 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(entry._id)}
                        onChange={() => handleToggleSelect(entry._id)}
                        disabled={entry.status !== "pending"}
                        className="h-3.5 w-3.5 rounded border-border bg-card disabled:opacity-30 dark:bg-slate-900"
                      />
                    </td>
                    <td className="bg-slate-200/35 px-2 py-3 align-top group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                      <span className="text-narrative break-all text-[11px] font-mono text-foreground">
                        {entry.email}
                      </span>
                    </td>
                    <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-1 py-3 dark:from-slate-900/80 dark:to-slate-900/40" />
                    {visibleDynamicColumnsMobile.map((column) => (
                      <td key={`${entry._id}-mobile-${column.key}`} className="px-2 py-3 text-center align-top">
                        <div className="inline-flex items-center justify-center">
                          {renderDynamicCell(column.key, entry)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Invite Dialog */}
      <AlertDialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim Undangan</AlertDialogTitle>
            <AlertDialogDescription>
              Kamu akan mengirim undangan ke {selectedPendingIds.length} email
              terpilih. Mereka akan menerima email dengan link untuk mendaftar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkInvite}>
              Kirim Undangan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deleteEntryId}
        onOpenChange={(open) => !open && setDeleteEntryId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin menghapus entry ini dari waiting list?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-500 text-white hover:bg-rose-600 font-mono text-xs"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
