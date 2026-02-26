/**
 * Payment Provider Abstraction Types
 * Provider-agnostic interfaces for payment processing
 */

// ════════════════════════════════════════════════════════════════
// Provider Identity
// ════════════════════════════════════════════════════════════════

export type PaymentProviderName = "xendit" | "midtrans"

// ════════════════════════════════════════════════════════════════
// Payment Method Categories
// ════════════════════════════════════════════════════════════════

export type PaymentMethodCategory = "QRIS" | "VIRTUAL_ACCOUNT" | "EWALLET"

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED" | "REFUNDED"

// ════════════════════════════════════════════════════════════════
// Channel Options (provider returns these)
// ════════════════════════════════════════════════════════════════

export interface VAChannelOption {
  code: string
  label: string
}

export interface EWalletChannelOption {
  code: string
  label: string
  requiresMobileNumber?: boolean
  requiresRedirectUrl?: boolean
}

// ════════════════════════════════════════════════════════════════
// Payment Creation Params (caller sends these)
// ════════════════════════════════════════════════════════════════

export interface QRISParams {
  referenceId: string
  amount: number
  description?: string
  metadata?: Record<string, unknown>
  expiresMinutes?: number
}

export interface VAParams {
  referenceId: string
  amount: number
  channelCode: string
  customerName: string
  description?: string
  metadata?: Record<string, unknown>
  expiresMinutes?: number
}

export interface EWalletParams {
  referenceId: string
  amount: number
  channelCode: string
  description?: string
  metadata?: Record<string, unknown>
  // OVO-specific
  mobileNumber?: string
  // Redirect-based (GoPay, ShopeePay, etc)
  successReturnUrl?: string
  failureReturnUrl?: string
  cancelReturnUrl?: string
}

// ════════════════════════════════════════════════════════════════
// Normalized Results (provider returns these)
// ════════════════════════════════════════════════════════════════

export interface PaymentResult {
  providerPaymentId: string
  referenceId: string
  status: PaymentStatus
  expiresAt?: number
  // Method-specific presentation data
  qrString?: string
  vaNumber?: string
  vaChannel?: string
  redirectUrl?: string
}

export interface WebhookEvent {
  providerPaymentId: string
  status: PaymentStatus
  paidAt?: number
  failureCode?: string
  rawAmount?: number
  channelCode?: string
  metadata?: Record<string, unknown>
}

// ════════════════════════════════════════════════════════════════
// Provider Interface
// ════════════════════════════════════════════════════════════════

export interface PaymentProvider {
  readonly name: PaymentProviderName

  // Payment creation — one per method category
  createQRIS(params: QRISParams): Promise<PaymentResult>
  createVA(params: VAParams): Promise<PaymentResult>
  createEWallet(params: EWalletParams): Promise<PaymentResult>

  // Webhook verification + parsing
  verifyWebhook(request: Request): Promise<WebhookEvent | null>

  // Status check (polling fallback)
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus>

  // Available channels (differs per provider)
  getSupportedVAChannels(): VAChannelOption[]
  getSupportedEWalletChannels(): EWalletChannelOption[]
}
