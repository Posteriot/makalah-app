/**
 * Receipt PDF Export API Route
 * GET /api/export/receipt/[paymentId]
 *
 * Generates a PDF receipt/kwitansi for a completed payment.
 * Auth: must be logged in, payment must belong to requesting user.
 */

import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated, getToken } from "@/lib/auth-server"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"
import PDFDocument from "pdfkit"

function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp))
}

function getMethodLabel(method: string, channel?: string): string {
  if (method === "QRIS") return "QRIS"
  if (method === "VIRTUAL_ACCOUNT") return `Virtual Account ${channel ?? ""}`.trim()
  if (method === "EWALLET") return channel ?? "E-Wallet"
  return method
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const isAuthed = await isAuthenticated()
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const convexToken = await getToken()
    if (!convexToken) {
      return NextResponse.json({ error: "Token missing" }, { status: 500 })
    }

    const { paymentId } = await params
    const convexOptions = { token: convexToken }

    const payment = await fetchQuery(
      api.billing.payments.getPaymentById,
      { paymentId: paymentId as Id<"payments"> },
      convexOptions
    )

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    if (payment.status !== "SUCCEEDED") {
      return NextResponse.json(
        { error: "Kwitansi hanya tersedia untuk pembayaran yang berhasil" },
        { status: 400 }
      )
    }

    // Fetch user for buyer name
    const user = await fetchQuery(
      api.users.getById,
      { userId: payment.userId },
      convexOptions
    )

    const buyerName = user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
      : "Pengguna Makalah"

    // Generate PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `Kwitansi - ${payment.xenditReferenceId}`,
        Author: "Makalah AI",
        Creator: "Makalah AI - pdfkit",
      },
    })

    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text("MAKALAH AI", { align: "center" })
    doc.moveDown(0.3)
    doc.fontSize(14).font("Helvetica-Bold").text("KWITANSI PEMBAYARAN", { align: "center" })
    doc.moveDown(1)

    // Line separator
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(1)

    // Detail rows
    const labelX = 50
    const valueX = 220
    doc.fontSize(10)

    const addRow = (label: string, value: string) => {
      const y = doc.y
      doc.font("Helvetica-Bold").text(label, labelX, y, { width: 160 })
      doc.font("Helvetica").text(value, valueX, y, { width: 325 })
      doc.moveDown(0.5)
    }

    addRow("No. Referensi", payment.xenditReferenceId)
    addRow("Tanggal", formatDate(payment._creationTime))
    addRow("Nama", buyerName)
    addRow("Paket", payment.description || `Paket Paper — ${payment.credits ?? 300} kredit`)
    addRow("Metode Pembayaran", getMethodLabel(payment.paymentMethod, payment.paymentChannel ?? undefined))
    addRow("Jumlah", formatCurrency(payment.amount))
    addRow("Status", "Lunas")

    doc.moveDown(1)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(1.5)

    // Footer
    doc.fontSize(8).font("Helvetica").fillColor("#888888")
    doc.text("Kwitansi ini dibuat secara otomatis oleh Makalah AI.", { align: "center" })
    doc.text("https://makalah.ai", { align: "center" })

    doc.end()

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)))
    })

    const filename = `kwitansi-${payment.xenditReferenceId}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("[Receipt] Error:", error)
    return NextResponse.json({ error: "Gagal membuat kwitansi" }, { status: 500 })
  }
}
