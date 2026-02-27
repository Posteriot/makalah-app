import { v } from "convex/values"
import { internalMutation } from "../_generated/server"

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

/**
 * Backfill provider-agnostic fields in `payments` from legacy Xendit fields.
 *
 * Run (dry-run):
 * npx convex run migrations/backfillPaymentsProviderFields:backfillPaymentsProviderFields '{"dryRun":true}'
 *
 * Run (apply):
 * npx convex run migrations/backfillPaymentsProviderFields:backfillPaymentsProviderFields '{"dryRun":false}'
 */
export const backfillPaymentsProviderFields = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true
    const payments = await ctx.db.query("payments").collect()

    let alreadyValid = 0
    let candidateRows = 0
    let patched = 0
    let unresolved = 0

    const unresolvedSamples: Array<{
      paymentId: string
      providerName?: string
      providerPaymentId?: string
      providerReferenceId?: string
      xenditPaymentRequestId?: string
      xenditReferenceId?: string
    }> = []

    for (const payment of payments) {
      const providerName = isNonEmptyString(payment.providerName)
        ? payment.providerName
        : undefined
      const providerPaymentId = isNonEmptyString(payment.providerPaymentId)
        ? payment.providerPaymentId
        : undefined
      const providerReferenceId = isNonEmptyString(payment.providerReferenceId)
        ? payment.providerReferenceId
        : undefined

      if (providerName && providerPaymentId && providerReferenceId) {
        alreadyValid += 1
        continue
      }

      candidateRows += 1

      const legacyXenditPaymentRequestId = isNonEmptyString(payment.xenditPaymentRequestId)
        ? payment.xenditPaymentRequestId
        : undefined
      const legacyXenditReferenceId = isNonEmptyString(payment.xenditReferenceId)
        ? payment.xenditReferenceId
        : undefined

      const nextProviderName =
        providerName ??
        ((legacyXenditPaymentRequestId || legacyXenditReferenceId) ? "xendit" : undefined)
      const nextProviderPaymentId = providerPaymentId ?? legacyXenditPaymentRequestId
      const nextProviderReferenceId = providerReferenceId ?? legacyXenditReferenceId

      if (!nextProviderName || !nextProviderPaymentId || !nextProviderReferenceId) {
        unresolved += 1
        if (unresolvedSamples.length < 20) {
          unresolvedSamples.push({
            paymentId: payment._id,
            providerName,
            providerPaymentId,
            providerReferenceId,
            xenditPaymentRequestId: legacyXenditPaymentRequestId,
            xenditReferenceId: legacyXenditReferenceId,
          })
        }
        continue
      }

      if (!dryRun) {
        const patch: {
          providerName?: "xendit" | "midtrans"
          providerPaymentId?: string
          providerReferenceId?: string
        } = {}

        if (!providerName) patch.providerName = nextProviderName
        if (!providerPaymentId) patch.providerPaymentId = nextProviderPaymentId
        if (!providerReferenceId) patch.providerReferenceId = nextProviderReferenceId

        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(payment._id, patch)
        }
      }

      patched += 1
    }

    return {
      success: unresolved === 0,
      dryRun,
      totalPayments: payments.length,
      alreadyValid,
      candidateRows,
      patched,
      unresolved,
      unresolvedSamples,
      message: dryRun
        ? "Dry-run selesai. Jalankan lagi dengan dryRun=false untuk apply."
        : unresolved === 0
          ? "Backfill selesai tanpa unresolved row."
          : "Backfill selesai, masih ada row unresolved.",
    }
  },
})
