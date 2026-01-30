# Bayar Per Paper (BPP) – Implementasi Pembayaran & Kredit (UPDATE)

> **Status:** Draft untuk implementasi
> **Source of Truth:** `docs/tokens/kalkulasi-gemini-tokens.md`, `docs/tokens/kalkulasi-fallback-gpt51.md`
> **Replaces:** `docs/pricing/bayar-per-paper.md`

---

## Ringkasan

Dokumen ini menjelaskan implementasi BPP yang **compliant** dengan sistem kredit:
- User membeli **Paket Paper** (300 kredit = Rp 80.000) atau **Extension** (50/100 kredit)
- Status pembayaran dipantau real-time via Convex subscription **di Plans Hub**
- Kredit berkurang seiring pemakaian AI (1 kredit = 1.000 tokens)
- Soft-block saat kredit habis, user beli Extension untuk lanjut
- Sisa kredit rollover ke paper berikutnya
- **Legacy:** `topupOptions` tetap dipertahankan sementara (deprecated) untuk transisi, `creditPackages` menjadi field utama.

---

## Konsep Kredit

### Konversi

| Unit | Nilai |
|------|-------|
| 1 kredit | 1.000 tokens |
| 1 paper | 300 kredit (soft cap) |
| 300 kredit | 300.000 tokens |

### Terminologi UI

| Internal | User-Facing |
|----------|-------------|
| tokens | kredit |
| soft cap | batas kredit paper |
| soft block | kredit habis |
| topup | tambah kredit |
| extension | perpanjangan |

---

## Struktur Paket

### Paket Utama

| Paket | Kredit | Tokens | Harga | Rate/kredit | Use Case |
|-------|--------|--------|-------|-------------|----------|
| **Paper** | 300 | 300.000 | Rp 80.000 | Rp 267 | Mulai paper baru |

### Paket Extension

| Paket | Kredit | Tokens | Harga | Rate/kredit | Use Case |
|-------|--------|--------|-------|-------------|----------|
| **Extension S** | 50 | 50.000 | Rp 25.000 | Rp 500 | Revisi ringan |
| **Extension M** | 100 | 100.000 | Rp 50.000 | Rp 500 | Revisi berat |

### Catatan Pricing

- Paket Paper memiliki rate terbaik (Rp 267/kredit)
- Paket Extension memiliki premium ~87% (Rp 500/kredit)
- Premium mendorong pengguna membeli paket Paper dari awal
- Extension sebagai "convenience fee" untuk fleksibilitas

---

## Detail per File/Fitur/Komponen

### `convex/billing/constants.ts`

**Peran:** Sumber konstanta billing untuk BPP.

**Perubahan yang Diperlukan:**
```typescript
// ════════════════════════════════════════════════════════════════
// Credit System (1 kredit = 1.000 tokens)
// ════════════════════════════════════════════════════════════════

export const TOKENS_PER_CREDIT = 1_000
export const PAPER_CREDITS = 300
export const PAPER_TOKENS = 300_000  // 300 kredit × 1.000 tokens
export const PAPER_PRICE_IDR = 80_000

// Paket pricing
export const CREDIT_PACKAGES = [
  { type: "paper", credits: 300, tokens: 300_000, priceIDR: 80_000, label: "Paket Paper" },
  { type: "extension_s", credits: 50, tokens: 50_000, priceIDR: 25_000, label: "Extension S" },
  { type: "extension_m", credits: 100, tokens: 100_000, priceIDR: 50_000, label: "Extension M" },
] as const

// Helper functions
export function tokensToCredits(tokens: number): number {
  return Math.ceil(tokens / TOKENS_PER_CREDIT)
}

export function creditsToTokens(credits: number): number {
  return credits * TOKENS_PER_CREDIT
}

// ════════════════════════════════════════════════════════════════
// DEPRECATED - Keep for backward compatibility
// ════════════════════════════════════════════════════════════════

/** @deprecated Use TOKENS_PER_CREDIT instead */
export const TOKENS_PER_IDR = 10

/** @deprecated Use PAPER_TOKENS instead */
export const BPP_PAPER_TOKENS_ESTIMATE = 800_000

// PENTING: TOKEN_PRICE_PER_1K_IDR harus TETAP ADA
// Dipakai oleh calculateCostIDR() di file ini
// Dan calculateCostIDR() dipakai oleh usage.ts untuk cost tracking
//
// Nilai ini adalah ESTIMASI biaya PRIMARY (Gemini 2.5 Flash):
// Input: Rp 4,80/1K tokens, Output: Rp 40,00/1K tokens
// Blended average (50:50) = Rp 22,40/1K tokens
// Catatan: fallback (GPT-5.1) lebih mahal, tidak dihitung di sini
export const TOKEN_PRICE_PER_1K_IDR = 22.40

export function calculateCostIDR(totalTokens: number): number {
  return Math.ceil((totalTokens / 1000) * TOKEN_PRICE_PER_1K_IDR)
}
```

