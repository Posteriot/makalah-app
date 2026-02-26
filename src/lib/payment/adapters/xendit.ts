/**
 * Xendit Adapter
 * Implements PaymentProvider interface for Xendit payment gateway
 */

import type {
  PaymentProvider,
  PaymentResult,
  PaymentStatus,
  QRISParams,
  VAParams,
  EWalletParams,
  VAChannelOption,
  EWalletChannelOption,
  WebhookEvent,
} from "../types"

// ════════════════════════════════════════════════════════════════
// Xendit-specific types (private to this adapter)
// ════════════════════════════════════════════════════════════════

interface XenditPaymentResponse {
  business_id: string
  payment_request_id: string
  reference_id: string
  type: string
  country: string
  currency: string
  request_amount: number
  capture_method: string
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
    type: string
    descriptor: "QR_STRING" | "WEB_URL" | "MOBILE_URL" | "VIRTUAL_ACCOUNT_NUMBER"
    value: string
  }>
  status:
    | "REQUIRES_ACTION"
    | "ACCEPTING_PAYMENTS"
    | "AUTHORIZED"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELED"
    | "EXPIRED"
  failure_code?: string
  description?: string
  metadata?: Record<string, unknown>
  created: string
  updated: string
}

interface XenditWebhookPayload {
  event: string
  business_id: string
  created: string
  api_version: string
  data: {
    payment_id: string
    payment_request_id: string
    reference_id: string
    status: string
    request_amount: number
    currency: string
    channel_code: string
    captures?: Array<{
      capture_id: string
      capture_timestamp: string
      capture_amount: number
    }>
    failure_code?: string
    metadata?: Record<string, unknown>
  }
}

interface XenditErrorResponse {
  error_code: string
  message: string
}

// ════════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════════

const XENDIT_API_URL = "https://api.xendit.co"
const XENDIT_API_VERSION = "2024-11-11"

const VA_CHANNELS: VAChannelOption[] = [
  { code: "BCA_VIRTUAL_ACCOUNT", label: "BCA" },
  { code: "BNI_VIRTUAL_ACCOUNT", label: "BNI" },
  { code: "BRI_VIRTUAL_ACCOUNT", label: "BRI" },
  { code: "MANDIRI_VIRTUAL_ACCOUNT", label: "Mandiri" },
]

const EWALLET_CHANNELS: EWalletChannelOption[] = [
  { code: "OVO", label: "OVO", requiresMobileNumber: true },
  { code: "GOPAY", label: "GoPay", requiresRedirectUrl: true },
]

// ════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════

