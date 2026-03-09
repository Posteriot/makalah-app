# Global Header QA Checklist

**Status:** Draft  
**Branch:** `marketing-pages-ui-design`  
**Date:** 2026-03-09

## Tujuan

Checklist ini dipakai untuk memverifikasi bahwa implementasi perbaikan `GlobalHeader`, `UserDropdown`, dan kontrak auth terkait sudah berjalan benar lewat UI.

## Setup

1. Jalankan app dari worktree:

```bash
cd /Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design
npm run dev
```

2. Buka `http://localhost:3000`.
3. Siapkan dua kondisi:
   - browser dalam keadaan logged-out
   - browser dalam keadaan logged-in
4. Siapkan pengujian di dua viewport:
   - desktop
   - mobile

## Halaman Uji

Lakukan verifikasi minimal di halaman berikut:

- `/`
- `/about`
- `/pricing`
- `/documentation?section=intro#api`
- `/blog`

## Checklist Desktop Logged-out

- [ ] Header merender tombol `Masuk`.
- [ ] Header tidak merender `UserDropdown`.
- [ ] Header tidak merender `theme toggle`.
- [ ] Badge user atau indikator subscription tidak muncul.
- [ ] Link `Chat` tidak mengarah ke jalur signed-in palsu.
- [ ] Refresh halaman tidak memunculkan flash UI logged-in.

## Checklist Desktop Logged-in

- [ ] Tombol `Masuk` tidak muncul.
- [ ] `UserDropdown` muncul.
- [ ] `theme toggle` muncul.
- [ ] Badge user atau indicator subscription tampil konsisten jika data user tersedia.
- [ ] Link `Chat` resolve ke jalur authenticated.
- [ ] Membuka dropdown berhasil.
- [ ] Klik di luar dropdown menutup dropdown.
- [ ] Tombol `Escape` menutup dropdown.

## Checklist Mobile Logged-out

- [ ] Hamburger menu bisa dibuka.
- [ ] Navigasi utama tampil normal.
- [ ] Tombol `Masuk` muncul di mobile menu.
- [ ] Section auth signed-in tidak muncul.
- [ ] `theme toggle` tidak muncul.
- [ ] Klik link navigasi menutup mobile menu.

## Checklist Mobile Logged-in

- [ ] Hamburger menu bisa dibuka.
- [ ] Section auth mobile muncul hanya saat authenticated final.
- [ ] Nama user tampil konsisten.
- [ ] `theme toggle` muncul dengan kontrak yang sama seperti desktop.
- [ ] Klik link navigasi menutup mobile menu.
- [ ] Pindah route menutup mobile menu.

## Checklist Redirect Login

Gunakan halaman: `/documentation?section=intro#api`

- [ ] Saat logged-out, klik `Masuk` dari desktop membawa user ke URL sign-in dengan `redirect_url`.
- [ ] `redirect_url` mengandung path, query string, dan hash.
- [ ] Setelah login sukses, user kembali ke `/documentation?section=intro#api`.
- [ ] State section/hash tetap utuh setelah redirect selesai.

## Checklist Sign-out

Uji dari desktop dropdown dan mobile auth menu.

- [ ] Saat `Sign out` diklik, menu auth langsung menutup.
- [ ] Trigger auth tidak tetap interaktif dalam transisi logout.
- [ ] UI tidak menampilkan `Masuk` dan signed-in UI secara bersamaan.
- [ ] Nama user tidak tertinggal setelah logout final.
- [ ] `theme toggle` tidak tertinggal pada state logged-in setelah logout selesai.
- [ ] Setelah logout final, header kembali ke state logged-out yang bersih.
- [ ] Refresh halaman setelah logout tidak mengembalikan UI logged-in palsu.

## Checklist Revalidation dan Tab Switch

Uji saat user logged-in.

- [ ] Pindah tab browser beberapa detik lalu kembali tidak memunculkan kombinasi UI auth yang kontradiktif.
- [ ] Refresh cepat tidak memunculkan `Masuk` dan `UserDropdown` secara bersamaan.
- [ ] Header tetap jatuh ke state tunggal: `loading`, `authenticated`, atau `unauthenticated`.
- [ ] Cache data user tidak mempertahankan signed-in UI saat session final hilang.

## Kriteria Gagal

Anggap verifikasi gagal jika salah satu kondisi ini muncul:

- [ ] `Masuk` dan `UserDropdown` tampil bersamaan.
- [ ] Dropdown masih terbuka atau masih bisa dipakai ketika logout dimulai.
- [ ] Nama user masih tampil setelah logout final.
- [ ] `theme toggle` tampil di state logged-out.
- [ ] Redirect login membuang query string atau hash.
- [ ] Mobile dan desktop menunjukkan aturan auth yang berbeda tanpa alasan yang jelas.

## Bukti yang Dicatat

Saat QA manual dilakukan, catat minimal:

- halaman yang diuji
- status auth saat diuji
- viewport yang dipakai
- hasil pass/fail
- screenshot bila ada bug
- langkah reproduksi singkat jika gagal

## Related Docs

- [`readme-header.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/readme-header.md)
- [`audit-findings.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/audit-findings.md)
- [`design.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/design.md)
- [`implementation-plan.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/implementation-plan.md)
