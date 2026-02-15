# Payment E2E Testing — Status & Results

Dokumentasi status testing end-to-end payment system Makalah App. Semua code path terverifikasi.

**Tanggal audit:** 15-16 Feb 2026

---

## 1. Happy Path — Terverifikasi via Live E2E

### 1.1 Gratis → BPP (Credit Top-Up)

| Step | Evidensi |
|------|----------|
| User Gratis klik "BELI KREDIT" di plans page | UI: checkout/bpp page muncul |
| Pilih QRIS, bayar Rp 80.000 | Payment request created di Xendit |
| Webhook `payment.capture` diterima | Response 200, status "processed" |
| Payment record → SUCCEEDED | `payments` table: status SUCCEEDED |
| Credit balance ter-create (300 kredit) | `creditBalances` table: remainingCredits 300 |
| User status → "bpp" | `users` table: subscriptionStatus "bpp" |
| Email konfirmasi diterima | "Pembayaran Berhasil! 300 kredit" |
| Plans page menampilkan BPP sebagai "SAAT INI" | Badge + sidebar berubah |

**User test:** reimajinasi@gmail.com

### 1.2 BPP → Pro (Subscription Initial)

| Step | Evidensi |
|------|----------|
| User BPP klik "Langganan" di Pro card | Checkout expanded (monthly/yearly + methods) |
| Pilih Pro Bulanan + QRIS, bayar Rp 200.000 | Payment request created di Xendit |
| Webhook `payment.capture` diterima | Response 200, status "processed" |
| Payment record → SUCCEEDED | `payments` table: status SUCCEEDED, paidAt set |
| Subscription record created | `subscriptions` table: status active, pro_monthly |
| User status → "pro" | `users` table: subscriptionStatus "pro" |
| Quota initialized (5M tokens/month) | `userQuotas` table: allottedTokens 5000000 |
| Email konfirmasi diterima | "Langganan Pro Bulanan Anda telah aktif" |
| Plans page menampilkan ActiveSubscriptionView | "Aktif" badge + berlaku sampai + batalkan |

**User test:** tokayakuwi@gmail.com

### 1.3 Cancel Subscription

| Step | Evidensi |
|------|----------|
| Klik "Batalkan Langganan" | Confirmation dialog muncul |
| Konfirmasi "Ya, Batalkan" | Loading state → UI berubah |
| Subscription: cancelAtPeriodEnd → true | DB: cancelAtPeriodEnd true, canceledAt set |
| UI menampilkan "Akan berakhir" | Badge amber + "Aktifkan Kembali" button |

### 1.4 Reactivate Subscription

| Step | Evidensi |
|------|----------|
| Klik "Aktifkan Kembali" | Mutation dipanggil |
| Subscription: cancelAtPeriodEnd → false | DB: cancelAtPeriodEnd false, canceledAt cleared |
| UI kembali ke "Aktif" | Badge hijau + "Batalkan Langganan" link |

### 1.5 Bugs Ditemukan & Di-Fix Selama Testing

| Bug | Root Cause | Fix | Commit |
|-----|-----------|-----|--------|
| Webhook tidak proses payment | Xendit v3 kirim `payment.capture`, handler expect `payment_request.succeeded`. Data structure juga beda (`data.payment_request_id` vs `data.id`) | Update event types dan field mapping di webhook handler | `0b4b59d` |
| Reactivation tidak reset cancel state | `reactivateSubscription` mutation set status "active" tapi tidak reset `cancelAtPeriodEnd` dan `canceledAt` | Tambah `cancelAtPeriodEnd: false` dan `canceledAt: undefined` | `7bb6d45` |

---

## 2. Edge Cases — Terverifikasi via Webhook Simulation & DB Manipulation

### 2.1 Webhook: `payment.failed` — PASS

**Test date:** 16 Feb 2026

**Metode:** Buat PENDING payment via one-off migration, trigger webhook manual via curl ke localhost.

| Verifikasi | Result |
|------------|--------|
| Payment record status → FAILED | ✅ Status FAILED, failureCode: "INSUFFICIENT_BALANCE" |
| metadata.failureCode berisi failure_code dari Xendit | ✅ Tersimpan di metadata |
| User tier/status TIDAK berubah | ✅ User tetap BPP |
| Credits TIDAK berubah | ✅ 300 credits intact |

### 2.2 Webhook: `payment_request.expired` — PASS

**Test date:** 16 Feb 2026

**Metode:** Gunakan payment record kedua dari migration, trigger expired webhook via curl.

| Verifikasi | Result |
|------------|--------|
| Payment record status → EXPIRED | ✅ Status EXPIRED |
| User tier/status TIDAK berubah | ✅ User tetap BPP |
| Tidak ada email dikirim | ✅ By design — expired bukan error |

**Catatan:** Event type `payment_request.expired` menggunakan format `payment_request.*` (bukan `payment.*`). Handler sudah support kedua format.

