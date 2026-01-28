# Xendit Payment Integration - Pending Tasks

Dokumentasi ini berisi daftar fitur/konfigurasi yang **belum diimplementasi** untuk melengkapi sistem pembayaran Xendit (QRIS, Virtual Account, OVO, GoPay).

> **Last Updated:** 2026-01-26

---

## Status Implementasi Saat Ini

### ✅ Sudah Diimplementasi

| Komponen | File | Status |
|----------|------|--------|
| Xendit Client | `src/lib/xendit/client.ts` | QRIS, VA, OVO, GoPay |
| Payment API | `src/app/api/payments/topup/route.ts` | Create payment |
| Webhook Handler | `src/app/api/webhooks/xendit/route.ts` | Success, Failed, Expired |
| Database Schema | `convex/schema.ts` | payments, creditBalances |
| Convex Functions | `convex/billing/payments.ts`, `credits.ts` | CRUD operations |
| Top-Up UI | `src/app/(dashboard)/subscription/topup/page.tsx` | Full flow |
| Success/Failed Pages | `topup/success`, `topup/failed` | Basic static pages |

---

## ❌ Belum Diimplementasi

### 1. Xendit Dashboard Configuration

**Masalah:** Webhook URL perlu dikonfigurasi manual di Xendit Dashboard.

