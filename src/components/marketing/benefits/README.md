# Benefits Section

Section "Kenapa Makalah AI?" di marketing page (`/`).

## Scope

README ini untuk dev internal/agent agar paham struktur, perilaku, dan sumber konten tanpa baca semua file satu per satu.

## Structure

```
benefits/
├── index.ts              # Re-exports semua komponen
├── BenefitsSection.tsx   # Main wrapper & orchestrator
├── BenefitsBadge.tsx     # Badge label "Kenapa Makalah AI?"
├── BenefitsTitle.tsx     # Heading h2
├── BentoBenefitsGrid.tsx # Desktop: bento grid dengan Tailwind utilities
├── BenefitsAccordion.tsx # Mobile: accordion
├── DocsCTA.tsx           # CTA button "LIHAT DOKUMENTASI"
└── README.md             # Dokumentasi ini
```

## Usage

```tsx
import { BenefitsSection } from "@/components/marketing/benefits"

// Di page.tsx
<BenefitsSection />
```

Integrasi utama ada di `src/app/(marketing)/page.tsx`.

## Exports (index.ts)

- `BenefitsSection`
- `BenefitsBadge`
- `BenefitsTitle`
- `BentoBenefitsGrid`
- `BenefitsAccordion`
- `DocsCTA`

## Section Anatomy

- Wrapper utama: `section.benefits-section` dengan `id="kenapa-makalah-ai"` untuk anchor.
- Background dekoratif: `benefits-bg-stripes`, `benefits-bg-dots`, `benefits-top-line`.
- Header: `BenefitsBadge` + `BenefitsTitle`.
- Konten responsive: `BentoBenefitsGrid` (desktop) dan `BenefitsAccordion` (mobile).
- Bottom CTA: `DocsCTA` di center.

## Komponen dan Tanggung Jawab

- `BenefitsSection.tsx`: menyusun layout section, background, header, konten responsive, dan DocsCTA.
- `BenefitsBadge.tsx`: badge kecil "Kenapa Makalah AI?" dengan dot animasi.
- `BenefitsTitle.tsx`: heading `h2` dengan font `var(--font-geist-mono)`.
- `BentoBenefitsGrid.tsx`: layout bento 2x2 untuk desktop, styling via Tailwind design tokens.
- `BenefitsAccordion.tsx`: accordion mobile, single-open + click-outside to close.
- `DocsCTA.tsx`: button link ke `/documentation` dengan inverted bg (btn-brand), include wrapper dengan spacing (`mt-8`) dan centering.

## Responsive Behavior

- **Desktop (md+)**: `BentoBenefitsGrid` tampil, `BenefitsAccordion` disembunyikan.
- **Mobile (<md)**: `BenefitsAccordion` tampil, `BentoBenefitsGrid` disembunyikan.
- **DocsCTA**: tampil di semua viewport, bottom center.

## Behavior Ringkas (Mobile Accordion)

- Default semua item tertutup (state awal `openItem = ""`).
- Hanya satu item bisa terbuka (single + collapsible).
- Klik/tap di luar area accordion menutup item yang terbuka.

## Styling

**Shared Design Tokens** (dipakai desktop & mobile):
- Dot: `bg-dot-light` (light), `bg-dot` (dark) + `animate-pulse` + glow shadow
- Fonts: `font-sans` (Geist), `font-mono` (Geist Mono)

**Desktop (BentoBenefitsGrid)** - Tailwind design tokens:
- Colors: `bg-bento`, `bg-bento-hover`, `border-bento-border`
- Typography: `text-bento-heading`, `text-bento-paragraph`, `leading-bento-heading`

**Mobile (BenefitsAccordion)** - Tailwind utilities:
- Same hover behavior as desktop (transparent idle, bg on hover, lift up)

**DocsCTA** - uses `btn-brand` class + wrapper:
- Wrapper: `flex justify-center mt-8` (spacing sama dengan hero)
- Light mode: dark bg, light text
- Dark mode: light bg, dark text

**Section wrapper** - CSS classes di `globals.css`:
- `.benefits-section`, `.benefits-container`, `.benefits-header`, `.benefits-title`

## Konten yang Ditampilkan

Empat benefit (data di-hardcode di masing-masing komponen):

| ID | Title | Description |
|----|-------|-------------|
| sparring-partner | Sparring Partner | Pendamping penulisan riset... |
| chat-natural | Chat Natural | Ngobrol saja, layaknya percakapan lazim... |
| bahasa-manusiawi | Bahasa Manusiawi | Gunakan fitur "Refrasa"... |
| dipandu-bertahap | Dipandu Bertahap | Workflow ketat dan terstruktur... |

## Dependencies

- `@/components/ui/accordion` sebagai primitive accordion di mobile.
