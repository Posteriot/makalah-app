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
      className: "role-badge--superadmin",
    },
    admin: {
      label: "Admin",
      className: "role-badge--admin",
    },
    user: {
      label: "User",
      className: "role-badge--user",
    },
  }

  const { label, className: badgeClass } = config[role] || config.user

  return (
    <span className={cn("role-badge", badgeClass, className)}>
      {label}
    </span>
  )
}
