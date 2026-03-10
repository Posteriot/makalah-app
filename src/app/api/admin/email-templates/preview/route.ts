import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated, getToken } from "@/lib/auth-server"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import {
  renderEmailTemplate,
  type BrandSettings,
  type EmailSection,
} from "@/lib/email/template-renderer"

/**
 * POST /api/admin/email-templates/preview
 * Render email template sections into HTML for live preview.
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const convexToken = await getToken()
  if (!convexToken) {
    return NextResponse.json({ error: "Convex token missing" }, { status: 500 })
  }

  try {
    const convexUser = await fetchQuery(api.users.getMyUser, {}, { token: convexToken })
    if (!convexUser || (convexUser.role !== "admin" && convexUser.role !== "superadmin")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }
  } catch (error) {
    console.error("[EmailTemplate Preview] Permission check failed:", error)
    return NextResponse.json({ error: "Permission check failed" }, { status: 500 })
  }

  let sections: EmailSection[]
  let brandSettings: BrandSettings
  let subject: string

  try {
    const body = await request.json()
    sections = body.sections
    brandSettings = body.brandSettings
    subject = body.subject

    if (!sections || !brandSettings || !subject) {
      return NextResponse.json(
        { error: "Required fields: sections, brandSettings, subject" },
        { status: 400 },
      )
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  try {
    const siteUrl = new URL(request.url).origin
    const html = await renderEmailTemplate(brandSettings, subject, sections, siteUrl)
    return NextResponse.json({ html })
  } catch (error) {
    console.error("[EmailTemplate Preview] Render failed:", error)
    return NextResponse.json(
      { error: "Failed to render email template" },
      { status: 500 },
    )
  }
}
