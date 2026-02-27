/**
 * Shared Payment Creation Function
 * Extracts the payment-method dispatch + Convex save logic
 * used by both topup and subscribe routes.
 */

import { fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { getProvider } from "./factory"

// ════════════════════════════════════════════════════════════════
// Input / Output Types
// ════════════════════════════════════════════════════════════════

export interface CreatePaymentInput {
  userId: Id<"users">
  referenceId: string
  amount: number
  description: string
  paymentMethod: "qris" | "va" | "ewallet"
  paymentType:
    | "credit_topup"
    | "paper_completion"
    | "subscription_initial"
    | "subscription_renewal"
  metadata: Record<string, unknown>
  idempotencyKey: string
  convexToken: string
  appUrl: string
  // Method-specific
  vaChannel?: string
  ewalletChannel?: string
  mobileNumber?: string
  customerName?: string
  // Package info (pass-through to DB record)
  packageType?: "paper" | "extension_s" | "extension_m"
  credits?: number
  planType?: "pro_monthly" | "pro_yearly"
}

export interface CreatePaymentResponse {
  paymentId: string
  convexPaymentId: string
  providerPaymentId: string
  providerName: string
  status: string
  amount: number
  expiresAt: number
  // Package/plan info passthrough
  packageType?: string
  credits?: number
  packageLabel?: string
  planType?: string
  planLabel?: string
  // Method-specific presentation
  qrString?: string
  vaNumber?: string
  vaChannel?: string
  redirectUrl?: string
}

// ════════════════════════════════════════════════════════════════
// Main Function
// ════════════════════════════════════════════════════════════════

export async function createPaymentViaProvider(
  input: CreatePaymentInput
): Promise<CreatePaymentResponse> {
  const provider = await getProvider()
  const convexOptions = { token: input.convexToken }

  // 1. Dispatch to correct payment method
  let result
  let paymentMethodType: "QRIS" | "VIRTUAL_ACCOUNT" | "EWALLET"

  switch (input.paymentMethod) {
    case "qris":
      result = await provider.createQRIS({
        referenceId: input.referenceId,
        amount: input.amount,
        description: input.description,
        metadata: input.metadata,
        expiresMinutes: 30,
      })
      paymentMethodType = "QRIS"
      break

    case "va":
      if (!input.vaChannel)
        throw new Error("Virtual Account channel wajib dipilih")
      result = await provider.createVA({
        referenceId: input.referenceId,
        amount: input.amount,
        channelCode: input.vaChannel,
        customerName: input.customerName ?? "Makalah User",
        description: input.description,
        metadata: input.metadata,
        expiresMinutes: 60 * 24,
      })
      paymentMethodType = "VIRTUAL_ACCOUNT"
      break

    case "ewallet":
      if (!input.ewalletChannel)
        throw new Error("E-Wallet channel wajib dipilih")
      result = await provider.createEWallet({
        referenceId: input.referenceId,
        amount: input.amount,
        channelCode: input.ewalletChannel,
        description: input.description,
        metadata: input.metadata,
        mobileNumber: input.mobileNumber,
        successReturnUrl: `${input.appUrl}/checkout/${input.paymentType === "subscription_initial" ? "pro" : "bpp"}?status=success`,
        failureReturnUrl: `${input.appUrl}/checkout/${input.paymentType === "subscription_initial" ? "pro" : "bpp"}?status=failed`,
        cancelReturnUrl: `${input.appUrl}/checkout/${input.paymentType === "subscription_initial" ? "pro" : "bpp"}`,
      })
      paymentMethodType = "EWALLET"
      break

    default:
      throw new Error("Metode pembayaran tidak valid")
  }

  // 2. Save to Convex
  const expiresAt = result.expiresAt ?? Date.now() + 30 * 60 * 1000

  const paymentId = await fetchMutation(
    api.billing.payments.createPayment,
    {
      userId: input.userId,
      providerPaymentId: result.providerPaymentId,
      providerReferenceId: input.referenceId,
      providerName: provider.name,
      amount: input.amount,
      paymentMethod: paymentMethodType,
      paymentChannel: input.vaChannel ?? input.ewalletChannel,
      paymentType: input.paymentType,
      packageType: input.packageType,
      credits: input.credits,
      planType: input.planType,
      description: input.description,
      idempotencyKey: input.idempotencyKey,
      expiredAt: expiresAt,
    },
    convexOptions
  )

  // 3. Return response
  return {
    paymentId,
    convexPaymentId: paymentId,
    providerPaymentId: result.providerPaymentId,
    providerName: provider.name,
    status: result.status,
    amount: input.amount,
    expiresAt,
    packageType: input.packageType,
    credits: input.credits,
    planType: input.planType,
    qrString: result.qrString,
    vaNumber: result.vaNumber,
    vaChannel: result.vaChannel,
    redirectUrl: result.redirectUrl,
  }
}
