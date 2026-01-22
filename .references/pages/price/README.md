# Dokumentasi Halaman Harga (UI Lama)

## Cakupan
- Gue scan UI/components halaman Harga di `.development/knowledge-base/ui-old-makalah/app` dan `.development/knowledge-base/ui-old-makalah/src`.
- Fokus ke struktur halaman, komponen UI, serta styling/typography yang dipakai.

## Titik masuk halaman
- `.development/knowledge-base/ui-old-makalah/app/pricing/page.tsx` - halaman Harga (komponen server) dengan hero + `PricingSection`.

## Struktur UI utama
1) Hero
- Wrapper: `<section className="hero-vivid hero-grid-thin">`.
- Judul: "Tak Perlu Bayar Mahal Untuk Karya Yang Masuk Akal".
- Subjudul: "Pilih paket penggunaan sesuai kebutuhan. Mau ujicoba dulu yang gratisan? Boleh! Atau langsung bayar per paper? Aman! Jika perlu, langganan bulanan sekalian! Bebas!".

2) PricingSection
- Komponen: `PricingSection` (grid desktop + carousel mobile).
- Sumber data: `pricingTiers`.

## PricingSection (detail)
- Desktop: grid 3 kolom `Card`.
- Mobile: `Carousel` + `CarouselContent` + `CarouselItem` + indikator titik.
- Elemen utama tiap kartu:
  - Nama paket (contoh: "Gratis", "Bayar Per Tugas", "Pro").
  - Badge opsional (variant `default`/`secondary`).
  - Harga (`priceLabel`) + unit (`priceUnit`).
  - Tagline + daftar deskripsi.
  - Tombol CTA (`cta.label`) memakai `btn-green-solid` jika aktif, atau disabled jika belum aktif.

## Label item paket (pricingTiers)
- "Gratis" (CTA: "Coba Gratis").
- "Bayar Per Tugas" (CTA: "Belum Aktif").
- "Pro" (CTA: "Belum Aktif").

## Komponen UI yang dipakai
- `PricingSection`.
- `Card`.
- `Badge`.
- `Button`.
- `Carousel`.

## Styling & typography
- Font global dari `.development/knowledge-base/ui-old-makalah/app/layout.tsx`:
  - `Inter` → `--font-sans`, `Nunito_Sans` → `--font-heading`, `Victor_Mono` → `--font-hero`, `JetBrains_Mono` → `--font-mono`.
- Class global dari `.development/knowledge-base/ui-old-makalah/app/globals.css`:
  - `.hero-vivid`, `.hero-grid-thin` untuk latar hero.
  - `.btn-green-solid` untuk tombol CTA aktif.
- Heading pakai `font-heading`.

## File indeks
- Detail file per komponen ada di `./files-index.md`.
