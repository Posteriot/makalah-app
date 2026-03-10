# Marketing UI Redesign Docs

Indeks dokumen kerja untuk branch `marketing-pages-ui-design`.

Folder ini dipakai sebagai basis dokumentasi untuk dua konteks kerja:

- migrasi styling system
- redesign visual total saat diminta

Area utama yang dicakup:

- `home`
- `about`
- `pricing`
- `documentation`
- `blog`

Standar desain yang jadi acuan:

- `home`
- halaman `chat` yang sudah memakai token mandiri di [`globals-new.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css)

Misi utama yang menjadi payung dokumen di folder ini:

- menata styling agar compliant dengan Tailwind
- melepas seluruh ketergantungan dari [`globals.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals.css)
- migrasi ke [`globals-new.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css)

Status acuan saat ini di branch:

- `home` tetap menjadi referensi visual marketing utama
- `chat` tetap menjadi referensi pola token mandiri berbasis scope
- `global header` sudah melewati audit, redesign terbatas, cleanup styling, dan verifikasi, sehingga sekarang bisa dipakai sebagai referensi implementasi komponen marketing yang sudah lebih dekat ke target migration state
- `footer` non-chat sudah melewati audit, migration checklist, design, implementation, review fix, dan verifikasi, sehingga sekarang menjadi referensi kedua untuk migrasi komponen lintas-shell non-chat ke `globals-new.css`

## Dokumen

### 1. Context

- [`context.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/context.md)
  - Fungsi: dokumen riset netral untuk memetakan kondisi styling saat ini, source of truth token, dependency legacy, dan baseline styling yang sudah tervalidasi di branch ini.
  - Catatan: tetap netral, tetapi sekarang bisa dipakai sebagai acuan audit konsistensi untuk halaman atau komponen marketing lain.

### 2. Header Audit Context

- [`global-header/readme-header.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/readme-header.md)
  - Fungsi: konteks awal untuk audit `GlobalHeader` dan `UserDropdown`, termasuk state flow auth, hotspot perilaku menu, potensi race condition, dan gap testing.
  - Catatan: masih berupa fondasi audit, belum berisi hasil audit final atau usulan redesign.

### 3. Header Audit Findings

- [`global-header/audit-findings.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/audit-findings.md)
  - Fungsi: hasil audit awal untuk `GlobalHeader` dan `UserDropdown`, berisi bug/risk yang terverifikasi dari pembacaan kode.
  - Catatan: belum berisi keputusan implementasi atau patch perbaikan.

### 4. Header Design

- [`global-header/design.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/design.md)
  - Fungsi: desain perbaikan header berdasarkan findings audit yang sudah disetujui section by section.
  - Catatan: fokus pada kontrak auth, perilaku menu, arah redesign visual yang terbatas, dan kriteria selesai.

### 5. Header Implementation Plan

- [`global-header/implementation-plan.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/implementation-plan.md)
  - Fungsi: rencana implementasi bertahap untuk menurunkan desain header ke task eksekusi.
  - Catatan: sudah menjadi basis eksekusi header pada branch ini.

### 6. Header QA Checklist

- [`global-header/qa-checklist.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/qa-checklist.md)
  - Fungsi: checklist QA manual untuk memverifikasi perilaku auth, menu, redirect, loading state, dan mobile/desktop header.
  - Catatan: bisa dipakai ulang sebagai pola verifikasi UI untuk komponen marketing lain yang punya state penting.

### 7. Footer Audit Context

- [`footer/readme-footer.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/readme-footer.md)
  - Fungsi: konteks awal untuk audit footer non-chat, termasuk sentralisasi komponen, kontrak CMS, auth-gated support link, dan hotspot styling terhadap token `core`.
  - Catatan: masih berupa fondasi audit, belum berisi keputusan migrasi atau redesign footer.

### 8. Footer Audit Findings

- [`footer/audit-findings.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/audit-findings.md)
  - Fungsi: hasil audit awal footer non-chat, berisi risk dan inkonsistensi yang terverifikasi dari pembacaan kode.
  - Catatan: belum berisi keputusan implementasi atau patch footer.

### 9. Footer Migration Checklist

- [`footer/migration-checklist.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/migration-checklist.md)
  - Fungsi: menurunkan findings footer menjadi fase migrasi yang urut dan bisa dieksekusi.
  - Catatan: menjadi jembatan antara audit footer, design doc, dan implementation plan.

