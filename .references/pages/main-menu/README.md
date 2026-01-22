# Dokumentasi Main Menu - Header (UI Lama)

## Cakupan
- Gue scan UI/components main menu di header dari `.development/knowledge-base/ui-old-makalah/app` dan `.development/knowledge-base/ui-old-makalah/src`.
- Fokus ke struktur menu utama, variant desktop/mobile, area user menu, dan styling/typography yang dipake.

## Titik masuk header
- `GlobalHeader` dipasang di `app/providers-client.tsx` lewat `<GlobalHeader className="global-header" showNavigation={!isAuthPage} />`.
- Header disembunyikan di halaman `/chat`, `/auth`, `/admin`, `/settings` (LayoutShell return children tanpa header).

## Struktur UI header (GlobalHeader)
- Wrapper: `<header className="relative bg-background">`.
- Konten: baris utama `px-6 pt-4 pb-6` berisi brand + menu + kontrol user.
- Separator bawah: SVG diagonal stripes (`diagonal-stripes-header`) dengan tinggi 10px.

## Branding header
- Logo: `BrandLogo` variant `white` size `sm`.
- Teks brand: mask SVG `/makalah_brand_text.svg` (aria-label: "Makalah AI").
- Versi aplikasi: teks `V. {appVersion}` atau fallback `Memuat...`.

## Menu utama (desktop)
- Ditampilkan saat `showNavigation` true dan bukan halaman chat.
- `<nav className="hidden md:flex items-center gap-8 text-sm font-medium mr-6">`.
- Urutan menu dari `orderedNav`: `Harga` → `Chat` → `Blog` → `Tutorial` → `Dokumentasi` → `Tentang`.
- `Chat` hanya muncul kalau `isAuthenticated` dan `user` ada.
- `NavLink` pakai underline dotted via pseudo-element (border putih) dan `aria-current="page"` saat aktif.

## Menu utama (mobile)
- Toggle: tombol icon `PanelLeftIcon` dengan aria-label "Buka menu utama".
- Container: `Sheet` (Radix) `side="right"` width `w-56`.
- Close: tombol custom dengan label screen reader "Close".
- Isi menu: `MobileNavItem` list yang sama dengan desktop (dengan kondisi `Chat`).

## Area user (auth)
- Saat belum login:
  - Desktop: tombol "Masuk" (class `btn-green-solid`) muncul di kanan.
  - Mobile: tombol "Masuk" di dalam `Sheet`.
- Saat login:
  - Desktop: `UserDropdown` variant `header`.
  - Mobile: `UserDropdown` ditaruh di dalam `Sheet`.
- Loading state (desktop): skeleton line tipis `h-[2px]`.

## Isi UserDropdown (header)
- Item menu:
  - "Dashboard" (muncul hanya untuk `superadmin`/`admin`).
  - "Settings".
  - "Logout".
- Trigger menampilkan avatar + nama + role (opsional) + icon `ChevronDown`.

## Styling & typography
- Typography global untuk `nav`: `var(--font-hero), var(--font-heading), var(--font-sans)` (lihat `app/globals.css`).
- Font setup di `app/layout.tsx`:
  - `Inter` → `--font-sans`.
  - `Nunito_Sans` → `--font-heading`.
  - `Victor_Mono` → `--font-hero`.
  - `JetBrains_Mono` → `--font-mono`.
- Utility CSS penting:
  - `.btn-green-solid` untuk tombol "Masuk".
  - `.app-logo` reset border-radius (logo selalu kotak).
  - Stripe bawah header menggunakan SVG di `GlobalHeader`.

## File indeks
- Detail file per komponen ada di `./files-index.md`.
