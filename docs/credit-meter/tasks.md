# Tasks: Universal Credit Meter

**Design reference:** `docs/plans/2026-02-12-credit-meter-universal-design.md`

**Branch:** `feat/billing-tier-enforcement` (existing)

**Constraint:** FRONTEND ONLY — JANGAN ubah file backend (`convex/*`, `src/app/api/*`)

---

## TG1: Custom Hook — `useCreditMeter`

**File baru:** `src/lib/hooks/useCreditMeter.ts`

Hook ini menormalkan data dari 3 query Convex yang sudah ada ke format universal kredit. ZERO new backend queries.

### Task 1.1: Buat hook `useCreditMeter`

**Subscribed queries (all existing):**
- `api.billing.quotas.getQuotaStatus` → Gratis/Pro tokens + BPP credit info
- `api.billing.credits.getCreditBalance` → BPP detailed credit balance
- `api.billing.subscriptions.checkSubscriptionStatus` → Pro subscription details

**Return type:**
```typescript
interface CreditMeterData {
  tier: EffectiveTier
  used: number          // kredit terpakai
  total: number         // kredit allotted (Infinity untuk BPP)
  remaining: number     // kredit tersisa
  percentage: number    // 0-100 (NaN untuk BPP)
  level: "normal" | "warning" | "critical" | "depleted"
  overage?: number      // Pro only, kredit overage
  overageCost?: number  // Pro only, Rp
  periodEnd?: number    // reset/expiry date timestamp
  cancelAtPeriodEnd?: boolean  // Pro cancel flag
  isLoading: boolean
  isAdmin: boolean      // admin/superadmin → meter hidden
}
```

**Conversion logic per tier:**
- **Gratis/Pro:** `used = ceil(quotaStatus.usedTokens / 1000)`, `total = quotaStatus.allottedTokens / 1000`
- **BPP:** `remaining = creditBalance.remainingCredits`, `total = Infinity`
- **Pro overage:** `overage = ceil(quotaStatus.overageTokens / 1000)`, `overageCost = quotaStatus.overageCostIDR`

**Level derivation:**
- Derive dari `quotaStatus.warningLevel`: "none" → "normal", "warning" → "warning", "critical" → "critical", "blocked" → "depleted"
- BPP: `remainingCredits < 30` → "critical", `< 100` → "warning", else "normal"

**Dependencies:**
- `useCurrentUser()` dari `@/lib/hooks/useCurrentUser`
- `getEffectiveTier()` dari `@/lib/utils/subscription`
- `TOKENS_PER_CREDIT` dari `@convex/billing/constants`
- `useQuery` dari `convex/react`

**Acceptance criteria:**
- [ ] Hook compiles tanpa TypeScript error
- [ ] Returns `isLoading: true` saat query undefined
- [ ] Returns `isAdmin: true` untuk admin/superadmin (meter hidden)
- [ ] Gratis: returns kredit values converted dari tokens
- [ ] BPP: returns remaining credits, total=Infinity, percentage=NaN
- [ ] Pro: returns kredit values + overage info + periodEnd
- [ ] Pro cancelAtPeriodEnd: flag dari checkSubscriptionStatus

---

## TG2: Shared Component — `CreditMeter`

**File baru:** `src/components/billing/CreditMeter.tsx`

Komponen reusable dengan 3 variant (compact, standard, detailed).

### Task 2.1: Buat komponen `CreditMeter`

**Props:**
```typescript
interface CreditMeterProps {
  variant: "compact" | "standard" | "detailed"
  className?: string
  onClick?: () => void
}
```

**Variant dimensions (dari design):**
| Variant | Tinggi | Bar height | Dipakai di |
|---------|--------|------------|------------|
| `compact` | ~40px | `h-1` (4px) | Sidebar footer |
| `standard` | ~64px | `h-1.5` (6px) | Settings page |
| `detailed` | ~120px | `h-2` (8px) | Overview (optional) |

**Internal: calls `useCreditMeter()` hook**

**Rendering per tier:**

1. **Gratis/Pro (quota-based):**
   - Progress bar: colored per level
   - Text: `"{used}/{total} kredit"` (Geist Mono for numbers)
   - Label "kredit" in `.text-signal` style
   - Tier badge: `<SegmentBadge>` (reuse existing component)