### 2.3 Cron: Daily Subscription Expiry — PASS

**Test date:** 16 Feb 2026

**Metode:** One-off migration yang replikasi cron logic (`checkExpiredSubscriptions`). Patch `currentPeriodEnd` ke masa lalu, jalankan expiry check, lalu restore.

| Skenario | Verifikasi | Result |
|----------|------------|--------|
| **A: Cancel + ada credits (300)** | Subscription → expired, User → "bpp" | ✅ `downgradedTo: "bpp"`, credits 300 intact |
| **B: Cancel + TIDAK ada credits** | Subscription → expired, User → "free" | ✅ `downgradedTo: "free"` |
| **C: Period end lewat tanpa cancel** | Cron tetap expire (hanya cek `currentPeriodEnd < now`) | ✅ Covered by A&B — `cancelAtPeriodEnd` tidak di-cek |

**Smart downgrade logic verified:** Credits → "bpp", no credits → "free".

### 2.4 Payment Methods: Virtual Account & E-Wallet — Code Path Verified

**Test date:** 16 Feb 2026

**Metode:** Code path audit (bukan live E2E).

**Findings:**
- Semua payment methods (QRIS, VA, OVO, GoPay) menggunakan Xendit Payment Request API v3 yang sama
- Webhook handler generik — lookup by `payment_request_id`, tidak method-specific
- `channel_code` beda per method tapi tidak mempengaruhi processing logic
- QRIS sudah proven E2E → handler aman untuk semua methods

**Risiko rendah:** Handler cukup generik. VA/E-Wallet E2E bisa diverifikasi saat production readiness.

### 2.5 Pro Credit Fallback — Code Path Verified

**Test date:** 16 Feb 2026

**Metode:** Code path audit + DB state manipulation (exhaust quota, verify logic, restore).

| Verifikasi | Result |
|------------|--------|
| Pre-flight: `checkQuota` return `{ allowed: true, useCredits: true }` saat quota habis + ada credits | ✅ Code path at `quotas.ts:427-446` confirmed |
| Pre-flight: `checkQuota` return `{ allowed: false, action: "topup" }` saat quota DAN credits habis | ✅ Code path at `quotas.ts:448-457` confirmed |
| Post-op: Token usage dideduct dari `creditBalances` (bukan `userQuotas`) | ✅ Code path at `enforcement.ts:172-185` confirmed |
| Client: `onError` handler shows toast on 402 | ✅ `ChatWindow.tsx:232-234` confirmed |
| `QuotaWarningBanner` rendered di chat | ✅ `ChatWindow.tsx:724` confirmed |

**DB manipulation test:**
- Set quota to 10 tokens (near zero), credits 300 → checkQuota logic: fallback to credits
- Set quota to 10 tokens, credits 0 → checkQuota logic: block with "topup" action
- Both states restored to original after test

---

## 3. Arsitektur Referensi

### Webhook Handler Entry Point

```
POST /api/webhooks/xendit
  → Verify x-callback-token
  → Parse Xendit v3 payload (event + data)
  → Switch on event:
      "payment.capture"         → handlePaymentSuccess()
      "payment.failed"          → handlePaymentFailed()
      "payment_request.expired" → handlePaymentExpired()
      "recurring.cycle.*"       → (future: subscription renewal)
```

**File:** `src/app/api/webhooks/xendit/route.ts`

### Xendit v3 Payload Structure

```typescript
{
  event: "payment.capture" | "payment.failed" | "payment_request.expired",
  business_id: string,
  created: string,         // ISO 8601
  api_version: "v3",
  data: {
    payment_id: string,           // py-xxx (Xendit payment ID)
    payment_request_id: string,   // pr-xxx (our lookup key)
    reference_id: string,         // our internal reference
    status: "SUCCEEDED" | "FAILED" | "EXPIRED",
    request_amount: number,
    currency: "IDR",
    channel_code: "QRIS" | "BCA_VIRTUAL_ACCOUNT" | "GOPAY" | "OVO" | ...,
    captures?: Array<{ capture_timestamp: string, capture_amount: number }>,
    failure_code?: string,        // only on failed
    metadata?: {
      user_id?: string,
      payment_type?: string,
    }
  }
}
```

### Billing Enforcement Flow

```
User sends chat message
  → checkQuotaBeforeOperation(userId, inputText, operationType)
    → checkQuota query (Convex)
      → unlimited (admin) → bypass
      → bpp → check creditBalances → allowed/blocked
      → pro → check userQuotas → if exhausted, check creditBalances → allowed/blocked
      → gratis → check userQuotas → allowed/blocked
  → If blocked → 402 + createQuotaExceededResponse()
  → If allowed → streamText (AI response)
  → recordUsageAfterOperation(tokens)
    → Record usageEvent
    → Deduct from quota or credits based on tier
```
