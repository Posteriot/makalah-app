/**
 * Payment Provider Factory
 * Returns the active payment provider adapter based on configuration.
 * Resolution: DB config → env var PAYMENT_PROVIDER → default "xendit"
 */

import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import type { PaymentProvider, PaymentProviderName } from "./types"
import { XenditAdapter } from "./adapters/xendit"
import { MidtransAdapter } from "./adapters/midtrans"

export async function getProvider(): Promise<PaymentProvider> {
  let providerName: PaymentProviderName = "xendit"

  try {
    const config = await fetchQuery(
      api.billing.paymentProviderConfigs.getActiveConfig,
      {}
    )
    providerName = config.activeProvider as PaymentProviderName
  } catch {
    // DB unavailable — fall back to env var
    providerName =
      (process.env.PAYMENT_PROVIDER as PaymentProviderName) || "xendit"
  }

  switch (providerName) {
    case "xendit":
      return new XenditAdapter()
    case "midtrans":
      return new MidtransAdapter()
    default:
      throw new Error(`Unknown payment provider: ${providerName}`)
  }
}
