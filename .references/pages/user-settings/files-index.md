# Indeks File - Pengaturan Akun

## Sumber screenshot
- `screenshots/user-settings-01.png` - tab Profile.
- `screenshots/user-settings-02.png` - tab Security.
- `screenshots/user-settings-03.png` - tab Status Akun (custom).
- `screenshots/user-settings-dropdown.png` - dropdown akun di header.

## File codebase yang terkait
- `src/components/layout/HeaderAuthNav.tsx` - konfigurasi `UserButton` + halaman profil custom.
- `src/components/user/AccountStatusPage.tsx` - isi tab "Status Akun".
- `src/components/admin/RoleBadge.tsx` - badge role ("Superadmin", "Admin", "User").
- `src/app/layout.tsx` - header global tempat avatar/dropdown muncul.

## Komponen UI internal (components/ui)
- `src/components/ui/badge.tsx` (dipakai oleh `RoleBadge`).

## Komponen UI eksternal
- Clerk: `UserButton`, `UserButton.MenuItems`, `UserButton.Link`, `UserButton.UserProfilePage`, `SignedIn`, `SignedOut`.
- Next.js: `Link` (nav header yang tampil di screenshot dropdown).

## Komponen visual yang terdeteksi (berdasarkan screenshot)
- Modal "Account" (Clerk, dibuka dari UserButton).
- Sidebar navigasi (list item aktif).
- Judul tab + daftar section.
- Avatar.
- Badge/pill status.
- Kebab menu/ellipsis.
- Menu dropdown akun (UserButton).
- Ikon aksi (tanpa label khusus).

## Catatan
- Daftar ini gue susun biar lo gampang nyocokin tampilan screenshot sama file terkait.
