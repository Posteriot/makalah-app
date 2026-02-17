# Billing Tier Enforcement

Dokumentasi teknis single source of truth untuk sistem billing dan quota enforcement Makalah App.

**Prinsip utama:**

1. **Kredit ada = boleh pakai, kredit habis = blocked** — berlaku untuk SEMUA tier tanpa pengecualian
2. **Tidak ada daily limit** — semua tier `dailyTokens = Infinity`
3. **Tidak ada overage** — Pro juga hard-block, tapi bisa fallback ke credit balance

---

## 1. Overview

Sistem billing Makalah App mengontrol akses pengguna terhadap operasi AI berdasarkan tier langganan. Dua mekanisme utama:

1. **Pre-flight check** (`checkQuotaBeforeOperation`) — Memeriksa quota/kredit sebelum operasi AI dijalankan. Jika tidak cukup, return HTTP 402.
2. **Post-operation deduction** (`recordUsageAfterOperation`) — Mencatat penggunaan token dan mengurangi quota/kredit setelah operasi AI selesai.

Satuan universal: **kredit** (1 kredit = 1.000 tokens). Frontend selalu menampilkan kredit sebagai satuan utama, tokens sebagai satuan sekunder.

---

## 2. Tier System

### Tabel Tier

| Tier | Model Billing | Harga | Limit Bulanan | Daily | Paper/Bulan | Habis → |
|------|--------------|-------|---------------|-------|-------------|---------|
| **Gratis** | Quota (hard limit) | Rp 0 | 100.000 tokens (100 kredit) | Tanpa batas | 2 | Blocked → upgrade |
| **BPP** | Kredit prepaid | Rp 80.000 / 300 kredit | Unlimited | Unlimited | Unlimited | Blocked → top up |
| **Pro** | Quota + credit fallback | Rp 200.000/bulan | 5.000.000 tokens (5.000 kredit) | Tanpa batas | Unlimited | Cek credit balance → ada = pakai, nggak ada = blocked + top up |

Sumber: `TIER_LIMITS` di `convex/billing/constants.ts`

### Penjelasan Per Tier

**Gratis**
- Quota bulanan 100.000 tokens (100 kredit). Hard limit — langsung block saat habis.
- Paper limit: maks 2 paper per bulan.
- Aksi saat blocked: arahkan user ke upgrade (BPP/Pro).

**BPP (Bayar Per Paper)**
- Sistem kredit prepaid. Tidak ada limit bulanan maupun harian.
- User beli paket kredit (minimal 300 kredit / Rp 80.000).
- Aksi saat kredit habis: blocked, arahkan ke top up.
- Auto-upgrade: user dengan `subscriptionStatus = "free"` yang membeli kredit otomatis di-upgrade ke BPP.

**Pro**
- Quota bulanan 5.000.000 tokens (5.000 kredit). Hard limit (`hardLimit: true`, `overageAllowed: false`).
- Saat quota habis, sistem cek `creditBalances` — jika ada kredit sisa, operasi tetap diizinkan dan deduction dari credit balance.
- Jika credit balance juga habis, blocked. Arahkan ke top up kredit.
- Pro bisa beli paket kredit tambahan (Rp 80.000/300 kredit) sebagai cadangan.

### Tier Determination

```typescript
// src/lib/utils/subscription.ts
export function getEffectiveTier(role?, subscriptionStatus?): EffectiveTier
```

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

1. **Pre-flight** (`checkQuota` di `quotas.ts`): langsung return `{ allowed: true, tier: "pro", bypassed: true }`
2. **Post-operation** (`recordUsageAfterOperation` di `enforcement.ts`): usage tetap dicatat via `recordUsage`, tapi deduction di-skip. Return `{ deducted: false }`
3. **Quota deduction** (`deductQuota` di `quotas.ts`): jika dipanggil langsung, return `{ success: true, bypassed: true }`

---

## 3. Architecture

