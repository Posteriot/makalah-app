/**
 * Xendit API Client
 * Handles payment request creation for QRIS, Virtual Account, and E-Wallet
 */

// Payment method types
export type XenditPaymentMethod = "QRIS" | "VIRTUAL_ACCOUNT" | "EWALLET"

// E-Wallet channel codes
// OVO: requires account_mobile_number
// GOPAY: requires success/failure/cancel_return_url
export type EWalletChannel = "OVO" | "GOPAY"

// Virtual Account channel codes (API v2024-11-11 format)
export type VAChannel =
  | "BCA_VIRTUAL_ACCOUNT"
  | "BNI_VIRTUAL_ACCOUNT"
  | "BRI_VIRTUAL_ACCOUNT"
  | "MANDIRI_VIRTUAL_ACCOUNT"
  | "PERMATA_VIRTUAL_ACCOUNT"
  | "CIMB_VIRTUAL_ACCOUNT"

// Payment request response (API v2024-11-11)
export interface XenditPaymentResponse {
  business_id: string
  payment_request_id: string
  reference_id: string
  type: "PAY" | "PAY_AND_SAVE" | "REUSABLE_PAYMENT_CODE"
  country: string
  currency: string
  request_amount: number
  capture_method: "AUTOMATIC" | "MANUAL"
  channel_code: string
  channel_properties: {
    expires_at?: string
    qr_string?: string
    virtual_account_number?: string
    customer_name?: string
    success_redirect_url?: string
    failure_redirect_url?: string
  }
  actions?: Array<{
    type: "PRESENT_TO_CUSTOMER" | "REDIRECT_CUSTOMER" | "INFORM_CUSTOMER"
    descriptor: "QR_STRING" | "WEB_URL" | "MOBILE_URL" | "VIRTUAL_ACCOUNT_NUMBER"
    value: string
  }>
  status: "REQUIRES_ACTION" | "ACCEPTING_PAYMENTS" | "AUTHORIZED" | "SUCCEEDED" | "FAILED" | "CANCELED" | "EXPIRED"
  failure_code?: string
  description?: string
  metadata?: Record<string, unknown>
  created: string
  updated: string
}

// Error response
export interface XenditError {
  error_code: string
  message: string
}

// Config
const XENDIT_API_URL = "https://api.xendit.co"
const XENDIT_API_VERSION = "2024-11-11" // Required for v3 API

function getHeaders(): Record<string, string> {
  const secretKey = process.env.XENDIT_SECRET_KEY
  if (!secretKey) {
    throw new Error("XENDIT_SECRET_KEY is not configured")
  }
  // Basic auth: key + ":" (no password)
  const authHeader = `Basic ${Buffer.from(secretKey + ":").toString("base64")}`

  return {
    Authorization: authHeader,
    "Content-Type": "application/json",
    "api-version": XENDIT_API_VERSION,
  }
}

/**
 * Create QRIS Payment Request
 * API v2024-11-11 structure - channel_code at top level
 */
export async function createQRISPayment(params: {
  referenceId: string
  amount: number
  description?: string
  metadata?: Record<string, unknown>
  expiresMinutes?: number
}): Promise<XenditPaymentResponse> {
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + (params.expiresMinutes ?? 30))

  const response = await fetch(`${XENDIT_API_URL}/v3/payment_requests`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      reference_id: params.referenceId,
      type: "PAY",
      country: "ID",
      currency: "IDR",
      request_amount: params.amount,
      capture_method: "AUTOMATIC",
      channel_code: "QRIS",
      channel_properties: {
        expires_at: expiresAt.toISOString(),
      },
      description: params.description ?? "Top Up Credit Makalah",
      metadata: params.metadata,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error("[Xendit] QRIS payment creation failed:", data)
    throw new Error((data as XenditError).message || "Failed to create QRIS payment")
  }

  return data as XenditPaymentResponse
}

/**
 * Create Virtual Account Payment Request
 * API v2024-11-11 structure - channel_code at top level
 */
