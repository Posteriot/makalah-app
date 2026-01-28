# Xendit Payment System Documentation

Dokumentasi komprehensif sistem pembayaran Xendit untuk Makalah App.

> **Last Updated:** 2026-01-26
> **Xendit API Version:** 2024-11-11

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Supported Payment Methods](#supported-payment-methods)
4. [User Flow](#user-flow)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [Webhook Handler](#webhook-handler)
8. [Billing Tiers](#billing-tiers)
9. [Configuration](#configuration)
10. [Testing](#testing)

---

## Overview

Sistem pembayaran Xendit menghandle credit top-up untuk tier BPP (Bayar Per Pakai). User dapat top-up saldo menggunakan:

- **QRIS** - Scan QR code dengan e-wallet apapun
- **Virtual Account** - Transfer bank (BCA, BNI, BRI, Mandiri)
- **E-Wallet** - OVO (push notification) dan GoPay (redirect)

### Tech Stack

| Component | Technology |
|-----------|------------|
| Payment Gateway | Xendit API v2024-11-11 |
| Backend | Next.js API Routes |
| Database | Convex (real-time) |
| Authentication | Clerk |
| Email | Resend |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER FLOW                                  │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌─────────┐
    │  User    │────▶│ /topup page  │────▶│ POST     │────▶│ Xendit  │
    │ Browser  │     │ Select       │     │ /api/    │     │ API     │
    └──────────┘     │ amount &     │     │ payments/│     │         │
         ▲           │ method       │     │ topup    │     └────┬────┘
         │           └──────────────┘     └──────────┘          │
         │                                                       │
         │  ┌─────────────────────────────────────────────────┐ │
         │  │                    RESPONSE                      │ │
         │  │  QRIS: qrString (render with QRCodeSVG)         │◀┘
         │  │  VA: vaNumber (display for transfer)            │
         │  │  OVO: push notification sent                    │
         │  │  GoPay: redirectUrl (redirect user)             │
         │  └─────────────────────────────────────────────────┘
         │
         │                      ┌───────────────┐
         │                      │   User pays   │
         │                      │ (scan/transfer│
         │                      │  /app)        │
         │                      └───────┬───────┘
         │                              │
         │                              ▼
         │  ┌──────────────────────────────────────────────────┐
         │  │              XENDIT WEBHOOK                       │
         │  │  POST /api/webhooks/xendit                       │
         │  │                                                   │
         │  │  1. Verify x-callback-token                      │
         │  │  2. Parse event type                             │
         │  │  3. Update payment status in Convex              │
         │  │  4. If SUCCESS: Add credits to user balance      │
         │  └──────────────────────────────────────────────────┘
         │
         └──────────── Real-time UI update via Convex subscription
```

---

## Supported Payment Methods

### 1. QRIS

| Property | Value |
|----------|-------|
| Channel Code | `QRIS` |
| Expiry | 30 minutes |
| Response | `qrString` (untuk render dengan `QRCodeSVG`) |
| User Action | Scan QR dengan e-wallet |

```typescript
// Request
{
  amount: 50000,
  paymentMethod: "qris"
}

// Response
{
  qrString: "00020101021226...", // QR code data
  expiresAt: 1706234567890
}
```

### 2. Virtual Account

| Property | Value |
|----------|-------|
| Channels | BCA, BNI, BRI, Mandiri |
| Channel Codes | `BCA_VIRTUAL_ACCOUNT`, `BNI_VIRTUAL_ACCOUNT`, etc. |
| Expiry | 24 hours |
| Response | `vaNumber` + `vaChannel` |
| User Action | Transfer ke nomor VA |

```typescript
// Request
{
  amount: 50000,
  paymentMethod: "va",
  vaChannel: "BCA_VIRTUAL_ACCOUNT"
}

// Response
{
  vaNumber: "1234567890123456",
  vaChannel: "BCA_VIRTUAL_ACCOUNT",
  expiresAt: 1706320967890
}
```

### 3. E-Wallet - OVO

| Property | Value |
|----------|-------|
| Channel Code | `OVO` |
| Required Field | `mobileNumber` (E.164 format: +628xxx) |
| Response | Push notification ke app OVO |
| User Action | Buka app OVO, konfirmasi pembayaran |

```typescript
// Request
{
  amount: 50000,
  paymentMethod: "ewallet",
  ewalletChannel: "OVO",
  mobileNumber: "08123456789"  // Akan dinormalisasi ke +628123456789
}

// Response (no redirect needed)
{
  status: "REQUIRES_ACTION",
  expiresAt: 1706234567890
}
```

**Phone Number Normalization:**
```typescript
// Input → Output
"08123456789"   → "+628123456789"
"8123456789"    → "+628123456789"
"628123456789"  → "+628123456789"
"+628123456789" → "+628123456789"
```

### 4. E-Wallet - GoPay

| Property | Value |
|----------|-------|
| Channel Code | `GOPAY` |
| Required Fields | `successReturnUrl`, `failureReturnUrl`, `cancelReturnUrl` |
| Response | `redirectUrl` (production only) |
| User Action | Redirect ke app Gojek/GoPay |

```typescript
// Request
{
  amount: 50000,
  paymentMethod: "ewallet",
  ewalletChannel: "GOPAY"
}

// Response (production)
{
  redirectUrl: "https://gopay.co.id/payment/...",
  expiresAt: 1706234567890
}
```

**Return URLs:**
- Success: `/subscription/topup/success`
- Failed: `/subscription/topup/failed`
- Cancel: `/subscription/topup`

**Sandbox Note:** GoPay di sandbox mode tidak mengembalikan `redirectUrl`. UI menampilkan fallback message.

---

## User Flow

### Top-Up Flow

```
1. User → /subscription/topup
   │
2. User pilih nominal (Rp 25K / 50K / 100K)
   │
3. User pilih metode pembayaran
   │
   ├─ QRIS → Show QR Code → User scan → Webhook → Credit added
   │
   ├─ VA → Show VA Number → User transfer → Webhook → Credit added
   │
   ├─ OVO → Enter phone → Push notif → User confirm in app → Webhook → Credit added
   │
   └─ GoPay → Redirect to GoPay → User confirm → Return URL → Webhook → Credit added
```

### Payment Status Flow

```
REQUIRES_ACTION / ACCEPTING_PAYMENTS (PENDING)
           │
           ├── User pays ──────────────▶ SUCCEEDED ──▶ Credits added
           │
           ├── User doesn't pay ───────▶ EXPIRED
           │
           └── Payment fails ──────────▶ FAILED
```

---

## API Reference

### POST `/api/payments/topup`

Create payment request untuk top-up credit.

**Headers:**
```
Content-Type: application/json
Authorization: (Clerk session)
```

**Request Body:**
```typescript
{
  amount: number,           // 25000 | 50000 | 100000
  paymentMethod: string,    // "qris" | "va" | "ewallet"
  vaChannel?: string,       // Required if va: "BCA_VIRTUAL_ACCOUNT" | "BNI_VIRTUAL_ACCOUNT" | ...
  ewalletChannel?: string,  // Required if ewallet: "OVO" | "GOPAY"
  mobileNumber?: string     // Required if OVO: "08123456789"
}
```

**Success Response (200):**
```typescript
{
  paymentId: string,      // Convex payment ID
  xenditId: string,       // Xendit payment request ID
  status: string,         // "REQUIRES_ACTION" | "ACCEPTING_PAYMENTS"
  amount: number,         // Amount in IDR
  expiresAt: number,      // Unix timestamp

  // Method-specific
  qrString?: string,      // QRIS only
  vaNumber?: string,      // VA only
  vaChannel?: string,     // VA only
  redirectUrl?: string    // GoPay only (production)
}
```

**Error Response (4xx/5xx):**
```typescript
{
  error: string           // Error message (Indonesian)
}
```

---

## Database Schema

### `payments` Table

```typescript
payments: defineTable({
  userId: v.id("users"),
  sessionId: v.optional(v.id("paperSessions")),

  // Xendit reference
  xenditPaymentRequestId: v.string(),
  xenditReferenceId: v.string(),

  // Payment details
  amount: v.number(),                    // IDR
  currency: v.literal("IDR"),
  paymentMethod: v.union(
    v.literal("QRIS"),
    v.literal("VIRTUAL_ACCOUNT"),
    v.literal("EWALLET"),
    v.literal("DIRECT_DEBIT"),
    v.literal("CREDIT_CARD")
  ),
  paymentChannel: v.optional(v.string()), // "BCA", "OVO", etc.

  // Status
  status: v.union(
    v.literal("PENDING"),
    v.literal("SUCCEEDED"),
    v.literal("FAILED"),
    v.literal("EXPIRED"),
    v.literal("REFUNDED")
  ),

  // Type
  paymentType: v.union(
    v.literal("credit_topup"),
    v.literal("paper_completion"),
    v.literal("subscription_initial"),
    v.literal("subscription_renewal")
  ),

  // Timestamps
  createdAt: v.number(),
  paidAt: v.optional(v.number()),
  expiredAt: v.optional(v.number()),

  // Idempotency
  idempotencyKey: v.string(),
})
```

### `creditBalances` Table

```typescript
creditBalances: defineTable({
  userId: v.id("users"),

  // Balance
  balanceIDR: v.number(),       // Current balance (Rupiah)
  balanceTokens: v.number(),    // Equivalent tokens

  // Lifetime stats
  totalTopUpIDR: v.number(),
  totalSpentIDR: v.number(),

  // Last top-up
  lastTopUpAt: v.optional(v.number()),
  lastTopUpAmount: v.optional(v.number()),

  createdAt: v.number(),
  updatedAt: v.number(),
})
```

---

## Webhook Handler

### Endpoint: `POST /api/webhooks/xendit`

### Verification

Webhook diverifikasi menggunakan `x-callback-token` header:

```typescript
const callbackToken = req.headers.get("x-callback-token")
if (!verifyWebhookToken(callbackToken)) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

### Event Types

| Event | Handler | Action |
|-------|---------|--------|
| `payment_request.succeeded` | `handlePaymentSuccess()` | Update status + Add credits |
| `payment_request.failed` | `handlePaymentFailed()` | Update status |
| `payment_request.expired` | `handlePaymentExpired()` | Update status |
| `recurring.cycle.succeeded` | `handleSubscriptionRenewal()` | Renew Pro subscription |
| `recurring.cycle.failed` | - | Log (TODO: implement) |

### Success Handler Flow

```typescript
async function handlePaymentSuccess(data) {
  // 1. Get payment from database
  const payment = await getPaymentByXenditId(data.id)

  // 2. Prevent duplicate processing
  if (payment.status === "SUCCEEDED") return

  // 3. Update payment status
  await updatePaymentStatus({
    xenditPaymentRequestId: data.id,
    status: "SUCCEEDED",
    paidAt: data.paid_at
  })

  // 4. Business logic by payment type
  if (payment.paymentType === "credit_topup") {
    await addCredits({
      userId: payment.userId,
      amountIDR: data.amount
    })
  }
}
```

---

## Billing Tiers

### Tier Configuration

| Tier | Monthly Tokens | Daily Tokens | Monthly Papers | Credit Based |
|------|---------------|--------------|----------------|--------------|
| Gratis | 100,000 | 50,000 | 2 | No |
| BPP | Unlimited | Unlimited | Unlimited | **Yes** |
| Pro | 5,000,000 | 200,000 | Unlimited | No |

### Credit Conversion

```typescript
// Constants
TOKENS_PER_IDR = 10              // Rp 1 = 10 tokens
TOKEN_PRICE_PER_1K_IDR = 3       // Rp 3 per 1K tokens

// Top-up packages
Rp 25,000  = 250,000 tokens
Rp 50,000  = 500,000 tokens
Rp 100,000 = 1,000,000 tokens
```

### BPP User Flow

```
1. User top-up credit (Rp 50,000)
   │
2. Credit added to balance (500,000 tokens)
   │
3. User status updated: "free" → "bpp"
   │
4. AI usage deducts from credit balance
   │
5. When balance low, prompt to top-up
```

---

## Configuration

### Environment Variables

```bash
# Xendit API
XENDIT_SECRET_KEY="xnd_development_..."   # Development key
XENDIT_WEBHOOK_SECRET="..."                # Webhook verification token

# Application
APP_URL="http://localhost:3000"            # Base URL for return URLs

# Email (optional)
RESEND_API_KEY="..."
RESEND_FROM_EMAIL="noreply@makalah.app"
```

### Xendit Dashboard Setup

1. **Login** ke [Xendit Dashboard](https://dashboard.xendit.co)

2. **API Keys:**
   - Settings → API Keys
   - Copy Secret Key ke `XENDIT_SECRET_KEY`

3. **Webhooks:**
   - Settings → Webhooks → Create
   - URL: `https://your-domain.com/api/webhooks/xendit`
   - Events:
     - `payment_request.succeeded`
     - `payment_request.failed`
     - `payment_request.expired`
   - Copy Verification Token ke `XENDIT_WEBHOOK_SECRET`

### Development Setup

```bash
# 1. Start Next.js
npm run dev

# 2. Start Convex
npm run convex:dev

# 3. Expose webhook (untuk testing)
ngrok http 3000

# 4. Update webhook URL di Xendit Dashboard
# https://<ngrok-id>.ngrok.io/api/webhooks/xendit
```

---

## Testing

### Test Credentials (Sandbox)

Xendit sandbox menerima test payment tanpa uang sungguhan.

### Test Flow

1. **QRIS:**
   - Buat payment → QR code muncul
   - Di Xendit Dashboard → Simulate Payment → Masukkan Reference ID
   - Webhook triggered → Credit added

2. **Virtual Account:**
   - Buat payment → VA number muncul
   - Di Xendit Dashboard → Simulate Payment
   - Webhook triggered → Credit added

3. **OVO:**
   - Buat payment dengan nomor test → Push notification simulated
   - Di Xendit Dashboard → Simulate Payment
   - Webhook triggered → Credit added

4. **GoPay:**
   - Buat payment → (sandbox tidak return redirect URL)
   - Di Xendit Dashboard → Simulate Payment
   - Webhook triggered → Credit added

### Simulate Payment (Xendit Dashboard)

1. Go to Xendit Dashboard → Transactions → Payment Requests
2. Find your payment request
3. Click "Simulate Payment"
4. Status changes to SUCCEEDED
5. Webhook sent to your endpoint

---

## Error Handling

### Common Errors

| Error Code | Message | Solution |
|------------|---------|----------|
| `PAYMENT_METHOD_NOT_ACTIVE` | Metode pembayaran tidak tersedia | Use different method |
| `CHANNEL_NOT_AVAILABLE` | Layanan sedang gangguan | Retry later |
| `INVALID_AMOUNT` | Nominal pembayaran tidak valid | Check amount |
| `DUPLICATE_REFERENCE` | Transaksi duplikat terdeteksi | Refresh page |

### Error Response Structure

```typescript
// API Error
{
  error: "Nominal tidak valid. Pilih: 25000, 50000, 100000"
}

// Xendit Error (handled internally)
{
  error_code: "INVALID_AMOUNT",
  message: "Amount must be greater than minimum"
}
```

---

## Security Considerations

1. **Webhook Verification:** Selalu verifikasi `x-callback-token`
2. **Idempotency:** Check `idempotencyKey` sebelum process payment
3. **Amount Validation:** Server-side validation untuk nominal (25K/50K/100K)
4. **Duplicate Processing:** Check payment status sebelum add credits
5. **User Authentication:** Semua endpoint di-protect oleh Clerk

---

## Related Documentation

- [Pending Tasks](./pending-tasks.md) - Fitur yang belum diimplementasi
- [Files Index](./files-index.md) - Index semua file
- [Xendit API Docs](https://docs.xendit.co) - Official Xendit documentation
