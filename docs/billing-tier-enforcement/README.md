# Billing Tier Enforcement

Dokumentasi teknis sistem billing dan quota enforcement pada Makalah App. Dokumen ini ditulis berdasarkan kode aktual yang sudah diimplementasi.

---

## 1. Overview

Billing tier enforcement adalah sistem yang mengontrol akses pengguna terhadap operasi AI berdasarkan tier langganan mereka. Sistem ini memiliki dua mekanisme utama:

1. **Pre-flight check** — Memeriksa apakah pengguna punya cukup quota/kredit sebelum operasi AI dijalankan
2. **Post-operation deduction** — Mencatat penggunaan token dan mengurangi quota/kredit setelah operasi AI selesai

### Tiga Tier

| Tier | Model Billing | Harga | Limit Bulanan | Limit Harian | Paper/Bulan |
|------|--------------|-------|---------------|--------------|-------------|
| **Gratis** | Quota (hard limit) | Rp 0 | 100.000 tokens | 50.000 tokens | 2 |
| **BPP** (Bayar Per Paper) | Kredit (prepaid) | Mulai Rp 80.000/paper | Unlimited | Unlimited | Unlimited |
| **Pro** | Quota (soft limit + overage) | Rp 200.000/bulan | 5.000.000 tokens | 200.000 tokens | Unlimited |

Sumber: `TIER_LIMITS` di `convex/billing/constants.ts`

---

## 2. Architecture

### Alur Enforcement

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  User Request    │────>│  Pre-flight Check     │────>│  AI Operation       │
│  (chat/paper)    │     │  checkQuotaBefore-    │     │  (streamText, etc.) │
│                  │     │  Operation()          │     │                     │
└─────────────────┘     └──────────────────────┘     └─────────┬───────────┘
                               │                               │
                          ┌────┴────┐                          │
                          │ allowed │                          │
                          │ = false │                     ┌────▼────────────┐
                          └────┬────┘                     │  Post-operation  │
                               │                          │  recordUsageAfter│
                          ┌────▼────┐                     │  Operation()     │
                          │  402    │                     └────┬─────────────┘
                          │Response │                          │
                          └─────────┘                     ┌────▼────────────┐
                                                          │  Deduct from    │
                                                          │  quota/credits  │
                                                          └─────────────────┘
```

### Fungsi yang Dipanggil (Urutan)

1. `determineOperationType()` — Tentukan tipe operasi (`chat_message`, `paper_generation`, `web_search`, `refrasa`)
2. `checkQuotaBeforeOperation(userId, inputText, operationType, convexToken)` — Pre-flight check
   - Internal: `estimateTotalTokens()` → `fetchQuery(api.billing.quotas.checkQuota)`
3. Jika `allowed === false` → `createQuotaExceededResponse()` → return HTTP 402
4. Jika `allowed === true` → Jalankan operasi AI
5. `recordUsageAfterOperation(params)` — Post-operation
   - Step 1: `fetchMutation(api.billing.usage.recordUsage)` — Catat usage event
   - Step 2: Cek tier user via `getEffectiveTier()`
   - Step 3a (BPP): `fetchMutation(api.billing.credits.deductCredits)` — Kurangi kredit
   - Step 3b (Gratis/Pro): `fetchMutation(api.billing.quotas.deductQuota)` — Kurangi quota

### Data Flow

```
[Next.js API Route]
    │
    ├── checkQuotaBeforeOperation()          ← src/lib/billing/enforcement.ts
    │       └── fetchQuery(checkQuota)       ← convex/billing/quotas.ts
    │
    ├── [AI Operation - streamText, etc.]
    │
    └── recordUsageAfterOperation()          ← src/lib/billing/enforcement.ts
            ├── fetchMutation(recordUsage)   ← convex/billing/usage.ts
            ├── fetchQuery(getById)          ← convex/users.ts
            └── BRANCH by tier:
                ├── BPP: fetchMutation(deductCredits)  ← convex/billing/credits.ts
                └── Gratis/Pro: fetchMutation(deductQuota) ← convex/billing/quotas.ts
```

---

## 3. Tier Determination

### `getEffectiveTier(role?, subscriptionStatus?): EffectiveTier`

File: `src/lib/utils/subscription.ts`

```typescript
export type EffectiveTier = "gratis" | "bpp" | "pro"

