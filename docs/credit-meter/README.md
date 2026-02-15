# Universal Credit Meter

Sistem tampilan kredit terpadu yang menormalisasi data billing dari 3 Convex query ke dalam format kredit universal. Ditampilkan di 3 lokasi berbeda dengan 3 variant komponen.

**Konversi:** 1 kredit = 1.000 tokens (`TOKENS_PER_CREDIT` dari `convex/billing/constants.ts`)

**Prinsip:** Semua tier (Gratis, BPP, Pro) ditampilkan dalam satuan kredit untuk konsistensi. User tidak perlu berpikir dalam satuan token.

---

## Daftar Isi

1. [Arsitektur](#arsitektur)
2. [`useCreditMeter` Hook](#usecreditmeter-hook)
3. [`CreditMeter` Component](#creditmeter-component)
4. [Integration Points](#integration-points)
5. [Design System Compliance](#design-system-compliance)
6. [Edge Cases](#edge-cases)
7. [Tests](#tests)
8. [Key Files Reference](#key-files-reference)

---

## Arsitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                     Convex Backend (3 Queries)                  │
│                                                                 │
│  api.billing.quotas.getQuotaStatus     ← Gratis/Pro tokens     │
│                                           + BPP credit summary  │
│  api.billing.credits.getCreditBalance  ← BPP detailed balance  │
│  api.billing.subscriptions             ← Pro subscription info  │
│    .checkSubscriptionStatus                                     │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   useCreditMeter() Hook                         │
│                                                                 │
│  - Subscribe ke 3 query (conditional "skip" per tier)           │
│  - Normalisasi tokens → kredit (Math.ceil / Math.floor)         │
│  - Derivasi level (normal / warning / critical / depleted)      │
│  - Return: CreditMeterData interface                            │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CreditMeter Component                         │
│                                                                 │
│  Props: { variant, className?, onClick? }                       │
│  Variants: "compact" | "standard" | "detailed"                  │
└──────┬───────────────────┬──────────────────────┬───────────────┘
       │                   │                      │
       ▼                   ▼                      ▼
  ChatSidebar         StatusTab            Overview Page
  (compact)           (standard)           (direct query,
  Footer section      Settings card         bukan component)
```

**Data Flow:**

1. Hook subscribe ke 3 Convex query secara conditional berdasarkan tier
2. Hook normalisasi raw data ke `CreditMeterData` interface
3. Component render berdasarkan tier dan variant
4. Overview page melakukan konversi kredit sendiri (tidak pakai hook/component)

---

## `useCreditMeter` Hook

**File:** `src/lib/hooks/useCreditMeter.ts`

### Interface

```typescript
export type CreditMeterLevel = "normal" | "warning" | "critical" | "depleted"

export interface CreditMeterData {
  tier: EffectiveTier            // "gratis" | "bpp" | "pro" | "unlimited"
  used: number                   // Kredit terpakai
  total: number                  // Total alokasi kredit
  remaining: number              // Kredit tersisa
  percentage: number             // Persentase terpakai (0 jika total = 0)
  level: CreditMeterLevel        // Level warning
  overage?: number               // Pro overage dalam kredit
  overageCost?: number            // Pro overage cost dalam IDR
  periodEnd?: number              // Timestamp akhir periode
  cancelAtPeriodEnd?: boolean     // Pro pending cancel flag
  isLoading: boolean
  isAdmin: boolean
}
```

### Conditional Query Subscription

Hook subscribe ke query secara selektif menggunakan pattern `"skip"` dan guard auth Convex:

| Query | Gratis | BPP | Pro |
|-------|--------|-----|-----|
| `api.billing.quotas.getQuotaStatus` | Subscribe | Subscribe | Subscribe |
| `api.billing.credits.getCreditBalance` | Skip | Subscribe | Skip |
| `api.billing.subscriptions.checkSubscriptionStatus` | Skip | Skip | Subscribe |

```typescript
const canRunProtectedQuery = Boolean(user?._id && isAuthenticated)

// Skip condition per tier + auth guard:
const quotaStatus = useQuery(
  api.billing.quotas.getQuotaStatus,
  canRunProtectedQuery ? { userId: user._id } : "skip"
)

const creditBalance = useQuery(
  api.billing.credits.getCreditBalance,
  canRunProtectedQuery && tier === "bpp" ? { userId: user._id } : "skip"
)

const subscriptionStatus = useQuery(
  api.billing.subscriptions.checkSubscriptionStatus,
  canRunProtectedQuery && tier === "pro" ? { userId: user._id } : "skip"
)
```

### Logika Konversi per Tier

#### Gratis / Pro (Token-based)

```typescript
const usedTokens = quotaStatus?.usedTokens ?? 0
const allottedTokens = quotaStatus?.allottedTokens ?? 0
const used = Math.ceil(usedTokens / TOKENS_PER_CREDIT)      // Ceil: bulatkan ke atas
const total = Math.floor(allottedTokens / TOKENS_PER_CREDIT) // Floor: bulatkan ke bawah
const remaining = Math.max(0, total - used)
const percentage = total > 0 ? Math.round((used / total) * 100) : 0
```

**Catatan:** `used` dibulatkan ke atas (`Math.ceil`) agar user tidak merasa punya lebih dari yang sebenarnya. `total` dibulatkan ke bawah (`Math.floor`) untuk alasan yang sama.

#### BPP (Credit-based)

```typescript
const remaining = creditBalance?.remainingCredits ?? quotaStatus?.currentCredits ?? 0
const level: CreditMeterLevel =
  remaining < 30 ? "critical" : remaining < 100 ? "warning" : "normal"

return {
  tier: "bpp",
  used: creditBalance?.usedCredits ?? 0,
  total: creditBalance?.totalCredits ?? 0,
  remaining,
  percentage: total > 0 ? Math.round((used / total) * 100) : 0,
  level,
  isLoading: creditBalance === undefined,
  isAdmin: false,
}
```

### Level Derivation

Untuk Gratis/Pro, level diderivasi dari `warningLevel` yang dikembalikan `getQuotaStatus`:

```typescript
const warningLevel = quotaStatus?.warningLevel ?? "none"
let level: CreditMeterLevel = "normal"
if (warningLevel === "blocked") level = "depleted"
else if (warningLevel === "critical") level = "critical"
else if (warningLevel === "warning") level = "warning"
```

Threshold `warningLevel` di backend (`convex/billing/quotas.ts`):
- `"blocked"` -- remaining <= 0%
- `"critical"` -- remaining <= 10%
- `"warning"` -- remaining <= 20%
- `"none"` -- remaining > 20%

Untuk BPP, level diderivasi langsung dari sisa kredit:
- `"critical"` -- remaining < 30 kredit
- `"warning"` -- remaining < 100 kredit
- `"normal"` -- remaining >= 100 kredit

### Pro Overage

```typescript
const overageTokens = quotaStatus?.overageTokens ?? 0
const overage = overageTokens > 0 ? Math.ceil(overageTokens / TOKENS_PER_CREDIT) : undefined
const overageCost = overageTokens > 0 ? (quotaStatus?.overageCostIDR ?? 0) : undefined
```

### Pro Subscription Details

```typescript
const periodEnd = subscriptionStatus?.currentPeriodEnd ?? quotaStatus?.periodEnd
const cancelAtPeriodEnd = subscriptionStatus?.isPendingCancel
```

### Admin Detection

```typescript
const isAdmin = user?.role === "admin" || user?.role === "superadmin"
```

Jika `isAdmin === true`, hook return data unlimited (`tier: "unlimited"`, `total: Infinity`) dengan `isAdmin: true`.
Component menampilkan satu baris badge + label `Unlimited`.

### Loading State

Hook return `isLoading: true` ketika:
- `userLoading` dari `useCurrentUser()` masih true
- `convexAuthLoading` dari `useConvexAuth()` masih true
- `quotaStatus === undefined` (query masih loading)
- Untuk BPP: `creditBalance === undefined`

---

## `CreditMeter` Component

**File:** `src/components/billing/CreditMeter.tsx`

### Props Interface

```typescript
interface CreditMeterProps {
  variant: "compact" | "standard" | "detailed"
  className?: string
  onClick?: () => void
}
```

### Variant Dimensions

| Variant | Bar Height | Use Case |
|---------|-----------|----------|
| `compact` | `h-1` (4px) | Sidebar footer |
| `standard` | `h-1.5` (6px) | Settings page |
| `detailed` | `h-2` (8px) | Overview page |

### Rendering per Tier

#### Admin/Superadmin

Render satu baris compact: `SegmentBadge + Unlimited`.

#### Loading State

```tsx
<div data-testid="credit-meter-skeleton">
  <div className="w-full rounded-none bg-muted animate-pulse {BAR_HEIGHT}" />
  <p className="mt-1 font-mono text-[10px] text-muted-foreground">&mdash; kredit</p>
</div>
```

#### BPP Tier (Tanpa Progress Bar)
- Menampilkan: `{used}/{total}` untuk compact/standard.
- Badge: `SegmentBadge` (BPP / Sky).
- Non-compact variant: Link "Top Up" ke `/subscription/plans`
- Compact variant mengikuti pola satu baris yang sama dengan tier lain.

#### Gratis / Pro Tier (Dengan Progress Bar)

- Progress bar: `role="progressbar"` dengan `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`
- Text: `{used}/{total} kredit`
- Badge: `SegmentBadge`
- Bar width: `Math.min(percentage, 100)%` (cap di 100%)

**Pro Overage Badge** (ketika `overage > 0`):
```
+{overage} overage (Rp {overageCost})
```
Badge: `rounded-badge border-amber-500/30 bg-amber-500/15 text-amber-400`

**Pro `cancelAtPeriodEnd` Warning:**
```
Berakhir: {formatDate(periodEnd)}
```
Text: `text-rose-500`

**Period Reset Date** (non-compact, ketika tidak `cancelAtPeriodEnd`):
```
Reset: {formatDate(periodEnd)}
```

### Color Logic (`LEVEL_COLORS`)

```typescript
const LEVEL_COLORS = {
  normal: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
  depleted: "bg-rose-500",
}
```

Ketika ada overage (`hasOverage === true`), bar selalu menggunakan `bg-amber-500` terlepas dari level.

### onClick Wrapper

Jika `onClick` diberikan, wrapper element menjadi `<button type="button">`. Jika tidak, wrapper element adalah `<div>`.
Wrapper button memiliki `cursor-pointer` dan hover state berbasis tier (`gratis/bpp/pro/unlimited`).

```typescript
const Wrapper = onClick ? "button" : "div"
```

### Utility Functions

```typescript
function formatNumber(n: number): string {
  return n.toLocaleString("id-ID")   // Format angka Indonesia (titik sebagai separator)
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp))
}
```

---

## Integration Points

### 4.1 ChatSidebar (Variant: `compact`)

**File:** `src/components/chat/ChatSidebar.tsx`

**Lokasi:** Footer section dari sidebar, di antara content area dan mini-footer.

```tsx
{/* Credit Meter — visible untuk semua tier */}
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

**Perilaku:**
- Ditampilkan di semua panel sidebar (chat-history, paper, progress)
- Click navigasi ke `/subscription/overview` via `router.push()`
- Render sebagai `<button>` karena ada `onClick`
- Hover/focus wrapper mengikuti warna tier (gratis: emerald, bpp: sky, pro: amber, unlimited: slate)
- Mini-footer copyright ditempatkan di bawah CreditMeter

### 4.2 StatusTab (Variant: `standard`)

**File:** `src/components/settings/StatusTab.tsx`

**Lokasi:** Di dalam card "Subskripsi", setelah `SegmentBadge` + tombol Upgrade.

```tsx
<div className="space-y-3">
  <div className="flex items-center justify-between ...">
    <SegmentBadge ... />
    {tierConfig.showUpgrade && (
      <Link href="/subscription/upgrade" ...>Upgrade</Link>
    )}
  </div>
  <CreditMeter variant="standard" />
  <div>
    <Link href="/subscription/overview" className="font-mono text-xs text-primary hover:underline">
      Lihat Detail
    </Link>
  </div>
</div>
```

**Perilaku:**
- Tanpa `onClick` -- render sebagai `<div>` (tidak clickable)
- Link "Lihat Detail" terpisah di bawah meter, navigasi ke `/subscription/overview`
- Upgrade button hanya tampil untuk Gratis dan BPP (konfigurasi `TIER_CONFIG`)

### 4.3 Overview Page (Konversi Kredit Langsung)

**File:** `src/app/(dashboard)/subscription/overview/page.tsx`

Halaman ini **tidak menggunakan** `CreditMeter` component atau `useCreditMeter` hook. Halaman ini melakukan konversi kredit secara langsung menggunakan `TOKENS_PER_CREDIT`.

**Enhancement kredit yang ditambahkan:**

1. **Kredit sebagai tampilan utama** di section "Penggunaan Bulan Ini":
   ```tsx
   <span className="font-mono text-xl font-bold">
     {usedKredit} / {totalKredit}
     <span className="text-signal text-[10px]">kredit</span>
   </span>
   ```
   Token ditampilkan sebagai info sekunder di bawahnya:
   ```tsx
   <p className="font-mono text-xs text-muted-foreground">
     {usedTokens} / {allottedTokens} tokens
   </p>
   ```

2. **Kolom Kredit di breakdown table:**
   Header table: `Tipe | Kredit | Tokens | Estimasi Biaya`
   ```tsx
   <td>{Math.ceil(item.tokens / TOKENS_PER_CREDIT).toLocaleString("id-ID")}</td>
   ```
   Footer total row juga menampilkan total kredit.

3. **Conversion note** di bagian bawah:
   ```
   1 kredit = 1.000 tokens. Estimasi biaya berdasarkan harga rata-rata model AI.
   ```

**Konversi yang digunakan:**
```typescript
const usedKredit = Math.ceil(usedTokens / TOKENS_PER_CREDIT)
const totalKredit = Math.floor(allottedTokens / TOKENS_PER_CREDIT)
```

---

## Design System Compliance

### Warna (Signal Theory)

| Level | Warna Bar | Penggunaan |
|-------|-----------|------------|
| `normal` | `bg-emerald-500` | Penggunaan di bawah 80% |
| `warning` | `bg-amber-500` | Remaining 10-20% (Gratis/Pro) atau < 100 kredit (BPP) |
| `critical` / `depleted` | `bg-rose-500` | Remaining < 10% atau habis |
| Pro overage | `bg-amber-500` | Selalu amber saat ada overage |

### Tipografi

- **Angka:** `font-mono` (Geist Mono) -- semua angka kredit, token, cost
- **Label "kredit":** `text-signal text-[10px]` (Mono + Uppercase + Wide Tracking)
- **Format angka:** `toLocaleString("id-ID")` (separator titik Indonesia)

### Shape System

- **Progress bar:** `rounded-none` (Core level per Mechanical Grace)
- **Bar background:** `bg-muted`
- **Overage badge:** `rounded-badge` (6px)
- **Tier badges:** `SegmentBadge` component (reuse)

### Tier Badge Colors (via `SegmentBadge`)

| Tier | Class | Warna |
|------|-------|-------|
| GRATIS | `bg-segment-gratis` | Emerald-600 |
| BPP | `bg-segment-bpp` | Sky-600 |
| PRO | `bg-segment-pro` | Amber-500 |

### Skeleton Loading

Menggunakan `animate-pulse` pada `bg-muted` bar dengan `data-testid="credit-meter-skeleton"`.

---

## Edge Cases

### Loading State

Hook return `isLoading: true` dengan semua nilai numerik di 0 dan level `"normal"`. Component render skeleton bar dengan placeholder text "-- kredit".

### Admin / Superadmin

Hook mendeteksi via `user?.role === "admin" || user?.role === "superadmin"` dan return `isAdmin: true`.
Component menampilkan satu baris `SegmentBadge + Unlimited` (tetap clickable jika `onClick` tersedia).

### BPP dengan 0 Credits

- `remaining = 0`
- Level: `"critical"` (karena `0 < 30`)
- Text compact tetap mengikuti format satu baris: `used/total`
- Link top-up tetap tersedia di variant non-compact.

### Pro Overage

- `percentage` bisa > 100 (tidak di-cap di hook)
- Bar width di-cap di component: `Math.min(meter.percentage, 100)`
- Bar warna: selalu `bg-amber-500` ketika `hasOverage === true`
- Overage badge muncul dengan jumlah kredit overage + estimasi cost IDR

### Pro `cancelAtPeriodEnd`

- Warning text berwarna Rose: `Berakhir: {tanggal}`
- Reset date (`Reset: ...`) tidak ditampilkan ketika `cancelAtPeriodEnd === true`

### BPP isLoading

- BPP punya loading state terpisah: `isLoading: creditBalance === undefined`
- Ini bisa berbeda dari loading state utama karena `quotaStatus` mungkin sudah ready tapi `creditBalance` belum

---

## Tests

**File:** `__tests__/credit-meter.test.tsx`

8 test cases menggunakan strategi **hook-level mocking** -- `useCreditMeter` dan `useCurrentUser` di-mock di level module.

| # | Test | Deskripsi |
|---|------|-----------|
| 1 | Gratis tier progress bar | Verifikasi progress bar ada (`role="progressbar"`), nilai kredit `50/100` ditampilkan, label "kredit" ada |
| 2 | BPP compact | Verifikasi text `used/total` ditampilkan dengan badge BPP |
| 3 | Pro overage badge | Verifikasi badge `+200 overage` dan cost `Rp 10` ditampilkan saat tier Pro over quota |
| 4 | Admin unlimited row | Verifikasi badge + text `Unlimited` ditampilkan untuk admin user |
| 5 | Warning level amber bar | Verifikasi bar punya class `bg-amber-500` saat level `"warning"` |
| 6 | Critical level rose bar | Verifikasi bar punya class `bg-rose-500` saat level `"critical"` |
| 7 | Loading skeleton | Verifikasi element `data-testid="credit-meter-skeleton"` dan text "-- kredit" |
| 8 | onClick + tier hover | Verifikasi wrapper menjadi `<button>`, `onClick` dipanggil, dan class hover sesuai tier |

### Mock Strategy

```typescript
const mockUseCreditMeter = vi.fn()
const mockUseCurrentUser = vi.fn()

vi.mock("@/lib/hooks/useCreditMeter", () => ({
  useCreditMeter: () => mockUseCreditMeter(),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))
```

Juga mock `next/navigation` (`useRouter`, `usePathname`), `next/link`, dan `convex/react` (`useQuery`).

Test helpers (`gratisData()`, `bppData()`, `proData()`) menghasilkan `CreditMeterData` shape dengan default values yang bisa di-override.

---

## Key Files Reference

| File | Tanggung Jawab |
|------|---------------|
| `src/lib/hooks/useCreditMeter.ts` | Hook: normalisasi 3 query ke `CreditMeterData` |
| `src/components/billing/CreditMeter.tsx` | Component: render meter dengan 3 variant |
| `src/components/chat/ChatSidebar.tsx` | Integrasi: compact variant di sidebar footer |
| `src/components/settings/StatusTab.tsx` | Integrasi: standard variant di settings card |
| `src/app/(dashboard)/subscription/overview/page.tsx` | Integrasi: konversi kredit langsung di overview |
| `src/lib/utils/subscription.ts` | Utility: `getEffectiveTier()` tier determination |
| `src/lib/hooks/useCurrentUser.ts` | Hook: Clerk + Convex user data |
| `src/components/ui/SegmentBadge.tsx` | Component: tier badge (Gratis/BPP/Pro) |
| `convex/billing/constants.ts` | Constants: `TOKENS_PER_CREDIT = 1_000` |
| `convex/billing/quotas.ts` | Backend: `getQuotaStatus` query |
| `convex/billing/credits.ts` | Backend: `getCreditBalance` query |
| `convex/billing/subscriptions.ts` | Backend: `checkSubscriptionStatus` query |
| `__tests__/credit-meter.test.tsx` | Tests: 8 test cases |
