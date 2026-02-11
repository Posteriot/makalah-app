# Benefits Section

Section "Kenapa Makalah AI?" di marketing page (`/`).

## Scope

README ini untuk dev internal/agent agar paham struktur, perilaku, dan sumber konten tanpa baca semua file satu per satu.

## Structure

```
benefits/
├── index.ts              # Re-exports semua komponen
├── BenefitsSection.tsx   # Main wrapper & orchestrator
├── BenefitsBadge.tsx     # Badge — delegasi ke SectionBadge
├── BenefitsTitle.tsx     # Heading h2
├── BentoBenefitsGrid.tsx # Desktop: bento grid 2x2
├── BenefitsAccordion.tsx # Mobile: accordion (satu-satunya "use client")
├── DocsCTA.tsx           # CTA — delegasi ke SectionCTA
└── README.md             # Dokumentasi ini
```

## Usage

```tsx
import { BenefitsSection } from "@/components/marketing/benefits"

// Di page.tsx
<BenefitsSection />
```

Integrasi di `src/app/(marketing)/page.tsx`. Posisi: setelah Hero section, sebelum PricingTeaser.

## Exports (index.ts)

- `BenefitsSection`
- `BenefitsBadge`
- `BenefitsTitle`
- `BentoBenefitsGrid`
- `BenefitsAccordion`
- `DocsCTA`

## Section Anatomy

- Wrapper: `<section>` dengan `id="kenapa-makalah-ai"`, full viewport (`h-[100svh] min-h-[100svh]`), `isolate` stacking context, `bg-[var(--section-bg-alt)]`.
- Background: `<DiagonalStripes className="opacity-40" />` (z-0) + `<DottedPattern spacing={24} withRadialMask={true} />` (z-[1]).
- Content container: `relative z-10`, `max-w-7xl`, 16-column grid (`grid-cols-16`, `content-center`, `gap-comfort`).
- Semua konten di kolom `col-span-16 md:col-span-12 md:col-start-3` (centered 12 dari 16).
- Urutan: `BenefitsBadge` + `BenefitsTitle` (header) → `BentoBenefitsGrid` (desktop) → `BenefitsAccordion` (mobile) → `DocsCTA` (bottom).

## Komponen dan Tanggung Jawab

- `BenefitsSection.tsx`: server component. Menyusun section wrapper, background patterns (DiagonalStripes + DottedPattern), 16-col grid, header, konten responsive, dan DocsCTA.
- `BenefitsBadge.tsx`: server component. Thin wrapper — delegasi ke `SectionBadge` dari `@/components/ui/section-badge`. Menampilkan teks "Kenapa Makalah AI?" dengan animated amber dot + emerald background.
- `BenefitsTitle.tsx`: server component. Heading `h2` dengan `text-narrative` (Geist Sans), bukan Geist Mono. Teks: "Kolaborasi dengan AI, bukan dibuatkan AI."
- `BentoBenefitsGrid.tsx`: server component. Layout bento 2x2 untuk desktop (`hidden md:grid`). Setiap card = `col-span-8` dalam `grid-cols-16`. Title disimpan sebagai array 2-elemen untuk line break (mis. `["Sparring", "Partner"]`).
- `BenefitsAccordion.tsx`: **client component** (`"use client"`). Accordion mobile (`md:hidden`), single-open (`type="single"` + `collapsible`). Default semua tertutup (`openItem = ""`). Title disimpan sebagai string tunggal. Tidak ada click-outside handler.
- `DocsCTA.tsx`: server component. Thin wrapper — delegasi ke `SectionCTA` dari `@/components/ui/section-cta` dengan `href="/documentation"` dan teks "LIHAT DOKUMENTASI". SectionCTA menggunakan `btn-stripes-pattern` (diagonal stripes on hover), bukan btn-brand.

## Responsive Behavior

