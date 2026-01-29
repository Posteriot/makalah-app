import { cn } from "@/lib/utils"

type WaitlistStatus = "pending" | "invited" | "registered"

const STATUS_CONFIG: Record<
  WaitlistStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Menunggu",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  invited: {
    label: "Diundang",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  registered: {
    label: "Terdaftar",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
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
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        config.className
      )}
    >
      {config.label}
    </span>
  )
}
