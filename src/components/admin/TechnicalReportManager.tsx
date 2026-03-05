"use client"

import { useMemo, useState } from "react"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import type { Id } from "@convex/_generated/dataModel"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, WarningCircle, Clock, RefreshCircle, CheckCircle } from "iconoir-react"
import {
  TechnicalReportStatusBadge,
  getTechnicalReportStatusMeta,
  type TechnicalReportStatus,
} from "./TechnicalReportStatusBadge"

const PAGE_SIZE = 20

type SourceFilter = "all" | "chat-inline" | "footer-link" | "support-page"

const STATUS_ORDER: TechnicalReportStatus[] = ["open", "triaged", "resolved"]

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatEventType(eventType: string): string {
  switch (eventType) {
    case "created":
      return "Laporan dibuat"
    case "status_changed":
      return "Status diubah"
    case "email_sent":
      return "Email terkirim"
    case "email_failed":
      return "Email gagal"
    default:
      return eventType
  }
}

type TechnicalReportManagerProps = {
  userId: Id<"users">
}

export function TechnicalReportManager({ userId }: TechnicalReportManagerProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | TechnicalReportStatus>("all")
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all")
  const [searchInput, setSearchInput] = useState("")
  const [selectedReportId, setSelectedReportId] = useState<Id<"technicalReports"> | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<TechnicalReportStatus | null>(null)

  const normalizedSearch = searchInput.trim()
  const listQueryArgs = useMemo(
    () => ({
      requestorUserId: userId,
      ...(statusFilter === "all" ? {} : { status: statusFilter }),
      ...(sourceFilter === "all" ? {} : { source: sourceFilter }),
      ...(normalizedSearch ? { search: normalizedSearch } : {}),
    }),
    [userId, statusFilter, sourceFilter, normalizedSearch]
  )

  const {
    results: reports,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(api.technicalReports.listForAdmin, listQueryArgs, {
    initialNumItems: PAGE_SIZE,
  })
  const stats = useQuery(api.technicalReports.getAdminStats, { requestorUserId: userId })
  const reportDetail = useQuery(
    api.technicalReports.getDetailForAdmin,
    selectedReportId
      ? {
          requestorUserId: userId,
          reportId: selectedReportId,
        }
      : "skip"
  )
  const reportEvents = useQuery(
    api.technicalReports.listEventsByReport,
    selectedReportId
      ? {
          requestorUserId: userId,
          reportId: selectedReportId,
          limit: 50,
        }
      : "skip"
  )
  const updateStatus = useMutation(api.technicalReports.updateStatusByAdmin)

  const handleStatusUpdate = async (toStatus: TechnicalReportStatus) => {
    if (!selectedReportId) return
    setUpdatingStatus(toStatus)
    try {
      const result = await updateStatus({
        requestorUserId: userId,
        reportId: selectedReportId,
        toStatus,
      })
      if (result.changed) {
        toast.success(`Status laporan diubah ke ${result.statusLabel}.`)
      } else {
        toast.info("Status laporan tidak berubah.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengubah status laporan.")
    } finally {
      setUpdatingStatus(null)
    }
  }

  if (paginationStatus === "LoadingFirstPage" || stats === undefined) {
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-shell border-main border border-border bg-card/60 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
            <WarningCircle className="h-3.5 w-3.5" />
            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">Total</span>
          </div>
          <p className="text-interface text-xl font-mono font-semibold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-shell border-main border border-border bg-card/60 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-interface text-xl font-mono font-semibold text-foreground">{stats.open}</p>
        </div>
        <div className="rounded-shell border-main border border-border bg-card/60 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
            <RefreshCircle className="h-3.5 w-3.5" />
            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">Proses</span>
          </div>
          <p className="text-interface text-xl font-mono font-semibold text-foreground">{stats.triaged}</p>
        </div>
        <div className="rounded-shell border-main border border-border bg-card/60 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="text-signal text-[10px] font-mono uppercase tracking-wider">Selesai</span>
          </div>
          <p className="text-interface text-xl font-mono font-semibold text-foreground">{stats.resolved}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="flex h-10 items-center gap-2 rounded-action border border-border bg-background px-3 text-xs text-muted-foreground">
          <Search className="h-4 w-4" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Cari report ID / email / deskripsi"
            className="h-full w-full bg-transparent text-sm text-foreground outline-none"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | TechnicalReportStatus)}
          className="focus-ring h-10 rounded-action border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="all">Semua status</option>
          <option value="open">Pending</option>
          <option value="triaged">Proses</option>
          <option value="resolved">Selesai</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
          className="focus-ring h-10 rounded-action border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="all">Semua sumber</option>
          <option value="chat-inline">chat-inline</option>
          <option value="footer-link">footer-link</option>
          <option value="support-page">support-page</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/60">
        <div className="overflow-x-auto">
          <table className="text-interface w-full border-collapse text-left text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-signal h-10 whitespace-nowrap bg-slate-100 px-4 py-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-800">
                  Report ID
                </th>
                <th className="text-signal h-10 whitespace-nowrap bg-slate-100 px-4 py-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-800">
                  User
                </th>
                <th className="text-signal h-10 whitespace-nowrap bg-slate-100 px-4 py-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-800">
                  Ringkasan
                </th>
                <th className="text-signal h-10 whitespace-nowrap bg-slate-100 px-4 py-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-800">
                  Source
                </th>
                <th className="text-signal h-10 whitespace-nowrap bg-slate-100 px-4 py-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-800">
                  Status
                </th>
                <th className="text-signal h-10 whitespace-nowrap bg-slate-100 px-4 py-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-800">
                  Waktu
                </th>
                <th className="text-signal h-10 whitespace-nowrap bg-slate-100 px-4 py-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase dark:bg-slate-800">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    Belum ada laporan yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report._id} className="transition-colors hover:bg-muted/50">
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <span className="font-mono text-xs text-foreground">{report._id}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono text-foreground">{report.userEmail}</span>
                        {report.userName && (
                          <span className="text-[11px] text-muted-foreground">{report.userName}</span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[380px] px-4 py-3 align-top">
                      <p className="line-clamp-2 text-xs text-foreground">{report.descriptionPreview}</p>
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      <span className="text-[11px] font-mono text-muted-foreground">{report.source}</span>
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      <TechnicalReportStatusBadge status={report.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-top">
                      <span className="text-[11px] text-muted-foreground">
                        {formatTimestamp(report.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      <button
                        type="button"
                        onClick={() => setSelectedReportId(report._id)}
                        className="focus-ring inline-flex h-8 items-center rounded-action border border-border px-3 text-xs font-mono text-foreground hover:bg-muted"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {paginationStatus === "CanLoadMore" && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => loadMore(PAGE_SIZE)}
            className="focus-ring inline-flex h-9 items-center rounded-action border border-border px-4 text-xs font-mono text-foreground hover:bg-muted"
          >
            Muat lebih banyak
          </button>
        </div>
      )}

      <Dialog
        open={Boolean(selectedReportId)}
        onOpenChange={(open) => {
          if (!open) setSelectedReportId(null)
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Technical Report</DialogTitle>
            <DialogDescription>
              Review konteks user, ubah status, dan lihat riwayat event.
            </DialogDescription>
          </DialogHeader>

          {selectedReportId && reportDetail === undefined ? (
            <p className="text-sm text-muted-foreground">Memuat detail report...</p>
          ) : reportDetail == null ? (
            <p className="text-sm text-[var(--chat-destructive)]">Report tidak ditemukan.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-action border border-border bg-card/60 p-3">
                  <p className="text-[11px] font-mono text-muted-foreground">REPORT ID</p>
                  <p className="break-all text-xs font-mono text-foreground">{reportDetail.report._id}</p>
                </div>
                <div className="rounded-action border border-border bg-card/60 p-3">
                  <p className="text-[11px] font-mono text-muted-foreground">STATUS</p>
                  <TechnicalReportStatusBadge status={reportDetail.report.status} />
                </div>
                <div className="rounded-action border border-border bg-card/60 p-3">
                  <p className="text-[11px] font-mono text-muted-foreground">USER</p>
                  <p className="text-xs text-foreground">{reportDetail.reporter?.email ?? "unknown@makalah.ai"}</p>
                </div>
                <div className="rounded-action border border-border bg-card/60 p-3">
                  <p className="text-[11px] font-mono text-muted-foreground">SOURCE</p>
                  <p className="text-xs font-mono text-foreground">{reportDetail.report.source}</p>
                </div>
              </div>

              <div className="rounded-action border border-border bg-card/60 p-3">
                <p className="text-[11px] font-mono text-muted-foreground">DESKRIPSI USER</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {reportDetail.report.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-action border border-border bg-card/60 p-3">
                  <p className="text-[11px] font-mono text-muted-foreground">ISSUE CATEGORY</p>
                  <p className="mt-1 text-xs text-foreground">{reportDetail.report.issueCategory ?? "-"}</p>
                </div>
                <div className="rounded-action border border-border bg-card/60 p-3">
                  <p className="text-[11px] font-mono text-muted-foreground">CONTEXT REF</p>
                  <p className="mt-1 text-xs text-foreground">
                    Conversation: {reportDetail.report.conversationId ?? "-"}
                    <br />
                    Paper session: {reportDetail.report.paperSessionId ?? "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-action border border-border bg-card/60 p-3">
                <p className="text-[11px] font-mono text-muted-foreground">CONTEXT SNAPSHOT</p>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2 text-[11px] text-foreground">
                  {JSON.stringify(reportDetail.report.contextSnapshot ?? {}, null, 2)}
                </pre>
              </div>

              <div className="rounded-action border border-border bg-card/60 p-3">
                <p className="text-[11px] font-mono text-muted-foreground">AKSI STATUS</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {STATUS_ORDER.map((statusValue) => {
                    const meta = getTechnicalReportStatusMeta(statusValue)
                    const isActive = reportDetail.report.status === statusValue
                    return (
                      <button
                        key={statusValue}
                        type="button"
                        disabled={Boolean(updatingStatus)}
                        onClick={() => handleStatusUpdate(statusValue)}
                        className={`focus-ring inline-flex h-9 items-center rounded-action border px-3 text-xs font-mono transition-colors ${
                          isActive
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {updatingStatus === statusValue ? "Mengubah..." : meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-action border border-border bg-card/60 p-3">
                <p className="text-[11px] font-mono text-muted-foreground">RIWAYAT STATUS & EMAIL</p>
                <div className="mt-2 space-y-2">
                  {reportEvents === undefined ? (
                    <p className="text-xs text-muted-foreground">Memuat riwayat event...</p>
                  ) : reportEvents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Belum ada event untuk report ini.</p>
                  ) : (
                    reportEvents.map((event) => (
                      <div
                        key={event._id}
                        className="rounded-action border border-border bg-background/70 px-3 py-2"
                      >
                        <p className="text-xs font-medium text-foreground">
                          {formatEventType(event.eventType)}
                          {event.fromStatus && event.toStatus
                            ? ` (${getTechnicalReportStatusMeta(event.fromStatus).label} -> ${getTechnicalReportStatusMeta(event.toStatus).label})`
                            : ""}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatTimestamp(event.createdAt)} •{" "}
                          {event.actorEmail ?? event.actorName ?? "system"}
                          {event.recipient ? ` • recipient: ${event.recipient}` : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