2. **BPP (credit-based):**
   - NO progress bar
   - Text: `"{remaining} kredit tersisa"` (Geist Mono)
   - Link "Top Up →" ke `/subscription/plans`

3. **Pro with overage:**
   - Bar full 100%, Amber color
   - Badge: `"+{overage} overage"` in Amber
   - Cost: `"(Rp {overageCost})"` secondary text

4. **Pro with cancelAtPeriodEnd:**
   - Label: `"Berakhir: {date}"` in Rose text

**Color logic (Mechanical Grace Signal Theory):**
- `level === "normal"`: Emerald bar (`bg-emerald-500`)
- `level === "warning"`: Amber bar (`bg-amber-500`)
- `level === "critical"` or `"depleted"`: Rose bar (`bg-rose-500`)

**Typography rules:**
- Numbers: `font-mono` (Geist Mono, mandatory per design system)
- "kredit" label: `.text-signal` → `font-mono text-[10px] uppercase font-bold tracking-widest`
- Tier badge: reuse `<SegmentBadge>` component

**Edge cases:**
- `isLoading`: Skeleton shimmer (`bg-muted animate-pulse`) + "— kredit"
- `isAdmin`: Return `null` (hidden)
- Bar shape: `rounded-none` (core-level per Mechanical Grace)

**Acceptance criteria:**
- [ ] Renders 3 variants with correct bar heights
- [ ] Gratis: progress bar + `{used}/{total} kredit` + SegmentBadge
- [ ] BPP: no progress bar + `{remaining} kredit tersisa` + "Top Up →"
- [ ] Pro: progress bar + overage badge when over quota
- [ ] Pro cancelAtPeriodEnd: Rose "Berakhir: {date}" text
- [ ] Color changes at warning (Amber) and critical (Rose) levels
- [ ] Loading state: skeleton with pulse animation
- [ ] Admin/superadmin: not rendered (returns null)
- [ ] Numbers use `font-mono`, labels use `.text-signal`
- [ ] onClick prop wired (compact variant → navigate to overview)

---

## TG3: Sidebar Footer Integration

**File:** `src/components/chat/ChatSidebar.tsx`

Replace existing upgrade CTA button (lines 188-204) with CreditMeter compact + mini-footer.

### Task 3.1: Import CreditMeter dan tambahkan ke sidebar footer

**Current footer (lines 188-204):**
```tsx
{showUpgradeCTA && (
  <div className="shrink-0 border-t ...">
    <Button onClick={() => router.push("/subscription/upgrade")}>
      <ArrowUpCircle /> Upgrade
    </Button>
  </div>
)}
```

**Target footer structure:**
```
├─────────────────────┤  ← border-hairline
│ ██████░░░░ 52/100   │  ← CreditMeter compact
│ kredit · Gratis     │
├─────────────────────┤  ← border-hairline
│ © 2026 Makalah AI   │  ← Mini-footer (new)
└─────────────────────┘
```

**Changes:**
1. Import `CreditMeter` from `@/components/billing/CreditMeter`
2. Remove `useRouter` import (no longer needed for upgrade push — CreditMeter handles navigation internally)
   - **Cek dulu**: apakah `router` masih dipakai di tempat lain. Jika ya, JANGAN hapus import
3. Replace `showUpgradeCTA` section dengan:
   ```tsx
   {/* Credit Meter — hidden for admin/superadmin (handled by component) */}
   <div className="shrink-0 border-t border-hairline">
     <CreditMeter
       variant="compact"
       onClick={() => router.push("/subscription/overview")}
     />
   </div>
   {/* Mini-footer */}
   <div className="shrink-0 border-t border-hairline px-3 py-2">
     <p className="text-center font-mono text-[10px] text-muted-foreground">
       &copy; 2026 Makalah AI
     </p>
   </div>
   ```
4. Remove `showUpgradeCTA` variable (line 88-89) — CreditMeter handles visibility internally (returns null for admin)

**PENTING:** CreditMeter compact harus visible untuk SEMUA tiers (Gratis, BPP, Pro). Perbedaan dari sebelumnya: upgrade CTA hanya tampil untuk non-Pro, tapi credit meter tampil untuk semua (kecuali admin).

