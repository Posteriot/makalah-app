# Indeks File - Main Menu (Header, UI Lama)

## Komponen utama
- `.development/knowledge-base/ui-old-makalah/src/components/layout/GlobalHeader.tsx` - struktur header, nav desktop/mobile, toggle menu, urutan menu, CTA "Masuk", dan `UserDropdown`.
- `.development/knowledge-base/ui-old-makalah/src/constants/main-menu.ts` - daftar `MAIN_MENU_ITEMS` (label: "Dokumentasi", "Tentang"; item lain dikomentari).

## Komponen pendukung (branding & user)
- `.development/knowledge-base/ui-old-makalah/src/components/ui/BrandLogo.tsx` - logo brand (variant `white` dipakai di header).
- `.development/knowledge-base/ui-old-makalah/src/components/ui/user-dropdown.tsx` - dropdown user (item "Dashboard", "Settings", "Logout").
- `.development/knowledge-base/ui-old-makalah/src/components/ui/user-avatar.tsx` - avatar user di header.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/avatar.tsx` - primitive avatar (Radix).

## UI primitives untuk menu
- `.development/knowledge-base/ui-old-makalah/src/components/ui/button.tsx` - Button variant `ghost` dan class tambahan `btn-green-solid` dipakai di header.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/sheet.tsx` - Sheet untuk menu mobile.
- `.development/knowledge-base/ui-old-makalah/src/components/ui/dropdown-menu.tsx` - DropdownMenu untuk `UserDropdown`.

## Layout & mounting
- `.development/knowledge-base/ui-old-makalah/app/providers-client.tsx` - mount `GlobalHeader`, aturan halaman yang menonaktifkan header, dan set CSS var `--header-h`.
- `.development/knowledge-base/ui-old-makalah/app/layout.tsx` - setup font (Inter, Nunito Sans, Victor Mono, JetBrains Mono).

## Styling & typography
- `.development/knowledge-base/ui-old-makalah/app/globals.css` - font untuk `nav`, `.btn-green-solid`, `.app-logo`, dan utilitas layout terkait header.
