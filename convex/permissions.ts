import { DatabaseReader } from "./_generated/server"
import { Id } from "./_generated/dataModel"

export type Role = "superadmin" | "admin" | "user"

export const ROLE_HIERARCHY: Record<Role, number> = {
  superadmin: 3,
  admin: 2,
  user: 1,
}

/**
 * Check if user has at least the required role level
 */
export async function hasRole(
  db: DatabaseReader,
  userId: Id<"users">,
  requiredRole: Role
): Promise<boolean> {
  const user = await db.get(userId)
  if (!user) return false

  const userRoleLevel = ROLE_HIERARCHY[user.role as Role] ?? 0
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole]

  return userRoleLevel >= requiredRoleLevel
}

/**
 * Throw error if user doesn't have required role
 */
export async function requireRole(
  db: DatabaseReader,
  userId: Id<"users">,
  requiredRole: Role
): Promise<void> {
  const hasPermission = await hasRole(db, userId, requiredRole)
  if (!hasPermission) {
    throw new Error(`Unauthorized: ${requiredRole} access required`)
  }
}

/**
 * Check if user is superadmin specifically
 */
export async function isSuperAdmin(
  db: DatabaseReader,
  userId: Id<"users">
): Promise<boolean> {
  const user = await db.get(userId)
  return user?.role === "superadmin"
}

/**
 * Check if user is at least admin
 */
export async function isAdmin(
  db: DatabaseReader,
  userId: Id<"users">
): Promise<boolean> {
  return await hasRole(db, userId, "admin")
}