### 10. Footer Design

- [`footer/design.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/design.md)
  - Fungsi: keputusan desain untuk cleanup/migration footer sebelum redesign visual dilakukan.
  - Catatan: fokus pada kontrak shell, token, CMS authority, fallback, dan testing.

### 11. Footer Implementation Plan

- [`footer/implementation-plan.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/implementation-plan.md)
  - Fungsi: rencana implementasi bertahap untuk menurunkan desain migrasi footer ke task eksekusi.
  - Catatan: sudah dieksekusi pada branch ini dan sekarang berfungsi sebagai jejak task implementasi footer yang selesai.

## Cara Pakai

Urutan baca yang dipakai untuk branch ini saat ini:

1. Baca [`context.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/context.md) untuk memahami kondisi aktual codebase.
2. Untuk audit header, lanjut baca [`global-header/readme-header.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/readme-header.md).
3. Lanjut ke [`global-header/audit-findings.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/audit-findings.md) untuk melihat bug dan risk yang ditemukan.
4. Lanjut ke [`global-header/design.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/design.md) untuk keputusan desain yang sudah disetujui.
5. Gunakan [`global-header/implementation-plan.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/implementation-plan.md) untuk menelusuri patch yang sudah dieksekusi dan struktur task-nya.
6. Gunakan [`global-header/qa-checklist.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/qa-checklist.md) sebagai pola verifikasi UI manual.

Untuk audit footer, urutan baca praktisnya:

1. Baca [`context.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/context.md) untuk baseline styling branch.
2. Lanjut ke [`footer/readme-footer.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/readme-footer.md) untuk konteks audit footer non-chat.
3. Lanjut ke [`footer/audit-findings.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/audit-findings.md) untuk melihat gap sentralisasi, kontrak token, dan kontrak CMS footer yang sudah terverifikasi.
4. Gunakan [`footer/migration-checklist.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/migration-checklist.md) untuk menerjemahkan findings menjadi urutan cleanup.
5. Lanjut ke [`footer/design.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/design.md) untuk keputusan desain migrasi footer.
6. Gunakan [`footer/implementation-plan.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/implementation-plan.md) sebagai basis eksekusi.
7. Anggap hasil implementasi footer di kode sebagai baseline komponen non-chat kedua setelah header: shell `core` seragam, kontrak CMS lebih eksplisit, fallback lebih aman, dan regression test sudah tracked di source tree.

## Cara Memakai Sebagai Acuan Styling

Untuk halaman atau komponen marketing lain, dokumen folder ini sekarang bisa dipakai dengan urutan praktis berikut:

1. Cocokkan komponen target terhadap baseline di [`context.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/context.md): `home`, `chat`, dan `global header`.
2. Periksa apakah token dan state styling target sudah bergerak lewat [`globals-new.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css), bukan masih bertopang ke [`globals.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals.css).
3. Gunakan paket dokumen `global-header` dan `footer` sebagai contoh lengkap alur kerja: konteks → findings → checklist/design → implementation plan → verifikasi.
4. Perlakukan utility semantik, state token, shell `core`, dan skeleton/loading yang sudah tervalidasi di header/footer sebagai indikator konsistensi, bukan sekadar detail khusus komponen tertentu.

## Status Folder

Status dokumentasi saat ini:

- `context.md` sudah tersedia
- `global-header/readme-header.md` sudah tersedia
- `global-header/audit-findings.md` sudah tersedia
- `global-header/design.md` sudah tersedia
- `global-header/implementation-plan.md` sudah tersedia
- `global-header/qa-checklist.md` sudah tersedia
- `footer/readme-footer.md` sudah tersedia
- `footer/audit-findings.md` sudah tersedia
- `footer/migration-checklist.md` sudah tersedia
- `footer/design.md` sudah tersedia
- `footer/implementation-plan.md` sudah tersedia
- implementasi footer non-chat sudah selesai dan sudah merged ke `main`
- dokumen keputusan teknis lanjutan untuk page lain belum dibuat

README ini akan menjadi indeks tetap untuk semua dokumen yang ditambahkan berikutnya di folder `docs/marketing-ui-redesign`.