**Acceptance criteria:**
- [ ] CreditMeter compact muncul di sidebar footer untuk semua tiers
- [ ] Admin/superadmin: meter hidden (CreditMeter returns null), mini-footer tetap tampil
- [ ] Click meter → navigate ke `/subscription/overview`
- [ ] `border-hairline` separator atas dan bawah
- [ ] Mini-footer: `font-mono text-[10px]`, centered
- [ ] Sidebar collapsed: meter hidden naturally (sidebar width = 0)

---

## TG4: Settings Page Integration

**File:** `src/components/settings/StatusTab.tsx`

Enhance subscription card (lines 71-107) dengan CreditMeter standard variant.

### Task 4.1: Tambah CreditMeter ke Subskripsi card di StatusTab

**Current subscription card (lines 71-107):**
```tsx
<div className="mb-4 overflow-hidden rounded-lg border ...">
  <div className="border-b ...">Subskripsi</div>
  <div className="p-4 ...">
    <SegmentBadge /> + Upgrade link
  </div>
</div>
```

**Target subscription card:**
```
┌─────────────────────────────────────┐
│ Subskripsi                          │  ← existing header
├─────────────────────────────────────┤
│ [GRATIS]  Tier saat ini             │  ← existing SegmentBadge
│                                     │
│ ████████████░░░░░░░░ 52/100 kredit  │  ← NEW: CreditMeter standard
│                                     │
│ [Lihat Detail]  [Upgrade]           │  ← links
└─────────────────────────────────────┘
```

**Changes:**
1. Import `CreditMeter` from `@/components/billing/CreditMeter`
2. Di dalam subscription card body (setelah SegmentBadge + Upgrade row):
   - Tambah `<CreditMeter variant="standard" className="mt-3" />`
3. Tambah "Lihat Detail" link ke `/subscription/overview` di bawah meter:
   ```tsx
   <div className="mt-3 flex items-center gap-3">
     <Link href="/subscription/overview" className="text-xs font-mono text-primary hover:underline">
       Lihat Detail
     </Link>
     {/* existing Upgrade button stays */}
   </div>
   ```

**Acceptance criteria:**
- [ ] CreditMeter standard muncul di bawah SegmentBadge
- [ ] "Lihat Detail" link ke `/subscription/overview`
- [ ] Upgrade button tetap ada untuk non-Pro tiers
- [ ] Admin: meter hidden, tapi card tetap render (SegmentBadge masih ada)
- [ ] Loading state: skeleton dari CreditMeter, bukan text "Memuat..."

---

## TG5: Overview Page Enhancement

**File:** `src/app/(dashboard)/subscription/overview/page.tsx`

Enhance existing displays — tambah konversi kredit universal.

### Task 5.1: Usage Progress Card — tambah kredit display

**Current (lines 210-270):**
```
150.000 / 5.000.000 tokens (3%)
```

**Target:**
```
150 / 5.000 kredit  (3%)              ← PRIMARY: font-mono text-xl font-bold
150.000 / 5.000.000 tokens            ← SECONDARY: font-mono text-xs text-muted-foreground
```

**Changes:**
1. Import `TOKENS_PER_CREDIT` dari `@convex/billing/constants`
2. Compute kredit values: `usedKredit = Math.ceil(usedTokens / TOKENS_PER_CREDIT)`, `totalKredit = allottedTokens / TOKENS_PER_CREDIT`
3. Di stats section (lines 231-248), tambah kredit row ABOVE existing token row:
   - Primary kredit display: `font-mono text-xl font-bold`
   - Existing token line: demote ke `font-mono text-xs text-muted-foreground`

### Task 5.2: Credit Balance Card (BPP) — tambah token equivalent

**Current (lines 274-302):**
```
150 kredit
```

**Target:**
```
150 kredit                             ← existing
≈ 150.000 tokens                       ← NEW: secondary
```

**Changes:**
- Setelah kredit display (line 283-284), tambah token equivalent:
  ```tsx
  <p className="text-xs font-mono text-muted-foreground mt-0.5">
    &asymp; {(currentCreditBalance * 1000).toLocaleString("id-ID")} tokens
  </p>
  ```
- **Cek**: line 286 sudah punya `≈ {(currentCreditBalance * 1000)...} tokens tersedia` — JANGAN duplikasi. Evaluate apakah perlu adjust existing text atau add separate line.

