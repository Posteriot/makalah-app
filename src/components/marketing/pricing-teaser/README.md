# Pricing Teaser (Marketing)

Section "Pemakaian & Harga" untuk marketing page (`/`).

## Scope

README ini untuk dev internal/agent agar paham struktur, perilaku, dan sumber konten tanpa baca semua file satu per satu. Semua poin di bawah ini sesuai dengan isi file di `src/components/marketing/pricing-teaser`.

## Struktur

```
pricing-teaser/
├── PricingTeaser.tsx       # Wrapper section + data fetch
├── PricingTeaserBadge.tsx  # Badge "Pemakaian & Harga"
├── PricingTeaserTitle.tsx  # Heading section
├── TeaserCard.tsx          # Card pricing individual
├── TeaserCarousel.tsx      # Carousel mobile
├── TeaserSkeleton.tsx      # Loading state
├── TeaserCTA.tsx           # CTA ke /pricing
├── backgroundPatterns.ts   # Inline background styles
├── types.ts                # Type TeaserPlan
├── index.ts                # Re-exports
└── README.md               # Dokumentasi ini
```

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
- `TeaserPlan`
- `gridStyle`, `gridStyleDark`, `dotsStyle`, `dotsStyleDark`

## Komponen dan Tanggung Jawab

- `PricingTeaser.tsx`: fetch data dari Convex, transform ke `TeaserPlan`, render layout desktop + mobile.
- `PricingTeaserBadge.tsx`: badge label "Pemakaian & Harga".
- `PricingTeaserTitle.tsx`: heading utama "Investasi untuk / Masa Depan Akademik."
- `TeaserCard.tsx`: kartu pricing individual + label "Solusi Terbaik" untuk plan highlighted.
- `TeaserCarousel.tsx`: carousel mobile (swipe + dots).
- `TeaserSkeleton.tsx`: skeleton loading saat data belum ada.
- `TeaserCTA.tsx`: CTA global ke `/pricing`.
- `backgroundPatterns.ts`: inline style untuk grid/dots (light + dark).
- `types.ts`: definisi `TeaserPlan`.

## Perilaku Ringkas

**PricingTeaser**
- Fetch data: `useQuery(api.pricingPlans.getActivePlans)`.
- Jika data belum ada (`!plansData`) → render `TeaserSkeleton`.
- Jika data kosong (`plansData.length === 0`) → return `null`.
- Layout:
  - Desktop (`md+`): grid 3 kolom.
  - Mobile (`<md`): `TeaserCarousel`.
- Section id: `pemakaian-harga`.

**TeaserCarousel**
- Slide awal memilih plan yang `isHighlighted`.
- Swipe detection pakai pointer events + threshold 48px.
- Dots navigasi bisa klik untuk pindah slide.

## Data & Konstanta

**TeaserPlan (types.ts)**
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

**getCardContent (PricingTeaser.tsx)**
- `gratis`:
  - description: "Cocok untuk mencoba 13 tahap workflow dan menyusun draft awal tanpa biaya."
  - creditNote: "Mendapat 50 kredit, untuk diksusi dan membentuk draft"
- `bpp`:
  - description: "Tepat untuk menyelesaikan satu paper utuh hingga ekspor Word/PDF."
  - creditNote: "Mendapat 300 kredit, untuk menyusun 1 paper setara 15 halaman A4 dan dikusi kontekstual."
- `pro`:
  - description: "Ideal untuk penyusunan banyak paper dengan diskusi sepuasnya."
  - creditNote: "Mendapat 2000 kredit, untuk menyusun 5-6 paper setara @15 halaman dan diskusi mendalam"

Catatan:
- Jika slug tidak dikenali, `description` dan `creditNote` dikembalikan kosong.

## Konten yang Ditampilkan

**PricingTeaserBadge**
- Text: "Pemakaian & Harga"

**PricingTeaserTitle**
- "Investasi untuk"
- "Masa Depan Akademik."

**TeaserCard**
- Label highlight: "Solusi Terbaik" (muncul saat `isHighlighted === true`).
- Harga menampilkan `unit` jika tersedia.

**TeaserCTA**
- Label tombol: "LIHAT DETAIL PAKET"
- Link: `/pricing`

## Styling

- Wrapper section:
  - `className="relative h-dvh min-h-[580px] md:min-h-[700px] ... bg-muted/30 dark:bg-black"`
  - `id="pemakaian-harga"`
- Background pattern:
  - Light mode: `gridStyle` + `dotsStyle`
  - Dark mode: `gridStyleDark` + `dotsStyleDark`
- `TeaserCard` menggunakan tokens bento:
  - `hover:bg-bento-light-hover` / `dark:hover:bg-bento-hover`
- `TeaserCTA` memakai class `.btn-brand` (didefinisikan di `src/app/globals.css`).

## Client Components

Komponen yang memakai `"use client"`:
- `PricingTeaser.tsx`
- `TeaserCarousel.tsx`

## Dependencies

- `convex/react` (`useQuery`)
- `@convex/_generated/api`
- `next/link`
- `@/lib/utils` (`cn`)
