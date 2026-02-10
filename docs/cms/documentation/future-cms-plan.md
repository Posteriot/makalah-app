# Documentation Future CMS Plan (Makalah)

Tanggal update: 10 Februari 2026
Owner: Codex (execution context)
Scope: Rencana evolusi dari halaman dokumentasi publik saat ini ke CMS internal penuh

## 1. Tujuan
Membangun CMS dokumentasi tanpa merusak kontrak UI publik yang saat ini sudah stabil di:
1. `src/app/(marketing)/documentation/**`
2. `src/components/marketing/documentation/**`

## 2. Baseline yang Harus Dipertahankan
Kontrak berikut harus tetap sama setelah CMS masuk:
1. Navigasi sidebar dengan grouped sections dan active state.
2. URL state sync `?section=slug#slug` tanpa full page reload.
3. Search client-side dengan Indonesian stemming tetap berfungsi.
4. Block rendering 3 tipe (`infoCard`, `ctaCards`, `section`) tetap konsisten.
5. Mobile Sheet pattern (trigger icon, Sheet dari kanan, reuse DocSidebar).
6. Section ordering via `order` field, grouping via `group` field.

## 3. Gap Utama yang Belum Dikerjakan

### 3.1 Gap Schema (`documentationSections`)
Perlu lifecycle editorial yang eksplisit:
1. `status`: `draft | scheduled | published | archived` (saat ini hanya `isPublished` boolean).
2. `publishedAt`: timestamp saat konten dipublikasikan (blog punya, docs belum).
3. `scheduledAt`: jadwal publish.
4. SEO field: `seoTitle`, `seoDescription`.
5. Audit field: `createdBy`, `updatedBy`.

### 3.2 Gap API
Belum ada API admin khusus CMS:
1. List admin (filter status, group, search, sort).
2. Create draft section.
3. Update draft section.
4. Publish now.
5. Schedule publish.
6. Archive/unarchive.
7. Reorder sections (update `order` field).
8. Auto-regenerate `searchText` saat konten diubah.

### 3.3 Gap Admin UI
Belum ada dashboard editorial untuk operasi CMS end-to-end.

### 3.4 Gap Khusus Dokumentasi (Tidak Ada di Blog)
1. **Group management**: Blog pakai flat categories, docs pakai hierarchical groups. Perlu UI untuk manage groups (tambah, rename, reorder, hapus).
2. **Icon assignment**: Sidebar icon + header icon perlu UI picker dari daftar Iconoir yang tersedia di `iconMap`.
3. **Cross-reference integrity**: `ctaCards` punya `targetSection` yang reference slug section lain. Bisa broken jika target di-rename/hapus. Perlu validasi referensi.
4. **`searchText` regeneration**: Saat ini hanya di-generate di seed migration. CMS harus auto-regenerate `searchText` setiap kali block content diubah, menggunakan logic `buildSearchText()` yang sama.
5. **Section reordering**: Drag-and-drop atau manual reorder yang update `order` field secara batch.
6. **Block editor**: Editor visual untuk compose/edit 3 block types (`infoCard`, `ctaCards`, `section`) termasuk nested list items dan sub-items.

## 4. Fase Implementasi

### Fase 1 — Schema & Data Migration
1. Tambah field lifecycle + SEO + audit di `documentationSections`:
   - `status`: `draft | scheduled | published | archived` (replace `isPublished`).
   - `publishedAt`, `scheduledAt`: timestamps.
   - `seoTitle`, `seoDescription`: optional string.
   - `createdBy`, `updatedBy`: user ID references.
2. Backfill data lama:
   - `isPublished=true` menjadi `status=published`, `publishedAt=createdAt`.
   - `isPublished=false` menjadi `status=draft`.
3. Migrate public query filter dari `isPublished=true` ke `status=published`.
4. Pindahkan `buildSearchText()` dari seed migration ke shared utility agar bisa dipakai oleh mutation CMS.

### Fase 2 — Public Query Stabilization
1. Tambah/update query publik yang siap skala:
   - `getPublishedSections()` — update filter ke `status=published`, tetap return semua fields.
   - `getSectionBySlug(slug)` — query individual section (untuk potensi deep-link atau SEO).
   - `getNavigationGroups()` — optimized query yang return hanya `slug`, `title`, `group`, `order`, `icon` (tanpa blocks/searchText) untuk sidebar rendering yang lebih ringan.
2. Pertahankan output agar kompatibel dengan komponen publik saat ini.

### Fase 3 — Admin CMS API
1. CRUD mutations:
   - `createDraftSection({ title, slug, group, order, blocks, ... })`.
   - `updateSection({ id, ...fields })` — auto-regenerate `searchText` via `buildSearchText()`.
   - `deleteSection({ id })` — soft delete ke `status=archived`.
