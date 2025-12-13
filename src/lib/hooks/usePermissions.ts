"use client"

import { useCurrentUser } from "./useCurrentUser"

type Role = "superadmin" | "admin" | "user"

/**
 * Hook to check user permissions
 * Returns helper functions for client-side permission checks
 */
export function usePermissions() {
  const user = useCurrentUser()

  const isAdmin = () => {
    if (!user) return false
    return user.role === "admin" || user.role === "superadmin"
  }

  const isSuperAdmin = () => {
    if (!user) return false
    return user.role === "superadmin"
  }

  const hasRole = (requiredRole: Role) => {
    if (!user) return false

    const roleHierarchy: Record<Role, number> = {
      superadmin: 3,
      admin: 2,
      user: 1,
    }

    const userRoleLevel = roleHierarchy[user.role as Role] ?? 0
    const requiredRoleLevel = roleHierarchy[requiredRole]

    return userRoleLevel >= requiredRoleLevel
  }

  return {
    isAdmin,
    isSuperAdmin,
    hasRole,
  }
}
