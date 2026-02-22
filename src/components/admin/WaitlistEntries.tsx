"use client"

import { useState } from "react"
import { useQuery, useMutation, useAction, usePaginatedQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
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
import { cn } from "@/lib/utils"
import {
  Group,
  Clock,
  Send,
  CheckCircle,
  Trash,
  Mail,
  RefreshDouble,
  Expand,
} from "iconoir-react"
import { WaitlistEntriesFullscreen } from "./WaitlistEntriesFullscreen"

type WaitlistStatus = "pending" | "invited" | "registered"

const PAGE_SIZE = 20

interface WaitlistEntriesProps {
  userId: Id<"users">
}

export function WaitlistEntries({ userId }: WaitlistEntriesProps) {
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | undefined>(
    undefined
  )
  const [invitingId, setInvitingId] = useState<Id<"waitlistEntries"> | null>(null)
  const [deleteEntryId, setDeleteEntryId] = useState<Id<"waitlistEntries"> | null>(
    null
  )
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { results: entries, status: paginationStatus, loadMore } = usePaginatedQuery(
    api.waitlist.getPaginated,
    { adminUserId: userId, statusFilter },
    { initialNumItems: PAGE_SIZE }
  )

  const stats = useQuery(api.waitlist.getStats, {
    adminUserId: userId,
  })

  const deleteEntryMutation = useMutation(api.waitlist.deleteEntry)
  const resetToPendingMutation = useMutation(api.waitlist.resetToPending)
  const sendInviteEmailAction = useAction(api.waitlist.sendInviteEmail)

  const handleResetToPending = async (entryId: Id<"waitlistEntries">) => {
    try {
      await resetToPendingMutation({
        adminUserId: userId,
        entryId,
      })
      toast.success("Entry direset ke status Menunggu")
    } catch (error) {
      console.error("Reset error:", error)
      toast.error("Gagal mereset entry")
    }
  }

  const handleInvite = async (entryId: Id<"waitlistEntries">) => {
    setInvitingId(entryId)
    try {
      const result = await sendInviteEmailAction({
        adminUserId: userId,
        entryId,
      })
      toast.success(`Undangan dikirim ke ${result.email}`)
    } catch (error) {
      console.error("Invite error:", error)
      toast.error("Gagal mengirim undangan", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
      })
    } finally {
      setInvitingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteEntryId) return

    try {
      await deleteEntryMutation({
        adminUserId: userId,
        entryId: deleteEntryId,
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

  if (paginationStatus === "LoadingFirstPage" || stats === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded-action bg-muted" />
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
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-shell border-main border border-border bg-card/60 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
            <Group className="h-3.5 w-3.5" />
            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">
              Total
            </span>
          </div>
          <p className="text-interface text-xl font-mono font-semibold text-foreground">
            {stats.total}
          </p>
        </div>
        <div className="rounded-shell border-main border border-border bg-card/60 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">
              Menunggu
            </span>
          </div>
          <p className="text-interface text-xl font-mono font-semibold text-foreground">
            {stats.pending}
          </p>
        </div>
        <div className="rounded-shell border-main border border-border bg-card/60 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
            <Send className="h-3.5 w-3.5" />
            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">
              Diundang
            </span>
          </div>
          <p className="text-interface text-xl font-mono font-semibold text-foreground">
            {stats.invited}
          </p>
        </div>
        <div className="rounded-shell border-main border border-border bg-card/60 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">
              Terdaftar
            </span>
          </div>
          <p className="text-interface text-xl font-mono font-semibold text-foreground">
            {stats.registered}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-signal text-xs font-mono text-muted-foreground">
          Filter:
        </span>
        <select
          value={statusFilter ?? "all"}
          onChange={(e) =>
            setStatusFilter(
              e.target.value === "all"
                ? undefined
                : (e.target.value as WaitlistStatus)
            )
          }
          className="focus-ring h-8 rounded-action border-main border border-border bg-background px-3 text-xs font-mono text-foreground"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="invited">Diundang</option>
          <option value="registered">Terdaftar</option>
        </select>
      </div>

      {/* Expand button + Fullscreen */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-muted-foreground">
          {entries.length} pendaftar
        </p>
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          aria-label="Fullscreen tabel"
          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Expand className="h-4 w-4" />
        </button>
      </div>

      <WaitlistEntriesFullscreen
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        entries={entries}
        paginationStatus={paginationStatus}
        loadMore={loadMore}
        formatDate={formatDate}
        invitingId={invitingId}
        onInvite={handleInvite}
        onResetToPending={handleResetToPending}
        onDelete={setDeleteEntryId}
      />

      {/* Table */}
      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/60">
        <div className="overflow-x-auto">
          <table className="text-interface w-full border-collapse text-left text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-signal h-10 whitespace-nowrap bg-slate-100 px-4 py-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-800">
                  Nama
                </th>
                <th className="text-signal h-10 whitespace-nowrap bg-slate-100 px-4 py-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-800">
                  Email
                </th>
                <th className="text-signal h-10 whitespace-nowrap bg-slate-100 px-4 py-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-800">
                  Status
                </th>
                <th className="text-signal h-10 whitespace-nowrap bg-slate-100 px-4 py-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-800">
                  Tanggal
                </th>
                <th className="text-signal h-10 whitespace-nowrap bg-slate-100 px-4 py-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-800">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Belum ada pendaftar di waiting list
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry._id}
                    className="group transition-colors hover:bg-muted/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <span className="text-narrative text-xs font-mono text-foreground">
                        {entry.firstName} {entry.lastName}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="text-narrative break-all text-xs font-mono text-foreground">
                        {entry.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      <WaitlistStatusBadge status={entry.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-top">
                      <span className="text-narrative text-xs text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      <div className="flex items-center justify-center gap-1">
                        {entry.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => handleInvite(entry._id)}
                            disabled={invitingId === entry._id}
                            title="Undang"
                            className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action border-main border border-border px-2.5 text-xs font-mono text-sky-600 transition-colors hover:bg-sky-500/10 disabled:opacity-50 dark:text-sky-400"
                          >
                            {invitingId === entry._id ? (
                              <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Mail className="h-3.5 w-3.5" />
                            )}
                            Undang
                          </button>
                        )}
                        {(entry.status === "invited" || entry.status === "registered") && (
                          <button
                            type="button"
                            onClick={() => handleResetToPending(entry._id)}
                            title="Reset ke Menunggu"
                            className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action border-main border border-border px-2.5 text-xs font-mono text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
                          >
                            <RefreshDouble className="h-3.5 w-3.5" />
                            Reset
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteEntryId(entry._id)}
                          title="Hapus"
                          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {paginationStatus === "CanLoadMore" && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => loadMore(PAGE_SIZE)}
            className={cn(
              "focus-ring inline-flex items-center gap-1.5 rounded-action border border-border px-4 py-2 text-xs font-mono text-foreground transition-colors hover:bg-muted"
            )}
          >
            Muat Lebih Banyak
          </button>
        </div>
      )}
      {paginationStatus === "Exhausted" && entries.length > PAGE_SIZE && (
        <p className="text-center text-xs font-mono text-muted-foreground">
          Semua data ditampilkan
        </p>
      )}

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