export function getEffectiveTier(role?: string, subscriptionStatus?: string): EffectiveTier {
  // Admin dan superadmin SELALU diperlakukan sebagai PRO (unlimited access)
  if (role === "superadmin" || role === "admin") return "pro"

  // Regular users: cek subscriptionStatus
  if (subscriptionStatus === "pro") return "pro"
  if (subscriptionStatus === "bpp") return "bpp"

  // Default untuk "free", "canceled", undefined, atau value lainnya
  return "gratis"
}
```

### Mapping Table

| `role` | `subscriptionStatus` | Effective Tier |
|--------|---------------------|----------------|
| `superadmin` | (apapun) | `pro` |
| `admin` | (apapun) | `pro` |
| `user` | `"pro"` | `pro` |
| `user` | `"bpp"` | `bpp` |
| `user` | `"free"` | `gratis` |
| `user` | `"canceled"` | `gratis` |
| `user` | `undefined` | `gratis` |

### Admin/Superadmin Bypass

Admin dan superadmin di-bypass pada tiga titik:

1. **Pre-flight** (`checkQuota` di `convex/billing/quotas.ts`): Langsung return `{ allowed: true, tier: "pro", bypassed: true }`
2. **Post-operation** (`recordUsageAfterOperation` di `enforcement.ts`): Usage tetap dicatat via `recordUsage`, tapi deduction di-skip. Return `{ deducted: false }`
3. **Quota deduction** (`deductQuota` di `convex/billing/quotas.ts`): Jika dipanggil langsung, return `{ success: true, bypassed: true }`

---

## 4. Quota System (Gratis / Pro)

Quota adalah mekanisme billing untuk tier Gratis dan Pro. Quota dilacak per periode bulanan (anniversary-based) dengan daily reset.

### Konfigurasi Limit

```typescript
// convex/billing/constants.ts → TIER_LIMITS

gratis: {
  monthlyTokens: 100_000,
  dailyTokens: 50_000,
  monthlyPapers: 2,
  hardLimit: true,        // Block saat quota habis
  overageAllowed: false,
  creditBased: false,
}

pro: {
  monthlyTokens: 5_000_000,
  dailyTokens: 200_000,
  monthlyPapers: Infinity,
  hardLimit: false,
  overageAllowed: true,
  overageRatePerToken: 0.00005, // Rp 0.05 per 1K tokens = Rp 50 per 1M tokens
  creditBased: false,
}
```

### Periode Bulanan (Anniversary-Based)

Periode billing dihitung dari tanggal signup user, bukan awal bulan kalender.

```typescript
// getPeriodBoundaries(referenceDate, currentDate)
// referenceDate = user.createdAt (tanggal signup)
// Menghitung periodStart dan periodEnd berdasarkan anniversary day
```

Contoh: User signup tanggal 15, maka period = tanggal 15 bulan ini s/d tanggal 15 bulan depan.

### Daily Reset

Token harian di-reset otomatis. Pengecekan via `isSameDay()` — jika `lastDailyReset` bukan hari ini, `dailyUsedTokens` direset ke 0.

### `checkQuota()` — Pre-flight Check

File: `convex/billing/quotas.ts`

```typescript
export const checkQuota = query({
  args: {
    userId: v.id("users"),
    estimatedTokens: v.number(),
    operationType: v.union(v.literal("chat"), v.literal("paper")),
  },
  handler: async (ctx, args) => { ... }
})
```

Logika pengecekan (berurutan):

1. **Admin bypass** — `role === "admin" || "superadmin"` → `{ allowed: true, bypassed: true }`
2. **BPP (credit-based)** — Cek `creditBalances` → bandingkan `remainingCredits` vs `estimatedCredits`
3. **Daily limit** — `dailyUsed + estimatedTokens > dailyLimit` → `{ allowed: false, reason: "daily_limit", action: "wait" }`
4. **Monthly limit** — `remainingTokens < estimatedTokens`:
   - Gratis (`hardLimit: true`): `{ allowed: false, reason: "monthly_limit", action: "upgrade" }`
   - Pro (`overageAllowed: true`): `{ allowed: true, warning: "Estimasi overage: ..." }`
5. **Paper limit** (Gratis only) — `completedPapers >= allottedPapers` → `{ allowed: false, reason: "paper_limit", action: "upgrade" }`
6. **Pass** — `{ allowed: true, remainingTokens, dailyRemaining }`

### `deductQuota()` — Post-operation

File: `convex/billing/quotas.ts`

```typescript
export const deductQuota = mutation({
  args: {
    userId: v.id("users"),
    tokens: v.number(),
  },
  handler: async (ctx, args) => { ... }
})
```

Logika:
- Admin bypass → `{ success: true, bypassed: true }`
- Auto-create quota jika belum ada atau periode baru
- Handle daily reset jika hari berganti
- Update: `usedTokens += tokens`, `remainingTokens = max(0, allotted - used)`, `dailyUsedTokens += tokens`
- **Pro overage**: Jika `usedTokens > allottedTokens`, hitung overage tokens dan cost (`overageRatePerToken = 0.00005`)

### Warning Thresholds

```typescript
// convex/billing/constants.ts → QUOTA_WARNING_THRESHOLDS
{
  warning: 20,   // Warning saat sisa 20%
  critical: 10,  // Critical saat sisa 10%
  blocked: 0,    // Block saat 0%
}
```

`getQuotaStatus()` menentukan `warningLevel`:
- `percentageRemaining <= 0` → `"blocked"`
- `percentageRemaining <= 10` → `"critical"`
- `percentageRemaining <= 20` → `"warning"`
- Lainnya → `"none"`

---

## 5. Credit System (BPP)

Kredit adalah mata uang internal untuk tier BPP (Bayar Per Paper).

### Konversi

```
1 kredit = 1.000 tokens
```

Konstanta: `TOKENS_PER_CREDIT = 1_000` di `convex/billing/constants.ts`

Fungsi konversi:
- `tokensToCredits(tokens)` — `Math.ceil(tokens / 1_000)` (pembulatan ke atas)
- `creditsToTokens(credits)` — `credits * 1_000`

### Paket Kredit

```typescript
// convex/billing/constants.ts → CREDIT_PACKAGES

