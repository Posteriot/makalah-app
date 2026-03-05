import { cn } from "@/lib/utils"

export type TechnicalReportStatus = "open" | "triaged" | "resolved"

const STATUS_META: Record<
  TechnicalReportStatus,
  {
    label: "Pending" | "Proses" | "Selesai"
    className: string
  }
> = {
  open: {
    label: "Pending",
    className: "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  triaged: {
    label: "Proses",
    className: "border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  resolved: {
    label: "Selesai",
    className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
}

export function getTechnicalReportStatusMeta(status: TechnicalReportStatus) {
  return STATUS_META[status]
}

export function TechnicalReportStatusBadge({ status }: { status: TechnicalReportStatus }) {
  const meta = getTechnicalReportStatusMeta(status)
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-badge border px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase",
        meta.className
      )}
    >
      {meta.label}
    </span>
  )
}
