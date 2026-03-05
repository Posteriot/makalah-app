"use client"

import { useQuery } from "convex/react"
import { useConvexAuth } from "convex/react"
import { WarningCircle, Clock, RefreshCircle, CheckCircle } from "iconoir-react"
import { api } from "@convex/_generated/api"
import { cn } from "@/lib/utils"
import {
  TechnicalReportStatusBadge,
  type TechnicalReportStatus,
} from "@/components/admin/TechnicalReportStatusBadge"

const STATUS_STEPS: Array<{
  status: TechnicalReportStatus
  label: "Pending" | "Proses" | "Selesai"
  icon: typeof Clock
}> = [
  { status: "open", label: "Pending", icon: Clock },
  { status: "triaged", label: "Proses", icon: RefreshCircle },
  { status: "resolved", label: "Selesai", icon: CheckCircle },
]

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function resolveEventLabel(event: {
  eventType: "created" | "status_changed" | "email_sent" | "email_failed"
  toStatus?: TechnicalReportStatus
}): string {
  if (event.eventType === "created") return "Laporan diterima sistem"
  if (event.eventType !== "status_changed") return "Perubahan status"

  if (event.toStatus === "open") return "Status diperbarui ke Pending"
  if (event.toStatus === "triaged") return "Laporan masuk tahap penanganan"
  if (event.toStatus === "resolved") return "Penanganan selesai"
  return "Status diperbarui"
}

function hasStepReached(currentStatus: TechnicalReportStatus, stepStatus: TechnicalReportStatus): boolean {
  const order: Record<TechnicalReportStatus, number> = { open: 0, triaged: 1, resolved: 2 }
  return order[currentStatus] >= order[stepStatus]
}

type TechnicalReportProgressSectionProps = {
  onCreateReportClick: () => void
}

export function TechnicalReportProgressSection({
  onCreateReportClick,
}: TechnicalReportProgressSectionProps) {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth()
  const reports = useQuery(
    api.technicalReports.listMyReportProgress,
    isAuthenticated ? { limit: 10 } : "skip"
  )

  if (isAuthLoading || reports === undefined) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-narrative text-lg font-medium text-foreground">Progres Laporan</h2>
            <p className="text-narrative text-sm text-muted-foreground">
              Memuat progres laporan...
            </p>
          </div>
        </div>
        <div className="h-40 animate-pulse rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900" />
      </section>
    )
  }

  if (!isAuthenticated) {
    return (
      <section className="space-y-3">
        <div className="overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900">
          <div className="flex items-start gap-2 bg-slate-50 p-4 dark:bg-slate-800">
            <WarningCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-narrative text-sm font-medium text-foreground">
                Silakan masuk untuk melihat progres laporan.
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-narrative text-lg font-medium text-foreground">Progres Laporan</h2>
          <p className="text-narrative text-sm text-muted-foreground">
            Menampilkan status terbaru dari laporan yang sudah dikirim.
          </p>
        </div>
        <button
          type="button"
          className="group relative inline-flex h-8 items-center justify-center gap-2 overflow-hidden rounded-action border border-transparent bg-slate-800 px-3 py-1 text-narrative text-xs font-medium text-slate-100 transition-colors hover:border-slate-600 hover:text-slate-800 focus-ring dark:bg-slate-100 dark:text-slate-800 dark:hover:border-slate-400 dark:hover:text-slate-100"
          onClick={onCreateReportClick}
        >
          <span
            className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
            aria-hidden="true"
          />
          <span className="relative z-10">Buat Laporan</span>
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900">
          <div className="flex items-start gap-2 bg-slate-50 p-4 dark:bg-slate-800">
            <WarningCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-narrative text-sm font-medium text-foreground">
                Belum ada laporan.
              </p>
              <p className="text-narrative text-sm text-muted-foreground">
                Kirim laporan pertama jika ada kendala saat chat.
              </p>
              <button
                type="button"
                className="group relative inline-flex h-8 items-center justify-center gap-2 overflow-hidden rounded-action border border-transparent bg-slate-800 px-3 py-1 text-narrative text-xs font-medium text-slate-100 transition-colors hover:border-slate-600 hover:text-slate-800 focus-ring dark:bg-slate-100 dark:text-slate-800 dark:hover:border-slate-400 dark:hover:text-slate-100"
                onClick={onCreateReportClick}
              >
                <span
                  className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                  aria-hidden="true"
                />
                <span className="relative z-10">Buat Laporan</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <article
              key={report._id}
              className="overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900"
            >
              <div className="bg-slate-50 p-4 dark:bg-slate-800">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-interface text-xs font-mono text-foreground">{report._id}</p>
                    <p className="text-narrative text-sm text-foreground">{report.descriptionPreview}</p>
                  </div>
                  <TechnicalReportStatusBadge status={report.status} />
                </div>

                <div className="mb-3 grid grid-cols-1 gap-2 text-interface text-xs text-muted-foreground sm:grid-cols-2">
                  <p>Dibuat: {formatTimestamp(report.createdAt)}</p>
                  <p>Update terakhir: {formatTimestamp(report.updatedAt)}</p>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-2">
                  {STATUS_STEPS.map((step) => {
                    const reached = hasStepReached(report.status, step.status)
                    const Icon = step.icon
                    return (
                      <div
                        key={`${report._id}-${step.status}`}
                        className={cn(
                          "rounded-action border px-2 py-2 text-center text-interface text-[11px]",
                          reached
                            ? "border-slate-300 bg-slate-100 text-foreground dark:border-slate-600 dark:bg-slate-700/70"
                            : "border-slate-200 bg-transparent text-muted-foreground/80 dark:border-slate-700"
                        )}
                      >
                        <div className="mb-1 flex items-center justify-center">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span>{step.label}</span>
                      </div>
                    )
                  })}
                </div>

                {report.events.length > 0 && (
                  <div className="space-y-1.5 border-t border-slate-200 pt-3 dark:border-slate-700">
                    {report.events.map((event) => (
                      <p key={event._id} className="text-interface text-xs text-muted-foreground">
                        {formatTimestamp(event.createdAt)} - {resolveEventLabel(event)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
