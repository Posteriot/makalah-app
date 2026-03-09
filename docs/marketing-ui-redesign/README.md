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

## Dokumen

### 1. Context

- [`context.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/context.md)
  - Fungsi: dokumen riset netral untuk memetakan kondisi styling saat ini, source of truth token, dependency legacy, dan area target branch ini.
  - Catatan: belum berisi rekomendasi implementasi rinci.

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
  - Catatan: belum dieksekusi ke kode aplikasi.

## Cara Pakai

Urutan baca yang dipakai untuk branch ini saat ini:

1. Baca [`context.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/context.md) untuk memahami kondisi aktual codebase.
2. Untuk audit header, lanjut baca [`global-header/readme-header.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/readme-header.md).
3. Lanjut ke [`global-header/audit-findings.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/audit-findings.md) untuk melihat bug dan risk yang ditemukan.
4. Lanjut ke [`global-header/design.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/design.md) untuk keputusan desain yang sudah disetujui.
5. Gunakan [`global-header/implementation-plan.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/implementation-plan.md) saat masuk tahap eksekusi.

## Status Folder

Status dokumentasi saat ini:

- `context.md` sudah tersedia
- `global-header/readme-header.md` sudah tersedia
- `global-header/audit-findings.md` sudah tersedia
- `global-header/design.md` sudah tersedia
- `global-header/implementation-plan.md` sudah tersedia
- dokumen keputusan teknis lanjutan belum dibuat

README ini akan menjadi indeks tetap untuk semua dokumen yang ditambahkan berikutnya di folder `docs/marketing-ui-redesign`.
