import { cn } from "@/lib/utils"

type WaitlistStatus = "pending" | "invited" | "registered"

const STATUS_CONFIG: Record<
  WaitlistStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Menunggu",
    className: "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  invited: {
    label: "Diundang",
    className: "border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  registered: {
    label: "Terdaftar",
    className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
}

interface WaitlistStatusBadgeProps {
  status: WaitlistStatus
}

export function WaitlistStatusBadge({ status }: WaitlistStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-badge border px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase",
        config.className
      )}
    >
      {config.label}
    </span>
  )
}
