"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { useWaitlistMode } from "@/lib/hooks/useWaitlistMode"
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
  NavArrowLeft,
} from "iconoir-react"
import Link from "next/link"

type WaitlistStatus = "pending" | "invited" | "registered"

interface WaitlistDashboardProps {
  userId: Id<"users">
}

export function WaitlistDashboard({ userId }: WaitlistDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | undefined>(
    undefined
  )
  const [invitingId, setInvitingId] = useState<Id<"waitlistEntries"> | null>(null)
  const [deleteEntryId, setDeleteEntryId] = useState<Id<"waitlistEntries"> | null>(
    null
  )

  const { isWaitlistMode, isLoading: isWaitlistLoading } = useWaitlistMode()
  const setWaitlistModeMutation = useMutation(api.appConfig.setWaitlistMode)

  const getStartedEnabled = useQuery(api.appConfig.getGetStartedEnabled)
  const setGetStartedEnabledMutation = useMutation(api.appConfig.setGetStartedEnabled)

  const entries = useQuery(api.waitlist.getAll, {
    adminUserId: userId,
    statusFilter,
  })

  const stats = useQuery(api.waitlist.getStats, {
    adminUserId: userId,
  })

  const deleteEntryMutation = useMutation(api.waitlist.deleteEntry)

  const handleToggleWaitlist = async () => {
    try {
      await setWaitlistModeMutation({
        adminUserId: userId,
        enabled: !isWaitlistMode,
      })
      toast.success(
        isWaitlistMode
          ? "Waiting list mode dinonaktifkan"
          : "Waiting list mode diaktifkan"
      )
    } catch (error) {
      console.error("Toggle waitlist error:", error)
      toast.error("Gagal mengubah status waiting list")
    }
  }

  const handleToggleGetStarted = async () => {
    try {
      await setGetStartedEnabledMutation({
        adminUserId: userId,
        enabled: !(getStartedEnabled ?? true),
      })
      toast.success(
        getStartedEnabled
          ? "Halaman Get Started dinonaktifkan"
          : "Halaman Get Started diaktifkan"
      )
    } catch (error) {
      console.error("Toggle get-started error:", error)
      toast.error("Gagal mengubah status halaman Get Started")
    }
  }

  const handleInvite = async (entryId: Id<"waitlistEntries">) => {
    setInvitingId(entryId)
    try {
      const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL
      if (!convexSiteUrl) {
        throw new Error("NEXT_PUBLIC_CONVEX_SITE_URL is not configured")
      }

      const res = await fetch(`${convexSiteUrl}/api/waitlist/send-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId,
          adminUserId: userId,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.status) {
        throw new Error(data.error ?? "Gagal mengirim undangan")
      }

      toast.success(`Undangan magic link dikirim ke ${data.email}`)
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

  if (entries === undefined || stats === undefined) {
    return (
      <div className="min-h-screen bg-[color:var(--section-bg-alt)]">
        <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
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
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[color:var(--section-bg-alt)]">
      <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-6 space-y-4">
          <Link
            href="/dashboard"
            className="focus-ring inline-flex items-center gap-1.5 rounded-action px-2 py-1 text-xs font-mono text-muted-foreground transition-colors hover:text-foreground"
          >
            <NavArrowLeft className="h-4 w-4" />
            Kembali ke Admin Panel
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-narrative text-2xl font-medium tracking-tight text-foreground md:text-3xl">
                Waiting List
              </h1>
              <p className="text-narrative mt-1 text-sm text-muted-foreground">
                Kelola pendaftar waiting list dan kirim undangan
              </p>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="text-interface text-xs font-mono text-muted-foreground">
                  Waitlist Mode
                </span>
                <button
                  type="button"
                  onClick={handleToggleWaitlist}
                  disabled={isWaitlistLoading}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50",
                    isWaitlistMode ? "bg-primary" : "bg-slate-600"
                  )}
                  aria-label={
                    isWaitlistMode
                      ? "Nonaktifkan waitlist mode"
                      : "Aktifkan waitlist mode"
                  }
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      isWaitlistMode ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
                <span
                  className={cn(
                    "text-signal text-[10px] font-bold",
                    isWaitlistMode
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  )}
                >
                  {isWaitlistMode ? "AKTIF" : "NONAKTIF"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-interface text-xs font-mono text-muted-foreground">
                  Get Started
                </span>
                <button
                  type="button"
                  onClick={handleToggleGetStarted}
                  disabled={getStartedEnabled === undefined}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50",
                    (getStartedEnabled ?? true) ? "bg-primary" : "bg-slate-600"
                  )}
                  aria-label={
                    getStartedEnabled
                      ? "Nonaktifkan halaman Get Started"
                      : "Aktifkan halaman Get Started"
                  }
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      (getStartedEnabled ?? true) ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
                <span
                  className={cn(
                    "text-signal text-[10px] font-bold",
                    (getStartedEnabled ?? true)
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  )}
                >
                  {(getStartedEnabled ?? true) ? "AKTIF" : "NONAKTIF"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-shell border-main border border-border bg-card/90 p-3 dark:bg-slate-900/90">
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
          <div className="rounded-shell border-main border border-border bg-card/90 p-3 dark:bg-slate-900/90">
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
          <div className="rounded-shell border-main border border-border bg-card/90 p-3 dark:bg-slate-900/90">
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
          <div className="rounded-shell border-main border border-border bg-card/90 p-3 dark:bg-slate-900/90">
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
        <div className="mb-4 flex items-center gap-2">
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
            className="focus-ring h-8 rounded-action border-main border border-border bg-card px-3 text-xs font-mono text-foreground dark:bg-slate-900"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="invited">Diundang</option>
            <option value="registered">Terdaftar</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
          <div className="overflow-x-auto">
            <table className="text-interface w-full border-collapse text-left text-sm">
              <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
                <tr>
                  <th className="text-signal h-12 whitespace-nowrap bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
                    Nama
                  </th>
                  <th className="text-signal h-12 whitespace-nowrap bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
                    Email
                  </th>
                  <th className="text-signal h-12 whitespace-nowrap bg-slate-200/75 px-4 py-3 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
                    Status
                  </th>
                  <th className="text-signal h-12 whitespace-nowrap bg-slate-200/75 px-4 py-3 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
                    Tanggal
                  </th>
                  <th className="text-signal h-12 whitespace-nowrap bg-slate-200/75 px-4 py-3 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-900/85">
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
      </div>

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