### Alur Enforcement

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  User Request    │────>│  Pre-flight Check     │────>│  AI Operation       │
│  (chat/paper)    │     │  checkQuotaBefore-    │     │  (streamText, etc.) │
│                  │     │  Operation()          │     │                     │
└─────────────────┘     └──────────────────────┘     └─────────┬───────────┘
                               │                               │
                          ┌────┴────┐                          │
                          │ allowed │                     ┌────▼────────────┐
                          │ = false │                     │  Post-operation  │
                          └────┬────┘                     │  recordUsageAfter│
                               │                          │  Operation()     │
                          ┌────▼────┐                     └────┬─────────────┘
                          │  402    │                          │
                          │Response │                     ┌────▼────────────┐
                          └─────────┘                     │  Deduct from    │
                                                          │  quota/credits  │
                                                          └─────────────────┘
```

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
                ├── BPP     → fetchMutation(deductCredits)  ← convex/billing/credits.ts
                ├── Pro     → cek quota remaining:
                │               ├── cukup  → fetchMutation(deductQuota)   ← convex/billing/quotas.ts
                │               └── habis  → fetchMutation(deductCredits) ← convex/billing/credits.ts
                └── Gratis  → fetchMutation(deductQuota)    ← convex/billing/quotas.ts
```

### Fungsi yang Dipanggil (Urutan)

1. `determineOperationType()` — Tentukan tipe operasi dari context
2. `estimateTotalTokens()` — Estimasi total token dari input text + multiplier
3. `checkQuotaBeforeOperation(userId, inputText, operationType, convexToken)` — Pre-flight check
4. Jika `allowed === false` → `createQuotaExceededResponse()` → return HTTP 402
5. Jika `allowed === true` → Jalankan operasi AI
6. `recordUsageAfterOperation(params)` — Post-operation: record + deduct

---

## 4. Pre-flight Check (`checkQuota`)

File: `convex/billing/quotas.ts`

### Urutan Pengecekan

```
1. Admin bypass?
   ├── Ya  → { allowed: true, bypassed: true }
   └── Tidak ↓

2. BPP (creditBased)?
   ├── Ya  → Cek creditBalances
   │         ├── Cukup   → { allowed: true, tier: "bpp" }
   │         └── Kurang  → { allowed: false, reason: "insufficient_credit", action: "topup" }
   └── Tidak ↓

3. Quota belum ada (needsInit)?
   ├── Ya  → { allowed: true, needsInit: true }
   └── Tidak ↓

4. Daily limit tercapai? (dailyUsed + estimated > dailyTokens)
   ├── Ya  → { allowed: false, reason: "daily_limit", action: "wait" }
   └── Tidak ↓
   CATATAN: Saat ini TIDAK PERNAH terjadi karena semua tier dailyTokens = Infinity

5. Monthly limit tercapai? (remainingTokens < estimatedTokens)
   ├── Pro  → Cek creditBalances
   │          ├── Kredit cukup   → { allowed: true, useCredits: true }
   │          └── Kredit kurang  → { allowed: false, reason: "monthly_limit", action: "topup" }
   ├── Gratis → { allowed: false, reason: "monthly_limit", action: "upgrade" }
   └── Cukup ↓

6. Paper limit (Gratis, operationType = "paper")?
   ├── completedPapers >= allottedPapers → { allowed: false, reason: "paper_limit", action: "upgrade" }
   └── Tidak ↓

7. Pass → { allowed: true, remainingTokens, dailyRemaining }
```

### Token Estimation

```typescript
// src/lib/billing/enforcement.ts

const CHARS_PER_TOKEN = 3  // ~3 karakter = 1 token (Indonesian)

function estimateTotalTokens(inputText, operationType): number {
  const inputTokens = Math.ceil(inputText.length / CHARS_PER_TOKEN)
  const multiplier = OPERATION_COST_MULTIPLIERS[operationType] ?? 1.0
  return Math.ceil(inputTokens * (1 + multiplier))
}
```

### Determinasi Tipe Operasi

```typescript
// src/lib/billing/enforcement.ts

function determineOperationType(params): OperationType {
  if (params.isRefrasa) return "refrasa"
  if (params.enableWebSearch) return "web_search"
  if (params.paperSessionId) return "paper_generation"
  return "chat_message"
}
```

Prioritas: `refrasa` > `web_search` > `paper_generation` > `chat_message`

---

## 5. Post-operation Deduction (`recordUsageAfterOperation`)

File: `src/lib/billing/enforcement.ts`

### Alur Per Tier

**Semua Tier:**
1. Record usage event via `fetchMutation(recordUsage)` — selalu jalan, termasuk admin

