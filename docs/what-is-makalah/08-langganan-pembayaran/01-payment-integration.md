# 01. Integrasi Pembayaran (Xendit)

Dokumen ini menjelaskan arsitektur lengkap sistem pembayaran Makalah AI: mulai dari abstraksi provider, alur transaksi end-to-end, webhook handler, hingga konfigurasi runtime. Seluruh fakta divalidasi dari audit forensik codebase produksi.

---

## 1. Arsitektur: Provider Abstraction Layer

Sistem pembayaran dibangun di atas **abstraksi provider** — bukan langsung ke Xendit API. Interface `PaymentProvider` di-design agar provider bisa diganti, namun `factory.ts` saat ini **hardcoded** mengembalikan `new XenditAdapter()`. Switching provider membutuhkan perubahan pada `factory.ts`.

```
Permintaan Bayar (Frontend)
    ↓
src/lib/payment/factory.ts  → getProvider()
    ↓
PaymentProvider (interface)
    ↓
XenditAdapter (implementasi)
    ↓
Xendit API v2024-11-11
```

**Kontrak interface `PaymentProvider`** (di `src/lib/payment/types.ts`) mendefinisikan:
- `createQRIS(params)` — membuat pembayaran QRIS
- `createVA(params)` — membuat Virtual Account
- `createEWallet(params)` — membuat pembayaran E-Wallet (GoPay, OVO)
- `verifyWebhook(request)` — memverifikasi dan parse webhook masuk
- `getPaymentStatus(id)` — polling status pembayaran
- `getSupportedVAChannels()` / `getSupportedEWalletChannels()` — channel yang tersedia

---

## 2. Xendit Adapter (`src/lib/payment/adapters/xendit.ts`)

`XenditAdapter` mengimplementasikan `PaymentProvider` untuk Xendit Payment Requests API v3.

### Endpoint API
```
POST /v3/payment_requests  — untuk QRIS, VA, EWallet
GET  /v3/payment_requests/{id}  — polling status
```
- API version: `2024-11-11` (header `api-version`)
- Auth: Basic Auth dengan `XENDIT_SECRET_KEY` (base64-encoded)
- Currency: selalu `IDR`, country: `ID`, capture method: `AUTOMATIC`

### Metode Pembayaran yang Didukung

| Metode | Channel Code | Expiry Default | Catatan |
|--------|-------------|----------------|---------|
| QRIS | `QRIS` | 30 menit | QR string dari `actions[].descriptor=QR_STRING` |
| Virtual Account | lihat daftar di bawah | 24 jam | VA number dari `actions[].descriptor=VIRTUAL_ACCOUNT_NUMBER` |
| E-Wallet OVO | `OVO` | – | Phone-based; wajib `account_mobile_number` |

**VA Channels Aktif** (dari `src/lib/payment/channel-options.ts`, `ACTIVE_VA_CHANNELS`):

| Code | Label |
|------|-------|
| `BJB_VIRTUAL_ACCOUNT` | Bank BJB |
| `BNI_VIRTUAL_ACCOUNT` | Bank Negara Indonesia |
| `BRI_VIRTUAL_ACCOUNT` | Bank Rakyat Indonesia |
| `BSI_VIRTUAL_ACCOUNT` | Bank Syariah Indonesia |
| `CIMB_VIRTUAL_ACCOUNT` | CIMB Niaga |
| `MANDIRI_VIRTUAL_ACCOUNT` | Bank Mandiri |
| `PERMATA_VIRTUAL_ACCOUNT` | PermataBank |

> [!NOTE]
> Adapter mendukung redirect-based e-wallet (GoPay, ShopeePay, dll.) via branch `else` di `createEWallet`. Namun saat ini `ACTIVE_EWALLET_CHANNELS` hanya berisi **OVO** — channel lain belum diaktifkan di kode.

### Status Mapping Xendit → Internal

| Status Xendit | Status Internal |
|---------------|-----------------|
| `REQUIRES_ACTION`, `ACCEPTING_PAYMENTS`, `AUTHORIZED` | `PENDING` |
| `SUCCEEDED` | `SUCCEEDED` |
| `FAILED`, `CANCELED` | `FAILED` |
| `EXPIRED` | `EXPIRED` |

### Verifikasi Webhook

Xendit mengirim notifikasi via HTTP POST ke endpoint webhook Makalah AI. Proses verifikasi:
1. Cek header `x-callback-token` terhadap env var `XENDIT_WEBHOOK_TOKEN` (atau fallback `XENDIT_WEBHOOK_SECRET`)
2. Parse body JSON ke `XenditWebhookPayload`
3. Map event type ke internal status:
   - `payment.capture` → `SUCCEEDED`
   - `payment.failed` → `FAILED`
   - `payment_request.expiry` / `payment_request.expired` → `EXPIRED`
4. Return normalized `WebhookEvent` (atau `null` jika tidak dikenali)

> [!NOTE]
> Xendit dashboard test mengirim event `payment_request.expiry` (bukan `.expired`). Kedua format ditangani di adapter untuk kompatibilitas test vs live.

---

## 3. Record Pembayaran di Convex (`convex/billing/payments.ts`)

Setiap transaksi disimpan sebagai record di tabel `payments` Convex (provider-agnostic).

### Tipe Pembayaran (`paymentType`)

| Nilai | Deskripsi |
|-------|-----------|
| `credit_topup` | Pembelian kredit BPP |
| `subscription_initial` | Langganan Pro pertama kali |
| `subscription_renewal` | Perpanjangan langganan Pro |

### Tipe Paket (`packageType`) — untuk `credit_topup`

