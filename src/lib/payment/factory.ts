/**
 * Payment Provider Factory
 * Returns the active payment provider adapter based on configuration.
 * Resolution: env var PAYMENT_PROVIDER → default "xendit"
 * NOTE: DB config support added in Task 18 after paymentProviderConfigs table exists
 */

import type { PaymentProvider, PaymentProviderName } from "./types"
import { XenditAdapter } from "./adapters/xendit"
import { MidtransAdapter } from "./adapters/midtrans"

export async function getProvider(): Promise<PaymentProvider> {
  const providerName: PaymentProviderName =
    (process.env.PAYMENT_PROVIDER as PaymentProviderName) || "xendit"

  switch (providerName) {
    case "xendit":
      return new XenditAdapter()
    case "midtrans":
      return new MidtransAdapter()
    default:
      throw new Error(`Unknown payment provider: ${providerName}`)
  }
}
