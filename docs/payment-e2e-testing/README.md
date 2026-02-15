# Payment E2E Testing — Status & Pending Test Cases

Dokumentasi status testing end-to-end payment system Makalah App. Digunakan sebagai checklist untuk memastikan semua code path terverifikasi sebelum production.

**Tanggal audit:** 15 Feb 2026

---

## 1. Yang Sudah Di-Test & Terverifikasi

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

## 2. Yang BELUM Di-Test (Pending)

### 2.1 Webhook: `payment.failed`

**Apa yang terjadi:** Xendit mengirim event ketika pembayaran gagal (kartu ditolak, saldo e-wallet tidak cukup, dll).

**Code path:**
```
src/app/api/webhooks/xendit/route.ts → handlePaymentFailed()
  → fetchQuery(getPaymentByXenditId) — cari payment di DB
  → fetchMutation(updatePaymentStatus) — set status FAILED + failure_code
  → fetchQuery(getUserById) — ambil email user
  → sendPaymentFailedEmail() — kirim email notifikasi gagal
```

**File terkait:**
- `src/app/api/webhooks/xendit/route.ts:301-349` — `handlePaymentFailed()`
- `src/lib/email/sendPaymentEmail.ts` — `sendPaymentFailedEmail()`

**Cara test:**
```bash
curl -s -X POST "http://localhost:3000/api/webhooks/xendit" \
  -H "Content-Type: application/json" \
  -H "x-callback-token: <XENDIT_WEBHOOK_SECRET>" \
  -d '{
    "event": "payment.failed",
    "api_version": "v3",
    "business_id": "<BUSINESS_ID>",
    "created": "<ISO_TIMESTAMP>",
    "data": {
      "payment_id": "py-test-failed-001",
      "payment_request_id": "<EXISTING_PENDING_PAYMENT_PR_ID>",
      "reference_id": "<REFERENCE_ID_FROM_PAYMENT>",
      "status": "FAILED",
      "request_amount": 80000,
      "currency": "IDR",
      "channel_code": "QRIS",
      "failure_code": "INSUFFICIENT_BALANCE",
      "metadata": {
        "payment_type": "credit_topup",
        "user_id": "<USER_ID>"
      }
    }
  }'
```

**Yang harus diverifikasi:**
- [ ] Payment record status → FAILED
- [ ] metadata.failureCode berisi failure_code dari Xendit
- [ ] Email "Pembayaran Gagal" diterima user
- [ ] UI tidak berubah (user tetap di tier sebelumnya)

---

### 2.2 Webhook: `payment_request.expired`

**Apa yang terjadi:** Xendit mengirim event ketika payment request melewati batas waktu (30 menit untuk QRIS, 24 jam untuk VA).

**Code path:**
```
src/app/api/webhooks/xendit/route.ts → handlePaymentExpired()
  → fetchMutation(updatePaymentStatus) — set status EXPIRED
```

**File terkait:**
- `src/app/api/webhooks/xendit/route.ts:354-367` — `handlePaymentExpired()`

**Catatan:** Handler ini TIDAK kirim email (by design — expired payment bukan error, user cuma tidak bayar).

**Cara test:**
```bash
curl -s -X POST "http://localhost:3000/api/webhooks/xendit" \
  -H "Content-Type: application/json" \
  -H "x-callback-token: <XENDIT_WEBHOOK_SECRET>" \
  -d '{
    "event": "payment_request.expired",
    "api_version": "v3",
    "business_id": "<BUSINESS_ID>",
    "created": "<ISO_TIMESTAMP>",
    "data": {
      "payment_id": "",
      "payment_request_id": "<EXISTING_PENDING_PAYMENT_PR_ID>",
      "reference_id": "<REFERENCE_ID_FROM_PAYMENT>",
      "status": "EXPIRED",
      "request_amount": 80000,
      "currency": "IDR",
      "channel_code": "QRIS",
      "metadata": {}
    }
  }'
```

**Yang harus diverifikasi:**
- [ ] Payment record status → EXPIRED
- [ ] User tier/status TIDAK berubah
- [ ] Tidak ada email dikirim

**Potensi issue:** Event type `payment_request.expired` masih menggunakan format v2 (`payment_request.*` bukan `payment.*`). Perlu verifikasi apakah Xendit v3 memang kirim event ini atau format berbeda.

---

### 2.3 Cron: Daily Subscription Expiry

**Apa yang terjadi:** Cron berjalan setiap hari jam 00:05 WIB. Cari subscription yang `status === "active"` DAN `currentPeriodEnd < now`. Untuk tiap subscription yang ditemukan:
1. Set subscription status → "expired"
2. Smart downgrade user: jika ada credit balance → "bpp", jika tidak → "free"

**Code path:**
```
convex/crons.ts → daily 17:05 UTC (00:05 WIB)
  → convex/billing/subscriptionCron.ts:checkExpiredSubscriptions
    → Query subscriptions WHERE status=active AND currentPeriodEnd < now
    → For each: check creditBalances → downgrade to "bpp" or "free"
    → Patch subscription status → "expired"
    → Patch user subscriptionStatus → newTier
```