function getHeaders(): Record<string, string> {
  const secretKey = process.env.XENDIT_SECRET_KEY
  if (!secretKey) {
    throw new Error("XENDIT_SECRET_KEY is not configured")
  }

  return {
    Authorization: `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
    "Content-Type": "application/json",
    "api-version": XENDIT_API_VERSION,
  }
}

function mapXenditStatus(status: XenditPaymentResponse["status"]): PaymentStatus {
  switch (status) {
    case "REQUIRES_ACTION":
    case "ACCEPTING_PAYMENTS":
    case "AUTHORIZED":
      return "PENDING"
    case "SUCCEEDED":
      return "SUCCEEDED"
    case "FAILED":
    case "CANCELED":
      return "FAILED"
    case "EXPIRED":
      return "EXPIRED"
  }
}

function mapWebhookEventToStatus(event: string): PaymentStatus | null {
  switch (event) {
    case "payment.capture":
      return "SUCCEEDED"
    case "payment.failed":
      return "FAILED"
    case "payment_request.expired":
      return "EXPIRED"
    default:
      return null
  }
}

function normalizeResponse(response: XenditPaymentResponse): PaymentResult {
  const result: PaymentResult = {
    providerPaymentId: response.payment_request_id,
    referenceId: response.reference_id,
    status: mapXenditStatus(response.status),
  }

  // Parse expiry
  if (response.channel_properties.expires_at) {
    result.expiresAt = new Date(response.channel_properties.expires_at).getTime()
  }

  // Extract presentation data from actions array
  if (response.actions) {
    for (const action of response.actions) {
      switch (action.descriptor) {
        case "QR_STRING":
          result.qrString = action.value
          break
        case "VIRTUAL_ACCOUNT_NUMBER":
          result.vaNumber = action.value
          break
        case "WEB_URL":
        case "MOBILE_URL":
          // Prefer WEB_URL, but take MOBILE_URL if no redirect yet
          if (!result.redirectUrl) {
            result.redirectUrl = action.value
          }
          break
      }
    }
  }

  // VA channel label
  if (result.vaNumber) {
    const channel = VA_CHANNELS.find((c) => c.code === response.channel_code)
    result.vaChannel = channel?.label ?? response.channel_code
  }

  return result
}

async function xenditRequest(
  path: string,
  options?: RequestInit
): Promise<XenditPaymentResponse> {
  const response = await fetch(`${XENDIT_API_URL}${path}`, {
    ...options,
    headers: getHeaders(),
  })

  const data = await response.json()

  if (!response.ok) {
    const err = data as XenditErrorResponse
    console.error(`[XenditAdapter] API error:`, err)
    throw new Error(err.message || "Xendit API request failed")
  }

  return data as XenditPaymentResponse
}

// ════════════════════════════════════════════════════════════════
// Adapter
// ════════════════════════════════════════════════════════════════

export class XenditAdapter implements PaymentProvider {
  readonly name = "xendit" as const

  async createQRIS(params: QRISParams): Promise<PaymentResult> {
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + (params.expiresMinutes ?? 30))

    const response = await xenditRequest("/v3/payment_requests", {
      method: "POST",
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

    return normalizeResponse(response)
  }

  async createVA(params: VAParams): Promise<PaymentResult> {
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + (params.expiresMinutes ?? 60 * 24))

    const response = await xenditRequest("/v3/payment_requests", {
      method: "POST",
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

    return normalizeResponse(response)
  }

  async createEWallet(params: EWalletParams): Promise<PaymentResult> {
    // Build channel_properties based on e-wallet type
    let channelProperties: Record<string, string>

    if (params.channelCode === "OVO") {
      if (!params.mobileNumber) {
        throw new Error("OVO requires mobileNumber")
      }
      channelProperties = {
        account_mobile_number: params.mobileNumber,
      }
    } else {
      // GoPay and other redirect-based e-wallets
      channelProperties = {
        success_return_url: params.successReturnUrl ?? "",
        failure_return_url: params.failureReturnUrl ?? "",
        cancel_return_url: params.cancelReturnUrl ?? "",
      }
    }

    const response = await xenditRequest("/v3/payment_requests", {
      method: "POST",
      body: JSON.stringify({
        reference_id: params.referenceId,
        type: "PAY",
        country: "ID",
        currency: "IDR",
        request_amount: params.amount,
        capture_method: "AUTOMATIC",
        channel_code: params.channelCode,
        channel_properties: channelProperties,
        description: params.description ?? "Top Up Credit Makalah",
        metadata: params.metadata,
      }),
    })

    return normalizeResponse(response)
  }

  async verifyWebhook(request: Request): Promise<WebhookEvent | null> {
    // 1. Verify callback token
    const callbackToken = request.headers.get("x-callback-token")
    const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN || process.env.XENDIT_WEBHOOK_SECRET

    if (!expectedToken) {
      console.error("[XenditAdapter] XENDIT_WEBHOOK_TOKEN or XENDIT_WEBHOOK_SECRET is not configured")
      return null
    }

    if (callbackToken !== expectedToken) {
      console.error("[XenditAdapter] Invalid callback token")
      return null
    }

    // 2. Parse body
    let payload: XenditWebhookPayload
    try {
      payload = await request.json()
    } catch {
      console.error("[XenditAdapter] Invalid JSON payload")
      return null
    }

    // 3. Map event to status
    const status = mapWebhookEventToStatus(payload.event)
    if (!status) {
      console.log(`[XenditAdapter] Unhandled event type: ${payload.event}`)
      return null
    }

    const { data } = payload

    // 4. Build normalized event
    const event: WebhookEvent = {
      providerPaymentId: data.payment_request_id,
      status,
      rawAmount: data.request_amount,
      channelCode: data.channel_code,
      metadata: data.metadata,
      failureCode: data.failure_code,
    }

    // Extract paidAt from captures
    if (data.captures?.[0]?.capture_timestamp) {
      event.paidAt = new Date(data.captures[0].capture_timestamp).getTime()
    }

    return event
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus> {
    const response = await xenditRequest(`/v3/payment_requests/${providerPaymentId}`, {
      method: "GET",
    })

    return mapXenditStatus(response.status)
  }

  getSupportedVAChannels(): VAChannelOption[] {
    return VA_CHANNELS
  }

  getSupportedEWalletChannels(): EWalletChannelOption[] {
    return EWALLET_CHANNELS
  }
}
