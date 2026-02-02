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
├── BenefitsAccordion.tsx # Mobile: Accordion dengan collapse behavior
└── benefitsData.tsx      # Shared data structure untuk benefits items
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
- `BentoBenefitsGrid.tsx`: layout bento untuk desktop, styling via Tailwind design tokens (bg-bento, text-bento-heading, dll).
- `BenefitsAccordion.tsx`: accordion mobile yang membaca data dari `benefitsData.tsx`.
- `benefitsData.tsx`: definisi `BenefitItem` dan array `benefits` untuk accordion.

## Responsive Behavior

- **Desktop (md+)**: `BentoBenefitsGrid` - 2x2 grid dengan Tailwind utilities + design tokens
- **Mobile (<md)**: `BenefitsAccordion` - Single-open accordion, click outside to close

## Behavior Ringkas (Mobile Accordion)

- Default semua item tertutup (state awal `openItem = ""`).
- Hanya satu item bisa terbuka (single + collapsible).
- Klik/tap di luar area accordion akan menutup item yang sedang terbuka.

## Styling

**Desktop (BentoBenefitsGrid)** - Tailwind design tokens di `globals.css` `@theme inline`:
- Colors: `bg-bento`, `bg-bento-hover`, `border-bento-border`, `bg-dot`
- Typography: `text-bento-heading`, `text-bento-paragraph`, `leading-bento-heading`
- Fonts: `font-sans` (Geist), `font-mono` (Geist Mono)

**Mobile (BenefitsAccordion)** - CSS classes di `globals.css`:
- `.benefits-accordion`, `.benefits-accordion-item`, `.bento-icon-box`

**Section wrapper** - CSS classes:
- `.benefits-section`, `.benefits-container`, `.benefits-header`, `.benefits-title`

Catatan:
- `BenefitsBadge` memakai utility classes inline, bukan `.benefits-badge*`.
- `BenefitsTitle` memakai font `var(--font-geist-mono)` + `font-medium`.

## Konten yang Ditampilkan

Empat benefit yang muncul di UI (desktop dan mobile) adalah:
- **Sparring Partner**: "Pendamping penulisan riset sekaligus mitra diskusi, dari tahap ide hingga paper jadi. Bukan sekadar alat, tapi juru tulis, pencari dan pengolah data, serta penimbang ide, yang memastikan setiap karya akuntabel dan berkualitas akademik."
- **Chat Natural**: "Ngobrol saja, layaknya percakapan lazim. Tanggapi setiap respons maupun pertanyaan agent menggunakan Bahasa Indonesia sehari-hari. Seperti interview dengan kawan sejawat. Ungkapkan ide, jelaskan maksud dan konteks, tanpa prompt yang rumit."
- **Bahasa Manusiawi**: "Gunakan fitur Refrasa untuk membentuk gaya penulisan bahasa Indonesia manusiawi, bukan khas robot, tanpa mengubah makna."
- **Dipandu Bertahap**: "Workflow ketat dan terstruktur, mengolah ide hingga paper jadi, dengan sitasi kredibel dan format sesuai preferensi."

## Data Structure

```tsx
type BenefitItem = {
  id: string
  title: string
  icon: LucideIcon
  content: React.ReactNode
}
```

Catatan:
- `benefitsData.tsx` dipakai oleh `BenefitsAccordion` (mobile).
- `BentoBenefitsGrid` meng-hardcode konten sendiri (tidak pakai `benefitsData`).
- 4 benefits items: Sparring Partner, Chat Natural, Bahasa Manusiawi, Dipandu Bertahap

## Dependencies

- `lucide-react` untuk ikon pada bento dan accordion.
- `@/components/ui/accordion` sebagai primitive accordion di mobile.
