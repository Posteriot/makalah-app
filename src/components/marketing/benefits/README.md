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
├── BentoBenefitsGrid.tsx # Desktop: Bento grid layout dengan Tailwind utilities
└── BenefitsAccordion.tsx # Mobile: Accordion dengan collapse behavior
```

## Usage

```tsx
import { BenefitsSection } from "@/components/marketing/benefits"

// Di page.tsx
<BenefitsSection />
```

Integrasi utama ada di `src/app/(marketing)/page.tsx`.

## Section Anatomy

- `section.benefits-section` punya `id="kenapa-makalah-ai"` untuk anchor.
- Background dekoratif: `benefits-bg-stripes`, `benefits-bg-dots`, dan `benefits-top-line` ada di dalam `BenefitsSection`.

## Komponen dan Tanggung Jawab

- `BenefitsSection.tsx`: wrapper section, menyisipkan background, header (badge + title), lalu render `BentoBenefitsGrid` (desktop) dan `BenefitsAccordion` (mobile).
- `BenefitsBadge.tsx`: badge label kecil "Kenapa Makalah AI?" dengan dot animasi, styling inline (tanpa class `.benefits-badge*`).
- `BenefitsTitle.tsx`: heading `h2` berisi copy utama section, memakai font `var(--font-geist-mono)` + `font-medium`.
- `BentoBenefitsGrid.tsx`: layout bento untuk desktop, styling via Tailwind design tokens.
- `BenefitsAccordion.tsx`: accordion mobile dengan design synced ke desktop (blinking dot, font-sans/mono).

## Responsive Behavior

- **Desktop (md+)**: `BentoBenefitsGrid` - 2x2 grid dengan Tailwind utilities + design tokens
- **Mobile (<md)**: `BenefitsAccordion` - Single-open accordion, click outside to close

## Behavior Ringkas (Mobile Accordion)

- Default semua item tertutup (state awal `openItem = ""`).
- Hanya satu item bisa terbuka (single + collapsible).
- Klik/tap di luar area accordion akan menutup item yang sedang terbuka.

## Styling

**Shared Design Tokens** (dipakai desktop & mobile):
- Dot: `bg-dot-light` (light), `bg-dot` (dark) + `animate-badge-dot` + glow shadow
- Fonts: `font-sans` (Geist), `font-mono` (Geist Mono)

**Desktop (BentoBenefitsGrid)** - Tailwind design tokens:
- Colors: `bg-bento`, `bg-bento-hover`, `border-bento-border`
- Typography: `text-bento-heading`, `text-bento-paragraph`, `leading-bento-heading`

**Mobile (BenefitsAccordion)** - CSS classes di `globals.css`:
- `.benefits-accordion`, `.benefits-accordion-item`
- `.benefits-accordion-trigger`, `.benefits-accordion-content`

**Section wrapper** - CSS classes:
- `.benefits-section`, `.benefits-container`, `.benefits-header`, `.benefits-title`

Catatan:
- `BenefitsBadge` memakai utility classes inline, bukan `.benefits-badge*`.
- `BenefitsTitle` memakai font `var(--font-geist-mono)` + `font-medium`.

## Konten yang Ditampilkan

Empat benefit (data di-hardcode di masing-masing komponen):

| ID | Title | Description |
|----|-------|-------------|
| sparring-partner | Sparring Partner | Pendamping penulisan riset sekaligus mitra diskusi... |
| chat-natural | Chat Natural | Ngobrol saja, layaknya percakapan lazim... |
| bahasa-manusiawi | Bahasa Manusiawi | Gunakan fitur "Refrasa" untuk membentuk gaya penulisan... |
| dipandu-bertahap | Dipandu Bertahap | Workflow ketat dan terstruktur... |

## Dependencies

- `@/components/ui/accordion` sebagai primitive accordion di mobile.
