"use server"

import { Resend } from "resend"
import { render } from "@react-email/components"
import { PaymentSuccessEmail } from "./templates/PaymentSuccessEmail"
import { PaymentFailedEmail } from "./templates/PaymentFailedEmail"

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
  credits?: number // New: credits purchased
  newTotalCredits?: number // New: total credits after purchase
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
 * Called from webhook handler after successful payment
 */
export async function sendPaymentSuccessEmail(
  params: PaymentSuccessParams
): Promise<SendResult> {
  if (!client) {
    console.log("[Email] Resend client not configured, skipping email")
    return { success: false, error: "Email client not configured" }
  }

  try {
    const html = await render(
      PaymentSuccessEmail({
        userName: params.userName,
        amount: params.amount,
        credits: params.credits,
        newTotalCredits: params.newTotalCredits,
        transactionId: params.transactionId,
        paidAt: formatDate(params.paidAt),
        appUrl,
      })
    )

    const result = await client.emails.send({
      from: fromEmail,
      to: params.to,
      subject: "Pembayaran Berhasil - Makalah AI",
      html,
    })

    console.log("[Email] Payment success email sent:", {
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
 * Called from webhook handler after failed payment
 */
export async function sendPaymentFailedEmail(
  params: PaymentFailedParams
): Promise<SendResult> {
  if (!client) {
    console.log("[Email] Resend client not configured, skipping email")
    return { success: false, error: "Email client not configured" }
  }

  try {
    const html = await render(
      PaymentFailedEmail({
        userName: params.userName,
        amount: params.amount,
        failureReason: params.failureReason,
        transactionId: params.transactionId,
        appUrl,
      })
    )

    const result = await client.emails.send({
      from: fromEmail,
      to: params.to,
      subject: "Pembayaran Gagal - Makalah AI",
      html,
    })

    console.log("[Email] Payment failed email sent:", {
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