**Dependensi:** Tidak ada.

**PENTING:** `TOKEN_PRICE_PER_1K_IDR` dan `calculateCostIDR` TIDAK BOLEH dihapus karena dipakai oleh `usage.ts` untuk cost tracking di `usageEvents` table.

---

### `convex/schema.ts`

**Peran:** Mendefinisikan field yang dibutuhkan BPP di database.

**Perubahan yang Diperlukan pada `pricingPlans`:**
```typescript
// Tambahkan creditPackages (topupOptions tetap ada tapi deprecated)
creditPackages: v.optional(v.array(v.object({
  type: v.union(v.literal("paper"), v.literal("extension_s"), v.literal("extension_m")),
  credits: v.number(),      // 300, 50, atau 100
  tokens: v.number(),       // 300000, 50000, atau 100000
  priceIDR: v.number(),     // 80000, 25000, atau 50000
  label: v.string(),
  description: v.optional(v.string()), // "Revisi ringan", "Revisi berat"
  ratePerCredit: v.optional(v.number()), // Rp/kredit (267 atau 500)
  popular: v.optional(v.boolean()),
}))),
```

**Perubahan yang Diperlukan pada `creditBalances`:**
```typescript
creditBalances: defineTable({
  userId: v.id("users"),

  // Kredit tracking (bukan IDR)
  totalCredits: v.number(),      // Total kredit yang dibeli
  usedCredits: v.number(),       // Kredit yang sudah terpakai
  remainingCredits: v.number(),  // Sisa kredit (computed)

  // Lifetime stats
  totalPurchasedCredits: v.number(),
  totalSpentCredits: v.number(),

  // Last purchase reference
  lastPurchaseAt: v.optional(v.number()),
  lastPurchaseType: v.optional(v.string()),
  lastPurchaseCredits: v.optional(v.number()),

  createdAt: v.number(),
  updatedAt: v.number(),
})
```

**Perubahan yang Diperlukan pada `paperSessions`:**
```typescript
// Tambahkan field untuk soft cap tracking
creditAllotted: v.optional(v.number()),    // Kredit yang dialokasikan (300 untuk Paper)
creditUsed: v.optional(v.number()),        // Kredit yang sudah terpakai di session ini
creditRemaining: v.optional(v.number()),   // Sisa kredit session (computed)
isSoftBlocked: v.optional(v.boolean()),    // True jika kredit habis
softBlockedAt: v.optional(v.number()),     // Timestamp saat soft-blocked
```

**Catatan:** `payments.status` tetap mendukung `PENDING/SUCCEEDED/FAILED/EXPIRED/REFUNDED`.

---

### `convex/migrations/seedPricingPlans.ts`

**Peran:** Mengaktifkan BPP di database dan mengisi `creditPackages`.

