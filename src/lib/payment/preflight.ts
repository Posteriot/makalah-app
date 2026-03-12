import * as Sentry from "@sentry/nextjs"

interface PreflightResult {
  ready: boolean
  reason?: string
  userMessage?: string
}

interface PreflightCheck {
  name: string
  value: string | undefined
  reason: string
}

export function assertPaymentSystemReady(): PreflightResult {
  const checks: PreflightCheck[] = [
    {
      name: "XENDIT_SECRET_KEY",
      value: process.env.XENDIT_SECRET_KEY?.trim(),
      reason: "XENDIT_SECRET_KEY not configured",
    },
    {
      name: "XENDIT_WEBHOOK_TOKEN/SECRET",
      value:
        process.env.XENDIT_WEBHOOK_TOKEN?.trim() ||
        process.env.XENDIT_WEBHOOK_SECRET?.trim(),
      reason: "Xendit webhook token not configured",
    },
    {
      name: "CONVEX_INTERNAL_KEY",
      value: process.env.CONVEX_INTERNAL_KEY?.trim(),
      reason: "CONVEX_INTERNAL_KEY not configured",
    },
  ]

  for (const check of checks) {
    if (!check.value) {
      Sentry.captureMessage(`Payment preflight failed: ${check.reason}`, {
        level: "fatal",
        tags: { "payment.preflight": check.name },
      })
      return {
        ready: false,
        reason: check.reason,
        userMessage:
          "Sistem pembayaran sedang tidak tersedia. Silakan coba beberapa saat lagi.",
      }
    }
  }

  return { ready: true }
}
