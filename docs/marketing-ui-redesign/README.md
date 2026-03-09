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

## Cara Pakai

Urutan baca yang dipakai untuk branch ini saat ini:

1. Baca [`context.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/context.md) untuk memahami kondisi aktual codebase.
2. Untuk audit header, lanjut baca [`global-header/readme-header.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/readme-header.md).
3. Lanjut ke [`global-header/audit-findings.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/audit-findings.md) untuk melihat bug dan risk yang ditemukan.
4. Lanjut ke [`global-header/design.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/design.md) untuk keputusan desain yang sudah disetujui.
5. Gunakan [`global-header/implementation-plan.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/implementation-plan.md) untuk menelusuri patch yang sudah dieksekusi dan struktur task-nya.
6. Gunakan [`global-header/qa-checklist.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/qa-checklist.md) sebagai pola verifikasi UI manual.

## Cara Memakai Sebagai Acuan Styling

Untuk halaman atau komponen marketing lain, dokumen folder ini sekarang bisa dipakai dengan urutan praktis berikut:

1. Cocokkan komponen target terhadap baseline di [`context.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/context.md): `home`, `chat`, dan `global header`.
2. Periksa apakah token dan state styling target sudah bergerak lewat [`globals-new.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css), bukan masih bertopang ke [`globals.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals.css).
3. Gunakan paket dokumen `global-header` sebagai contoh lengkap alur kerja: konteks → findings → design → implementation plan → QA checklist.
4. Perlakukan utility semantik, state token, dan skeleton/loading yang sudah tervalidasi di header sebagai indikator konsistensi, bukan sekadar detail khusus header.

## Status Folder

Status dokumentasi saat ini:

- `context.md` sudah tersedia
- `global-header/readme-header.md` sudah tersedia
- `global-header/audit-findings.md` sudah tersedia
- `global-header/design.md` sudah tersedia
- `global-header/implementation-plan.md` sudah tersedia
- `global-header/qa-checklist.md` sudah tersedia
- dokumen keputusan teknis lanjutan untuk page lain belum dibuat

README ini akan menjadi indeks tetap untuk semua dokumen yang ditambahkan berikutnya di folder `docs/marketing-ui-redesign`.
