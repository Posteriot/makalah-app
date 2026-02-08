# Subscription Tier: Data Model

> Dokumen ini adalah referensi lengkap data model subscription tier Makalah App.
> Digunakan sebagai konteks oleh Claude Code saat bekerja pada fitur terkait billing/subscription.

---

## Core Concept: Raw DB Value vs Effective Tier

Ada **dua konsep berbeda** yang wajib dipahami:

| Konsep | Sumber | Values | Contoh |
|--------|--------|--------|--------|
| **Raw `subscriptionStatus`** | Field di `users` table | `"free"`, `"bpp"`, `"pro"`, `"canceled"` | Superadmin punya `"free"` |
| **Effective Tier** | Output dari `getEffectiveTier()` | `"gratis"`, `"bpp"`, `"pro"` | Superadmin jadi `"pro"` |

**Aturan emas:** UI dan logic **HARUS** selalu pakai Effective Tier, bukan raw DB value.

---

## Database Schema

### `users` table (`convex/schema.ts:57`)

| Field | Type | Description |
|-------|------|-------------|
| `subscriptionStatus` | `v.string()` | Raw tier value di database |
| `role` | `v.string()` | User role: `"user"`, `"admin"`, `"superadmin"` |

**Type definition** (`convex/users.ts:6`):
```typescript
export type SubscriptionStatus = "free" | "pro" | "canceled"
// CATATAN: "bpp" digunakan di runtime tapi belum ada di type definition ini
```

### Possible Values `subscriptionStatus`

| DB Value | Effective Tier | Display | Warna | Kapan Di-set |
|----------|---------------|---------|-------|--------------|
| `"free"` | `"gratis"` | GRATIS | Emerald-600 | Default saat user dibuat (`convex/users.ts:77`) |
| `"bpp"` | `"bpp"` | BPP | Sky-600 | Auto-upgrade saat beli credit pertama (`convex/billing/credits.ts:136-140`) |
| `"pro"` | `"pro"` | PRO | Amber-500 | Saat subscribe Pro (`convex/billing/subscriptions.ts:59`) atau saat promote ke admin (`convex/adminUserManagement.ts:54`) |
| `"canceled"` | `"gratis"` | GRATIS | Emerald-600 | Legacy, ada di type definition tapi tidak aktif digunakan |

**Default untuk semua user baru (termasuk superadmin via hardcoded email):** `"free"`

### EffectiveTier Type (`src/lib/utils/subscription.ts`)

```typescript
export type EffectiveTier = "gratis" | "bpp" | "pro"
```

Hanya 3 nilai. Tidak pernah `"free"` atau `"canceled"` — selalu di-normalize.

---

## Subscription Flow

### User Creation

```
Clerk webhook → convex/users.ts:createUserFromWebhook()
  → subscriptionStatus: "free"
  → role: "superadmin" (hardcoded email) | "user" (default)
```

**Implikasi penting:** Superadmin yang dibuat dari webhook memiliki `subscriptionStatus: "free"` karena tidak ada logic yang auto-set ke `"pro"`. Backend Convex mengompensasi ini dengan admin bypass di quota functions, tapi frontend harus pakai `getEffectiveTier()`.

### Tier Upgrades

```
free ──(beli credit)──→ bpp    (convex/billing/credits.ts:addCredits, line 136-140)
free ──(subscribe)───→ pro     (convex/billing/subscriptions.ts:createSubscription, line 59)
bpp  ──(subscribe)───→ pro     (convex/billing/subscriptions.ts:createSubscription, line 59)
```

### Tier Downgrades

```
pro ──(cancel immediate)──→ free   (convex/billing/subscriptions.ts:cancelSubscription, line 180-183)
pro ──(expired)───────────→ free   (convex/billing/subscriptions.ts:expireSubscription, line 215-219)
```

### Role Changes (Admin Panel)

```
user ──(promote to admin)──→ admin  + subscriptionStatus: "pro"
    (convex/adminUserManagement.ts:promoteToAdmin, line 52-54)

admin ──(demote to user)───→ user   (subscriptionStatus TIDAK di-reset)
    (convex/adminUserManagement.ts:demoteToUser, line 112-115)
```