**File terkait:**
- `convex/crons.ts` — Cron schedule definition
- `convex/billing/subscriptionCron.ts` — `checkExpiredSubscriptions` internalMutation
- `convex/billing/subscriptions.ts:300-348` — `expireSubscription` (manual expire, same logic)

**Penting — Cron HANYA expire subscription yang `currentPeriodEnd < now`.** Field `cancelAtPeriodEnd` TIDAK di-cek oleh cron. Artinya:
- Subscription yang di-cancel (`cancelAtPeriodEnd: true`) → tetap active sampai `currentPeriodEnd` lewat → cron expire
- Subscription yang TIDAK di-cancel → jika `currentPeriodEnd` lewat tanpa renewal payment → cron juga expire

**Cara test:**
1. Buat subscription dengan `currentPeriodEnd` di masa lalu (atau patch langsung di Convex Dashboard)
2. Trigger cron manual:
```bash
npx convex run billing/subscriptionCron:checkExpiredSubscriptions '{}'
# Catatan: ini internalMutation, mungkin perlu --internal flag atau convex dashboard
```

**Yang harus diverifikasi:**

Skenario A — Cancel + ada credit balance:
- [ ] Subscription status → "expired"
- [ ] User subscriptionStatus → "bpp"
- [ ] Credit balance tetap intact

Skenario B — Cancel + TIDAK ada credit balance:
- [ ] Subscription status → "expired"
- [ ] User subscriptionStatus → "free"

Skenario C — Tidak cancel tapi renewal payment gagal:
- [ ] Cron tetap expire karena `currentPeriodEnd < now`
- [ ] Smart downgrade berlaku sama

---

### 2.4 Payment Methods: Virtual Account & E-Wallet

**Status:** Hanya QRIS yang di-test E2E. Virtual Account dan E-Wallet tersedia di UI tapi belum diverifikasi.

**Code path (sama untuk semua methods):**
```
src/app/api/payments/topup/route.ts → createQRISPayment | createVAPayment | createOVOPayment | createGopayPayment
  → Xendit Payment Request API v3
  → Webhook handler (sama untuk semua methods)
```

**File terkait:**
- `src/lib/xendit/client.ts` — `createQRISPayment()`, `createVAPayment()`, `createOVOPayment()`, `createGopayPayment()`

**Yang harus diverifikasi per method:**
- [ ] Virtual Account (BCA): Payment request created, VA number ditampilkan, webhook → SUCCEEDED
- [ ] E-Wallet (GoPay): Payment request created, deep link / QR ditampilkan, webhook → SUCCEEDED
- [ ] E-Wallet (OVO): Payment request created, push notification, webhook → SUCCEEDED

**Risiko:** Webhook payload structure mungkin beda per method (terutama `channel_code` dan `payment_details`). Handler saat ini cukup generik — lookup by `payment_request_id` jadi seharusnya aman.

---

### 2.5 Pro Credit Fallback

**Apa yang terjadi:** User Pro yang quota bulanannya habis (5M tokens) bisa tetap pakai jika punya credit balance (dari top-up). Sistem otomatis fallback ke credit deduction.

**Code path (pre-flight check):**
```
convex/billing/quotas.ts:checkQuota (line 427-468)
  → quota.remainingTokens < estimatedTokens?
  → tier === "pro"?
    → check creditBalances → if credits >= estimated → allowed: true, useCredits: true
    → if no credits → allowed: false, action: "topup"
```

**Code path (post-operation deduction):**
```
src/lib/billing/enforcement.ts:recordUsageAfterOperation (line 158-193)
  → tier === "pro"
  → quotaRemaining >= totalTokens? → normal quota deduction
  → else → deduct from creditBalances via api.billing.credits.deductCredits
```

**File terkait:**
- `convex/billing/quotas.ts:427-468` — Pre-flight: `checkQuota` Pro monthly limit branch
- `src/lib/billing/enforcement.ts:158-193` — Post-op: Pro credit fallback deduction
- `convex/billing/credits.ts` — `deductCredits` mutation

**Cara test:**
1. Login sebagai Pro user yang sudah punya subscription aktif
2. Set quota `remainingTokens` mendekati 0 (via Convex Dashboard atau migration)
3. Pastikan user juga punya credit balance (top up 300 kredit)
4. Kirim chat message → harus tetap bisa (fallback ke credits)
5. Verifikasi credit balance berkurang sesuai token usage
6. Habiskan semua credits → kirim chat → harus di-block (402)

**Yang harus diverifikasi:**
- [ ] Pre-flight: `checkQuota` return `{ allowed: true, useCredits: true }` saat quota habis tapi ada credits
- [ ] Pre-flight: `checkQuota` return `{ allowed: false, action: "topup" }` saat quota DAN credits habis
- [ ] Post-op: Token usage dideduct dari `creditBalances` (bukan `userQuotas`)
- [ ] UI: Chat tetap berjalan normal saat fallback ke credits
- [ ] UI: 402 error + toast saat kedua sumber habis

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