**Perubahan pada `activateCreditPackages`:**
```typescript
// Tambahkan creditPackages untuk plan BPP
const creditPackages = [
  { type: "paper", credits: 300, tokens: 300_000, priceIDR: 80_000, label: "Paket Paper", description: "1 paper lengkap (~15 halaman)", ratePerCredit: 267, popular: true },
  { type: "extension_s", credits: 50, tokens: 50_000, priceIDR: 25_000, label: "Extension S", description: "Revisi ringan", ratePerCredit: 500 },
  { type: "extension_m", credits: 100, tokens: 100_000, priceIDR: 50_000, label: "Extension M", description: "Revisi berat", ratePerCredit: 500 },
]

await db.patch(bppPlan._id, {
  creditPackages,
  ctaText: "Beli Paket Paper",
  updatedAt: now,
})
```

**Dependensi:** `CREDIT_PACKAGES` dari `convex/billing/constants.ts`.

---

### `convex/pricingPlans.ts`

**Peran:** Sumber opsi paket kredit BPP untuk UI.

**Perubahan - Tambahkan `getCreditPackagesForPlan` (getTopupOptionsForPlan tetap ada tapi deprecated):**
```typescript
export const getCreditPackagesForPlan = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("pricingPlans")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()

    if (!plan) {
      return {
        planExists: false,
        // Fallback to constants (mapping for UI needs: popular, description, ratePerCredit)
        creditPackages: CREDIT_PACKAGES,
      }
    }

    if (plan.creditPackages && plan.creditPackages.length > 0) {
      return {
        planExists: true,
        creditPackages: plan.creditPackages,
      }
    }

    return {
      planExists: true,
      // Fallback to constants (mapping for UI needs: popular, description, ratePerCredit)
      creditPackages: CREDIT_PACKAGES,
    }
  },
})
```

**Dependensi:** `CREDIT_PACKAGES` dari constants.

---

### `src/app/(dashboard)/subscription/plans/page.tsx`

**Peran:** Plans Hub dengan inline payment BPP (expandable card).

**Perubahan UI yang Diperlukan:**

1. **Ganti "Top Up Saldo" dengan "Beli Paket"**
2. **Tampilkan 3 paket:** Paper (Rp 80K), Extension S (Rp 25K), Extension M (Rp 50K)
3. **Display dalam kredit, bukan tokens:**
   - "300 kredit" bukan "300.000 tokens"
   - "Estimasi: 1 paper lengkap"
4. **Highlight Paket Paper** sebagai opsi utama
5. **Extension hanya muncul** jika user sudah punya kredit atau dalam soft-block

**Dependensi:** `useQuery` (Convex), `qrcode.react`, `sonner`.

---

### `src/app/(dashboard)/subscription/topup/page.tsx`

**Peran:** Halaman pembelian paket kredit (rename dari "topup").

**Perubahan:**
- Rename menjadi `/subscription/buy-credits` atau tetap `/subscription/topup`
- Tampilkan pilihan paket (Paper/Extension S/Extension M)
- Display kredit, bukan tokens
- **Catatan:** Halaman ini belum ada realtime subscription pembayaran (berbeda dengan Plans Hub)

---

### `src/app/api/payments/topup/route.ts`

**Peran:** Endpoint pembuatan payment request.

**Perubahan Validasi:**
```typescript
import { isValidPackageType, getPackageByType } from "@convex/billing/constants"

// Validasi berdasarkan package type, bukan amount
const { packageType } = body
if (!isValidPackageType(packageType)) {
  return NextResponse.json({ error: "Paket tidak valid" }, { status: 400 })
}

const pkg = getPackageByType(packageType)
if (!pkg) {
  return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 400 })
}

const { credits, priceIDR: amount, label: packageLabel } = pkg
```

**Response tambahan:**
```typescript
responseData = {
  ...responseData,
  amount,       // jumlah pembayaran (saat ini = priceIDR)
  packageType,
  credits,
  packageLabel,
}
```

**Dependensi:** `@clerk/nextjs/server`, `convex/nextjs`, `@/lib/xendit/client`.

---

### `convex/billing/payments.ts`

**Peran:** Penyimpanan dan subscription status pembayaran.

