# Indeks File - Auth (UI Lama)

## Rute halaman (UI)
- `.development/knowledge-base/ui-old-makalah/app/auth/page.tsx` - halaman Masuk/Daftar (2 tahap daftar).
- `.development/knowledge-base/ui-old-makalah/app/auth/forgot-password/page.tsx` - halaman Lupa Password.
- `.development/knowledge-base/ui-old-makalah/app/auth/reset-password/page.tsx` - halaman Reset Password.
- `.development/knowledge-base/ui-old-makalah/app/auth/waiting-list/page.tsx` - halaman Daftar Tunggu.

## Komponen auth khusus
- `.development/knowledge-base/ui-old-makalah/src/components/auth/WaitingListCard.tsx` - kartu daftar tunggu (form email + alert).

## Komponen UI dasar (src/components/ui)
- `.development/knowledge-base/ui-old-makalah/src/components/ui/BrandLogo.tsx` - logo merek (varian/ukuran).
- `.development/knowledge-base/ui-old-makalah/src/components/ui/alert.tsx` - `Alert`, `AlertDescription`.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/button.tsx` - `Button`.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/card.tsx` - `Card`.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/checkbox.tsx` - `Checkbox`.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/input.tsx` - `Input`.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/label.tsx` - `Label`.

## Styling & typography
- `.development/knowledge-base/ui-old-makalah/app/globals.css` - `hero-vivid`, `hero-grid-thin`, `space-ui-*`, `text-destructive`.
- `.development/knowledge-base/ui-old-makalah/app/layout.tsx` - definisi font (`--font-sans`, `--font-heading`, `--font-hero`, `--font-mono`).

## Rute tanpa UI terkait auth
- `.development/knowledge-base/ui-old-makalah/app/auth/callback/route.ts` - rute callback auth (tanpa UI).
