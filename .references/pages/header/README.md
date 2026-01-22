# Dokumentasi Header Global

## Cakupan
- Fokus ke header global di `src/app/layout.tsx`.
- Komponen yang kebawa: `HeaderAuthNav`, `AccountStatusPage`, `RoleBadge`.
- Tujuan: daftar lengkap UI/components yang muncul di header dan turunannya.

## Struktur UI utama (alur render)
- `RootLayout` -> `<header>`
  - Area brand: `Link` ke `/` dengan label "Makalah App" + teks kecil "AI-assisted papers".
  - Navigasi utama: `Link` ke Home, Pricing, About (disembunyikan di layar kecil), Chat.
  - Area autentikasi: `HeaderAuthNav`.

## Label navigasi header
- Brand: "Makalah App" (`/`) + teks kecil "AI-assisted papers".
- Navigasi utama: "Home" (`/`), "Pricing" (`/pricing`), "About" (`/about`), "Chat" (`/chat`).
- Navigasi autentikasi:
  - SignedIn: "Dashboard" (`/dashboard`), item menu "Papers" (`/dashboard/papers`), halaman profil "Status Akun".
  - SignedOut: "Sign in" (`/sign-in`).

## Detail area autentikasi (`HeaderAuthNav`)
- Kondisi login (`SignedIn`):
  - `Link` ke `/dashboard` (disembunyikan di layar kecil).
  - `UserButton` (Clerk) dengan:
    - Menu item "Papers" (`UserButton.Link`) ke `/dashboard/papers`.
    - Halaman profil custom "Status Akun" (`UserButton.UserProfilePage`) yang menampilkan `AccountStatusPage`.
    - Ikon menu: `FileText`, `User` dari `lucide-react`.
- Kondisi logout (`SignedOut`):
  - `Link` ke `/sign-in`.

## Detail halaman Status Akun (`AccountStatusPage`)
- Loading state: teks "Memuat...".
- Error state: teks "Data tidak tersedia. Silakan refresh halaman."
- Konten utama:
  - Judul "Status Akun" + deskripsi singkat.
  - Baris informasi: Email, Role (pakai `RoleBadge`), Subscription.

## Komponen UI primitif (components/ui) yang dipakai
- `Badge` via `RoleBadge`.

## Komponen UI eksternal yang dipakai
- Next.js: `Link`.
- Clerk: `SignedIn`, `SignedOut`, `UserButton`, `UserButton.MenuItems`, `UserButton.Link`, `UserButton.UserProfilePage`.
- Lucide React: `FileText`, `User`.

## Catatan responsif
- Link "About" dan "Dashboard" disembunyikan di layar kecil (`sm`).

## File indeks
- Detail file per komponen ada di `./files-index.md`.
