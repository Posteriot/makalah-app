import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated, getToken } from "@/lib/auth-server"
import { fetchMutation, fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"

/**
 * POST /api/admin/users/delete
 * Soft-delete user in Convex.
 */
export async function POST(request: NextRequest) {
  const session = await isAuthenticated()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const convexToken = await getToken()
  if (!convexToken) {
    return NextResponse.json({ error: "Convex token missing" }, { status: 500 })
  }
  const convexOptions = { token: convexToken }

  let targetUserId: string
  try {
    const body = await request.json()
    targetUserId = body.targetUserId
    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json(
        { error: "Field wajib: targetUserId" },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const convexUser = await fetchQuery(
    api.users.getUserByBetterAuthId,
    { betterAuthUserId: session.user.id },
    convexOptions
  )

  if (
    !convexUser ||
    (convexUser.role !== "admin" && convexUser.role !== "superadmin")
  ) {
    return NextResponse.json(
      { error: "Forbidden: Admin access required" },
      { status: 403 }
    )
  }

  const target = await fetchQuery(
    api.users.getUserForAdminManagement,
    {
      requestorUserId: convexUser._id,
      targetUserId: targetUserId as Id<"users">,
    },
    convexOptions
  )

  if (!target) {
    return NextResponse.json(
      { error: "User target tidak ditemukan" },
      { status: 404 }
    )
  }

  const result = await fetchMutation(
    api.adminUserManagement.softDeleteUser,
    { targetUserId: targetUserId as Id<"users"> },
    convexOptions
  )

  return NextResponse.json(result)
}
