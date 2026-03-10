import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { isAuthenticated, getToken } from "@/lib/auth-server"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import {
  renderEmailTemplate,
  type BrandSettings,
  type EmailSection,
} from "@/lib/email/template-renderer"
import { replacePlaceholders } from "@/lib/email/template-helpers"

// ---------------------------------------------------------------------------
// In-memory rate limit: max 5 test emails per adminEmail per minute
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60_000

function checkRateLimit(email: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(email)

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

/**
 * POST /api/admin/email-templates/send-test
 * Send a test email with example placeholder data via Resend.
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
    console.error("[EmailTemplate SendTest] Permission check failed:", error)
    return NextResponse.json({ error: "Permission check failed" }, { status: 500 })
  }

  let templateType: string
  let sections: EmailSection[]
  let brandSettings: BrandSettings
  let subject: string
  let availablePlaceholders: { key: string; example: string }[]
  let adminEmail: string

  try {
    const body = await request.json()
    templateType = body.templateType
    sections = body.sections
    brandSettings = body.brandSettings
    subject = body.subject
    availablePlaceholders = body.availablePlaceholders ?? []
    adminEmail = body.adminEmail

    if (!sections || !brandSettings || !subject || !adminEmail) {
      return NextResponse.json(
        { error: "Required fields: sections, brandSettings, subject, adminEmail" },
        { status: 400 },
      )
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Rate limit check
  if (!checkRateLimit(adminEmail)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 5 test emails per minute." },
      { status: 429 },
    )
  }

  // Validate env
  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!resendApiKey || !fromEmail) {
    return NextResponse.json(
      { error: "Email service not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)" },
      { status: 500 },
    )
  }

  try {
    // Render template
    const siteUrl = new URL(request.url).origin
    const rawHtml = await renderEmailTemplate(brandSettings, subject, sections, siteUrl)

    // Build example data from placeholders
    const exampleData: Record<string, string> = {}
    for (const p of availablePlaceholders) {
      exampleData[p.key] = p.example
    }

    // Replace placeholders in HTML and subject
    const finalHtml = replacePlaceholders(rawHtml, exampleData)
    const finalSubject = `[TEST] ${replacePlaceholders(subject, exampleData)}`

    // Send via Resend
    const resend = new Resend(resendApiKey)
    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: finalSubject,
      html: finalHtml,
    })

    console.log(
      `[EmailTemplate SendTest] Sent test email for "${templateType}" to ${adminEmail}`,
    )

    return NextResponse.json({ success: true, sentTo: adminEmail })
  } catch (error) {
    console.error("[EmailTemplate SendTest] Failed:", error)
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 },
    )
  }
}
