# Quota Warning Banner Offer Matrix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menyatukan matrix CTA quota/kredit di chat (banner + quota error overlay) agar sesuai tier (`gratis`, `bpp`, `pro`) dan selalu mengarah ke checkout/billing route yang benar-benar executable.

**Architecture:** Tambahkan policy resolver terpusat (`quota-offer-policy`) sebagai single source of truth untuk message dan CTA. Konsumen (`QuotaWarningBanner` dan `ChatWindow`) hanya menghitung state lokal lalu minta hasil dari resolver. Untuk 402 `quota_exceeded`, reason dipakai sebagai override agar CTA selalu tepat saat hard block.

**Tech Stack:** Next.js 16, React 19, TypeScript, Convex, AI SDK useChat, Vitest + Testing Library.

---

### Task 1: Baseline Matrix Tests (Policy belum ada)

**Files:**
- Create: `src/lib/billing/quota-offer-policy.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { resolveQuotaOffer } from "./quota-offer-policy"

describe("resolveQuotaOffer", () => {
  it("gratis depleted -> dua CTA checkout bpp + checkout pro", () => {
    const result = resolveQuotaOffer({
      tier: "gratis",
      context: "banner",
      visualState: "depleted",
    })

    expect(result.primaryCta.href).toBe("/checkout/bpp")
    expect(result.secondaryCta?.href).toBe("/checkout/pro")
  })

  it("pro depleted -> primary CTA checkout bpp (canonical topup pro)", () => {
    const result = resolveQuotaOffer({
      tier: "pro",
      context: "chat_error",
      visualState: "depleted",
      quotaReason: "monthly_limit",
    })

    expect(result.primaryCta.href).toBe("/checkout/bpp")
    expect(result.secondaryCta).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/billing/quota-offer-policy.test.ts`  
Expected: FAIL dengan error module/function belum ditemukan.

**Step 3: Commit red test**

```bash
git add src/lib/billing/quota-offer-policy.test.ts
git commit -m "test(billing): add failing matrix tests for quota offer policy"
```

### Task 2: Implement Policy Resolver (Single Source of Truth)

**Files:**
- Create: `src/lib/billing/quota-offer-policy.ts`
- Modify: `src/lib/billing/quota-offer-policy.test.ts`

**Step 1: Write minimal implementation**

```ts
import type { EffectiveTier } from "@/lib/utils/subscription"

export type QuotaVisualState = "warning" | "critical" | "depleted"
export type QuotaOfferContext = "banner" | "chat_error"
export type QuotaReason = "monthly_limit" | "insufficient_credit" | "paper_limit" | "daily_limit" | string

export interface QuotaOfferInput {
  tier: Exclude<EffectiveTier, "unlimited"> | "gratis"
  context: QuotaOfferContext
  visualState: QuotaVisualState
  quotaReason?: QuotaReason
}

export interface QuotaOfferResult {
  message: string
  primaryCta: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
}

const BLOCK_REASONS = new Set(["monthly_limit", "insufficient_credit", "paper_limit"])

function forceDepletedForChatError(input: QuotaOfferInput): QuotaVisualState {
  if (input.context !== "chat_error") return input.visualState
  if (!input.quotaReason) return input.visualState
  return BLOCK_REASONS.has(input.quotaReason) ? "depleted" : input.visualState
}

export function resolveQuotaOffer(input: QuotaOfferInput): QuotaOfferResult {
  const state = forceDepletedForChatError(input)
  const tier = input.tier === "unlimited" ? "gratis" : input.tier

  if (state === "depleted") {
    if (tier === "gratis") {
      return {
        message: "Kuota habis. Pilih beli kredit atau upgrade ke Pro untuk melanjutkan.",
        primaryCta: { label: "Beli Kredit", href: "/checkout/bpp" },
        secondaryCta: { label: "Upgrade ke Pro", href: "/checkout/pro" },
      }
    }
    if (tier === "bpp") {
      return {
        message: "Kredit habis. Beli kredit atau upgrade ke Pro untuk melanjutkan.",
        primaryCta: { label: "Beli Kredit", href: "/checkout/bpp" },
        secondaryCta: { label: "Upgrade ke Pro", href: "/checkout/pro" },
      }
    }
    return {
      message: "Kuota/kredit Pro tidak mencukupi. Beli kredit untuk melanjutkan.",
      primaryCta: { label: "Beli Kredit", href: "/checkout/bpp" },
    }
  }

  if (tier === "gratis") {
    return {
      message: "Kuota hampir habis. Lihat opsi paket agar proses tidak terhenti.",
      primaryCta: { label: "Lihat Opsi", href: "/subscription/overview" },
    }
  }

  return {
    message: "Kredit hampir habis. Beli kredit untuk menjaga kelancaran proses.",
    primaryCta: { label: "Beli Kredit", href: "/checkout/bpp" },
  }
}
```