**Admin/Superadmin:**
2. Skip deduction. Return `{ deducted: false }`

**BPP:**
2. `fetchMutation(deductCredits)` — kurangi kredit dari `creditBalances`
3. Jika `Insufficient credits` → soft-block (catch error, response tetap selesai, UI tampilkan status)

**Pro:**
2. `fetchQuery(getUserQuota)` — cek `remainingTokens`
3. Jika quota masih cukup → `fetchMutation(deductQuota)` — kurangi dari quota
4. Jika quota habis → `fetchMutation(deductCredits)` — kurangi dari credit balance (fallback)
5. Jika credit juga habis → soft-block (catch error, response tetap selesai)

**Gratis:**
2. `fetchMutation(deductQuota)` — kurangi dari quota

### Deduct Quota (`convex/billing/quotas.ts`)

- Admin bypass → `{ success: true, bypassed: true }`
- Auto-create quota jika belum ada atau periode baru
- Handle daily reset jika hari berganti
- Update: `usedTokens += tokens`, `remainingTokens = max(0, allotted - used)`, `dailyUsedTokens += tokens`
- Track overage tokens untuk analytics (tapi TIDAK digunakan untuk billing — semua tier hard-block)

### Deduct Credits (`convex/billing/credits.ts`)

- Konversi token ke kredit via `tokensToCredits(tokens)` = `Math.ceil(tokens / 1000)`
- Cek `remainingCredits >= creditsToDeduct` → jika tidak cukup, throw `"Insufficient credits"`
- Update: `usedCredits += deducted`, `remainingCredits -= deducted`, `totalSpentCredits += deducted`
- Jika `sessionId` disertakan → update paper session credit tracking (`creditUsed`, `creditRemaining`, `isSoftBlocked`)

### Soft-Block Behavior

Ketika user kehabisan kredit saat operasi AI sedang berjalan:
- Error `"Insufficient credits"` di-catch (tidak di-throw ulang)
- Response TIDAK di-interrupt — user tetap mendapat respons
- Console log: `[Billing] Soft-block triggered`
- Operasi berikutnya akan di-block oleh pre-flight check

---

## 6. Credit System

### Konversi

```
1 kredit = 1.000 tokens
```

Konstanta: `TOKENS_PER_CREDIT = 1_000` di `convex/billing/constants.ts`

Fungsi:
- `tokensToCredits(tokens)` → `Math.ceil(tokens / 1_000)` (pembulatan ke atas)
- `creditsToTokens(credits)` → `credits * 1_000`

### Paket Kredit

| Type | Kredit | Tokens | Harga (IDR) | Label | Deskripsi | Rate/Kredit |
|------|--------|--------|-------------|-------|-----------|-------------|
| `paper` | 300 | 300.000 | 80.000 | Paket Paper | 1 paper lengkap (~15h) | Rp 267 |
| `extension_s` | 50 | 50.000 | 25.000 | Extension S | Revisi ringan | Rp 500 |
| `extension_m` | 100 | 100.000 | 50.000 | Extension M | Revisi berat | Rp 500 |

Sumber: `CREDIT_PACKAGES` di `convex/billing/constants.ts`

### Pro Credit Fallback

Pro user bisa membeli paket kredit yang sama (Rp 80.000/300 kredit) sebagai cadangan. Saat monthly quota habis:
1. Pre-flight check (`checkQuota`) mendeteksi `remainingTokens < estimatedTokens`
2. Karena tier `pro` → cek `creditBalances`
3. Jika kredit cukup → return `{ allowed: true, useCredits: true }`
4. Post-operation → `deductCredits` (bukan `deductQuota`)

### `addCredits` — Setelah Pembayaran Sukses

- Auto-create `creditBalances` record jika belum ada
- Update: `totalCredits += credits`, `remainingCredits += credits`, `totalPurchasedCredits += credits`
- **Auto-upgrade**: Jika `subscriptionStatus === "free"`, otomatis upgrade ke `"bpp"`

---

## 7. Constants & Configuration

### `TIER_LIMITS`

