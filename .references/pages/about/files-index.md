# Indeks File - About (UI Lama)

## Halaman utama
- `.development/knowledge-base/ui-old-makalah/app/about/page.tsx` - struktur hero, manifesto, persoalan, Ai agents, karier & kontak (pakai class `section-separator` di tiap section utama selain hero).

## UI primitives
- `.development/knowledge-base/ui-old-makalah/src/components/ui/button.tsx` - `Button` + `buttonVariants`.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/card.tsx` - `Card`.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/badge.tsx` - `Badge`.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/accordion.tsx` - `Accordion` + item/trigger/content.

## Utilitas
- `.development/knowledge-base/ui-old-makalah/src/lib/utils.ts` - `cn`.

## Styling & typography
- `.development/knowledge-base/ui-old-makalah/app/globals.css` - class hero (`hero-vivid`, `hero-grid-thin`), tombol (`btn-green-solid`), dan utilitas layout.
- `.development/knowledge-base/ui-old-makalah/app/layout.tsx` - setup font global.

## Layout global
- `.development/knowledge-base/ui-old-makalah/app/providers-client.tsx` - mount `GlobalHeader` + `Footer` untuk halaman publik.
- `.development/knowledge-base/ui-old-makalah/src/components/layout/GlobalHeader.tsx` - header global.
- `.development/knowledge-base/ui-old-makalah/src/components/layout/Footer.tsx` - footer global.
