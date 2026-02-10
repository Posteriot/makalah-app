import { NextRequest, NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { fetchMutation, fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"

type ClerkApiError = {
  status?: number
  errors?: unknown
}

/**
 * POST /api/admin/users/delete
 * Delete user from Clerk, then soft-delete user in Convex.
 */
export async function POST(request: NextRequest) {
  const { userId, getToken } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const convexToken = await getToken({ template: "convex" })
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
    api.users.getUserByClerkId,
    { clerkUserId: userId },
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

  const shouldDeleteFromClerk =
    target.clerkSyncStatus !== "deleted" &&
    !target.clerkUserId.startsWith("pending_")

  if (shouldDeleteFromClerk) {
    try {
      const client = await clerkClient()
      await client.users.deleteUser(target.clerkUserId)
    } catch (error: unknown) {
      const clerkError = error as ClerkApiError
      if (clerkError.status !== 404) {
        console.error("[AdminDeleteUser] Failed to delete user in Clerk:", error)
        return NextResponse.json(
          { error: "Gagal menghapus user di Clerk" },
          { status: 502 }
        )
      }
    }
  }

  const result = await fetchMutation(
    api.adminUserManagement.softDeleteUser,
    { targetUserId: targetUserId as Id<"users"> },
    convexOptions
  )

  return NextResponse.json(result)
}