### Task 5.3: Breakdown Table — tambah kolom kredit

**Current (lines 306-369):**
```
| Tipe | Tokens | Estimasi Biaya |
```

**Target:**
```
| Tipe | Kredit | Tokens | Estimasi Biaya |
```

**Changes:**
1. Tambah header column "Kredit" sebelum "Tokens"
2. Di setiap row, tambah cell `Math.ceil(item.tokens / 1000).toLocaleString("id-ID")`
3. Di footer total row, tambah `Math.ceil(usageBreakdown.totalTokens / 1000).toLocaleString("id-ID")`

### Task 5.4: Info footer — tambah konversi note

**Target:** Tambah note di bawah breakdown table (sebelum "Cara Kerja Pembayaran"):
```
1 kredit = 1.000 tokens. Estimasi biaya berdasarkan harga rata-rata model AI.
```

Style: `font-mono text-[10px] text-muted-foreground`

**Acceptance criteria:**
- [ ] Usage Progress: kredit as primary, tokens as secondary
- [ ] BPP Credit: token equivalent displayed (no duplication)
- [ ] Breakdown: "Kredit" column added with correct values
- [ ] Info footer: conversion note visible
- [ ] All numbers use `font-mono` (Geist Mono)
- [ ] TOKENS_PER_CREDIT imported from constants (no hardcoded 1000)

---

## TG6: Tests

**File baru:** `__tests__/credit-meter.test.tsx`

8 tests sesuai design doc.

### Task 6.1: Buat test file dengan 8 test cases

**Mocks needed:**
- `useCurrentUser` — return mock user per tier
- `convex/react` → `useQuery` — return mock quota/credit/subscription data
- `next/navigation` → `useRouter` — mock push

**Test cases:**
1. **Gratis renders correctly**: progress bar + kredit values (e.g., `50/100 kredit`)
2. **BPP renders without progress bar**: `{remaining} kredit tersisa`, no bar element
3. **Pro renders overage badge**: when `usedTokens > allottedTokens`, shows `+X overage`
4. **Admin hidden**: CreditMeter returns null, not in document
5. **Warning level (70-90%)**: bar has Amber color class
6. **Critical level (>90%)**: bar has Rose color class
7. **Loading state**: skeleton element with `animate-pulse`
8. **Click navigation**: clicking compact meter calls `router.push("/subscription/overview")`

**Acceptance criteria:**
- [ ] All 8 tests pass with `npx vitest run __tests__/credit-meter.test.tsx`
- [ ] No import errors or missing mocks

---

## TG7: Build Verification

### Task 7.1: TypeScript compilation check
```bash
npx eslint src/components/billing/CreditMeter.tsx src/lib/hooks/useCreditMeter.ts src/components/chat/ChatSidebar.tsx src/components/settings/StatusTab.tsx src/app/\(dashboard\)/subscription/overview/page.tsx --no-error-on-unmatched-pattern
```

### Task 7.2: Run credit-meter tests
```bash
npx vitest run __tests__/credit-meter.test.tsx
```

### Task 7.3: Run ALL tests (regressions)
```bash
npm run test
```

**Acceptance criteria:**
- [ ] Zero ESLint errors on changed files
- [ ] All 8 credit-meter tests pass
- [ ] No regressions on existing tests

---

## Execution Order

```
TG1 (hook) ──→ TG2 (component) ──→ TG3 (sidebar) ─┐
                                  ├→ TG4 (settings)├──→ TG6 (tests) → TG7 (verify)
                                  └→ TG5 (overview) ┘
```

- TG1 & TG2: sequential (component depends on hook)
- TG3, TG4, TG5: parallel (independent integration points)
- TG6 & TG7: sequential after all integrations

---

## File Summary

| # | File | Action |
|---|------|--------|
| 1 | `src/lib/hooks/useCreditMeter.ts` | NEW |
| 2 | `src/components/billing/CreditMeter.tsx` | NEW |
| 3 | `src/components/chat/ChatSidebar.tsx` | MODIFY |
| 4 | `src/components/settings/StatusTab.tsx` | MODIFY |
| 5 | `src/app/(dashboard)/subscription/overview/page.tsx` | MODIFY |
| 6 | `__tests__/credit-meter.test.tsx` | NEW |