**Perubahan pada `createPayment`:**
```typescript
// Tambahkan field untuk tracking kredit
// NOTE: packageType & credits bersifat "conditional required"
// - WAJIB untuk paymentType = "credit_topup"
// - OPSIONAL untuk paymentType lainnya
packageType: v.union(
  v.literal("paper"),
  v.literal("extension_s"),
  v.literal("extension_m")
),
credits: v.number(),  // 300, 50, atau 100
```

**Catatan:** `watchPaymentStatus` tetap return `null` jika payment tidak ditemukan.

---

### `src/app/api/webhooks/xendit/route.ts`

**Peran:** Webhook handler status pembayaran Xendit.

**Perubahan pada `handlePaymentSuccess`:**
```typescript
case "credit_topup": {
  // Ambil credits dari payment record
  const creditsToAdd = payment.credits ?? 0  // 300, 50, atau 100
  const packageType = payment.packageType ?? "paper"

  if (creditsToAdd === 0) {
    console.warn(`[Xendit] Payment has no credits: ${data.id}`)
    break
  }

  const creditResult = await fetchMutation(api.billing.credits.addCredits, {
    userId: payment.userId,
    credits: creditsToAdd,
    packageType,
    paymentId: payment._id,
    internalKey,
  })

  console.log(`[Xendit] Credits added:`, {
    userId: payment.userId,
    credits: creditsToAdd,
    packageType,
    newBalance: creditResult.newTotalCredits,
  })
  break
}
```

**Catatan Email:** Email sukses membawa `credits` dan `newTotalCredits` untuk konfirmasi saldo.

**Dependensi:** `@/lib/xendit/client`, `convex/nextjs`, `@/lib/email/sendPaymentEmail`.

---

### `convex/billing/credits.ts`

**Peran:** Menambah dan memotong kredit untuk BPP.

**Perubahan Total - Ganti seluruh file:**
```typescript
import { v } from "convex/values"
import { mutation, query } from "../_generated/server"
import { TOKENS_PER_CREDIT } from "./constants"

// Get user's credit balance
export const getCreditBalance = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!balance) {
      return {
        totalCredits: 0,
        usedCredits: 0,
        remainingCredits: 0,
      }
    }

    return balance
  },
})

// Add credits after successful payment
export const addCredits = mutation({
  args: {
    userId: v.id("users"),
    credits: v.number(),  // 300, 50, atau 100
    packageType: v.string(),
    paymentId: v.optional(v.id("payments")),
    internalKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ... validation ...

    const now = Date.now()
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!balance) {
      // Create new balance
      await ctx.db.insert("creditBalances", {
        userId: args.userId,
        totalCredits: args.credits,
        usedCredits: 0,
        remainingCredits: args.credits,
        totalPurchasedCredits: args.credits,
        totalSpentCredits: 0,
        lastPurchaseAt: now,
        lastPurchaseType: args.packageType,
        lastPurchaseCredits: args.credits,
        createdAt: now,
        updatedAt: now,
      })
    } else {
      // Update existing
      await ctx.db.patch(balance._id, {
        totalCredits: balance.totalCredits + args.credits,
        remainingCredits: balance.remainingCredits + args.credits,
        totalPurchasedCredits: balance.totalPurchasedCredits + args.credits,
        lastPurchaseAt: now,
        lastPurchaseType: args.packageType,
        lastPurchaseCredits: args.credits,
        updatedAt: now,
      })
    }

    // Upgrade user to BPP tier if on free
    const user = await ctx.db.get(args.userId)
    if (user && user.subscriptionStatus === "free") {
      await ctx.db.patch(args.userId, {
        subscriptionStatus: "bpp",
        updatedAt: now,
      })
    }

    return { success: true, newTotalCredits: (balance?.totalCredits ?? 0) + args.credits }
  },
})

// Deduct credits after AI response
export const deductCredits = mutation({
  args: {
    userId: v.id("users"),
    tokensUsed: v.number(),
    sessionId: v.optional(v.id("paperSessions")),
  },
  handler: async (ctx, args) => {
    const creditsUsed = Math.ceil(args.tokensUsed / TOKENS_PER_CREDIT)

    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!balance || balance.remainingCredits < creditsUsed) {
      throw new Error(`Insufficient credits. Required: ${creditsUsed}, Available: ${balance?.remainingCredits ?? 0}`)
    }

    await ctx.db.patch(balance._id, {
      usedCredits: balance.usedCredits + creditsUsed,
      remainingCredits: balance.remainingCredits - creditsUsed,
      totalSpentCredits: balance.totalSpentCredits + creditsUsed,
      updatedAt: Date.now(),
    })

    // Update paper session if provided
    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId)
      if (session) {
        const newUsed = (session.creditUsed ?? 0) + creditsUsed
        const newRemaining = (session.creditAllotted ?? 300) - newUsed

        await ctx.db.patch(args.sessionId, {
          creditUsed: newUsed,
          creditRemaining: newRemaining,
          isSoftBlocked: newRemaining <= 0,
        })
      }
    }

    return {
      creditsDeducted: creditsUsed,
      tokensUsed: args.tokensUsed,
      remainingCredits: balance.remainingCredits - creditsUsed,
    }
  },
})
```