export async function createVAPayment(params: {
  referenceId: string
  amount: number
  channelCode: VAChannel
  customerName: string
  description?: string
  metadata?: Record<string, unknown>
  expiresMinutes?: number
}): Promise<XenditPaymentResponse> {
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + (params.expiresMinutes ?? 60 * 24)) // 24 hours default

  const response = await fetch(`${XENDIT_API_URL}/v3/payment_requests`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      reference_id: params.referenceId,
      type: "PAY",
      country: "ID",
      currency: "IDR",
      request_amount: params.amount,
      capture_method: "AUTOMATIC",
      channel_code: params.channelCode,
      channel_properties: {
        expires_at: expiresAt.toISOString(),
        display_name: params.customerName,
      },
      description: params.description ?? "Top Up Credit Makalah",
      metadata: params.metadata,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error("[Xendit] VA payment creation failed:", data)
    throw new Error((data as XenditError).message || "Failed to create VA payment")
  }

  return data as XenditPaymentResponse
}

/**
 * Create OVO Payment Request
 * Requires account_mobile_number in E.164 format
 */
export async function createOVOPayment(params: {
  referenceId: string
  amount: number
  mobileNumber: string // E.164 format: +628123456789
  description?: string
  metadata?: Record<string, unknown>
}): Promise<XenditPaymentResponse> {
  const response = await fetch(`${XENDIT_API_URL}/v3/payment_requests`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      reference_id: params.referenceId,
      type: "PAY",
      country: "ID",
      currency: "IDR",
      request_amount: params.amount,
      capture_method: "AUTOMATIC",
      channel_code: "OVO",
      channel_properties: {
        account_mobile_number: params.mobileNumber,
      },
      description: params.description ?? "Top Up Credit Makalah",
      metadata: params.metadata,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error("[Xendit] OVO payment creation failed:", data)
    throw new Error((data as XenditError).message || "Failed to create OVO payment")
  }

  return data as XenditPaymentResponse
}

/**
 * Create GoPay Payment Request
 * Requires success/failure/cancel return URLs
 */
export async function createGopayPayment(params: {
  referenceId: string
  amount: number
  successReturnUrl: string
  failureReturnUrl: string
  cancelReturnUrl: string
  description?: string
  metadata?: Record<string, unknown>
}): Promise<XenditPaymentResponse> {
  const response = await fetch(`${XENDIT_API_URL}/v3/payment_requests`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      reference_id: params.referenceId,
      type: "PAY",
      country: "ID",
      currency: "IDR",
      request_amount: params.amount,
      capture_method: "AUTOMATIC",
      channel_code: "GOPAY",
      channel_properties: {
        success_return_url: params.successReturnUrl,
        failure_return_url: params.failureReturnUrl,
        cancel_return_url: params.cancelReturnUrl,
      },
      description: params.description ?? "Top Up Credit Makalah",
      metadata: params.metadata,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error("[Xendit] GoPay payment creation failed:", data)
    throw new Error((data as XenditError).message || "Failed to create GoPay payment")
  }

  return data as XenditPaymentResponse
}

/**
 * Get Payment Request Status
 */
export async function getPaymentStatus(paymentRequestId: string): Promise<XenditPaymentResponse> {
  const response = await fetch(`${XENDIT_API_URL}/v3/payment_requests/${paymentRequestId}`, {
    method: "GET",
    headers: getHeaders(),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error("[Xendit] Get payment status failed:", data)
    throw new Error((data as XenditError).message || "Failed to get payment status")
  }

  return data as XenditPaymentResponse
}

/**
 * Verify webhook callback token
 */
export function verifyWebhookToken(callbackToken: string | null): boolean {
  // Support both naming conventions
  const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN || process.env.XENDIT_WEBHOOK_SECRET
  if (!expectedToken) {
    console.error("[Xendit] XENDIT_WEBHOOK_TOKEN or XENDIT_WEBHOOK_SECRET is not configured")
    return false
  }
  return callbackToken === expectedToken
}

/**
 * Handle Xendit API error
 */
export function handleXenditError(error: XenditError): {
  userMessage: string
  retryable: boolean
} {
  switch (error.error_code) {
    case "PAYMENT_METHOD_NOT_ACTIVE":
      return {
        userMessage: "Metode pembayaran tidak tersedia. Coba metode lain.",
        retryable: false,
      }
    case "CHANNEL_NOT_AVAILABLE":
      return {
        userMessage: "Layanan sedang gangguan. Coba beberapa menit lagi.",
        retryable: true,
      }
    case "INVALID_AMOUNT":
      return {
        userMessage: "Nominal pembayaran tidak valid.",
        retryable: false,
      }
    case "DUPLICATE_REFERENCE":
      return {
        userMessage: "Transaksi duplikat terdeteksi. Refresh halaman.",
        retryable: false,
      }
    default:
      return {
        userMessage: "Terjadi kesalahan. Silakan coba lagi.",
        retryable: true,
      }
  }
}
