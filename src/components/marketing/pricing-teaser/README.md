# Pricing Teaser (Marketing)

Section "Pemakaian & Harga" untuk marketing page (`/`).

## Scope

README ini untuk dev internal/agent agar paham struktur, perilaku, dan sumber konten tanpa baca semua file satu per satu. Semua poin di bawah ini sesuai dengan isi file di `src/components/marketing/pricing-teaser`.

## Struktur

```
pricing-teaser/
├── PricingTeaser.tsx       # Wrapper section + data fetch (client)
├── PricingTeaserBadge.tsx  # Badge "Pemakaian & Harga" (server, delegates to SectionBadge)
├── PricingTeaserTitle.tsx  # Heading section (server)
├── TeaserCard.tsx          # Card pricing individual (server)
├── TeaserCarousel.tsx      # Carousel mobile (client)
├── TeaserSkeleton.tsx      # Loading state (server)
├── TeaserCTA.tsx           # CTA ke /pricing (server, delegates to SectionCTA)
├── types.ts                # Type TeaserPlan
├── index.ts                # Re-exports
└── README.md               # Dokumentasi ini
```

> **Catatan:** `backgroundPatterns.ts` sudah dihapus. Background sekarang menggunakan `GridPattern` dan `DottedPattern` dari `@/components/marketing/SectionBackground`.

## Penggunaan

```tsx
import { PricingTeaser } from "@/components/marketing/pricing-teaser"
```

Integrasi utama ada di `src/app/(marketing)/page.tsx`.

## Ekspor (index.ts)

- `PricingTeaser`
- `PricingTeaserBadge`
- `PricingTeaserTitle`
- `TeaserCard`
- `TeaserCarousel`
- `TeaserSkeleton`
- `TeaserCTA`
- `TeaserPlan` (type)

> **Tidak ada ekspor** `gridStyle`, `gridStyleDark`, `dotsStyle`, `dotsStyleDark` — inline style patterns sudah dihapus, diganti React components (`GridPattern`, `DottedPattern`).

## Komponen dan Tanggung Jawab

### PricingTeaser.tsx (client)

- Section wrapper utama. Satu-satunya client component di level section.
- Fetch data: `useQuery(api.pricingPlans.getActivePlans)`.
- Transform ke `TeaserPlan[]` menggunakan `plan.teaserDescription || ""` dan `plan.teaserCreditNote || ""` dari database (bukan hardcoded `getCardContent()`).
- Loading: render `TeaserSkeleton` saat `!plansData`.
- Empty: return `null` saat `plansData.length === 0`.
- Layout: 16-column grid (`grid-cols-16`), content centered di `col-span-12 col-start-3`.
  - Desktop (`md+`): `grid-cols-3 gap-6` (hidden di mobile).
  - Mobile (`<md`): `TeaserCarousel` (hidden di desktop via `md:hidden` di carousel).
- Section wrapper: `relative h-[100svh] flex flex-col justify-center overflow-hidden bg-background`.
- Section id: `pemakaian-harga`.
- Background: `GridPattern` (z-0) + `DottedPattern` (spacing=24, withRadialMask=false, z-0) — keduanya dari `@/components/marketing/SectionBackground`.

### PricingTeaserBadge.tsx (server)

- **Delegates to `SectionBadge`** dari `@/components/ui/section-badge`.
- Tidak punya styling sendiri. SectionBadge menyediakan: emerald-600 bg, amber-500 animated dot, `text-signal` uppercase text, `rounded-badge`.
- Text: "Pemakaian & Harga".

### PricingTeaserTitle.tsx (server)

- Font: `text-narrative` (Geist Sans, bukan Geist Mono — JSDoc di file salah).
- Classes: `text-2xl sm:text-[2rem] md:text-[2.5rem] font-medium leading-[1.3] text-foreground`.
- Content: "Investasi untuk" + `<br />` + "Masa Depan Akademik."

### TeaserCard.tsx (server)

- Card pricing individual. Menerima prop `plan: TeaserPlan`.
- **Outer wrapper:** `group relative h-full` — group untuk hover effects.
- **Card body:**
  - `rounded-shell` (16px border radius)
  - `border-1 border-[color:var(--slate-400)]` (default)
  - Highlighted card: `border-2 border-[color:var(--emerald-500)]` (override)
  - `min-h-[240px] md:min-h-[280px]`
  - `p-comfort md:p-airy` (16px → 24px+)
  - Hover: `group-hover:bg-[color:var(--slate-200)] dark:group-hover:bg-[color:var(--slate-700)]` + `group-hover:-translate-y-1` (lift effect) + `transition-all duration-300`
- **Highlight tag** (saat `isHighlighted`):
  - Positioned: `absolute -top-3 left-1/2 -translate-x-1/2 z-10`
  - Colors: `bg-[color:var(--emerald-500)] text-[color:var(--slate-50)]`
  - Typography: `text-[11px] font-semibold uppercase tracking-wide`
  - Shape: `rounded-full` (pill shape)
  - Hover: `group-hover:-translate-y-1` (lifts with card)
  - Text: "Solusi Terbaik"
- **Dot indicator:**
  - Color: **`bg-[color:var(--rose-500)]`** (rose, bukan amber — berbeda dari benefits section)
  - Effect: `animate-pulse shadow-[0_0_8px_var(--rose-500)]` (glow)
  - Size: `w-2 h-2 min-w-2 rounded-full`
