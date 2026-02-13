/**
 * Word Export API Route
 *
 * Export completed paper session ke format Word (.docx).
 *
 * POST /api/export/word
 * Body: { sessionId: string }
 *
 * Response:
 * - 200: Word file stream dengan Content-Disposition header
 * - 400: Bad request (missing sessionId, session belum completed)
 * - 403: Forbidden (user bukan owner session)
 * - 404: Session not found
 * - 500: Server error
 */

import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated, getToken } from "@/lib/auth-server"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"
import { getExportableContent, ExportValidationError } from "@/lib/export/validation"
import { generateWordStream, getWordFilename } from "@/lib/export/word-builder"

export async function POST(request: NextRequest) {
  try {
    const referer = request.headers.get("referer")
    const fallbackPath = `${request.nextUrl.pathname}${request.nextUrl.search}`
    const refererUrl = referer ? new URL(referer) : null
    const redirectPath = refererUrl
      ? `${refererUrl.pathname}${refererUrl.search}`
      : fallbackPath

    // 1. Parse request body
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "sessionId is required" },
        { status: 400 }
      )
    }

    // 2. Authenticate user via BetterAuth
    const session = await isAuthenticated()

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized - please sign in",
          redirectUrl: `/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`,
        },
        { status: 401 }
      )
    }

    const convexToken = await getToken()
    if (!convexToken) {
      return NextResponse.json(
        { success: false, error: "Convex token missing" },
        { status: 500 }
      )
    }
    const convexOptions = { token: convexToken }

    // 3. Get Convex user by BetterAuth ID
    const convexUser = await fetchQuery(api.users.getUserByBetterAuthId, {
      betterAuthUserId: session.user.id,
    }, convexOptions)

    if (!convexUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    // 4. Fetch paper session dari Convex
    const session = await fetchQuery(api.paperSessions.getById, {
      sessionId: sessionId as Id<"paperSessions">,
    }, convexOptions)

    // 5. Validate dan compile content
    // getExportableContent akan throw ExportValidationError jika ada masalah
    const content = getExportableContent(session, convexUser._id)

    // 6. Generate Word document stream
    const wordStream = await generateWordStream(content)

    // 7. Get filename
    const filename = getWordFilename(content.title)

    // 8. Return file response
    return new Response(wordStream, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    // Handle ExportValidationError dengan specific status codes
    if (error instanceof ExportValidationError) {

      const statusMap = {
        SESSION_NOT_FOUND: 404,
        NOT_OWNER: 403,
        ARCHIVED: 400,
        NOT_COMPLETED: 400,
        MISSING_CONTENT: 400,
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: statusMap[error.code] }
      )
    }

    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[Word Export] Server error:", error)

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
