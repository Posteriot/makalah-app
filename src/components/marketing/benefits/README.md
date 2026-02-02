# Benefits Section

Section "Kenapa Makalah AI?" di marketing page (`/`).

## Scope

README ini untuk dev internal/agent agar paham struktur, perilaku, dan sumber konten tanpa baca semua file satu per satu. Semua poin di bawah ini sesuai dengan isi file di `src/components/marketing/benefits`.

## Structure

```
benefits/
├── index.ts              # Re-exports semua komponen + data
├── BenefitsSection.tsx   # Main wrapper & orchestrator
├── BenefitsBadge.tsx     # Badge label "Kenapa Makalah AI?"
├── BenefitsTitle.tsx     # Heading h2
├── BentoBenefitsGrid.tsx # Desktop: bento grid + SVG illustration
├── BenefitsAccordion.tsx # Mobile: accordion
├── benefitsData.tsx      # Data benefits untuk accordion
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
- `benefits`
- `BenefitItem`

## Section Anatomy

- Wrapper utama: `section.benefits-section` dengan `id="kenapa-makalah-ai"` untuk anchor.
- Background dekoratif di dalam section: `benefits-bg-stripes`, `benefits-bg-dots`, `benefits-top-line`.
- Header section: `BenefitsBadge` + `BenefitsTitle`.
- Konten responsive: `BentoBenefitsGrid` (desktop) dan `BenefitsAccordion` (mobile).

## Komponen dan Tanggung Jawab

- `BenefitsSection.tsx`: menyusun layout section, background, header, dan dua varian konten (desktop + mobile).
- `BenefitsBadge.tsx`: badge kecil "Kenapa Makalah AI?" dengan dot animasi, styling inline (tanpa class `.benefits-badge*`).
- `BenefitsTitle.tsx`: heading `h2`, class `benefits-title` + `font-medium`, font `var(--font-geist-mono)`.
- `BentoBenefitsGrid.tsx`: layout bento untuk desktop (`hidden md:grid`), konten hardcode + SVG illustration per card.
- `BenefitsAccordion.tsx`: accordion mobile (`md:hidden`), konten diambil dari `benefitsData.tsx`, single-open + click-outside to close.
- `benefitsData.tsx`: definisi `BenefitItem` dan array `benefits` untuk accordion.

## Responsive Behavior

- **Desktop (md+)**: `BentoBenefitsGrid` tampil, `BenefitsAccordion` disembunyikan.
- **Mobile (<md)**: `BenefitsAccordion` tampil, `BentoBenefitsGrid` disembunyikan.

## Behavior Ringkas (Mobile Accordion)

- Default semua item tertutup (state awal `openItem = ""`).
- Hanya satu item bisa terbuka (single + collapsible).
- Klik/tap di luar area accordion menutup item yang terbuka.

## Data Structure (benefitsData.tsx)

```tsx
type BenefitItem = {
  id: string
  title: string
  icon: LucideIcon
  content: React.ReactNode
  checklistItems?: string[]
}
```

Catatan data:
- `sparring-partner` memakai `checklistItems` dan `content` di-set `null`.
- Tiga item lain memakai `content` (string atau React fragment dengan `<br />`).

## Konten yang Ditampilkan

Empat benefit yang muncul di UI (desktop dan mobile):

1) **Sparring Partner** (`sparring-partner`)
   - Mendampingi riset dari awal
   - Juru tulis yang terampil
   - Paper akuntabel dan berkualitas
2) **Chat Natural** (`chat-natural`)
   - "Ngobrol saja, tidak perlu prompt rumit, menggunakan Bahasa Indonesia sehari-hari"
3) **Sitasi Akurat** (`sitasi-akurat`)
   - "Sumber kredibel, dengan format sitasi sesuai preferensi, anti link mati dan hoax"
4) **Dipandu Bertahap** (`dipandu-bertahap`)
   - "Workflow ketat dan terstruktur, mengolah ide hingga paper jadi."
   - "Apapun percakapannya, ujungnya pasti jadi paper"

Catatan konsistensi:
- Konten desktop (bento) dan mobile (accordion) saat ini disalin manual.
- Kalau ada perubahan copy, update keduanya agar tetap sinkron.

## Styling

Kelas utama yang dipakai komponen ini ada di `src/app/globals.css`:

- Section + background: `.benefits-section`, `.benefits-container`, `.benefits-header`, `.benefits-bg-stripes`, `.benefits-bg-dots`, `.benefits-top-line`
- Title: `.benefits-title`
- Bento (desktop): `.bento-grid`, `.bento-item`, `.bento-large`, `.bento-row`, `.bento-content`, `.bento-content-row`, `.bento-content-col`, `.bento-text-wrap`, `.bento-header-flex`, `.bento-icon-box`, `.bento-checklist`, `.bento-illustration`, `.bento-illustration-static`, `.bento-illustration-tall`, `.bento-svg`, `.bento-glow`
- Accordion (mobile): `.benefits-accordion`, `.benefits-accordion-item`, `.benefits-accordion-trigger`, `.benefits-accordion-header`, `.benefits-accordion-content`

Catatan:
- `BenefitsBadge` memakai utility classes inline, bukan `.benefits-badge*`.
- `globals.css` punya definisi `.benefits-badge*`, tapi saat ini tidak dipakai oleh komponen.
- `bento-checklist` dipakai di desktop dan juga di accordion ketika ada `checklistItems`.

## Dependencies

- `lucide-react` untuk ikon pada bento dan accordion.
- `@/components/ui/accordion` sebagai primitive accordion di mobile.
