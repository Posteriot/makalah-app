# Design: Universal Credit Meter

## Overview

Menambahkan "meteran kredit" universal ke 3 lokasi di Makalah App. Semua tier (Gratis, BPP, Pro) ditampilkan dalam satuan **kredit** (1 kredit = 1.000 tokens) untuk konsistensi.

**Keputusan desain:**
- **Satuan**: Universal kredit (bukan tokens)
- **Visual**: Inline progress bar (horizontal)
- **Placement sidebar**: Footer, di bawah conversation list
- **Scope**: Sidebar + Settings + Overview enhancement

### Status implementasi aktual (main, 2026-02-16)
- Hook `useCreditMeter` sudah memakai guard auth (`useConvexAuth`) agar query protected tidak memicu `Unauthorized` saat sesi belum settle.
- `CreditMeter` clickable sudah memiliki `cursor-pointer` dan hover/focus berbasis tier (`gratis/bpp/pro/unlimited`).
- Admin/superadmin tidak disembunyikan; ditampilkan sebagai satu baris `SegmentBadge + Unlimited`.

---

## 1. Shared Component: `CreditMeter`

**File:** `src/components/billing/CreditMeter.tsx`

Komponen reusable dengan 3 variant:

| Variant | Tinggi | Bar | Dipakai di |
|---------|--------|-----|-----------|
| `compact` | ~40px | 4px `h-1` | Sidebar footer |
| `standard` | ~64px | 6px `h-1.5` | Settings page |
| `detailed` | ~120px | 8px `h-2` | Overview page (optional) |

### Behavior per tier

| Tier | Display | Konversi |
|------|---------|----------|
| **Gratis** | `50/100 kredit` + progress bar | `usedTokens/1000` / `allottedTokens/1000` |
| **BPP** | `used/total` + NO progress bar | Langsung dari `creditBalances` (used/total/remaining) |
| **Pro** | `2.500/5.000 kredit` + progress bar + overage badge | `usedTokens/1000` / `allottedTokens/1000` |

### Color logic (Mechanical Grace signal theory)

- `< 70%` terpakai: Emerald (success/trust)
- `70-90%` terpakai: Amber (warning/primary)
- `> 90%` terpakai: Rose (destructive)
- BPP credit low (< 100 kredit): Amber

### Typography

- Angka: Geist Mono (mandatory per design system)
- Label "kredit": `.text-signal` (Mono 10px uppercase bold tracking-widest)
- Tier badge: Warna per tier (Emerald=Gratis, Sky=BPP, Amber=Pro), `rounded-badge` (6px)

---

## 2. Sidebar Footer — Compact Meter

**File:** `src/components/chat/ChatSidebar.tsx`

```
┌─────────────────────┐
│ Makalah AI           │  ← Sidebar header
├─────────────────────┤
│ + Percakapan Baru   │
│ Percakapan 1        │
│ Percakapan 2        │
│         ...         │
├─────────────────────┤  ← border-hairline
│ ██████░░░░ 52/100   │  ← CreditMeter compact
│ kredit · Gratis     │
├─────────────────────┤  ← border-hairline
│ © 2025 Makalah AI   │  ← Mini-footer (existing)
└─────────────────────┘
```

**BPP variant (no bar):**
```
│ 150/500 kredit      │
│ BPP · Top Up →      │  ← link ke /subscription/plans
```

**Detail:**
- Progress bar: `h-1`, `rounded-none` (core-level)
- Separator: `border-hairline` (0.5px) atas dan bawah
- Clickable → navigate ke `/subscription/overview`
- Collapsed sidebar: meter hidden
- Admin/superadmin: meter tampil sebagai `UNLIMITED`

---

## 3. Settings Page — Standard Meter

**File:** `src/app/(account)/settings/page.tsx` (tab Status)

Replace tier badge yang sekarang cuma 1 line → card dengan meter:

```
┌─────────────────────────────────────┐
│ LANGGANAN                           │  ← .text-signal
│                                     │
│ [GRATIS]  Tier saat ini             │
│                                     │
│ ████████████░░░░░░░░ 52/100 kredit  │  ← progress bar 6px
│                                     │
│ Reset: 15 Mar 2026                  │
│                                     │
│ [Lihat Detail]  [Upgrade]           │
└─────────────────────────────────────┘
```

**Card style:** `border-main`, `rounded-shell` (16px), `p-comfort` (16px)

**Pro with overage:**
```
│ [PRO]  Tier saat ini                │
│ ████████████████████ 5.200/5.000    │
│ kredit · +200 overage (Rp 10)      │
│ Berlaku sampai: 15 Mar 2026         │
```

