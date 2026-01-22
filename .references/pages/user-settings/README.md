# Dokumentasi Pengaturan Akun (berdasarkan screenshot)

## Cakupan
- Sumber visual yang gue pakai:
  - `screenshots/user-settings-01.png` (tab Profile)
  - `screenshots/user-settings-02.png` (tab Security)
  - `screenshots/user-settings-03.png` (tab Status Akun)
  - `screenshots/user-settings-dropdown.png` (dropdown akun)
- Fokus ke UI/components yang tampak di layar, termasuk bagian custom "Status Akun", biar lo bisa ngikutin mapping-nya.

## Struktur UI utama
- Modal "Account" (Clerk, dibuka dari UserButton) dengan tombol tutup "X" di kanan atas.
  - Sidebar kiri: judul "Account", teks "Manage your account info.", daftar menu: "Profile", "Security", "Status Akun".
  - Konten kanan: judul tab + daftar section per tab.

## Detail tab Profile (user-settings-01)
- Header tab: "Profile details".
- Section "Profile":
  - Avatar bulat, nama pengguna.
  - Aksi teks "Update profile".
- Section "Email addresses":
  - Email utama + badge "Primary".
  - Aksi "Add email address" dengan ikon plus.
  - Kebab menu/ellipsis untuk opsi tambahan.
- Section "Connected accounts":
  - Aksi "Connect account" dengan ikon plus.

## Detail tab Security (user-settings-02)
- Header tab: "Security".
- Section "Password":
  - Indikator kata sandi disamarkan.
  - Aksi "Update password".
- Section "Active devices":
  - Daftar perangkat aktif (nama perangkat, browser, lokasi, waktu).
  - Badge "This device" pada perangkat aktif saat ini.
  - Kebab menu/ellipsis untuk opsi tiap perangkat.
- Section "Delete account":
  - Aksi "Delete account" (teks merah).

## Detail tab Status Akun (user-settings-03)
- Header tab: "Status Akun".
- Deskripsi: "Informasi akun Anda di Makalah App".
- Baris informasi:
  - Email (nilai di kanan).
  - Role (badge pill merah: "Superadmin").
  - Subscription (nilai "Free").

## Detail dropdown akun (user-settings-dropdown)
- Menu dropdown dari avatar di header (UserButton).
- Bagian identitas:
  - Avatar bulat.
  - Nama pengguna + email.
- Daftar aksi:
  - "Manage account" (ikon gear).
  - "Papers" (ikon dokumen).
  - "Sign out" (ikon keluar).

## Komponen UI yang terdeteksi (berdasarkan tampilan)
- Modal "Account" + tombol tutup (ikon X).
- Sidebar navigasi (list item aktif/hover).
- Avatar bulat.
- Badge/pill status ("Primary", "This device", "Superadmin").
- List/row dengan divider.
- Tombol/aksi teks ("Update profile", "Update password", "Delete account").
- Kebab menu/ellipsis (aksi tambahan).
- Menu dropdown akun.
- Ikon di menu/aksi (tanpa label khusus).

## Komponen custom yang terlihat
- "Status Akun" adalah halaman profil custom (dipasang via `UserButton.UserProfilePage`).
- Badge role terlihat sebagai komponen `RoleBadge`.

## Komponen eksternal yang terlihat
- UI modal + dropdown akun berasal dari Clerk (via UserButton).
- Ikon di dropdown mengikuti set ikon bawaan/ikon dari Clerk.

## File indeks
- Detail mapping file dan komponen ada di `./files-index.md`.