- **Desktop (md+)**: `BentoBenefitsGrid` tampil (`hidden md:grid`), `BenefitsAccordion` disembunyikan (`md:hidden`).
- **Mobile (<md)**: `BenefitsAccordion` tampil, `BentoBenefitsGrid` disembunyikan.
- **DocsCTA**: tampil di semua viewport, bottom center.

## Behavior Ringkas (Mobile Accordion)

- Default semua item tertutup (state awal `openItem = ""`).
- Hanya satu item bisa terbuka sekaligus (`type="single"` + `collapsible`).
- Klik trigger yang sama menutup item (collapsible). Tidak ada click-outside handler — toggle hanya via trigger.

## Styling

**Section Wrapper:**
- `relative isolate h-[100svh] min-h-[100svh] overflow-hidden bg-[var(--section-bg-alt)]`
- `--section-bg-alt`: light = `var(--slate-200)`, dark = `var(--slate-800)`
- Inner container: `relative z-10 mx-auto h-full w-full max-w-7xl px-4 py-6 md:px-8 md:py-10`

**Shared Tokens** (desktop & mobile):
- Amber dot: `bg-amber-500 animate-pulse shadow-[0_0_8px] shadow-amber-500` (ukuran `h-2.5 w-2.5 min-w-2.5 rounded-full`)
- Typography heading: `text-narrative` (Geist Sans)
- Typography description: `text-interface text-xs leading-relaxed text-muted-foreground` (Geist Mono)
- Spacing: `gap-comfort` (16px), `p-comfort` (16px)

**Desktop (BentoBenefitsGrid):**
- Grid: `hidden md:grid grid-cols-16 gap-comfort`
- Card: `col-span-8 rounded-shell border-hairline bg-transparent p-comfort`
- Hover: `hover:bg-slate-50 dark:hover:bg-slate-900` (subtle, no lift)
- Heading: `text-narrative font-light text-3xl leading-[1.1] text-foreground`
- Dot: sama dengan shared, plus `mt-1.5` (alignment)

**Mobile (BenefitsAccordion):**
- Accordion: `flex flex-col gap-comfort`
- Item: `rounded-md border-hairline bg-transparent`
- Hover: `hover:bg-slate-200 dark:hover:bg-slate-900` (no lift)
- Trigger: `px-4 py-3 hover:no-underline`
- Title: `text-narrative font-medium text-base text-foreground`
- Content: `px-4 pb-4`, description `pl-5`

**DocsCTA:**
- Wrapper: `flex justify-center mt-8`
- Button: `SectionCTA` — `rounded-action`, inverted theme (light: dark bg → dark: light bg), `btn-stripes-pattern` hover overlay, `text-signal text-xs uppercase tracking-widest`

## Konten yang Ditampilkan

Empat benefit (data di-hardcode di masing-masing komponen):

| ID | Title | Description |
|----|-------|-------------|
| sparring-partner | Sparring Partner | Pendamping penulisan riset... |
| chat-natural | Chat Natural | Ngobrol saja, layaknya percakapan lazim... |
| bahasa-manusiawi | Bahasa Manusiawi | Gunakan fitur "Refrasa"... |
| dipandu-bertahap | Dipandu Bertahap | Workflow ketat dan terstruktur... |

Data duplikat di kedua komponen dengan format berbeda: desktop titles = array (untuk line break), mobile titles = string tunggal.

## Client Components

Hanya satu komponen menggunakan `"use client"`:

- `BenefitsAccordion.tsx` — butuh `useState` untuk controlled accordion state.

Semua komponen lain (BenefitsSection, BenefitsBadge, BenefitsTitle, BentoBenefitsGrid, DocsCTA) adalah server components.

## Dependencies

- `@/components/ui/accordion` — Radix primitive untuk mobile accordion.
- `@/components/ui/section-badge` — SectionBadge (dipakai oleh BenefitsBadge).
- `@/components/ui/section-cta` — SectionCTA dengan btn-stripes-pattern (dipakai oleh DocsCTA).
- `@/components/marketing/SectionBackground` — DiagonalStripes + DottedPattern (dipakai oleh BenefitsSection).