**Pro with cancelAtPeriodEnd:**
Label "Berakhir: {date}" di bawah meter, text Rose.

---

## 4. Overview Page Enhancement

**File:** `src/app/(dashboard)/subscription/overview/page.tsx`

Enhance existing display — tambah konversi kredit.

### 4.1 Usage Progress Card

Saat ini: `150.000 / 5.000.000 tokens (3%)`

Sesudah:
```
150 / 5.000 kredit  (3%)              ← PRIMARY: Mono 20px bold
150.000 / 5.000.000 tokens            ← SECONDARY: Mono 12px muted
```

### 4.2 Credit Balance Card (BPP)

Tambah token equivalent:
```
150 kredit                             ← existing
≈ 150.000 tokens                       ← NEW: secondary
```

### 4.3 Breakdown Table

Tambah kolom kredit:
```
| Operasi | Kredit | Tokens  | Estimasi (Rp) |
|---------|--------|---------|---------------|
| Chat    | 80     | 80.000  | Rp 1.792      |
| Paper   | 50     | 50.000  | Rp 1.120      |
| Total   | 130    | 130.000 | Rp 2.912      |
```

### 4.4 Info footer

```
1 kredit = 1.000 tokens. Estimasi biaya berdasarkan harga rata-rata model AI.
```

---

## 5. Data Flow

### Custom hook: `useCreditMeter()`

**File:** `src/lib/hooks/useCreditMeter.ts`

```typescript
function useCreditMeter() → {
  tier: EffectiveTier
  used: number          // kredit terpakai
  total: number         // kredit allotted
  remaining: number     // kredit tersisa
  percentage: number    // 0-100 (0 jika total=0)
  level: "normal" | "warning" | "critical" | "depleted"
  overage?: number      // Pro only, kredit overage
  overageCost?: number  // Pro only, Rp
  periodEnd?: number    // reset date
  isLoading: boolean
}
```

### Konversi logic

- **Gratis/Pro**: `used = ceil(quotaStatus.usedTokens / 1000)`, `total = allottedTokens / 1000`
- **BPP**: `remaining = creditBalance.remainingCredits`, `total = creditBalance.totalCredits`
- **Level**: derive dari `quotaStatus.warningLevel` atau credit threshold

### Query reuse (ZERO new backend queries)

| Data | Convex Query (existing) | Tier |
|------|------------------------|------|
| Quota | `api.billing.quotas.getQuotaStatus` | Gratis, Pro |
| Credits | `api.billing.credits.getCreditBalance` | BPP |
| Subscription | `api.billing.subscriptions.checkSubscriptionStatus` | Pro |
| User | `useCurrentUser()` | All |

---

## 6. Edge Cases & Error Handling

| Case | Behavior |
|------|----------|
| New user, no quota | Skeleton shimmer sampai `initializeQuota` |
| BPP, 0 kredit | Tetap tampil format compact `used/total`, variant non-compact tetap ada link Top Up |
| Pro overage | Bar full (100%) Amber + "+X overage" badge |
| Pro cancelAtPeriodEnd | Label "Berakhir: {date}" Rose |
| Admin/superadmin | Meter tampil baris compact: badge tier + `Unlimited` |
| Query loading | Skeleton: `bg-muted animate-pulse` + "— kredit" |
| Query error | "Gagal memuat" + retry icon |
| Sidebar collapsed | Meter hidden via CSS |

---

## 7. Testing Plan (8 tests)

File: `__tests__/credit-meter.test.tsx`

1. Gratis: renders progress bar with correct kredit values
2. BPP: renders compact `used/total` tanpa progress bar
3. Pro: renders progress bar with overage badge when over quota
4. Admin: renders `UNLIMITED` row
5. Warning level: bar color Amber at 70%
6. Critical level: bar color Rose at 90%
7. Loading: renders skeleton
8. Click navigates to /subscription/overview

---

## 8. File Summary

| # | File | Action |
|---|------|--------|
| 1 | `src/components/billing/CreditMeter.tsx` | NEW |
| 2 | `src/lib/hooks/useCreditMeter.ts` | NEW |
| 3 | `__tests__/credit-meter.test.tsx` | NEW |
| 4 | `src/components/chat/ChatSidebar.tsx` | MODIFY |
| 5 | `src/app/(account)/settings/page.tsx` | MODIFY |
| 6 | `src/app/(dashboard)/subscription/overview/page.tsx` | MODIFY |
