# Chat Empty State CMS Plan

## Tujuan
Menambahkan pengelolaan konten empty state halaman chat ke CMS, khusus untuk:
1. Upload logo (dark dan light).
2. Edit teks penjelasan empty state.
3. Edit dan tambah template prompt.

Dokumen ini hanya rencana implementasi. Belum ada eksekusi kode.

## Keputusan Final (Sudah Divalidasi)
1. Logo memakai dua varian: dark dan light.
2. Template memakai satu field teks per item (teks tombol sama dengan prompt yang dikirim).
3. Aktivasi konten mengikuti publish gate existing (`isPublished`).

## Ruang Lingkup
- Menambah entri page Chat di CMS shell.
- Menambah editor baru untuk section `chat-empty-state`.
- Menyimpan data ke tabel `pageContent` (reuse pola existing).
- Menghubungkan frontend chat empty state agar membaca data CMS dengan fallback aman.
- Mengupdate dokumentasi CMS agar sesuai codebase.

## Di Luar Scope
- Perubahan layout besar halaman chat.
- Perubahan workflow chat selain area empty state yang ditunjuk.
- Migrasi konten lama di luar section baru ini.

## Arsitektur Teknis

### 1) Integrasi CMS Navigation
- Tambah `chat` ke `CmsPageId`.
- Tambah item Chat di:
  - Activity bar.
  - Main overview.
  - Sidebar section list.
- Tambah section baru di sidebar:
  - `chat-empty-state` dengan label `Empty State`.

### 2) Editor Baru: `ChatEmptyStateEditor`
Editor berbasis pola existing (`CmsSaveButton`, `CmsImageUpload`, `Switch`):
- Field logo dark (`primaryImageId`).
- Field logo light (`secondaryImageId`).
- Field heading (`title`) untuk teks utama (contoh: `Mari berdiskusi!`).
- Field deskripsi multiline (`paragraphs[]`), dipetakan ke 3 baris teks existing.
- Field label template (`subtitle`) untuk teks `Atau gunakan template berikut:`.
- Field daftar template (`items[]`) dengan struktur:
  - `title`: teks template (dipakai sebagai label tombol + prompt).
  - `description`: diset sama dengan `title` agar valid dengan schema existing.
  - `icon`: optional, tidak dipakai UI chat.
  - `imageId`: optional, tidak dipakai UI chat.
- Toggle `isPublished`.

### 3) Penyimpanan Data (Convex `pageContent`)
Gunakan 1 record:
- `pageSlug: "chat"`
- `sectionSlug: "chat-empty-state"`
- `sectionType: "page-settings"` (reuse tipe existing, tanpa ubah union schema)
- `sortOrder: 1`

Mapping field:
- `primaryImageId` => logo dark.
- `secondaryImageId` => logo light.
- `title` => heading.
- `paragraphs` => body text lines.
- `subtitle` => label bagian template.
- `items[]` => template list.

### 4) Frontend Chat Consumption
`TemplateGrid` akan:
- Query section `chat/chat-empty-state`.
- Menggunakan data CMS hanya jika `isPublished === true`.
- Fallback ke hardcoded existing jika:
  - record belum ada,
  - record belum dipublish,
  - field tertentu kosong.

Fallback yang dipertahankan:
- Logo default dark/light.
- Heading default.
- 3 baris teks penjelasan default.
- Label template default.
- 2 template default.

## Rencana Task Eksekusi

1. **CMS shell wiring**
- Update type/konstanta page & section di `CmsActivityBar`, `CmsSidebar`, `CmsShell`, `CmsMainOverview`.
- Tambah status summary page Chat di overview.

2. **Buat editor baru**
- Tambah file `ChatEmptyStateEditor.tsx`.
- Implement form, dynamic template list (add/remove/edit), save/publish.

3. **Hook editor ke shell**
- Tambah routing editor untuk `chat-empty-state`.
- Pastikan empty state CMS overview untuk page Chat tampil konsisten.

4. **Hubungkan frontend chat**
- Refactor `TemplateGrid` supaya baca data CMS + fallback.
- Pertahankan callback `onTemplateSelect` dan `onSidebarLinkClick` tanpa ubah behavior.

5. **Dokumentasi**
- Update `docs/cms/README.md`:
  - page Chat masuk CMS architecture.
  - section `chat-empty-state`.
  - mapping field dan fallback behavior.
  - file map editor baru.

6. **Verifikasi**
- Verifikasi save draft, publish, unpublish.
- Verifikasi upload logo dark/light.
- Verifikasi tambah/hapus template.
- Verifikasi klik template tetap mengirim prompt ke flow existing.

## Kriteria Selesai
- Admin bisa mengatur logo dark/light, teks, dan template empty state chat dari CMS.
- Konten baru muncul di chat hanya saat `Published`.
- Saat `Draft/Unpublished`, chat tetap pakai fallback hardcoded yang sekarang.
- Tidak ada regresi pada flow kirim pesan dan starter prompt.
- Dokumentasi CMS sinkron dengan implementasi final.

## Risiko dan Mitigasi
- **Risiko:** `items[]` schema mewajibkan `title` dan `description`.
  - **Mitigasi:** simpan `description = title` di editor.
- **Risiko:** data kosong menyebabkan UI blank.
  - **Mitigasi:** fallback per field di `TemplateGrid`.
- **Risiko:** perubahan nav CMS berdampak ke keyboard navigation.
  - **Mitigasi:** update daftar page untuk arrow/home/end navigation.

## Catatan Implementasi
- Tidak menambah tabel baru.
- Tidak menambah enum schema baru jika belum perlu.
- Prioritas: perubahan minimal, konsisten dengan pola CMS existing.
