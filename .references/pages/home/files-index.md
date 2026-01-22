# Indeks File - Home/Landing (UI Lama)

## Halaman utama
- `.development/knowledge-base/ui-old-makalah/app/page.tsx` - struktur hero, benefits, pricing, dialog badge, dan trigger toast `waitlist=success`.

## Komponen home
- `.development/knowledge-base/ui-old-makalah/src/components/marketing/ChatInputHeroMock.tsx` - mock input chat (desktop-only) + animasi cursor.
- `.development/knowledge-base/ui-old-makalah/src/components/marketing/TypewriterText.tsx` - animasi typewriter dan caret blink.
- `.development/knowledge-base/ui-old-makalah/src/components/pricing/PricingSection.tsx` - kartu harga (desktop) + carousel (mobile).
- `.development/knowledge-base/ui-old-makalah/src/constants/pricing.ts` - data `pricingTiers`.

## Layout global yang tampil di home
- `.development/knowledge-base/ui-old-makalah/app/providers-client.tsx` - mount `GlobalHeader` + `Footer` untuk halaman publik.
- `.development/knowledge-base/ui-old-makalah/src/components/layout/GlobalHeader.tsx` - header global (menu utama).
- `.development/knowledge-base/ui-old-makalah/src/components/layout/Footer.tsx` - footer global.

## UI primitives yang dipakai di home
- `.development/knowledge-base/ui-old-makalah/src/components/ui/button.tsx`
- `.development/knowledge-base/ui-old-makalah/src/components/ui/card.tsx`
- `.development/knowledge-base/ui-old-makalah/src/components/ui/badge.tsx`
- `.development/knowledge-base/ui-old-makalah/src/components/ui/dialog.tsx`
- `.development/knowledge-base/ui-old-makalah/src/components/ui/accordion.tsx`
- `.development/knowledge-base/ui-old-makalah/src/components/ui/carousel.tsx`

## Toast (waitlist)
- `.development/knowledge-base/ui-old-makalah/src/hooks/use-toast.ts` - hook `useToast`.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/toast.tsx` - komponen toast.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/toaster.tsx` - renderer toast.

## Styling & typography
- `.development/knowledge-base/ui-old-makalah/app/globals.css` - class hero/section dan animasi (`hero-vivid`, `hero-grid-thin`, `hero-text-shimmer`, `hero-caret-blink`, `section-screen-with-header`).
- `.development/knowledge-base/ui-old-makalah/app/layout.tsx` - setup font global (Inter, Nunito Sans, Victor Mono, JetBrains Mono).
