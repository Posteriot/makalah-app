# Subscription Tier: Data Model

## Database Schema

### `users` table (`convex/schema.ts`)

Field `subscriptionStatus` menyimpan tier subscription user sebagai string.

| Field | Type | Description |
|-------|------|-------------|
| `subscriptionStatus` | `v.string()` | Raw tier value dari database |
| `role` | `v.string()` | User role: `"user"`, `"admin"`, `"superadmin"` |

**Type definition** (`convex/users.ts` line 6):
```typescript
export type SubscriptionStatus = "free" | "pro" | "canceled"
// NOTE: "bpp" belum ada di type definition tapi digunakan di runtime
```

### Possible Values `subscriptionStatus`

| Value | Display | Warna | Kapan Di-set |
|-------|---------|-------|--------------|
| `"free"` | GRATIS | Emerald-600 | Default saat user dibuat (`convex/users.ts:77`) |
| `"bpp"` | BPP | Sky-600 | Auto-upgrade saat beli credit pertama (`convex/billing/credits.ts:136-140`) |
| `"pro"` | PRO | Amber-500 | Saat subscribe Pro (`convex/billing/subscriptions.ts:59`) |
| `"canceled"` | — | — | Legacy, ada di type definition tapi tidak aktif digunakan |

**Default untuk semua user baru (termasuk admin/superadmin)**: `"free"`

---

## Subscription Flow

### User Creation
```
Clerk webhook → convex/users.ts:createUserFromWebhook()
  → subscriptionStatus: "free"
  → role: "superadmin" (hardcoded email) | "user" (default)
```

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

---

## Critical: Role vs subscriptionStatus

**Admin/superadmin users memiliki `subscriptionStatus: "free"` di database**, karena tidak ada logic yang auto-update field ini berdasarkan role. Namun secara bisnis, admin/superadmin diperlakukan sebagai PRO (unlimited access).

Ini berarti: **membaca `subscriptionStatus` saja TIDAK CUKUP** untuk menentukan tier efektif user. Harus selalu cek `role` terlebih dahulu.

Lihat `tier-determination-logic.md` untuk detail pattern yang benar dan audit inkonsistensi.