**Edge case:** Demoted admin tetap punya `subscriptionStatus: "pro"`. Ini mungkin intentional (mereka masih punya subscription), tapi bisa misleading jika mereka belum pernah subscribe.

---

## Related Tables

### `subscriptions` (Pro recurring billing)

| Field | Description |
|-------|-------------|
| `status` | `"active"`, `"canceled"`, `"past_due"`, `"expired"` |
| `type` | `"pro_monthly"` (Rp 200K/month), `"pro_yearly"` (Rp 2M/year) |

### `creditBalances` (BPP prepaid credits)

| Field | Description |
|-------|-------------|
| `totalCredits` | Total credits purchased |
| `usedCredits` | Credits consumed |
| `remainingCredits` | Available balance |

1 credit = 1,000 tokens. Credit packages:
- Paper Package: 300 credits = Rp 80,000
- Extension S: 50 credits = Rp 25,000
- Extension M: 100 credits = Rp 50,000

### `userQuotas` (Gratis/Pro monthly quotas)

| Field | Description |
|-------|-------------|
| `allottedTokens` | Monthly allocation |
| `usedTokens` | Used this period |
| `remainingTokens` | Available this period |
| `dailyUsedTokens` | Used today (reset daily) |
| `overageTokens` | Pro-only: tokens beyond allotment |
| `overageCostIDR` | Pro-only: overage cost |

### `usageEvents` (Token tracking per operation)

| Field | Description |
|-------|-------------|
| `operationType` | `"chat_message"`, `"paper_generation"`, `"web_search"`, `"refrasa"` |
| `promptTokens` | Input tokens used |
| `completionTokens` | Output tokens used |
| `totalTokens` | Total tokens |

### `payments` (Xendit payment records)

| Field | Description |
|-------|-------------|
| `status` | `"PENDING"`, `"SUCCEEDED"`, `"FAILED"`, `"EXPIRED"`, `"REFUNDED"` |
| `type` | `"credit_topup"`, `"subscription_initial"`, `"subscription_renewal"` |

---

## Tier Limits (`convex/billing/constants.ts`)

| Tier | Monthly Tokens | Daily Tokens | Monthly Papers | Hard Limit | Credit-Based |
|------|---------------|-------------|----------------|------------|--------------|
| **gratis** | 100,000 | 50,000 | 2 | Yes (blocks) | No |
| **bpp** | Infinity | Infinity | Infinity | No (pay-as-go) | Yes |
| **pro** | 5,000,000 | 200,000 | Infinity | No (soft + overage) | No |

### Overage (Pro only)
Pro users yang melebihi 5M tokens/bulan dikenakan overage rate per token (soft limit, tidak block).

---

## Backend Admin Bypass (Convex)

Backend Convex **sudah benar** menangani admin bypass di 3 tempat di `quotas.ts`:

| Function | Line | Behavior |
|----------|------|----------|
| `deductQuota()` | 170-172 | `return { success: true, bypassed: true }` |
| `checkQuota()` | 304-306 | `return { allowed: true, tier: "pro" }` |
| `getQuotaStatus()` | 422-429 | `return { tier: "pro", unlimited: true }` |

**Namun**, tier determination di luar admin bypass (line 64, 105, 186, 309, 432) masih pakai raw pattern:
```typescript
const tier = (user.subscriptionStatus === "free" ? "gratis" : user.subscriptionStatus) as TierType
```

Ini **tidak bug** karena hanya dieksekusi setelah admin bypass, tapi menunjukkan inkonsistensi pattern. Convex backend belum bisa import `getEffectiveTier()` dari `src/lib/utils/` (berbeda runtime environment).

---

## Critical: Role vs subscriptionStatus

**Admin/superadmin users memiliki `subscriptionStatus: "free"` di database** (kecuali yang di-promote via admin panel, yang jadi `"pro"`). Secara bisnis, admin/superadmin diperlakukan sebagai PRO (unlimited access).

**Membaca `subscriptionStatus` saja TIDAK CUKUP** untuk menentukan tier efektif user. Semua frontend code harus pakai `getEffectiveTier(role, subscriptionStatus)`.

Lihat `tier-determination-logic.md` untuk detail implementasi dan status perbaikan.