```typescript
// convex/billing/constants.ts

gratis: {
  monthlyTokens: 100_000,     // 100 kredit
  dailyTokens: Infinity,       // Tanpa batas harian
  monthlyPapers: 2,
  hardLimit: true,              // Block saat habis
  overageAllowed: false,
  creditBased: false,
}

bpp: {
  monthlyTokens: Infinity,     // Tidak ada limit bulanan
  dailyTokens: Infinity,
  monthlyPapers: Infinity,
  hardLimit: false,
  overageAllowed: false,
  creditBased: true,            // Pakai sistem kredit
}

pro: {
  monthlyTokens: 5_000_000,   // 5.000 kredit
  dailyTokens: Infinity,       // Tanpa batas harian
  monthlyPapers: Infinity,
  hardLimit: true,              // Block saat habis (fallback ke credit)
  overageAllowed: false,        // Tidak ada overage
  creditBased: false,
}
```

### Operation Cost Multipliers

```typescript
// convex/billing/constants.ts → OPERATION_COST_MULTIPLIERS

chat_message:     1.0   // Base rate
paper_generation: 1.5   // Paper cenderung pakai lebih banyak
web_search:       2.0   // Search results masuk ke context
refrasa:          0.8   // Refrasa biasanya lebih pendek
```

Formula: `totalEstimated = inputTokens × (1 + multiplier)`

Contoh: Input "selamat pagi" (12 chars), operasi `web_search`:
- `inputTokens = ceil(12/3) = 4`
- `totalEstimated = ceil(4 × (1 + 2.0)) = 12`

### Subscription Pricing

```typescript
pro_monthly: Rp 200.000/bulan
pro_yearly:  Rp 2.000.000/tahun (hemat 2 bulan)
```

### Quota Warning Thresholds

```typescript
// convex/billing/constants.ts → QUOTA_WARNING_THRESHOLDS

warning:  20%   // Sisa 20% → warning
critical: 10%   // Sisa 10% → critical
blocked:   0%   // Habis → blocked
```

BPP (kredit) menggunakan threshold absolut (saldo paket awal tetap 300 kredit):
- `< 100 kredit tersisa` → `"warning"`
- `< 30 kredit tersisa` → `"critical"`

### Token Cost Tracking

```typescript
TOKEN_PRICE_PER_1K_IDR = 22.4
// Berdasarkan Gemini 2.5 Flash blended average (50:50 input/output)
// Dipakai untuk cost estimation di usageEvents, bukan untuk billing
```

### Periode Billing (Anniversary-Based)

Periode dihitung dari tanggal signup user, bukan awal bulan kalender.

```
User signup: 15 Januari
Period 1: 15 Jan → 15 Feb
Period 2: 15 Feb → 15 Mar
...
```

Fungsi: `getPeriodBoundaries(referenceDate, currentDate)` di `convex/billing/constants.ts`

---

## 8. Frontend Integration

### `getQuotaStatus` Return Shapes

Query ini mengembalikan 4 bentuk data berbeda tergantung kondisi user:

**1. Admin:**
```typescript
{ tier: "pro", unlimited: true, percentageUsed: 0, warningLevel: "none" }
```

**2. BPP:**
```typescript
{ tier: "bpp", creditBased: true, currentCredits: 250, totalCredits: 300, usedCredits: 50, warningLevel: "none" }
```

**3. Quota belum dibuat (needsInit):**
```typescript
{ tier: "gratis", needsInit: true, percentageUsed: 0, warningLevel: "none" }
```

**4. Normal (Gratis/Pro):**
```typescript
{
  tier: "gratis",
  percentageUsed: 45,
  percentageRemaining: 55,
  usedTokens: 45000,
  allottedTokens: 100000,
  remainingTokens: 55000,
  dailyUsedTokens: 12000,
  dailyLimit: Infinity,
  completedPapers: 1,
  allottedPapers: 2,
  periodEnd: 1707984000000,
  warningLevel: "none",
  overageTokens: 0,
  overageCostIDR: 0,
}
```

### Overview Page (`/subscription/overview`)

File: `src/app/(dashboard)/subscription/overview/page.tsx`

Tier-aware overview dengan card yang berbeda per kondisi:

