# 05 — Keamanan Webhook Pembayaran

**Sumber kode**: `src/app/api/webhooks/payment/route.ts`, `src/lib/payment/adapters/xendit.ts`

---

## Gambaran Umum

Webhook payment adalah titik masuk eksternal yang langsung mempengaruhi saldo kredit dan status subscription user. Keamanannya kritis — setiap request yang tidak terautentikasi atau duplikat berpotensi menyebabkan kredit fiktif atau data tidak konsisten.

Makalah AI menerapkan tiga lapisan perlindungan pada webhook:
1. **Token verification** — memastikan request benar-benar dari Xendit
2. **Internal key guard** — memastikan webhook bisa memanggil Convex mutations
3. **Idempotency check** — mencegah pemrosesan duplikat

---

## Endpoint Webhook

```
POST /api/webhooks/payment
File: src/app/api/webhooks/payment/route.ts
```

---

## Layer 1: Xendit Token Verification

```typescript
// src/lib/payment/adapters/xendit.ts — baris 308–334
async verifyWebhook(request: Request): Promise<WebhookEvent | null> {
  const callbackToken = request.headers.get("x-callback-token")
  const rawToken = process.env.XENDIT_WEBHOOK_TOKEN?.trim()
  const rawSecret = process.env.XENDIT_WEBHOOK_SECRET?.trim()
  const expectedToken = rawToken || rawSecret  // Prioritas XENDIT_WEBHOOK_TOKEN

  if (!expectedToken) {
    // Token tidak dikonfigurasi → log fatal + Sentry → return null
    return null
  }

  if (callbackToken !== expectedToken) {
    // Token tidak cocok → log error + Sentry → return null
    return null
  }
  // ...
}
```

Verifikasi menggunakan **header `x-callback-token`** yang dikirim Xendit pada setiap webhook request.

Dua env var yang digunakan (fallback pattern):
- `XENDIT_WEBHOOK_TOKEN` — diutamakan
- `XENDIT_WEBHOOK_SECRET` — fallback jika yang pertama tidak ada

Jika keduanya tidak dikonfigurasi, Sentry mendapat alert level `fatal` dan webhook selalu ditolak.

---

## Layer 2: Internal Key Guard

```typescript
// src/app/api/webhooks/payment/route.ts — baris 19–29
const internalKey = process.env.CONVEX_INTERNAL_KEY

export async function POST(req: NextRequest) {
  if (!internalKey) {
    Sentry.captureMessage("CONVEX_INTERNAL_KEY not configured for payment webhook", {
      level: "fatal",
    })
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }
  // ...
}
```

`CONVEX_INTERNAL_KEY` diperlukan untuk memanggil Convex internal mutations (seperti `billing.credits.addCredits`, `billing.subscriptions.createSubscriptionInternal`). Tanpa ini, tidak ada satu pun perubahan data yang bisa dilakukan.

---

## Layer 3: Idempotency Check

```typescript
// src/app/api/webhooks/payment/route.ts — baris 111–115
// Prevent duplicate processing
if (payment.status === "SUCCEEDED") {
  console.log(`[Payment] Payment already processed: ${providerPaymentId}`)
  return
}
```

Sebelum memproses payment success, sistem mengecek apakah payment sudah berstatus `SUCCEEDED` di database. Jika ya, pemrosesan dihentikan tanpa error — ini melindungi dari:
- Xendit mengirim webhook duplikat (retry dari sisi Xendit)
- Network timeout yang menyebabkan Xendit menganggap webhook gagal padahal sudah diproses

---

## Event Mapping (Xendit → Status Internal)

```typescript
// src/lib/payment/adapters/xendit.ts — baris 133–147
function mapWebhookEventToStatus(event: string): PaymentStatus | null {
  switch (event) {
    case "payment.capture":
      return "SUCCEEDED"
    case "payment.failed":
      return "FAILED"
    case "payment_request.expiry":
    case "payment_request.expired":
      return "EXPIRED"
    default:
      return null
  }
}
```

Dua event untuk expired ditangani: `payment_request.expiry` (Xendit test/dashboard) dan `payment_request.expired` (live runtime). Event yang tidak dikenal (`null`) diabaikan tanpa error.

---

## Klasifikasi Error & HTTP Response

```typescript
// src/app/api/webhooks/payment/route.ts — baris 76–87
const message = error instanceof Error ? error.message : ""
if (message.includes("not found") || message.includes("tidak ditemukan")) {
  // Permanent error → 200 (jangan retry)
  return NextResponse.json({ status: "error", reason: message })
}
// Transient error → 500 (agar Xendit retry)
return NextResponse.json(
  { status: "error", reason: "transient" },
  { status: 500 }
)
```

| Tipe Error | HTTP Status | Alasan |
|---|---|---|
| Data tidak ada di DB (`not found`) | 200 | Permanent — Xendit tidak perlu retry, hasilnya sama |
| Error transient (DB timeout, network) | 500 | Xendit akan retry — mungkin berhasil di attempt berikutnya |
| Sukses | 200 `{ status: "processed" }` | Normal |

---

## Alur Pemrosesan Payment

### Payment Type yang Ditangani

| `paymentType` | Tindakan |
|---|---|
| `credit_topup` | Tambah kredit ke saldo user via `billing.credits.addCredits` |
| `subscription_initial` | Buat subscription baru + initialize quota bulanan |
| `subscription_renewal` | Perbarui subscription + reset quota bulanan |
| `paper_completion` | Tidak ada fulfillment path aktif (log error, tidak proses) |

### Flow `credit_topup`

```typescript
// Ambil jumlah kredit dari payment record (bukan dari webhook)
const creditsToAdd = payment.credits ?? 0
const packageType = payment.packageType ?? "paper"

// Tambah kredit
const creditResult = await fetchMutation(api.billing.credits.addCredits, {
  userId: payment.userId,
  credits: creditsToAdd,
  packageType,
  paymentId: payment._id,
  internalKey,
})
```

Penting: **jumlah kredit diambil dari database**, bukan dari payload webhook. Ini mencegah manipulasi jumlah kredit via webhook forgery (meskipun token verification sudah dilakukan).

---

## Sentry Integration

Empat titik Sentry monitoring pada webhook:

| Event | Level | Trigger |
|---|---|---|
| `CONVEX_INTERNAL_KEY` tidak ada | `fatal` | Server misconfiguration |
| Token Xendit tidak dikonfigurasi | `fatal` | Webhook tidak bisa diverifikasi |
| Token mismatch | `error` | Possible unauthorized request |
| Runtime processing error | `exception` | Semua error di switch block |

---

## Email Konfirmasi

Setelah payment berhasil diproses, sistem mengirim email notifikasi ke user. Kegagalan pengiriman email **tidak menghentikan** pemrosesan webhook:

```typescript
// src/app/api/webhooks/payment/route.ts — baris 267–273
} catch (emailError) {
  // Email failure should not break webhook processing
  console.error(`[Payment] Email notification failed:`, emailError)
  Sentry.captureException(emailError, {
    tags: { "api.route": "webhook.payment", subsystem: "email" },
  })
}
```

Ini adalah keputusan desain yang tepat — email adalah nice-to-have, status kredit adalah critical. Kegagalan email tidak boleh menyebabkan Xendit menganggap webhook gagal dan melakukan retry yang berpotensi memproses pembayaran dua kali.
