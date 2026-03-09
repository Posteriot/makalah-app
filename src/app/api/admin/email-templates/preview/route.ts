import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/auth-server"
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
    const html = await renderEmailTemplate(brandSettings, subject, sections)
    return NextResponse.json({ html })
  } catch (error) {
    console.error("[EmailTemplate Preview] Render failed:", error)
    return NextResponse.json(
      { error: "Failed to render email template" },
      { status: 500 },
    )
  }
}
