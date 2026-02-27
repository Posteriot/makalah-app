/**
 * Midtrans Adapter (Skeleton)
 * Implements PaymentProvider interface — all payment methods throw "not yet implemented".
 * Channel lists are populated with actual Midtrans-supported channels.
 */

import type {
  PaymentProvider,
  QRISParams,
  VAParams,
  EWalletParams,
  PaymentResult,
  PaymentStatus,
  WebhookEvent,
  VAChannelOption,
  EWalletChannelOption,
} from "../types"

export class MidtransAdapter implements PaymentProvider {
  readonly name = "midtrans" as const

  async createQRIS(_params: QRISParams): Promise<PaymentResult> {
    throw new Error("MidtransAdapter.createQRIS not yet implemented")
  }

  async createVA(_params: VAParams): Promise<PaymentResult> {
    throw new Error("MidtransAdapter.createVA not yet implemented")
  }

  async createEWallet(_params: EWalletParams): Promise<PaymentResult> {
    throw new Error("MidtransAdapter.createEWallet not yet implemented")
  }

  async verifyWebhook(_request: Request): Promise<WebhookEvent | null> {
    throw new Error("MidtransAdapter.verifyWebhook not yet implemented")
  }

  async getPaymentStatus(_providerPaymentId: string): Promise<PaymentStatus> {
    throw new Error("MidtransAdapter.getPaymentStatus not yet implemented")
  }

  getSupportedVAChannels(): VAChannelOption[] {
    return [
      { code: "BCA", label: "BCA Virtual Account" },
      { code: "BNI", label: "BNI Virtual Account" },
      { code: "BRI", label: "BRI Virtual Account" },
      { code: "MANDIRI", label: "Mandiri Virtual Account" },
      { code: "PERMATA", label: "Permata Virtual Account" },
    ]
  }

  getSupportedEWalletChannels(): EWalletChannelOption[] {
    return [
      { code: "GOPAY", label: "GoPay", requiresRedirectUrl: true },
      { code: "SHOPEEPAY", label: "ShopeePay", requiresRedirectUrl: true },
    ]
  }
}
