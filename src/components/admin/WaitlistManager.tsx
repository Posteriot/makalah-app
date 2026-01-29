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
  Trash2,
  RefreshCw,
  Users,
  Clock,
  Send,
  CheckCircle,
  Loader2,
} from "lucide-react"
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
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-muted rounded-lg" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Total</span>
          </div>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Menunggu</span>
          </div>
          <p className="text-2xl font-semibold">{stats.pending}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Send className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Diundang</span>
          </div>
          <p className="text-2xl font-semibold">{stats.invited}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Terdaftar</span>
          </div>
          <p className="text-2xl font-semibold">{stats.registered}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <select
            value={statusFilter ?? "all"}
            onChange={(e) =>
              setStatusFilter(
                e.target.value === "all"
                  ? undefined
                  : (e.target.value as WaitlistStatus)
              )
            }
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
            className="gap-2"
          >
            {isInviting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Invite {selectedPendingIds.length} Terpilih
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-10 p-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      pendingEntries.length > 0 &&
                      selectedPendingIds.length === pendingEntries.length
                    }
                    onChange={handleSelectAll}
                    disabled={pendingEntries.length === 0}
                    className="h-4 w-4 rounded border-border"
                  />
                </th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Email
                </th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Tanggal Daftar
                </th>
                <th className="p-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Belum ada pendaftar di waiting list
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(entry._id)}
                        onChange={() => handleToggleSelect(entry._id)}
                        disabled={entry.status !== "pending"}
                        className="h-4 w-4 rounded border-border disabled:opacity-30"
                      />
                    </td>
                    <td className="p-3">
                      <span className="text-sm font-medium">{entry.email}</span>
                    </td>
                    <td className="p-3">
                      <WaitlistStatusBadge status={entry.status} />
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {formatDate(entry.createdAt)}
                      {entry.invitedAt && (
                        <div className="text-xs mt-0.5">
                          Diundang: {formatDate(entry.invitedAt)}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        {entry.status === "invited" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleResendInvite(entry._id)}
                            title="Kirim ulang undangan"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteEntryId(entry._id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