- **Plan name:** `text-narrative font-light text-xl md:text-2xl text-foreground text-center`
- **Price:** `text-interface text-3xl font-medium tracking-tight tabular-nums text-foreground text-center`
- **Unit (optional):** `text-interface text-sm font-normal text-muted-foreground`
- **Description:** `text-interface font-normal text-sm leading-relaxed text-foreground`
- **Credit note:** `text-interface text-xs leading-relaxed text-foreground`
- **Tidak menggunakan** token bento (`hover:bg-bento-light-hover`, `dark:hover:bg-bento-hover`). Hover colors didefinisikan langsung via CSS vars.

### TeaserCarousel.tsx (client)

- Mobile-only: wrapper `md:hidden`.
- Initial slide: `plans.findIndex(p => p.isHighlighted)` — default ke highlighted plan (BPP).
- **Swipe mechanism:**
  - Pointer events: `onPointerDown`, `onPointerUp`, `onPointerCancel`.
  - Pointer capture: `setPointerCapture()` / `releasePointerCapture()` untuk reliable tracking.
  - Threshold: **48px** minimum swipe distance.
  - Index clamping: `Math.max(0, Math.min(index, plans.length - 1))`.
- **Slide layout:** `flex-shrink-0 w-full px-2`, inner `max-w-[300px] mx-auto`.
- **Transform:** `translateX(-${activeSlide * 100}%)` + `transition-transform duration-300 ease-out`.
- **Touch:** `touch-pan-y` pada wrapper dan track (allows vertical scroll, captures horizontal).
- **Navigation dots:**
  - Active: `bg-brand`
  - Inactive: `bg-black/20 dark:bg-white/30`
  - Size: `w-2 h-2 rounded-full`
  - Clickable via `onClick`.
  - Gap: `gap-2`, centered `flex justify-center mt-6`.

### TeaserSkeleton.tsx (server)

- Background: `GridPattern` (z-0) dari `@/components/marketing/SectionBackground`.
- Section: `relative py-20 md:py-28 px-4 md:px-6 overflow-hidden bg-background`, id=`pemakaian-harga`.
- Container: `max-w-[var(--container-max-width)]` (bukan `max-w-7xl`).
- Header skeleton: pill badge placeholder + title placeholder.
- Desktop grid: `hidden md:grid grid-cols-3 gap-6` (mobile hidden).
- Cards: `p-6 md:p-8 bg-card border border-border rounded-2xl animate-pulse` (3 placeholder cards).

### TeaserCTA.tsx (server)

- **Delegates to `SectionCTA`** dari `@/components/ui/section-cta`.
- Tidak punya styling sendiri. SectionCTA menyediakan: inverted Slate bg, `text-signal` uppercase, `btn-stripes-pattern` hover overlay, `rounded-action`.
- Props: `href="/pricing"`, children="LIHAT DETAIL PAKET".
- Wrapper: `flex justify-center mt-8`.

## Data

### TeaserPlan (types.ts)

```ts
type TeaserPlan = {
  _id: string
  name: string
  price: string
  unit?: string
  isHighlighted: boolean
  description: string
  creditNote: string
}
```

### Data Source

Data berasal dari tabel `pricingPlans` di Convex via `api.pricingPlans.getActivePlans`.

Transform di `PricingTeaser.tsx`:
```ts
const teaserPlans: TeaserPlan[] = (plansData || []).map((plan) => ({
  _id: plan._id,
  name: plan.name,
  price: plan.price,
  unit: plan.unit,
  isHighlighted: plan.isHighlighted,
  description: plan.teaserDescription || "",
  creditNote: plan.teaserCreditNote || "",
}))
```

> **Tidak ada lagi** `getCardContent()` dengan hardcoded descriptions per slug. Konten `description` dan `creditNote` sekarang dari field `teaserDescription` dan `teaserCreditNote` di database.

## Client vs Server Components

| Component | Type | Reason |
|-----------|------|--------|
| PricingTeaser | Client (`"use client"`) | `useQuery` hook untuk data fetch |
| TeaserCarousel | Client (`"use client"`) | `useState`, `useRef`, pointer event handlers |
| PricingTeaserBadge | Server | Pure render, delegasi ke SectionBadge |
| PricingTeaserTitle | Server | Pure render |
| TeaserCard | Server | Pure render, props only |
| TeaserSkeleton | Server | Pure render |
| TeaserCTA | Server | Pure render, delegasi ke SectionCTA |

## Page Position

Di `src/app/(marketing)/page.tsx`, urutan sections:
1. Hero
2. Benefits
3. **Pricing Teaser** ← section ini
4. (sections berikutnya)

## Dependencies

- `convex/react` — `useQuery`
- `@convex/_generated/api` — `api.pricingPlans.getActivePlans`
- `@/components/marketing/SectionBackground` — `GridPattern`, `DottedPattern`
- `@/components/ui/section-badge` — `SectionBadge` (via PricingTeaserBadge)
- `@/components/ui/section-cta` — `SectionCTA` (via TeaserCTA)
- `@/lib/utils` — `cn` (class merging)
- `react` — `useState`, `useRef`, `useCallback` (TeaserCarousel)