**Langkah yang diperlukan:**
1. Login ke [Xendit Dashboard](https://dashboard.xendit.co)
2. Pergi ke **Settings → Webhooks**
3. Tambahkan webhook endpoint:
   - **Development:** `https://<ngrok-url>/api/webhooks/xendit`
   - **Production:** `https://<production-domain>/api/webhooks/xendit`
4. Subscribe ke events:
   - `payment_request.succeeded`
   - `payment_request.failed`
   - `payment_request.expired`
5. Copy Webhook Verification Token ke `.env.local`:
   ```
   XENDIT_WEBHOOK_TOKEN=<token-dari-dashboard>
   ```

**File terkait:** `src/app/api/webhooks/xendit/route.ts:51` (verifikasi token)

---

### 2. Payment Status Polling (Real-time Updates)

**Masalah:** User tidak mendapat notifikasi real-time saat pembayaran berhasil. Harus refresh manual.

**Yang perlu diimplementasi:**
```
src/app/(dashboard)/subscription/topup/page.tsx
└── Tambah useEffect dengan polling interval
    └── Check payment status setiap 5 detik
    └── Stop polling saat status !== PENDING
    └── Redirect ke success page saat SUCCEEDED
```

**Referensi function yang sudah ada:**
- `api.billing.payments.getPaymentByXenditId` - Query payment by Xendit ID
- `getPaymentStatus()` di `src/lib/xendit/client.ts:256` - API call ke Xendit

**Alternatif:** Convex subscription dengan `useQuery` (real-time tanpa polling)

---

### 3. Email Konfirmasi Pembayaran

**Masalah:** Kode ada TODO tapi belum diimplementasi.

**Lokasi TODO:** `src/app/api/webhooks/xendit/route.ts:185-186`
```typescript
// 5. TODO: Send confirmation email
// await sendPaymentConfirmationEmail(payment.userId, data.amount)
```

**Yang perlu diimplementasi:**
1. Buat function `sendPaymentConfirmationEmail` di `src/lib/email/resend.ts`
2. Buat email template (HTML atau React Email)
3. Panggil dari webhook handler setelah credit ditambahkan

**Referensi:** `sendBillingNotificationEmail` di `src/lib/email/resend.ts:29-44` sudah ada

---

### 4. Production Environment Configuration

**Masalah:** Beberapa konfigurasi masih hardcoded untuk localhost.

| Variable | Current Value | Production Value |
|----------|--------------|------------------|
| `APP_URL` | `http://localhost:3000` | `https://makalah.app` (atau domain production) |
| `XENDIT_SECRET_KEY` | Development key (`xnd_development_...`) | Production key (`xnd_production_...`) |

**File yang terpengaruh:**
- `src/app/api/payments/topup/route.ts:87` - GoPay redirect URLs
- `.env.local` dan `.env.production`

**GoPay redirect URLs di production:**
```typescript
successReturnUrl: `https://makalah.app/subscription/topup/success`
failureReturnUrl: `https://makalah.app/subscription/topup/failed`
cancelReturnUrl: `https://makalah.app/subscription/topup`
```

---

### 5. Admin Panel - Payment Management

**Masalah:** Tidak ada UI admin untuk mengelola pembayaran.

**Yang perlu diimplementasi:**

```
src/components/admin/PaymentManagement.tsx
├── Payment History Table
│   ├── Filter by status (PENDING, SUCCEEDED, FAILED, EXPIRED)
│   ├── Filter by method (QRIS, VA, EWALLET)
│   ├── Filter by date range
│   └── Search by user/reference ID
├── Payment Detail View
│   └── Xendit ID, status timeline, user info
├── Payment Statistics Dashboard
│   └── Chart: revenue by method, success rate
└── Manual Actions
    └── Mark as expired (untuk cleanup)
```

**Convex functions yang sudah ada:**
- `api.billing.payments.getPaymentStats` - Statistik pembayaran
- `api.billing.payments.getPaymentHistory` - History per user

---

### 6. Error Handling & Recovery

**Masalah:** Tidak ada mekanisme untuk handle failure scenarios.

**Yang perlu diimplementasi:**

#### a. Webhook Retry Handling
Xendit akan retry webhook jika return non-200. Saat ini semua error return 200 untuk prevent infinite retry.

**Pertimbangkan:**
- Logging ke external service (Sentry, LogRocket)
- Queue untuk retry internal

#### b. Xendit API Downtime
```typescript
// src/lib/xendit/client.ts
// Tambahkan retry logic dengan exponential backoff
```

#### c. Duplicate Webhook Prevention
Sudah ada basic check di `handlePaymentSuccess`:
```typescript
if (payment.status === "SUCCEEDED") {
  console.log(`[Xendit] Payment already processed: ${data.id}`)
  return
}
```

Tapi perlu tambah handling untuk race condition.

---

### 7. Testing

**Masalah:** Tidak ada automated tests.

**Yang perlu dibuat:**

```
__tests__/
├── xendit/
│   ├── client.test.ts           # Unit test Xendit functions
│   ├── webhook.test.ts          # Webhook handler test
│   └── topup-api.test.ts        # API route test
└── billing/
    ├── payments.test.ts         # Convex mutations test
    └── credits.test.ts          # Credit balance test
```

**Test scenarios:**
1. QRIS payment creation → correct QR string returned
2. VA payment creation → correct VA number returned
3. OVO payment → phone number normalization
4. GoPay payment → redirect URL handling
5. Webhook success → credit added correctly
6. Webhook expired → status updated
7. Idempotency check → duplicate rejected

---

### 8. Xendit Sandbox Testing Limitations

**Catatan penting untuk testing:**

| Method | Sandbox Behavior | Production Behavior |
|--------|------------------|---------------------|
| QRIS | ✅ QR code works | ✅ Full flow |
| Virtual Account | ✅ VA number generated | ✅ Full flow |
| OVO | ✅ Payment created, push notif simulated | ✅ Real push notification |
| GoPay | ⚠️ No redirect URL returned | ✅ Redirect to GoPay app |

**GoPay di sandbox:** Response tidak mengandung redirect URL di `actions` array. Di production akan ada.

---

## Prioritas Implementasi

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 🔴 HIGH | Xendit Dashboard Config | 15 min | Required for production |
| 🔴 HIGH | Production ENV Config | 10 min | Required for production |
| 🟡 MEDIUM | Payment Status Polling | 2-3 hours | Better UX |
| 🟡 MEDIUM | Email Confirmation | 1-2 hours | Better UX |
| 🟢 LOW | Admin Payment Panel | 4-6 hours | Nice to have |
| 🟢 LOW | Testing | 4-6 hours | Code quality |
| 🟢 LOW | Error Handling | 2-3 hours | Reliability |

---

## Environment Variables Checklist

### Development (`.env.local`)
```bash
# ✅ Required
XENDIT_SECRET_KEY="xnd_development_..."    # Sudah ada
XENDIT_WEBHOOK_SECRET="..."                 # Sudah ada

# ⚠️ Check
APP_URL="http://localhost:3000"             # OK untuk dev

# 📌 Optional
RESEND_API_KEY="..."                        # Untuk email
RESEND_FROM_EMAIL="..."                     # Untuk email
```

### Production (`.env.production`)
```bash
# ❌ Perlu dikonfigurasi
XENDIT_SECRET_KEY="xnd_production_..."      # Dari Xendit Dashboard
XENDIT_WEBHOOK_SECRET="..."                 # Dari Xendit Dashboard (production)
APP_URL="https://makalah.app"               # Domain production
```

---

## File Index

| File | Purpose |
|------|---------|
| `src/lib/xendit/client.ts` | Xendit API client functions |
| `src/app/api/payments/topup/route.ts` | Top-up payment creation API |
| `src/app/api/webhooks/xendit/route.ts` | Webhook handler |
| `src/app/(dashboard)/subscription/topup/page.tsx` | Top-up UI |
| `convex/billing/payments.ts` | Payment database operations |
| `convex/billing/credits.ts` | Credit balance operations |
| `convex/schema.ts:635-680` | payments table schema |
