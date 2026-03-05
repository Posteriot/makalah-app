# Footer (Layout)

Komponen footer global untuk layout aplikasi (marketing + dashboard).

## Scope

README ini untuk dev internal/agent agar paham struktur, perilaku, dan sumber konten tanpa baca file satu per satu. Semua poin di bawah ini sesuai dengan isi file di `src/components/layout/footer`.

## Struktur

```
footer/
├── Footer.tsx  # Footer global
├── index.ts    # Re-exports semua komponen
└── README.md   # Dokumentasi ini
```

## Penggunaan

```tsx
import { Footer } from "@/components/layout/footer"
```

Integrasi utama:
- `src/app/(marketing)/layout.tsx`
- `src/app/(dashboard)/layout.tsx`

## Ekspor (index.ts)

- `Footer`

## Komponen dan Tanggung Jawab

- `Footer.tsx`: menyusun grid footer 16-kolom, link navigasi (3 grup), logo dengan theme switching, social links, hairline separator, dan copyright.
- `Footer.tsx`: menyisipkan link `Lapor Masalah` ke section `Sumber Daya` (di bawah `Kerja Sama Bisnis`) dengan guard auth.

## Perilaku Ringkas

- Menggunakan `new Date().getFullYear()` untuk tahun copyright.
- Social links membuka tab baru (`target="_blank"`, `rel="noopener noreferrer"`).
- Logo otomatis switch antara light/dark variant berdasarkan tema:
  - Light mode: `makalah_logo_dark.svg` (`block dark:hidden`)
  - Dark mode: `makalah_logo_light.svg` (`hidden dark:block`)
- Footer menampilkan `Lapor Masalah` di section `Sumber Daya` (bukan CTA terpisah di bottom bar).

## Layout & Grid

- 16-column grid system (`grid grid-cols-16 gap-comfort`).
- Brand area: `col-span-16 md:col-span-4` (full-width mobile, 4 kolom desktop).
- Links area: `col-span-16 md:col-span-7 md:col-start-10 md:grid-cols-3` (full-width mobile, 7 kolom mulai kolom 10 desktop, 3-column sub-grid).
- Responsive behavior:
  - Mobile: semua centered, stacked vertical.
  - Desktop: brand kiri, links kanan (3 kolom sejajar), bottom bar flex row `justify-between`.

## Data & Konstanta

**Link Groups**
- `RESOURCE_LINKS`:
  - `/blog` → "Blog"
  - `/documentation` → "Dokumentasi"
  - `/about#kontak` → "Kerja Sama Bisnis"
- `COMPANY_LINKS`:
  - `/about#bergabung-dengan-tim` → "Karier"
  - `/about` → "Tentang kami"
- `LEGAL_LINKS`:
  - `/privacy` → "Privacy"
  - `/security` → "Security"
  - `/terms` → "Terms"
- Link pelaporan (statis, non-CMS):
  - Saat login: `/support/technical-report?source=footer-link` → "Lapor Masalah"
  - Saat belum login: `/sign-in?redirect_url=%2Fsupport%2Ftechnical-report%3Fsource%3Dfooter-link` → "Lapor Masalah"
- `SOCIAL_LINKS`:
  - `#` → "X" (`XIcon` dari iconoir-react)
  - `#` → "LinkedIn" (`Linkedin` dari iconoir-react)
  - `#` → "Instagram" (`Instagram` dari iconoir-react)

Catatan:
- `SOCIAL_LINKS` saat ini masih placeholder (`href: "#"`) di semua item.

## Konten yang Ditampilkan

- Logo brand (32x32, theme-aware).
- Section "Sumber Daya", "Perusahaan", dan "Legal" beserta link-linknya.
- Link "Lapor Masalah" di section "Sumber Daya" sebagai kanal pelaporan masalah chat dari halaman non-chat.
- Hairline separator (`h-[0.5px] bg-[color:var(--border-hairline)]`).
- Copyright:
  - `Jl. H. Jian, Kebayoran Baru, Jakarta Selatan`
  - `© {tahun sekarang} Makalah AI. Hak cipta dilindungi.`
- Social icons: X, LinkedIn, Instagram (masing-masing `icon-interface` = 16px).

## Styling

### Wrapper & Background
- Wrapper luar: `id="footer"`, `bg-background text-foreground` (CSS variable tokens).
- Footer element: `bg-[color:var(--footer-background)]` dengan `relative overflow-hidden`.
- Pattern background: `<DiagonalStripes className="opacity-40" />` (React component dari `@/components/marketing/SectionBackground`).

### Container
- Content container: `max-w-7xl px-4 py-6 md:px-8 md:py-8` (1280px max, responsive padding).
- Positioned `relative z-[1]` di atas background pattern.

### Typography
- Section headings ("Sumber Daya", dll): `text-narrative text-[14px] font-medium text-foreground`.
- Section links: `text-narrative text-[14px] font-medium text-muted-foreground`.
- Copyright: `text-interface text-[12px] text-muted-foreground` (Geist Mono).

### Separator
- Hairline div: `h-[0.5px] w-full bg-[color:var(--border-hairline)]` (bukan CSS border, melainkan elemen div tipis).

### Hover & Transitions
- Links: `transition-colors duration-300 hover:text-foreground` (dari muted ke foreground).
- Social icons: `transition-colors duration-300 hover:text-foreground`.

### Icon Sizing
- Social icons: `icon-interface` (16px, dari Mechanical Grace design system).

## Client Components

Komponen yang memakai `"use client"`:
- `Footer.tsx`

## Dependencies

- `next/link`, `next/image`
- `iconoir-react` (`X as XIcon`, `Linkedin`, `Instagram`)
- `@/components/marketing/SectionBackground` (`DiagonalStripes`)