| Nilai | Keterangan |
|-------|------------|
| `paper` | **Aktif** — Paket Paper 300 kredit @ Rp 80.000 |
| `extension_s` | **Deprecated** — hanya ada di record lama |
| `extension_m` | **Deprecated** — hanya ada di record lama |

> [!IMPORTANT]
> Paket `extension_s` dan `extension_m` sudah **tidak dijual lagi**. Mereka masih ada di schema untuk menjaga integritas histori pembayaran lama. Pembelian baru hanya menggunakan `paper`.

### Siklus Status Pembayaran

```
PENDING → SUCCEEDED  (webhook payment.capture)
PENDING → FAILED     (webhook payment.failed)
PENDING → EXPIRED    (webhook payment_request.expiry)
SUCCEEDED → REFUNDED (manual, tidak otomatis)
```

### Perlindungan Idempotency

Setiap pembayaran memiliki `idempotencyKey` unik. Fungsi `checkIdempotency` memastikan tidak ada duplikasi transaksi untuk key yang sama. Webhook handler juga memiliki guard `if (payment.status === "SUCCEEDED") return` untuk mencegah double-processing.

### Fungsi Utama

| Fungsi | Tipe | Deskripsi |
|--------|------|-----------|
| `createPayment` | mutation | Membuat record baru saat inisiasi pembayaran |
| `updatePaymentStatus` | mutation | Dipanggil webhook setelah notifikasi dari Xendit (butuh `CONVEX_INTERNAL_KEY`) |
| `getPaymentByProviderId` | query | Lookup via `providerPaymentId` (mendukung auth atau internal key) |
| `getPaymentByProviderReference` | query | Lookup via `providerReferenceId` untuk rekonsiliasi |
| `getPaymentHistory` | query | Riwayat pembayaran user (default 30, caller-settable via `limit` arg, bisa filter per type) |
| `getPendingPayments` | query | Pembayaran pending yang belum expired |
| `watchPaymentStatus` | query | Real-time subscription status untuk polling UI |
| `getPaymentStats` | query | Statistik admin: total, sukses, gagal, by-type, by-method (butuh role admin) |
| `checkIdempotency` | query | Cek duplikasi sebelum membuat pembayaran baru |

---

## 4. Konfigurasi Provider (`convex/billing/paymentProviderConfigs.ts`)

Admin dapat mengkonfigurasi parameter runtime payment provider melalui tabel `paymentProviderConfigs`. Konfigurasi ini mengontrol:
- **Metode yang diaktifkan** (`enabledMethods`): `QRIS`, `VIRTUAL_ACCOUNT`, `EWALLET`
- **Channel VA yang ditampilkan** (`visibleVAChannels`): daftar kode VA yang muncul di UI
- **Webhook URL** (`webhookUrl`): default `/api/webhooks/payment`
- **Expiry default** (`defaultExpiryMinutes`): default 30 menit

Jika tidak ada config aktif di DB, sistem menggunakan **default sensible** dari `runtime-settings.ts` (fallback pattern). Admin melihat status env var (`XENDIT_SECRET_KEY`, `XENDIT_WEBHOOK_TOKEN`) via `checkProviderEnvStatus` — nilainya tidak pernah diekspos, hanya boolean.

---

## 5. Webhook Handler (`src/app/api/webhooks/payment/route.ts`)

Endpoint: `POST /api/webhooks/payment`

### Alur Lengkap

```
1. Cek CONVEX_INTERNAL_KEY tersedia
2. getProvider() → XenditAdapter
3. provider.verifyWebhook(req) → WebhookEvent | null
4. Switch berdasarkan event.status:
   ├── SUCCEEDED → handlePaymentSuccess()
   ├── FAILED    → handlePaymentFailed()
   └── EXPIRED   → handlePaymentExpired()
5. Return { status: "processed" }
```

### `handlePaymentSuccess` — Logika per Tipe

| Payment Type | Aksi yang Dilakukan |
|-------------|---------------------|
| `credit_topup` | `credits.addCredits()` → update `creditBalances`, upgrade tier ke `bpp` jika masih `free` |
| `subscription_initial` | `subscriptions.createSubscriptionInternal()` → set status user ke `pro` → `quotas.initializeQuotaInternal()` (reset quota Pro) |
| `subscription_renewal` | `subscriptions.renewSubscriptionInternal()` → perpanjang `currentPeriodEnd` → `quotas.initializeQuotaInternal()` (reset quota periode baru) |
| `paper_completion` | **Tidak ada fulfillment aktif** — di-log sebagai error (legacy type) |

### Error Handling Webhook

- **Permanent errors** (payment/user not found) → return HTTP 200 agar Xendit tidak retry
- **Transient errors** (DB timeout, network) → return HTTP 500 agar Xendit retry
- Semua error di-capture ke Sentry dengan tag `api.route: webhook.payment`
- Email konfirmasi dikirim via Resend setelah sukses; kegagalan email tidak memblokir webhook

---

## 6. Keamanan

- **`CONVEX_INTERNAL_KEY`**: Semua mutation backend-to-backend (`updatePaymentStatus`, `addCredits`, `createSubscriptionInternal`, `initializeQuotaInternal`) menggunakan key ini. Tanpa key → `throw new Error("Unauthorized")`.
- **Webhook token**: Xendit callback diverifikasi via `x-callback-token` header. Token mismatch → return `null` + Sentry alert.
- **Auth ownership**: Query publik seperti `getPaymentById` dan `getPaymentHistory` memverifikasi bahwa user yang meminta adalah pemilik payment.
- **Role guard admin**: `getPaymentStats` dilindungi `requireRole(ctx.db, userId, "admin")`.
