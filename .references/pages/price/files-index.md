# Indeks File - Harga (UI Lama)

## Halaman utama
- `.development/knowledge-base/ui-old-makalah/app/pricing/page.tsx` - hero harga + `PricingSection`.

## Komponen harga
- `.development/knowledge-base/ui-old-makalah/src/components/pricing/PricingSection.tsx` - grid kartu harga + carousel mobile.
- `.development/knowledge-base/ui-old-makalah/src/constants/pricing.ts` - data `pricingTiers`.

## UI primitives
- `.development/knowledge-base/ui-old-makalah/src/components/ui/card.tsx` - `Card`.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/badge.tsx` - `Badge`.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/button.tsx` - `Button`.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/carousel.tsx` - `Carousel`.

## Utilitas
- `.development/knowledge-base/ui-old-makalah/src/lib/utils.ts` - `cn`.

## Styling & typography
- `.development/knowledge-base/ui-old-makalah/app/globals.css` - class hero (`hero-vivid`, `hero-grid-thin`) dan tombol (`btn-green-solid`).
- `.development/knowledge-base/ui-old-makalah/app/layout.tsx` - setup font global.

## Layout global
- `.development/knowledge-base/ui-old-makalah/app/providers-client.tsx` - mount `GlobalHeader` + `Footer` untuk halaman publik.
- `.development/knowledge-base/ui-old-makalah/src/components/layout/GlobalHeader.tsx` - header global.
- `.development/knowledge-base/ui-old-makalah/src/components/layout/Footer.tsx` - footer global.
