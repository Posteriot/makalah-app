import { Badge } from "@/components/ui/badge"

type Role = "superadmin" | "admin" | "user"

interface RoleBadgeProps {
  role: Role
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = {
    superadmin: {
      label: "Superadmin",
      variant: "destructive" as const,
    },
    admin: {
      label: "Admin",
      variant: "default" as const,
    },
    user: {
      label: "User",
      variant: "secondary" as const,
    },
  }

  const { label, variant } = config[role] || config.user

  return <Badge variant={variant}>{label}</Badge>
}
