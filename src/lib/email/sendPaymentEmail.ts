"use server"

import { Resend } from "resend"
import { render } from "@react-email/components"
import { PaymentSuccessEmail } from "./templates/PaymentSuccessEmail"
import { PaymentFailedEmail } from "./templates/PaymentFailedEmail"
import { fetchTemplateAndRender } from "./template-helpers"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@makalah.ai"
const appUrl = process.env.APP_URL || "https://makalah.ai"

const client = resendApiKey ? new Resend(resendApiKey) : null

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

interface PaymentSuccessParams {
  to: string
  userName?: string
  amount: number
  credits?: number // Credits purchased (BPP)
  newTotalCredits?: number // Total credits after purchase (BPP)
  subscriptionPlanLabel?: string // Subscription plan label (Pro) e.g. "Pro Bulanan"
  newBalance?: number // Deprecated: kept for backward compat
  transactionId: string
  paidAt: Date | number
}

interface PaymentFailedParams {
  to: string
  userName?: string
  amount: number
  failureReason?: string
  transactionId: string
  subscriptionPlanLabel?: string // Present = Pro payment, absent = BPP
}

interface SendResult {
  success: boolean
  error?: string
}

// ════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════

function formatDate(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date
  return d.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  })
}

// ════════════════════════════════════════════════════════════════
// Email Sending Functions
// ════════════════════════════════════════════════════════════════

/**
 * Send payment success email
 * Routes to BPP or Pro template based on subscriptionPlanLabel presence.
 */
export async function sendPaymentSuccessEmail(
  params: PaymentSuccessParams
): Promise<SendResult> {
  if (!client) {
    console.log("[Email] Resend client not configured, skipping email")
    return { success: false, error: "Email client not configured" }
  }

  const isPro = !!params.subscriptionPlanLabel

  try {
    let subject: string
    let html: string

    // Route to tier-specific template
    const templateType = isPro ? "payment_success_pro" : "payment_success_bpp"
    const templateData: Record<string, string> = {
      userName: params.userName ?? "Pengguna",
      amount: `Rp ${params.amount.toLocaleString("id-ID")}`,
      transactionId: params.transactionId,
      paidAt: formatDate(params.paidAt),
      appUrl,
      appName: "Makalah AI",
    }
    if (isPro) {
      templateData.subscriptionPlanLabel = params.subscriptionPlanLabel!
    } else {
      templateData.credits = params.credits ? `${params.credits} kredit` : "-"
      templateData.newTotalCredits = params.newTotalCredits
        ? `${params.newTotalCredits} kredit`
        : "-"
    }

    const rendered = await fetchTemplateAndRender(templateType, templateData)

    if (rendered) {
      subject = rendered.subject
      html = rendered.html
    } else {
      // Fallback to React Email component (handles both BPP and Pro)
      subject = isPro
        ? "Langganan Pro Berhasil — Makalah AI"
        : "Pembelian Kredit Berhasil — Makalah AI"
      html = await render(
        PaymentSuccessEmail({
          userName: params.userName,
          amount: params.amount,
          credits: params.credits,
          newTotalCredits: params.newTotalCredits,
          subscriptionPlanLabel: params.subscriptionPlanLabel,
          transactionId: params.transactionId,
          paidAt: formatDate(params.paidAt),
          appUrl,
        })
      )
    }

    const result = await client.emails.send({
      from: fromEmail,
      to: params.to,
      subject,
      html,
    })

    console.log(`[Email] Payment success email sent (${templateType}):`, {
      to: params.to,
      transactionId: params.transactionId,
      emailId: result.data?.id,
    })

    return { success: true }
  } catch (error) {
    console.error("[Email] Failed to send payment success email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Send payment failed email
 * Routes to BPP or Pro template based on subscriptionPlanLabel presence.
 */
export async function sendPaymentFailedEmail(
  params: PaymentFailedParams
): Promise<SendResult> {
  if (!client) {
    console.log("[Email] Resend client not configured, skipping email")
    return { success: false, error: "Email client not configured" }
  }

  const isPro = !!params.subscriptionPlanLabel

  try {
    let subject: string
    let html: string

    // Route to tier-specific template
    const templateType = isPro ? "payment_failed_pro" : "payment_failed_bpp"
    const templateData: Record<string, string> = {
      userName: params.userName ?? "Pengguna",
      amount: `Rp ${params.amount.toLocaleString("id-ID")}`,
      failureReason: params.failureReason ?? "Pembayaran tidak dapat diproses",
      transactionId: params.transactionId,
      appUrl,
      appName: "Makalah AI",
    }
    if (isPro) {
      templateData.subscriptionPlanLabel = params.subscriptionPlanLabel!
    }

    const rendered = await fetchTemplateAndRender(templateType, templateData)

    if (rendered) {
      subject = rendered.subject
      html = rendered.html
    } else {
      // Fallback to React Email component (handles both BPP and Pro)
      subject = isPro
        ? "Langganan Pro Gagal — Makalah AI"
        : "Pembelian Kredit Gagal — Makalah AI"
      html = await render(
        PaymentFailedEmail({
          userName: params.userName,
          amount: params.amount,
          failureReason: params.failureReason,
          transactionId: params.transactionId,
          appUrl,
        })
      )
    }

    const result = await client.emails.send({
      from: fromEmail,
      to: params.to,
      subject,
      html,
    })

    console.log(`[Email] Payment failed email sent (${templateType}):`, {
      to: params.to,
      transactionId: params.transactionId,
      emailId: result.data?.id,
    })

    return { success: true }
  } catch (error) {
    console.error("[Email] Failed to send payment failed email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
