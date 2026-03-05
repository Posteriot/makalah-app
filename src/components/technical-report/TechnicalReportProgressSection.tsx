"use client"

import { useQuery } from "convex/react"
import { WarningCircle, Clock, RefreshCircle, CheckCircle } from "iconoir-react"
import { api } from "@convex/_generated/api"
import { Button } from "@/components/ui/button"
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
  const reports = useQuery(api.technicalReports.listMyReportProgress, { limit: 10 })

  if (reports === undefined) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-narrative text-lg font-medium text-foreground">Progres Laporan</h2>
            <p className="text-narrative text-sm text-muted-foreground">
              Memuat progres laporan teknis...
            </p>
          </div>
        </div>
        <div className="h-40 animate-pulse rounded-shell border border-border bg-muted/40" />
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-action text-xs font-medium font-sans"
          onClick={onCreateReportClick}
        >
          Buat Laporan
        </Button>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-shell border border-border bg-card/60 p-4">
          <div className="flex items-start gap-2">
            <WarningCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-narrative text-sm font-medium text-foreground">
                Belum ada laporan teknis.
              </p>
              <p className="text-narrative text-sm text-muted-foreground">
                Kirim laporan pertama untuk membantu investigasi kendala chat.
              </p>
              <Button
                type="button"
                size="sm"
                className="chat-validation-approve-button h-8 rounded-action px-3 text-xs"
                onClick={onCreateReportClick}
              >
                Buat Laporan
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <article key={report._id} className="rounded-shell border border-border bg-card/60 p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-interface text-xs font-mono text-foreground">{report._id}</p>
                  <p className="text-narrative text-sm text-foreground">{report.descriptionPreview}</p>
                </div>
                <TechnicalReportStatusBadge status={report.status} />
              </div>

              <div className="mb-3 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
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
                        "rounded-action border px-2 py-2 text-center text-[11px]",
                        reached
                          ? "border-border bg-background text-foreground"
                          : "border-border/60 bg-transparent text-muted-foreground/80"
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
                <div className="space-y-1.5 border-t border-border/70 pt-3">
                  {report.events.map((event) => (
                    <p key={event._id} className="text-narrative text-xs text-muted-foreground">
                      {formatTimestamp(event.createdAt)} - {resolveEventLabel(event)}
                    </p>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

