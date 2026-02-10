# Blog Future CMS Plan (Makalah)

Tanggal update: 9 Februari 2026  
Owner: Codex (execution context)  
Scope: Rencana evolusi dari blog publik saat ini ke CMS internal penuh

## 1. Tujuan
Membangun CMS blog tanpa merusak kontrak UI publik yang saat ini sudah stabil di:
1. `src/app/(marketing)/blog/**`
2. `src/components/marketing/blog/**`

## 2. Baseline yang Harus Dipertahankan
Kontrak berikut harus tetap sama setelah CMS masuk:
1. Headline selalu mengikuti rule `featured > latest published`.
2. Feed row tetap berbasis data nyata, single-open expand, dengan metadata box + CTA.
3. Filter publik tetap punya 4 grup: `Cari Konten`, `Kategori`, `Waktu`, `Urutkan`.
4. Detail artikel tetap memakai route `/blog/[slug]` dengan metadata sidebar.

## 3. Gap Utama yang Belum Dikerjakan

### 3.1 Gap schema (`blogSections`)
Perlu lifecycle editorial yang eksplisit:
1. `status`: `draft | scheduled | published | archived`
2. `featuredAt`: timestamp saat konten dijadikan featured
3. `scheduledAt`: jadwal publish
4. `searchText`: agregat searchable text
5. SEO field: `seoTitle`, `seoDescription`
6. Audit field: `createdBy`, `updatedBy`

### 3.2 Gap API
Belum ada API admin khusus CMS:
1. list admin (filter status, kategori, search, sort)
2. create draft
3. update draft
4. publish now
5. schedule publish
6. archive/unarchive
7. set featured transactional (single featured aktif)

### 3.3 Gap admin UI
Belum ada dashboard editorial untuk operasi CMS end-to-end.

## 4. Fase Implementasi

### Fase 1 - Schema & Data Migration
1. Tambah field lifecycle + SEO + audit di `blogSections`.
2. Backfill data lama:
   - kategori lama ke kategori canonical (`Update`, `Tutorial`, `Opini`, `Event`)
   - `status=published` untuk post publik existing
3. Isi `searchText` agar query search lebih efisien.

### Fase 2 - Public Query Stabilization
1. Tambah query publik yang siap skala:
   - `getHeadlinePost()`
   - `getPublicFeed({ cursor, limit, category, timeRange, sort, q })`
   - `getPublicCategoriesWithCount()`
2. Pertahankan output agar kompatibel dengan komponen publik saat ini.

### Fase 3 - Admin CMS API
1. Buat mutation lifecycle editorial (draft/schedule/publish/archive).
2. Buat mutation featured atomic supaya tidak ada featured ganda.
3. Tambah guard role `admin/superadmin`.

### Fase 4 - Admin CMS UI
1. Daftar konten + filter admin.
2. Editor konten (title, excerpt, cover, blocks, SEO).
3. Workflow publish/schedule/archive.
4. Featured toggle + preview publik.

### Fase 5 - Hardening & QA
1. Uji regresi kontrak UI publik (headline/feed/detail/filter).
2. Uji kombinasi filter/search/sort/time range.
3. Audit performa query (cursor pagination, batas default).

## 5. Acceptance Criteria Target CMS
1. Halaman publik hanya menampilkan konten `published`.
2. Dalam satu waktu hanya ada satu featured aktif.
3. Rule fallback headline tetap valid saat featured tidak ada.
4. Admin bisa mengelola lifecycle editorial penuh.
5. Query publik tetap responsif untuk feed panjang.

## 6. Risiko & Mitigasi
1. Risiko kategori lama tidak konsisten.
   - Mitigasi: mapping migrasi + audit hasil migrasi.
2. Risiko featured dobel karena race condition.
   - Mitigasi: mutation atomic untuk set/unset featured.
3. Risiko search berat di data besar.
   - Mitigasi: `searchText` precompute + index + cursor pagination.

## 7. Catatan Operasional
1. Setiap perubahan pada kontrak UI publik harus update `docs/cms/blog/state-current.md`.
2. Setiap perubahan prioritas CMS harus update dokumen ini sebelum implementasi.