**Step 2: Extend tests for full matrix coverage**

Tambahkan test untuk:
1. `bpp depleted` -> 2 CTA.
2. `gratis warning/critical` -> 1 CTA `/subscription/overview`.
3. `bpp/pro warning/critical` -> 1 CTA `/checkout/bpp`.
4. `chat_error` reason override -> paksa mode depleted.
5. Unknown reason fallback aman.

**Step 3: Run test to verify pass**

Run: `npm run test -- src/lib/billing/quota-offer-policy.test.ts`  
Expected: PASS.

**Step 4: Commit**

```bash
git add src/lib/billing/quota-offer-policy.ts src/lib/billing/quota-offer-policy.test.ts
git commit -m "feat(billing): add centralized quota offer policy resolver"
```

### Task 3: Integrate Policy into QuotaWarningBanner

**Files:**
- Modify: `src/components/chat/QuotaWarningBanner.tsx`
- Test: `src/components/chat/QuotaWarningBanner.test.tsx` (new)

**Step 1: Write failing banner test (CTA rendering)**

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { QuotaWarningBanner } from "./QuotaWarningBanner"

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: { _id: "u1", role: "user", subscriptionStatus: "free" },
    isLoading: false,
  }),
}))

vi.mock("convex/react", () => ({
  useQuery: () => ({ percentUsed: 100 }),
}))