| Kondisi | Card Kanan | Usage Section |
|---------|-----------|---------------|
| Gratis/Pro | "Kuota Bulanan: X kredit" + "Reset: tanggal" | Progress bar + kredit used/total |
| BPP | "Saldo Credit: X kredit" + Top Up button | Detail credit (tersisa/terpakai/total dibeli) |
| Admin | "Akses: Unlimited" | "Unlimited" tanpa progress bar |
| Blocked (Gratis) | - | "Upgrade ke Pro atau top up credit" + CTA |
| Blocked (Pro) | - | "Top up credit untuk melanjutkan" + Top Up button |

Semua tier mendapat **Breakdown Penggunaan** — tabel per tipe operasi (Chat, Paper, Web Search, Refrasa) dengan kolom kredit, tokens, dan estimasi biaya IDR.

### CreditMeter Hook (`useCreditMeter`)

File: `src/lib/hooks/useCreditMeter.ts`

Hook universal yang menormalisasi data dari 3 Convex query ke format kredit yang seragam.

**Subscribe ke:**
- `api.billing.quotas.getQuotaStatus` — semua tier
- `api.billing.credits.getCreditBalance` — BPP saja
- `api.billing.subscriptions.checkSubscriptionStatus` — Pro saja

**Return:**
```typescript
{
  tier: EffectiveTier,
  used: number,       // kredit terpakai
  total: number,      // total kredit (Infinity untuk BPP/Admin)
  remaining: number,  // sisa kredit
  percentage: number, // persen terpakai (NaN untuk BPP)
  level: "normal" | "warning" | "critical" | "depleted",
  overage?: number,   // kredit overage (untuk analytics)
  overageCost?: number,
  periodEnd?: number,
  cancelAtPeriodEnd?: boolean,
  isLoading: boolean,
  isAdmin: boolean,
}
```

Untuk Gratis/Pro, hook menggunakan `TIER_LIMITS` sebagai fallback saat quota belum diinisialisasi (`needsInit`).

### Admin Management

File: `convex/adminUserManagement.ts`

**`updateSubscriptionTier` mutation:**
- Admin/superadmin bisa mengubah tier user biasa via User Management page
- Tidak bisa mengubah tier admin/superadmin (mereka selalu unlimited via `getEffectiveTier`)
- Parameter: `targetUserId`, `newTier` (`"free"` | `"bpp"` | `"pro"`)
- Diakses via clickable tier badge di `src/components/admin/UserList.tsx`

---

## 9. Key Files Reference

| File | Tanggung Jawab |
|------|---------------|
| `convex/billing/constants.ts` | Semua konstanta: `TIER_LIMITS`, `TOKENS_PER_CREDIT`, `CREDIT_PACKAGES`, `OPERATION_COST_MULTIPLIERS`, `QUOTA_WARNING_THRESHOLDS`, helper functions |
| `convex/billing/quotas.ts` | Quota CRUD: `checkQuota` (pre-flight), `deductQuota` (post-op), `getQuotaStatus` (UI), `initializeQuota`, `incrementCompletedPapers` |
| `convex/billing/credits.ts` | Credit balance: `getCreditBalance`, `addCredits`, `deductCredits`, `checkCredits`, `initializeCreditBalance`, `getCreditHistory` |
| `convex/billing/usage.ts` | Usage events: `recordUsage`, `getMonthlyBreakdown`, `getTodayUsage`, `getUsageSummary` |
| `convex/billing/payments.ts` | Payment records: `createPayment`, `updatePaymentStatus`, `watchPaymentStatus`, `checkIdempotency` |
| `convex/billing/subscriptions.ts` | Subscription lifecycle: `createSubscription`, `cancelSubscription`, `renewSubscription`, `checkSubscriptionStatus` |
| `src/lib/billing/enforcement.ts` | Middleware: `checkQuotaBeforeOperation`, `recordUsageAfterOperation`, `createQuotaExceededResponse`, `estimateTotalTokens`, `determineOperationType` |
| `src/lib/utils/subscription.ts` | `getEffectiveTier()` — tier determination logic |
| `src/lib/hooks/useCreditMeter.ts` | Universal credit meter hook untuk semua tier |
| `src/app/(dashboard)/subscription/overview/page.tsx` | UI monitoring penggunaan — tier-aware cards + breakdown tabel |
| `convex/adminUserManagement.ts` | `updateSubscriptionTier` — admin ubah tier user |
| `src/components/admin/UserList.tsx` | UI clickable tier badge untuk admin management |