**Dependensi:** `TOKENS_PER_CREDIT` dari `convex/billing/constants.ts`.

---

### `convex/billing/quotas.ts`

**Peran:** Pre-flight quota check sebelum operasi AI.

**Perubahan pada `checkQuota` (lines 311-333):**

Saat ini kode BPP cek `balanceIDR`:
```typescript
// KODE LAMA (IDR-based) - HARUS DIGANTI
const estimatedCost = Math.ceil((args.estimatedTokens / 1000) * 3)
const currentBalance = balance?.balanceIDR ?? 0
```

**GANTI DENGAN (credit-based):**
```typescript
import { tokensToCredits } from "./constants"

// BPP: Check credit balance (bukan IDR)
if (limits.creditBased) {
  const balance = await ctx.db
    .query("creditBalances")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .first()

  const estimatedCredits = tokensToCredits(args.estimatedTokens)
  const currentCredits = balance?.remainingCredits ?? 0

  if (currentCredits < estimatedCredits) {
    return {
      allowed: false,
      reason: "insufficient_credit",
      message: `Kredit tidak cukup. Estimasi: ${estimatedCredits} kredit, saldo: ${currentCredits} kredit`,
      action: "topup",
      currentCredits,
      estimatedCredits,
    }
  }

  return { allowed: true, tier: "bpp", currentCredits }
}
```

**Dependensi:** `tokensToCredits` dari `./constants`.

---

### `src/lib/billing/enforcement.ts`

**Peran:** Enforcement billing saat operasi AI.

**Perubahan:**
```typescript
// Ganti tokensUsed ke credits conversion
if (tier === "bpp") {
  try {
    await fetchMutation(api.billing.credits.deductCredits, {
      userId: params.userId,
      tokensUsed: params.totalTokens,
      sessionId: params.sessionId,  // Untuk soft-block tracking
    }, convexOptions)
  } catch (error) {
    // Jika insufficient credits, trigger soft-block response
    // TODO: Implement helper `createSoftBlockResponse()` di enforcement.ts
    if (error.message.includes("Insufficient credits")) {
      // return createSoftBlockResponse(error)
    }
    console.warn("[Billing] Credit deduction failed:", error)
  }
}
```

**Dependensi:** `convex/nextjs`.

---

### `src/lib/email/sendPaymentEmail.ts`

**Peran:** Kirim email sukses/gagal pembayaran.

**Perubahan pada template:**
```typescript
// Ganti "saldo" dengan "kredit"
sendPaymentSuccessEmail({
  to: user.email,
  userName: user.firstName,
  credits: payment.credits,  // 300, 50, atau 100
  packageType: payment.packageType,
  priceIDR: payment.amount,
  newTotalCredits: creditResult.newTotalCredits,
  transactionId: data.id,
  paidAt: data.paid_at,
})
```

**Dependensi:** `resend`, `@react-email/components`.