describe("QuotaWarningBanner", () => {
  it("gratis depleted menampilkan dua CTA", () => {
    render(<QuotaWarningBanner />)
    expect(screen.getByRole("link", { name: "Beli Kredit" })).toHaveAttribute("href", "/checkout/bpp")
    expect(screen.getByRole("link", { name: "Upgrade ke Pro" })).toHaveAttribute("href", "/checkout/pro")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/chat/QuotaWarningBanner.test.tsx`  
Expected: FAIL karena komponen masih single CTA/hardcode.

**Step 3: Refactor component to policy-driven rendering**

Implementasi minimum:
1. Import `resolveQuotaOffer`.
2. Setelah menentukan `tier + bannerType`, panggil resolver.
3. Render `primaryCta` selalu.
4. Render `secondaryCta` jika ada.
5. Hapus hardcoded mapping CTA lama.
6. Tetap jaga style class yang sudah direstyling.

**Step 4: Run tests**

Run:
1. `npm run test -- src/components/chat/QuotaWarningBanner.test.tsx`
2. `npm run test -- src/lib/billing/quota-offer-policy.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/chat/QuotaWarningBanner.tsx src/components/chat/QuotaWarningBanner.test.tsx
git commit -m "refactor(chat): make QuotaWarningBanner use centralized quota offer policy"
```

### Task 4: Integrate Policy into ChatWindow Quota Error Overlay

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`
- Create: `src/components/chat/chat-quota-error.ts`
- Create: `src/components/chat/chat-quota-error.test.ts`

**Step 1: Add failing test for error payload -> offer mapping**

```ts
import { describe, expect, it } from "vitest"
import { buildChatQuotaOfferFromError } from "./chat-quota-error"

describe("buildChatQuotaOfferFromError", () => {
  it("quota_exceeded monthly_limit for pro -> checkout bpp", () => {
    const err = new Error(JSON.stringify({ error: "quota_exceeded", reason: "monthly_limit" }))
    const result = buildChatQuotaOfferFromError(err, "pro")
    expect(result?.primaryCta.href).toBe("/checkout/bpp")
  })
})
```

**Step 2: Run test to verify fail**

Run: `npm run test -- src/components/chat/chat-quota-error.test.ts`  
Expected: FAIL module belum ada.

**Step 3: Implement helper + wire to ChatWindow**

1. Buat helper `buildChatQuotaOfferFromError(error, tier)`:
- parse payload JSON
- validasi `error === "quota_exceeded"`
- map reason + tier via `resolveQuotaOffer({ context: "chat_error", ... })`

2. Di `ChatWindow`:
- replace hardcoded button `router.push("/subscription/plans")`.
- gunakan hasil helper untuk render primary/secondary CTA.
- pertahankan split antara quota overlay dan generic overlay.

**Step 4: Run tests**

Run:
1. `npm run test -- src/components/chat/chat-quota-error.test.ts`
2. `npm run test -- src/lib/billing/quota-offer-policy.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/chat/ChatWindow.tsx src/components/chat/chat-quota-error.ts src/components/chat/chat-quota-error.test.ts
git commit -m "feat(chat): drive quota exceeded overlay CTA via centralized offer policy"
```

### Task 5: Remove Quota Route Drift Regression (`/subscription/plans`)

**Files:**
- Create: `__tests__/chat/quota-route-canonical.test.ts`

**Step 1: Write regression test**

```ts
import { describe, expect, it } from "vitest"
import { resolveQuotaOffer } from "@/lib/billing/quota-offer-policy"

describe("quota route canonical", () => {
  it("pro depleted topup route must be checkout/bpp", () => {
    const result = resolveQuotaOffer({ tier: "pro", context: "chat_error", visualState: "depleted", quotaReason: "monthly_limit" })
    expect(result.primaryCta.href).toBe("/checkout/bpp")
    expect(result.primaryCta.href).not.toBe("/subscription/plans")
  })
})
```

**Step 2: Run test**

Run: `npm run test -- __tests__/chat/quota-route-canonical.test.ts`  
Expected: PASS.

**Step 3: Commit**

```bash
git add __tests__/chat/quota-route-canonical.test.ts
git commit -m "test(chat): add canonical route guard for quota CTA"
```

### Task 6: Disable Forced Interaction Preview for Quota UI

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`
- Modify: `src/components/chat/QuotaWarningBanner.tsx`

**Step 1: Remove forced preview wiring from ChatWindow**

1. Set `FORCE_INTERACTION_UI_PREVIEW = false`.
2. Hapus prop `preview={...}` dari pemanggilan `QuotaWarningBanner` jika tidak lagi dibutuhkan.

**Step 2: Simplify QuotaWarningBanner preview handling**

1. Jika preview mode tidak lagi dipakai untuk scope ini, hapus branch preview dari komponen.
2. Pastikan behavior kembali normal: banner muncul hanya berdasarkan kondisi real user/query.

**Step 3: Run targeted tests**

Run:
1. `npm run test -- src/components/chat/QuotaWarningBanner.test.tsx`
2. `npm run test -- src/components/chat/chat-quota-error.test.ts`
3. `npm run test -- src/lib/billing/quota-offer-policy.test.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/components/chat/ChatWindow.tsx src/components/chat/QuotaWarningBanner.tsx
git commit -m "chore(chat): restore quota UI visibility to real interaction state"
```

### Task 7: Full Validation Run + Evidence Capture

**Files:**
- No code change required unless failures found.

**Step 1: Run full relevant tests**

Run:
1. `npm run test -- src/lib/billing/quota-offer-policy.test.ts src/components/chat/QuotaWarningBanner.test.tsx src/components/chat/chat-quota-error.test.ts __tests__/chat/quota-route-canonical.test.ts`
2. `npm run test -- __tests__/billing-pro-card-ui.test.tsx`

Expected: PASS.

**Step 2: Optional type-check sanity**

Run: `npx tsc --noEmit`  
Expected: PASS.

**Step 3: Commit validation note (if documentation update needed)**

```bash
git add <any-updated-files>
git commit -m "test(chat): validate tiered quota CTA flow end-to-end"
```

### Task 8: Documentation Sync in Chat Restyling Scope

**Files:**
- Modify: `docs/ai-ui-component/chat-ai-restyling-scope.md`

**Step 1: Mark done items**

Update section terkait:
1. `QuotaWarningBanner` tiered matrix (gratis/bpp/pro).
2. `Error UI saat kirim chat ditolak karena quota` tiered CTA parity.
3. Route canonical topup pro: `/checkout/bpp`.

**Step 2: Commit docs update**

```bash
git add docs/ai-ui-component/chat-ai-restyling-scope.md
git commit -m "docs(chat): sync quota CTA tier matrix and canonical routes"
```

## Implementasi Guardrails

1. Jangan ubah `convex/billing/quotas.ts` untuk task ini kecuali ditemukan bug kritikal.
2. Jangan ubah payment provider abstraction.
3. Fokus hanya pada orchestration policy + komponen chat + test coverage.
4. Pastikan `temporary-note.txt` tidak ikut commit.

## Definition of Done

1. Matrix CTA sesuai keputusan user berjalan konsisten di banner + overlay.
2. Pro topup route canonical terkunci ke `/checkout/bpp`.
3. Tidak ada hardcode CTA quota di chat yang bypass policy resolver.
4. Test matrix + regression guard pass.
5. Mode preview quota yang dipaksa sudah dicabut ke mode interaksi normal.