| Type          | Kredit | Tokens  | Harga (IDR) | Label        | Deskripsi              | Rate/Kredit |
|---------------|--------|---------|-------------|--------------|------------------------|-------------|
| `paper`       | 300    | 300.000 | 80.000      | Paket Paper  | 1 paper lengkap (~15h) | Rp 267      |
| `extension_s` | 50     | 50.000  | 25.000      | Extension S  | Revisi ringan          | Rp 500      |
| `extension_m` | 100    | 100.000 | 50.000      | Extension M  | Revisi berat           | Rp 500      |
```

### `addCredits()` — Tambah Kredit Setelah Pembayaran

File: `convex/billing/credits.ts`

```typescript
export const addCredits = mutation({
  args: {
    userId: v.id("users"),
    credits: v.number(),
    packageType: v.string(),
    paymentId: v.optional(v.id("payments")),
    internalKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => { ... }
})
```

Logika:
- Auto-create `creditBalances` record jika belum ada
- Update: `totalCredits += credits`, `remainingCredits += credits`, `totalPurchasedCredits += credits`
- Set `lastPurchaseAt`, `lastPurchaseType`, `lastPurchaseCredits`
- **Auto-upgrade**: Jika `subscriptionStatus === "free"`, otomatis upgrade ke `"bpp"`

### `deductCredits()` — Kurangi Kredit

File: `convex/billing/credits.ts`

```typescript
export const deductCredits = mutation({
  args: {
    userId: v.id("users"),
    tokensUsed: v.number(),
    sessionId: v.optional(v.id("paperSessions")),
  },
  handler: async (ctx, args) => { ... }
})
```

Logika:
- Konversi token ke kredit via `tokensToCredits()`
- Cek `remainingCredits >= creditsToDeduct` → jika tidak cukup, throw `"Insufficient credits"`
- Update: `usedCredits += creditsDeducted`, `remainingCredits -= creditsDeducted`, `totalSpentCredits += creditsDeducted`

### Paper Session Credit Tracking

Jika `sessionId` disertakan pada `deductCredits()`:
- Update paper session: `creditUsed += creditsDeducted`, `creditRemaining = (creditAllotted ?? 300) - creditUsed`
- **Soft-block**: Jika `creditRemaining <= 0`, set `isSoftBlocked = true` dan `softBlockedAt = Date.now()`
- Soft-block **tidak** menghentikan respons yang sedang berjalan. Response tetap selesai, tapi UI menampilkan status soft-block

### Soft-Block Behavior

Ketika BPP user kehabisan kredit saat operasi AI sedang berjalan:
- Error `"Insufficient credits"` di-catch di `recordUsageAfterOperation()`
- **Response tidak di-interrupt** — user tetap mendapat respons
- Console log: `[Billing] Soft-block triggered`
- Frontend menampilkan indikasi soft-block

---

## 6. Operation Cost Multipliers

Setiap tipe operasi memiliki multiplier yang mempengaruhi estimasi total token.

### Tabel Multiplier

```typescript
// convex/billing/constants.ts → OPERATION_COST_MULTIPLIERS

| Operation          | Multiplier | Deskripsi                            |
|--------------------|-----------|--------------------------------------|
| `chat_message`     | 1.0       | Base rate (chat biasa)               |
| `paper_generation` | 1.5       | Paper cenderung pakai lebih banyak   |
| `web_search`       | 2.0       | Search results masuk ke context      |
| `refrasa`          | 0.8       | Refrasa biasanya lebih pendek        |
```

### Formula Estimasi Token

```typescript
// src/lib/billing/enforcement.ts

const CHARS_PER_TOKEN = 3  // ~3 karakter = 1 token (Indonesian)

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function estimateTotalTokens(inputText: string, operationType: OperationType): number {
  const inputTokens = estimateTokens(inputText)
  const multiplier = OPERATION_COST_MULTIPLIERS[operationType] ?? 1.0
  return Math.ceil(inputTokens * (1 + multiplier))
}
```

Contoh: Input "hello" (5 chars), `paper_generation`:
- `inputTokens = ceil(5/3) = 2`
- `totalTokens = ceil(2 * (1 + 1.5)) = ceil(5) = 5`

### Determinasi Tipe Operasi

```typescript
// src/lib/billing/enforcement.ts

function determineOperationType(params: {
  paperSessionId?: string | null
  enableWebSearch?: boolean
  isRefrasa?: boolean
}): OperationType {
  if (params.isRefrasa) return "refrasa"
  if (params.enableWebSearch) return "web_search"
  if (params.paperSessionId) return "paper_generation"
  return "chat_message"
}
```

Prioritas: `refrasa` > `web_search` > `paper_generation` > `chat_message`

### Cost Tracking (IDR)

Setiap usage event juga menghitung cost estimasi dalam IDR:

```typescript
// convex/billing/constants.ts
const TOKEN_PRICE_PER_1K_IDR = 22.4
// Berdasarkan Gemini 2.5 Flash: Input $0.30/1M + Output $2.50/1M
// Blended average (50:50) = Rp 22,40/1K tokens

function calculateCostIDR(totalTokens: number): number {
  return Math.ceil((totalTokens / 1000) * TOKEN_PRICE_PER_1K_IDR)
}
```

---

## 7. Payment Flow

### Payment Gateway

Semua pembayaran diproses melalui **Xendit** (API version `2024-11-11`).

### Metode Pembayaran yang Didukung

| Metode | Channel | Keterangan |
|--------|---------|-----------|
| **QRIS** | - | Scan QR code dari e-wallet manapun |
| **Virtual Account** | BCA, BNI, BRI, Mandiri, Permata, CIMB | Transfer bank |
| **E-Wallet** | OVO (perlu nomor HP), GoPay (perlu redirect) | Pembayaran via e-wallet |

Sumber: `src/lib/xendit/client.ts`

### BPP Top-up: `/api/payments/topup`

File: `src/app/api/payments/topup/route.ts`

**Endpoint**: `POST /api/payments/topup`

**Request Body**:
```typescript
{
  packageType: "paper" | "extension_s" | "extension_m"
  paymentMethod: "qris" | "va" | "ewallet"
  vaChannel?: string          // Wajib jika paymentMethod = "va"
  ewalletChannel?: string     // Wajib jika paymentMethod = "ewallet"
  mobileNumber?: string       // Wajib jika ewalletChannel = "OVO"
}
```

**Alur**:
1. Auth check (Clerk)
2. Get Convex user
3. Validasi `packageType` via `isValidPackageType()`
4. Generate `referenceId` (`topup_{userId}_{timestamp}`) dan `idempotencyKey` (UUID)
5. Cek duplikat via `checkIdempotency()`
6. Buat Xendit payment request sesuai metode
7. Simpan record ke `payments` table via `createPayment()`
8. Return payment data (QR string / VA number / redirect URL)

**QRIS Expiry**: 30 menit | **VA Expiry**: 24 jam

### Pro Subscription: `/api/payments/subscribe`

**Status**: Belum diimplementasi (endpoint belum ada di `src/app/api/payments/subscribe/`).

Frontend (`PlansHubPage`) sudah memanggil `POST /api/payments/subscribe` dengan payload:
```typescript
{
  planType: "pro_monthly" | "pro_yearly"
  paymentMethod: "qris" | "va" | "ewallet"
  vaChannel?: string
  ewalletChannel?: string
  mobileNumber?: string
}
```

Backend subscription management (`convex/billing/subscriptions.ts`) sudah lengkap, tapi API route penghubung belum dibuat.

### Xendit Webhook: `/api/webhooks/xendit`

File: `src/app/api/webhooks/xendit/route.ts`

**Endpoint**: `POST /api/webhooks/xendit`

**Event yang ditangani**:

| Event | Handler | Status |
|-------|---------|--------|
| `payment_request.succeeded` | `handlePaymentSuccess()` | Implementasi lengkap |
| `payment_request.failed` | `handlePaymentFailed()` | Implementasi lengkap |
| `payment_request.expired` | `handlePaymentExpired()` | Implementasi lengkap |
| `recurring.cycle.succeeded` | `handleSubscriptionRenewal()` | Stub (TODO: reset monthly quota) |
| `recurring.cycle.failed` | - | Log only (TODO: handle) |

**Alur `handlePaymentSuccess()`**:
1. Get payment dari DB via `getPaymentByXenditId()`
2. Cek duplikat (jika `status === "SUCCEEDED"`, skip)
3. Update status payment via `updatePaymentStatus()`
4. Business logic berdasarkan `paymentType`:
   - `credit_topup`: Panggil `addCredits()` → kredit ditambahkan ke user
   - `paper_completion`: TODO (belum diimplementasi)
   - `subscription_initial` / `subscription_renewal`: TODO (belum diimplementasi)
5. Kirim email konfirmasi via `sendPaymentSuccessEmail()`

**Verifikasi**: Webhook diverifikasi via `x-callback-token` header menggunakan `verifyWebhookToken()`.

**Error handling**: Selalu return HTTP 200 (bahkan saat error) untuk mencegah Xendit retry. Error di-log untuk investigasi.

---

## 8. Frontend Components

### Plans Page (`/subscription/plans`)

File: `src/app/(dashboard)/subscription/plans/page.tsx`

Halaman pemilihan paket langganan. Menampilkan 3 tier card (Gratis, BPP, Pro) yang diambil dari `pricingPlans` table.

**Fitur utama**:
- Menampilkan tier badge saat ini
- BPP card: Expandable dengan pemilihan paket kredit dan metode pembayaran
- Pro card: Expandable dengan pemilihan plan (bulanan/tahunan) dan metode pembayaran
- Real-time payment status tracking via `watchPaymentStatus` query (Convex reactive)
- Countdown timer untuk expiry pembayaran
- QR code rendering (QRIS), VA number display, E-Wallet redirect
- Extension packages (S/M) hanya ditampilkan jika user sudah punya kredit atau sedang soft-blocked

**State management**:
- BPP dan Pro memiliki state payment yang terpisah (isolated)
- Payment status di-subscribe secara real-time — UI auto-update saat webhook memproses pembayaran

**Payment result states**:
1. **PENDING** — Menampilkan instruksi pembayaran (QR/VA/E-Wallet) + countdown
2. **Expired countdown** — Tombol "Cek Status Pembayaran" + "Batalkan & Pilih Ulang"
3. **SUCCEEDED** — Konfirmasi sukses + CTA ke chat
4. **FAILED/EXPIRED** — Error state + tombol "Coba Lagi"

### Overview Page (`/subscription/overview`)

File: `src/app/(dashboard)/subscription/overview/page.tsx`

Halaman monitoring penggunaan.

**Komponen yang ditampilkan**:
- Tier card — Menampilkan tier saat ini dengan link upgrade
- Credit balance card — Saldo kredit BPP dengan link top-up
- Usage progress bar — Persentase penggunaan (Gratis/Pro) dengan warna berdasarkan `warningLevel`
- BPP credit status — Saldo kredit dalam kredit dan estimasi tokens
- Usage breakdown table — Tabel per tipe operasi (Chat, Paper, Web Search, Refrasa) dengan kolom kredit, tokens, dan estimasi biaya IDR
- Overage info (Pro) — Menampilkan token overage dan cost jika ada

**Data source**:
- `getQuotaStatus()` — Quota dan warning level
- `getMonthlyBreakdown()` — Breakdown per tipe operasi
- `getCreditBalance()` — Saldo kredit BPP

### Payment Email Templates

#### `PaymentSuccessEmail`

File: `src/lib/email/templates/PaymentSuccessEmail.tsx`

Template React Email untuk notifikasi pembayaran sukses. Mendukung dua variant:
- **BPP (credit topup)**: Menampilkan kredit dibeli dan total kredit baru
- **Pro (subscription)**: Menampilkan label plan langganan

Data: `userName`, `amount`, `credits`, `newTotalCredits`, `subscriptionPlanLabel`, `transactionId`, `paidAt`

#### `sendPaymentSuccessEmail()` / `sendPaymentFailedEmail()`

File: `src/lib/email/sendPaymentEmail.ts`

Server action yang mengirim email via **Resend**. Dipanggil dari Xendit webhook handler.

```typescript
export async function sendPaymentSuccessEmail(params: PaymentSuccessParams): Promise<SendResult>
export async function sendPaymentFailedEmail(params: PaymentFailedParams): Promise<SendResult>
```

---

## 9. Database Tables

### `usageEvents`

Mencatat setiap event penggunaan token.

| Field | Type | Deskripsi |
|-------|------|-----------|
| `userId` | `Id<"users">` | User yang melakukan operasi |
| `conversationId` | `Id<"conversations">?` | Conversation terkait (opsional) |
| `sessionId` | `Id<"paperSessions">?` | Paper session terkait (opsional) |
| `promptTokens` | `number` | Token input (prompt) |
| `completionTokens` | `number` | Token output (completion) |
| `totalTokens` | `number` | Total tokens (prompt + completion) |
| `costIDR` | `number` | Estimasi biaya dalam Rupiah |
| `model` | `string` | Model AI yang digunakan |
| `operationType` | `"chat_message" \| "paper_generation" \| "web_search" \| "refrasa"` | Tipe operasi |
| `createdAt` | `number` | Timestamp pembuatan |

**Indexes**: `by_user_time`, `by_session`, `by_conversation`, `by_user_type`

### `userQuotas`

State quota per user per periode billing.

| Field | Type | Deskripsi |
|-------|------|-----------|
| `userId` | `Id<"users">` | User pemilik quota |
| `periodStart` | `number` | Awal periode billing |
| `periodEnd` | `number` | Akhir periode billing |
| `allottedTokens` | `number` | Total quota tokens untuk periode ini |
| `usedTokens` | `number` | Tokens yang sudah dipakai |
| `remainingTokens` | `number` | Sisa quota (computed: allotted - used) |
| `allottedPapers` | `number` | Max papers per bulan |
| `completedPapers` | `number` | Papers yang sudah selesai |
| `dailyUsedTokens` | `number` | Pemakaian hari ini (reset harian) |
| `lastDailyReset` | `number` | Timestamp reset harian terakhir |
| `tier` | `"gratis" \| "bpp" \| "pro"` | Tier saat quota dibuat |
| `overageTokens` | `number` | Tokens di luar limit (Pro) |
| `overageCostIDR` | `number` | Biaya overage akumulasi (Pro) |
| `updatedAt` | `number` | Timestamp update terakhir |

**Indexes**: `by_user`, `by_period`

### `creditBalances`

Saldo kredit untuk user BPP. Satu record per user.

| Field | Type | Deskripsi |
|-------|------|-----------|
| `userId` | `Id<"users">` | User pemilik saldo |
| `totalCredits` | `number?` | Total kredit yang pernah dibeli (opsional, migration) |
| `usedCredits` | `number?` | Kredit yang sudah terpakai |
| `remainingCredits` | `number?` | Sisa kredit (total - used) |
| `totalPurchasedCredits` | `number?` | Lifetime total kredit dibeli |
| `totalSpentCredits` | `number?` | Lifetime total kredit dipakai |
| `lastPurchaseAt` | `number?` | Timestamp pembelian terakhir |
| `lastPurchaseType` | `string?` | Tipe paket terakhir dibeli |
| `lastPurchaseCredits` | `number?` | Jumlah kredit pembelian terakhir |
| `createdAt` | `number` | Timestamp pembuatan |
| `updatedAt` | `number` | Timestamp update terakhir |

**Note**: Field bertipe optional karena migrasi dari sistem lama. Code menggunakan `?? 0` sebagai fallback.

**Indexes**: `by_user`

### `payments`

Record transaksi pembayaran Xendit.

| Field | Type | Deskripsi |
|-------|------|-----------|
| `userId` | `Id<"users">` | User yang membayar |
| `sessionId` | `Id<"paperSessions">?` | Untuk `paper_completion` payment |
| `xenditPaymentRequestId` | `string` | ID payment request Xendit |
| `xenditReferenceId` | `string` | Reference ID internal (untuk reconciliation) |
| `amount` | `number` | Jumlah dalam IDR |
| `currency` | `"IDR"` | Selalu IDR |
| `paymentMethod` | `"QRIS" \| "VIRTUAL_ACCOUNT" \| "EWALLET" \| "DIRECT_DEBIT" \| "CREDIT_CARD"` | Metode pembayaran |
| `paymentChannel` | `string?` | Channel spesifik (e.g., "BCA", "OVO") |
| `status` | `"PENDING" \| "SUCCEEDED" \| "FAILED" \| "EXPIRED" \| "REFUNDED"` | Status pembayaran |
| `paymentType` | `"credit_topup" \| "paper_completion" \| "subscription_initial" \| "subscription_renewal"` | Tipe pembayaran |
| `packageType` | `"paper" \| "extension_s" \| "extension_m"?` | Paket kredit (untuk credit_topup) |
| `credits` | `number?` | Jumlah kredit (300, 50, atau 100) |
| `subscriptionPeriodStart` | `number?` | Awal periode subscription |
| `subscriptionPeriodEnd` | `number?` | Akhir periode subscription |
| `description` | `string?` | Deskripsi transaksi |
| `metadata` | `any?` | Extra data dari Xendit |
| `createdAt` | `number` | Timestamp pembuatan |
| `paidAt` | `number?` | Timestamp pembayaran sukses |
| `expiredAt` | `number?` | Timestamp kedaluwarsa |
| `idempotencyKey` | `string` | Key untuk mencegah pemrosesan duplikat |

**Indexes**: `by_user`, `by_xendit_id`, `by_reference`, `by_status`, `by_user_type`

### `subscriptions`

Record subscription untuk Pro tier.

| Field | Type | Deskripsi |
|-------|------|-----------|
| `userId` | `Id<"users">` | User pemilik subscription |
| `xenditRecurringId` | `string?` | ID recurring plan Xendit |
| `xenditCustomerId` | `string?` | ID customer Xendit |
| `planType` | `"pro_monthly" \| "pro_yearly"` | Tipe plan |
| `priceIDR` | `number` | Harga (200.000 monthly, 2.000.000 yearly) |
| `status` | `"active" \| "canceled" \| "past_due" \| "expired"` | Status subscription |
| `currentPeriodStart` | `number` | Awal periode saat ini |
| `currentPeriodEnd` | `number` | Akhir periode saat ini |
| `nextBillingDate` | `number?` | Tanggal tagihan berikutnya |
| `canceledAt` | `number?` | Timestamp pembatalan |
| `cancelReason` | `string?` | Alasan pembatalan |
| `cancelAtPeriodEnd` | `boolean?` | Cancel di akhir periode (bukan immediate) |
| `trialEnd` | `number?` | Akhir trial (jika ada) |
| `createdAt` | `number` | Timestamp pembuatan |
| `updatedAt` | `number` | Timestamp update terakhir |

**Indexes**: `by_user`, `by_status`, `by_xendit_recurring`

---

## 10. Key Files Reference

| File | Tanggung Jawab |
|------|---------------|
| `src/lib/billing/enforcement.ts` | Middleware enforcement: pre-flight check, post-operation recording, token estimation, HTTP 402 response |
| `src/lib/utils/subscription.ts` | `getEffectiveTier()` — Tier determination logic |
| `convex/billing/constants.ts` | Semua konstanta: tier limits, pricing, credit packages, multipliers, helper functions |
| `convex/billing/quotas.ts` | Quota CRUD: `checkQuota`, `deductQuota`, `getQuotaStatus`, `initializeQuota`, `incrementCompletedPapers` |
| `convex/billing/credits.ts` | Credit balance: `getCreditBalance`, `addCredits`, `deductCredits`, `checkCredits`, `getCreditHistory` |
| `convex/billing/usage.ts` | Usage events: `recordUsage`, `getUsageByPeriod`, `getMonthlyBreakdown`, `getTodayUsage`, `getSessionUsage`, `getUsageSummary` |
| `convex/billing/subscriptions.ts` | Subscription lifecycle: `createSubscription`, `cancelSubscription`, `renewSubscription`, `expireSubscription`, `markPastDue`, `reactivateSubscription`, `checkSubscriptionStatus` |
| `convex/billing/payments.ts` | Payment records: `createPayment`, `updatePaymentStatus`, `getPaymentHistory`, `watchPaymentStatus`, `checkIdempotency`, `getPaymentStats` |
| `src/app/api/payments/topup/route.ts` | API route untuk BPP credit top-up via Xendit |
| `src/app/api/payments/subscribe/route.ts` | **Belum diimplementasi** — API route untuk Pro subscription |
| `src/app/api/webhooks/xendit/route.ts` | Webhook handler untuk notifikasi pembayaran Xendit |
| `src/lib/xendit/client.ts` | Xendit API client: `createQRISPayment`, `createVAPayment`, `createOVOPayment`, `createGopayPayment` |
| `src/lib/email/sendPaymentEmail.ts` | Email sending: `sendPaymentSuccessEmail`, `sendPaymentFailedEmail` |
| `src/lib/email/templates/PaymentSuccessEmail.tsx` | Template email pembayaran sukses (React Email) |
| `src/app/(dashboard)/subscription/plans/page.tsx` | UI pemilihan paket + checkout inline |
| `src/app/(dashboard)/subscription/overview/page.tsx` | UI monitoring penggunaan dan saldo |
| `convex/schema.ts` | Schema definition untuk semua billing tables |

---

## 11. Tests

### `__tests__/billing-type-safety.test.ts`

Test unit untuk fungsi-fungsi pure billing:

- `getEffectiveTier("user", "bpp")` returns `"bpp"` — Memastikan mapping tier BPP benar
- `estimateTotalTokens("hello", "chat_message")` returns `4` — Memastikan multiplier 1.0 diterapkan
- `estimateTotalTokens("hello", "paper_generation")` returns `5` — Memastikan multiplier 1.5 diterapkan

Mock: `convex/nextjs` dan `convex/_generated/api` di-mock karena module-level dependency.

### `__tests__/billing-pro-card-ui.test.tsx`

Test komponen untuk Pro card checkout flow di Plans page:

- Render plan selection (monthly/yearly) saat Pro card CTA diklik
- Harga benar: Rp 200.000 (monthly) dan Rp 2.000.000 (yearly) + "Hemat 2 bulan"
- Render 3 metode pembayaran (QRIS, Virtual Account, E-Wallet)
- POST ke `/api/payments/subscribe` dengan payload yang benar (`planType: "pro_monthly"`, `paymentMethod: "qris"`)

Mock: `useCurrentUser`, `useQuery` (Convex), `next/navigation`, `next/link`, `next/image`, `qrcode.react`, `sonner`

---

## Catatan Implementasi

### Yang Sudah Lengkap
- Pre-flight quota check (`checkQuotaBeforeOperation`)
- Post-operation deduction (`recordUsageAfterOperation`)
- Credit system (addCredits, deductCredits, soft-block)
- BPP top-up payment flow (API route + Xendit + webhook + email)
- Quota management (daily reset, monthly period, overage tracking)
- Subscription lifecycle management (create, cancel, renew, expire, reactivate)
- Frontend plans page + overview page
- Payment status real-time tracking via Convex reactive query

### Yang Belum Diimplementasi
- `src/app/api/payments/subscribe/route.ts` — API route untuk Pro subscription checkout (frontend sudah memanggil endpoint ini, tapi route belum ada)
- Webhook handler untuk `recurring.cycle.succeeded` — stub, TODO reset monthly quota
- Webhook handler untuk `recurring.cycle.failed` — log only, TODO kirim email
- Webhook business logic untuk `paper_completion` payment type — log only
- Webhook business logic untuk `subscription_initial` / `subscription_renewal` — log only
