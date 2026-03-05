import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { Resend } from "resend"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { getToken, isAuthenticated } from "@/lib/auth-server"

export const runtime = "nodejs"

const SUPPORT_EMAIL = "dukungan@makalah.ai"
const FROM_EMAIL = "noreply@makalah.ai"
const MAX_DESCRIPTION_LENGTH = 3000
const ALLOWED_SOURCES = new Set(["chat-inline", "footer-link", "support-page"])

type ReporterIdentity = {
  email?: string
  name?: string
  userId?: string
}

export async function POST(req: NextRequest) {
  try {
    const authed = await isAuthenticated()
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const source = typeof body.source === "string" ? body.source : ""
    const description = typeof body.description === "string" ? body.description.trim() : ""
    const conversationId =
      typeof body.conversationId === "string" ? body.conversationId : undefined
    const paperSessionId =
      typeof body.paperSessionId === "string" ? body.paperSessionId : undefined
    const contextSnapshot =
      body.contextSnapshot && typeof body.contextSnapshot === "object"
        ? (body.contextSnapshot as Record<string, unknown>)
        : undefined
    const fallbackReporterEmail =
      typeof body.reporterEmail === "string" ? body.reporterEmail.trim() : undefined
    const fallbackReporterName =
      typeof body.reporterName === "string" ? body.reporterName.trim() : undefined
    const fallbackReporterUserId =
      typeof body.reporterUserId === "string" ? body.reporterUserId.trim() : undefined

    if (!ALLOWED_SOURCES.has(source)) {
      return NextResponse.json({ error: "Sumber laporan tidak valid." }, { status: 400 })
    }

    if (!description) {
      return NextResponse.json({ error: "Deskripsi laporan wajib diisi." }, { status: 400 })
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Deskripsi maksimal ${MAX_DESCRIPTION_LENGTH} karakter.` },
        { status: 400 }
      )
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Layanan email belum terkonfigurasi." },
        { status: 503 }
      )
    }

    const reporter = await resolveReporterIdentity({
      fallbackReporterEmail,
      fallbackReporterName,
      fallbackReporterUserId,
    })

    const reportId = `fallback-${randomUUID()}`
    const appUrl = process.env.APP_URL || process.env.SITE_URL || "https://makalah.ai"
    const createdAt = new Date().toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    })
    const resend = new Resend(resendApiKey)

    const contextSnapshotString = contextSnapshot
      ? JSON.stringify(contextSnapshot, null, 2)
      : "-"

    const developerHtml = [
      "<h2>Laporan Teknis (Fallback)</h2>",
      "<p>Convex technical report belum tersedia di environment aktif. Laporan ini dikirim via API fallback.</p>",
      `<p><strong>Report ID:</strong> ${escapeHtml(reportId)}</p>`,
      `<p><strong>Sumber:</strong> ${escapeHtml(source)}</p>`,
      `<p><strong>Waktu:</strong> ${escapeHtml(createdAt)}</p>`,
      `<p><strong>User ID:</strong> ${escapeHtml(reporter.userId ?? "-")}</p>`,
      `<p><strong>Email User:</strong> ${escapeHtml(reporter.email ?? "-")}</p>`,
      `<p><strong>Nama User:</strong> ${escapeHtml(reporter.name ?? "-")}</p>`,
      `<p><strong>Conversation ID:</strong> ${escapeHtml(conversationId ?? "-")}</p>`,
      `<p><strong>Paper Session ID:</strong> ${escapeHtml(paperSessionId ?? "-")}</p>`,
      `<h3>Deskripsi</h3>`,
      `<p>${escapeHtml(description).replace(/\n/g, "<br/>")}</p>`,
      "<h3>Snapshot Diagnostik</h3>",
      `<pre>${escapeHtml(contextSnapshotString)}</pre>`,
    ].join("")

    await resend.emails.send({
      from: FROM_EMAIL,
      to: SUPPORT_EMAIL,
      subject: `[Technical Report Fallback] ${source} - ${reportId}`,
      html: developerHtml,
    })

    if (reporter.email) {
      const userHtml = [
        "<p>Laporan teknis telah diterima.</p>",
        `<p><strong>ID Laporan:</strong> ${escapeHtml(reportId)}</p>`,
        `<p><strong>Waktu:</strong> ${escapeHtml(createdAt)}</p>`,
        `<p>Tim dukungan akan meninjau laporan ini. Jika diperlukan, tindak lanjut dapat dilakukan melalui ${escapeHtml(
          SUPPORT_EMAIL
        )}.</p>`,
        `<p><a href="${escapeHtml(appUrl)}/dashboard/support/technical-report">Buka halaman technical report</a></p>`,
      ].join("")

      await resend.emails.send({
        from: FROM_EMAIL,
        to: reporter.email,
        subject: `Laporan Teknis Diterima (${reportId})`,
        html: userHtml,
      })
    }

    return NextResponse.json({
      reportId,
      status: "open",
      via: "fallback-email",
    })
  } catch (error) {
    console.error("[TechnicalReportFallback] Failed to submit report:", error)
    return NextResponse.json(
      { error: "Laporan teknis belum dapat dikirim. Silakan coba beberapa saat lagi." },
      { status: 500 }
    )
  }
}

async function resolveReporterIdentity(input: {
  fallbackReporterEmail?: string
  fallbackReporterName?: string
  fallbackReporterUserId?: string
}): Promise<ReporterIdentity> {
  const token = await getToken()
  if (token) {
    try {
      const convexUser = await fetchQuery(api.users.getMyUser, {}, { token })
      if (convexUser) {
        const fullName = [convexUser.firstName, convexUser.lastName]
          .filter(Boolean)
          .join(" ")
          .trim()

        return {
          email: convexUser.email,
          name: fullName || undefined,
          userId: String(convexUser._id),
        }
      }
    } catch (error) {
      console.warn("[TechnicalReportFallback] Failed to resolve reporter from Convex:", error)
    }
  }

  return {
    email: input.fallbackReporterEmail,
    name: input.fallbackReporterName,
    userId: input.fallbackReporterUserId,
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