2. Lifecycle mutations:
   - `publishSection({ id })` — set `status=published`, `publishedAt=now`.
   - `scheduleSection({ id, scheduledAt })`.
   - `archiveSection({ id })` / `unarchiveSection({ id })`.
3. Reorder mutation:
   - `reorderSections({ updates: [{ id, order }] })` — batch update `order` field.
4. **Docs-specific**: Cross-reference validation.
   - `validateCrossReferences({ sectionId })` — check semua `targetSection` di `ctaCards` blocks masih valid.
   - Jalankan otomatis saat section di-rename (slug change) atau di-archive.
5. Guard role `admin/superadmin` pada semua mutation.

### Fase 4 — Admin CMS UI
1. **Daftar section + filter admin**: tabel dengan filter status, group, search.
2. **Section editor**:
   - Form: title, slug (auto-generate dari title), group (dropdown/create), summary, icons (picker dari `iconMap`).
   - Block editor: visual composer untuk 3 block types.
   - `infoCard`: title, description, items list.
   - `ctaCards`: array of cards, masing-masing title, description, targetSection (dropdown dari existing slugs), ctaText, icon.
   - `section`: title, description, paragraphs (textarea array), list (variant toggle + items + sub-items).
3. **Reorder UI**: drag-and-drop atau up/down arrows per section.
4. **Group management**: sidebar panel untuk manage groups (rename, reorder).
5. **Icon picker**: grid visual dari semua icon yang ada di `iconMap`.
6. **Workflow publish/schedule/archive** dengan status badges.
7. **Preview publik**: render section seperti tampil di halaman publik.
8. **Cross-reference warnings**: highlight `ctaCards` yang `targetSection`-nya broken.

### Fase 5 — Hardening & QA
1. Uji regresi kontrak UI publik:
   - Sidebar navigation + active state.
   - URL state sync.
   - Search (stemming, scoring, snippets, highlight).
   - Block rendering semua 3 tipe.
   - Mobile Sheet behavior.
2. Uji `searchText` regeneration:
   - Edit section via CMS, verifikasi `searchText` ter-update.
   - Search query terhadap konten baru menghasilkan hit yang benar.
3. Uji cross-reference integrity:
   - Rename slug section yang jadi target `ctaCards`, verifikasi warning muncul.
   - Archive section yang jadi target, verifikasi validasi mencegah broken link.
4. Uji reorder:
   - Reorder sections, verifikasi sidebar publik dan artikel navigation (prev/next) tetap konsisten.
5. Audit performa:
   - Pastikan `getPublishedSections` tetap responsif seiring jumlah section bertambah.
   - Evaluasi apakah `getNavigationGroups` (lightweight query) diperlukan untuk optimasi.

## 5. Acceptance Criteria Target CMS
1. Halaman publik hanya menampilkan konten `status=published`.
2. Admin bisa mengelola lifecycle editorial penuh (draft/schedule/publish/archive).
3. `searchText` otomatis ter-regenerate setiap kali konten section diubah.
4. Cross-reference `targetSection` di `ctaCards` tervalidasi — warning jika target tidak ada.
5. Section ordering bisa diubah via admin tanpa direct database edit.
6. Group management tersedia (tambah, rename, reorder groups).
7. Query publik tetap responsif dan kompatibel dengan komponen frontend saat ini.
8. URL state sync dan search client-side tetap berfungsi tanpa perubahan di frontend.

## 6. Risiko & Mitigasi
1. **Risiko `searchText` stale setelah edit**.
   - Mitigasi: auto-regenerate di setiap mutation `updateSection`, gunakan `buildSearchText()` yang sama dengan seed.
2. **Risiko cross-reference broken saat slug berubah**.
   - Mitigasi: validasi otomatis + warning di admin UI. Opsi: auto-update references atau block rename jika ada dependents.
3. **Risiko group ordering tidak konsisten**.
   - Mitigasi: groups tampil berdasarkan urutan section pertama di tiap group (implicit ordering dari `order` field). Atau tambah explicit `groupOrder` field jika perlu kontrol lebih.
4. **Risiko block editor complexity**.
   - Mitigasi: implementasi incremental — mulai dari `section` block (paling umum), lalu `infoCard`, terakhir `ctaCards` (paling kompleks karena cross-reference).
5. **Risiko migration `isPublished` ke `status`**.
   - Mitigasi: backfill script + dual-read period (query support both `isPublished` dan `status`) sampai migration selesai diverifikasi.

## 7. Catatan Operasional
1. Setiap perubahan pada kontrak UI publik dokumentasi harus update `docs/cms/documentation/state-current.md`.
2. Setiap perubahan prioritas CMS harus update dokumen ini sebelum implementasi.
3. `documentationBlock` validator di schema shared dengan `blogSections` — perubahan pada validator harus diuji dampaknya ke kedua halaman.
