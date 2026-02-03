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

- `Footer.tsx`: menyusun grid footer, link navigasi, social links, dan copyright.

## Perilaku Ringkas

- Menggunakan `new Date().getFullYear()` untuk tahun copyright.
- Social links membuka tab baru (`target="_blank"`, `rel="noopener noreferrer"`).

## Data & Konstanta

**Link Groups**
- `RESOURCE_LINKS`:
  - `/blog` → "Blog"
  - `/documentation` → "Dokumentasi"
  - `/about#kontak` → "Hubungi Sales"
- `COMPANY_LINKS`:
  - `/about#bergabung-dengan-tim` → "Karier"
  - `/about` → "Tentang kami"
  - `/about#security` → "Security"
- `LEGAL_LINKS`:
  - `/about#privacy-policy` → "Privacy"
  - `/about#terms` → "Terms"
- `SOCIAL_LINKS`:
  - `#` → "X" (Twitter icon)
  - `#` → "LinkedIn" (Linkedin icon)
  - `#` → "Instagram" (Instagram icon)

Catatan:
- `SOCIAL_LINKS` saat ini masih placeholder (`href: "#"`) di semua item.

## Konten yang Ditampilkan

- Section "Sumber Daya", "Perusahaan", dan "Legal" beserta link-linknya.
- Copyright:
  - `© {tahun sekarang} Makalah AI. Hak cipta dilindungi.`
- Social icons: X, LinkedIn, Instagram.

## Styling

- Wrapper luar: `id="footer"`, `bg-[#f8f8f8]` (light) dan `dark:bg-black`.
- Container utama: `max-w-[1200px] px-6 py-12 md:py-16`.
- Pattern background: `.footer-diagonal-stripes` (didefinisikan di `src/app/globals.css`).
- Border top pada bagian bawah: `border-black/[0.08]` (light), `dark:border-white/[0.05]`.

## Client Components

Komponen yang memakai `"use client"`:
- `Footer.tsx`

## Dependencies

- `next/link`, `next/image`
- `lucide-react` (`Twitter`, `Linkedin`, `Instagram`)
