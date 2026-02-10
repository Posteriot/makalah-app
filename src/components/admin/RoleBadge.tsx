import { cn } from "@/lib/utils"

type Role = "superadmin" | "admin" | "user"

interface RoleBadgeProps {
  role: Role
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = {
    superadmin: {
      label: "Superadmin",
      className: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
    },
    admin: {
      label: "Admin",
      className: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    },
    user: {
      label: "User",
      className:
        "border border-border bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100",
    },
  }

  const { label, className: badgeClass } = config[role] || config.user

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-badge text-[10px] font-mono font-bold uppercase tracking-wide",
        badgeClass,
        className
      )}
    >
      {label}
    </span>
  )
}
