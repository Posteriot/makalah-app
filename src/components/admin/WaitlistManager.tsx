"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
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
} from "iconoir-react"
import {
  sendBulkInviteEmails,
  sendSingleInviteEmail,
} from "@/app/(auth)/waiting-list/actions"

type WaitlistStatus = "pending" | "invited" | "registered"

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

      await sendSingleInviteEmail(result.email, result.inviteToken)

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

  if (entries === undefined || stats === undefined) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-20 bg-slate-800 rounded-lg" />
        <div className="h-56 bg-slate-800 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards - Mechanical Grace: Slate bg, hairline borders, Mono numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Group className="h-3.5 w-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Total</span>
          </div>
          <p className="text-xl font-mono font-semibold text-slate-100">{stats.total}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-amber-500 mb-1">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Menunggu</span>
          </div>
          <p className="text-xl font-mono font-semibold text-slate-100">{stats.pending}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-sky-400 mb-1">
            <Send className="h-3.5 w-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Diundang</span>
          </div>
          <p className="text-xl font-mono font-semibold text-slate-100">{stats.invited}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-emerald-500 mb-1">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Terdaftar</span>
          </div>
          <p className="text-xl font-mono font-semibold text-slate-100">{stats.registered}</p>
        </div>
      </div>

      {/* Toolbar - Mechanical Grace */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">Filter:</span>
          <select
            value={statusFilter ?? "all"}
            onChange={(e) =>
              setStatusFilter(
                e.target.value === "all"
                  ? undefined
                  : (e.target.value as WaitlistStatus)
              )
            }
            className="h-8 rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs font-mono text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="invited">Diundang</option>
            <option value="registered">Terdaftar</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedPendingIds.length > 0 && (
          <Button
            onClick={() => setShowInviteDialog(true)}
            disabled={isInviting}
            className="gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs"
          >
            {isInviting ? (
              <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            Invite {selectedPendingIds.length} Terpilih
          </Button>
        )}
      </div>

      {/* Table - Mechanical Grace: 0px radius for data, hairline borders, Mono */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="w-10 p-2.5 text-left">
                  <input
                    type="checkbox"
                    checked={
                      pendingEntries.length > 0 &&
                      selectedPendingIds.length === pendingEntries.length
                    }
                    onChange={handleSelectAll}
                    disabled={pendingEntries.length === 0}
                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900"
                  />
                </th>
                <th className="p-2.5 text-left text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="p-2.5 text-left text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="p-2.5 text-left text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider">
                  Tanggal Daftar
                </th>
                <th className="p-2.5 text-right text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-xs font-mono text-slate-500">
                    Belum ada pendaftar di waiting list
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(entry._id)}
                        onChange={() => handleToggleSelect(entry._id)}
                        disabled={entry.status !== "pending"}
                        className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 disabled:opacity-30"
                      />
                    </td>
                    <td className="p-2.5">
                      <span className="text-xs font-mono font-medium text-slate-200">{entry.email}</span>
                    </td>
                    <td className="p-2.5">
                      <WaitlistStatusBadge status={entry.status} />
                    </td>
                    <td className="p-2.5 text-xs font-mono text-slate-400">
                      {formatDate(entry.createdAt)}
                      {entry.invitedAt && (
                        <div className="text-[10px] mt-0.5 text-slate-500">
                          Diundang: {formatDate(entry.invitedAt)}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {entry.status === "invited" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleResendInvite(entry._id)}
                            title="Kirim ulang undangan"
                            className="h-7 w-7 hover:bg-slate-800"
                          >
                            <Refresh className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteEntryId(entry._id)}
                          className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          title="Hapus"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
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