---

## User Flow

### Happy Path - Beli Paket Paper

```
User beli Paket Paper (300 kredit = Rp 80.000)
                    │
                    ▼
User mulai menyusun paper (13 tahap)
    • Kredit berkurang seiring usage
    • UI: "Sisa kredit: 245 / 300"
                    │
                    ▼
Paper selesai dengan kredit tersisa ✓
    • Sisa kredit ROLLOVER ke paper berikutnya
    • User puas, dapat paper lengkap
```

### Soft Block Path

```
User beli Paket Paper (300 kredit = Rp 80.000)
                    │
                    ▼
User menyusun paper dengan banyak revisi
                    │
                    ▼
Kredit habis di tengah proses (misal stage 10)
                    │
                    ▼
SOFT BLOCK
    • UI: "Kredit habis. Tambah kredit untuk melanjutkan."
    • Tawarkan: Extension S (50kr/Rp 25rb) atau M (100kr/Rp 50rb)
                    │
                    ▼
User beli Extension
                    │
                    ▼
Lanjut paper → Selesai ✓
```

---

## UI Components Update

### Display Kredit di Chat

```
┌─────────────────────────────────────────┐
│ Kredit Paper                            │
│ ████████████░░░░░░░░ 245 / 300 kredit  │
│                                         │
│ Estimasi sisa: ~2-3 tahap lagi          │
└─────────────────────────────────────────┘
```

### Soft Block UI

```
┌─────────────────────────────────────────┐
│ ⚠️ Kredit Habis                         │
│                                         │
│ Paper Anda belum selesai dan kredit     │
│ sudah habis. Tambah kredit untuk        │
│ melanjutkan penyusunan.                 │
│                                         │
│ ┌─────────────┐  ┌─────────────┐       │
│ │ +50 kredit  │  │ +100 kredit │       │
│ │  Rp 25.000  │  │  Rp 50.000  │       │
│ └─────────────┘  └─────────────┘       │
│                                         │
│ [Tambah Kredit]                         │
└─────────────────────────────────────────┘
```

---

## Daftar File yang Perlu Diubah

| File | Scope Perubahan |
|------|-----------------|
| `convex/billing/constants.ts` | Tambah konstanta kredit, **KEEP** `TOKEN_PRICE_PER_1K_IDR` + `calculateCostIDR` |
| `convex/schema.ts` | Update `creditBalances`, tambah field di `paperSessions` |
| `convex/migrations/seedPricingPlans.ts` | Ganti `topupOptions` → `creditPackages` |
| `convex/pricingPlans.ts` | Ganti query `getTopupOptionsForPlan` |
| `convex/billing/payments.ts` | Tambah field `packageType`, `credits` |
| `convex/billing/credits.ts` | Full rewrite ke sistem kredit |
| `convex/billing/quotas.ts` | **Update `checkQuota` dari IDR ke kredit** |
| `src/app/api/payments/topup/route.ts` | Validasi paket, bukan amount |
| `src/app/api/webhooks/xendit/route.ts` | Handle credits bukan IDR |
| `src/lib/billing/enforcement.ts` | Token → credits conversion, soft-block |
| `src/app/(dashboard)/subscription/plans/page.tsx` | UI kredit, 3 paket |
| `src/app/(dashboard)/subscription/topup/page.tsx` | UI kredit, 3 paket |
| `src/lib/email/sendPaymentEmail.ts` | Template kredit |

---

## Referensi

- Kalkulasi Gemini: `docs/tokens/kalkulasi-gemini-tokens.md`
- Kalkulasi Fallback: `docs/tokens/kalkulasi-fallback-gpt51.md`
- Implementasi lama: `docs/pricing/bayar-per-paper.md`

---

## Changelog

| Tanggal | Perubahan |
|---------|-----------|
| 2026-01-30 | Update: tambah `quotas.ts`, perjelas `TOKEN_PRICE_PER_1K_IDR` harus tetap ada |
| 2026-01-30 | Initial draft - sistem kredit compliant dengan dok token |
