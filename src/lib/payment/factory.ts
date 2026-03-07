/**
 * Payment Provider Factory
 * Returns the active payment provider adapter.
 * Runtime is intentionally fixed to Xendit while payment settings remain DB-backed.
 */

import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import type { PaymentProvider } from "./types"
import { XenditAdapter } from "./adapters/xendit"

export async function getProvider(): Promise<PaymentProvider> {
  try {
    await fetchQuery(api.billing.paymentProviderConfigs.getActiveConfig, {})
  } catch {
    // Ignore settings query failures; payment runtime still resolves to Xendit.
  }

  return new XenditAdapter()
}
