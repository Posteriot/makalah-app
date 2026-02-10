# Documentation State Current (Makalah)

Tanggal update: 10 Februari 2026
Owner: Codex (execution context)
Scope: Kondisi implementasi halaman dokumentasi publik yang aktif di kode saat ini

## 1. Tujuan
Dokumen ini jadi referensi implementasi aktual untuk:
1. Struktur route publik dokumentasi.
2. Struktur komponen modular di folder documentation.
3. Behavior UI yang sudah aktif.
4. Search architecture client-side (Indonesian stemming, scoring, snippets).
5. Kontrak data/query publik yang sedang dipakai.

## 2. Route Publik (Aktual)
1. `src/app/(marketing)/documentation/page.tsx`
   - Wrapper tipis, hanya render `DocumentationPage`.
   - Navigasi antar-section via URL state: `?section=slug#slug` dengan `router.replace` (tanpa full page reload).
   - Tidak ada dynamic route `[slug]` — semua section di-render di satu halaman.

## 3. Struktur Komponen Dokumentasi (Aktual)
Lokasi: `src/components/marketing/documentation`

1. `DocumentationPage.tsx`
   - Orchestrator utama.
   - Fetch data via `useQuery(api.documentationSections.getPublishedSections)`.
   - Manage state: `activeSection`, `mobileNavOpen`, `query`, `results`.
   - Membangun search index, scoring, dan URL sync di dalam komponen ini.
   - Desktop: `<aside>` wraps DocSidebar dalam card container.
   - Mobile: Sheet dari kanan dengan trigger `SidebarExpand` icon.
   - `handleMobileSelect`: navigasi + auto-close Sheet.
2. `DocSidebar.tsx`
   - Pure content component (tanpa `<aside>` wrapper).
   - Search input (`blog-neutral-input` class, tanpa blue focus ring) + grouped navigation.
   - Dipakai di desktop (dalam aside) dan mobile (dalam Sheet) — pattern yang sama dengan `BlogFiltersPanel`.
   - Search results dropdown: max 6 hasil, snippet + highlight, Enter navigasi ke hasil teratas.
3. `DocArticle.tsx`
   - Render konten section aktif dalam card container `max-w-4xl`.
   - Header: `SectionBadge` (group name) + icon + title + summary.
   - Support 3 block types: `infoCard`, `ctaCards`, `section`.
   - Inline markdown via `renderInline()`: `**bold**` menjadi `<strong>`, backtick-code menjadi `<code>`.
   - Mobile-only prev/next navigation buttons di bawah artikel.
4. `types.ts`
   - `DocBlock` (union 3 types: `infoCard`, `ctaCards`, `section`).
   - `DocListItem`, `DocList` (untuk list dalam section block).
   - `DocumentationSection` (model utama).
   - `SearchRecord` (index entry untuk search).
   - `NavigationGroup` (sidebar group).
5. `utils.tsx`
   - Icon map backward-compatible (Lucide keys ke Iconoir components): `BookOpen` ke `Book`, `FileText` ke `Page`, `Lightbulb` ke `LightBulb`, `Users` ke `Group`, `Zap` ke `Flash`, plus `Globe`, `Settings`, `ShieldCheck` direct.
   - Indonesian text normalization: `baseNorm`, `stripDiacritics`, `tokenize`, `stemToken`, `tokensFromText`.
   - Search scoring: `scoreDoc` (stem-based, title 2x weight).
   - Snippet generation: `makeSnippetAdvanced`, `highlightSnippet` (HTML-safe).
   - Inline renderer: `renderInline` (bold + code markdown ke React elements).
6. `index.ts`
   - Re-export: `DocumentationPage`, `DocSidebar`, `DocArticle`.

## 4. Behavior UI Publik (Aktual)

### 4.1 Halaman `/documentation`
1. Tidak memakai hero. Layout langsung grid 16-kolom: sidebar kiri (4 col) + artikel kanan (12 col).
2. Section pertama otomatis aktif via logic: `?section` param, lalu hash fragment, lalu fallback ke `orderedSections[0]`.
3. URL state sync: `router.replace` update `?section=slug#slug` tanpa scroll reset.
4. Background memakai `DottedPattern` di bawah konten dengan `bg-[color:var(--section-bg-alt)]`.
5. Surface utama (sidebar card + article card) memakai `rounded-shell border-hairline bg-card/90 backdrop-blur-[1px]`.

### 4.2 Sidebar (Desktop)
1. Sticky di dalam aside, dibungkus card container.
2. Search input dengan `blog-neutral-input` class (tanpa blue focus ring).
3. Hasil search muncul sebagai dropdown di bawah input: max 6 hasil, dengan snippet + highlight.
4. Enter pada search langsung navigasi ke hasil teratas.
5. Navigation grouped by `group` field: tiap group punya heading `text-signal` + list items.
6. Active item: `bg-slate-900/60 text-slate-100` (dark: `bg-slate-200/10`). Arrow icon di kanan.
7. Inactive item: `text-muted-foreground`, hover `bg-slate-200 text-slate-900` (dark: `bg-slate-500 text-slate-50`).

### 4.3 Sidebar (Mobile)
1. Trigger: `SidebarExpand` icon (h-7 w-7, strokeWidth 1.5) di kanan atas, `md:hidden`.
2. Sheet dari kanan, lebar w-72, padding p-0.
3. Header: `SheetHeader` + `SheetTitle` "Navigasi Dokumentasi" (`text-signal text-[10px] font-bold tracking-widest text-foreground`).
4. Konten: reuse `DocSidebar` dalam `overflow-y-auto p-comfort` — identik dengan desktop.
5. Select section menyebabkan navigasi + auto-close Sheet via `handleMobileSelect`.

### 4.4 Artikel
1. Card container `max-w-4xl` dengan `rounded-shell border-hairline bg-card/90`.
2. Header: `SectionBadge` (group name) + optional icon + title (`text-narrative text-2xl md:text-3xl`) + optional summary.
3. Block rendering:
   - `infoCard`: border-left info color, bullet list items.
   - `ctaCards`: 2-col grid, hover lift (`hover:-translate-y-1`), button navigasi ke `targetSection`.
   - `section`: heading + optional description + optional paragraphs + optional ordered/unordered list dengan sub-items.
4. Inline markdown: `renderInline()` parse bold dan backtick-code dalam list items, paragraphs, dan sub-items.
5. Mobile-only prev/next navigation buttons di bawah artikel (border-t separator).

### 4.5 Konvensi visual yang sudah aktif
1. Label section memakai `SectionBadge`.
2. Pattern background memakai `DottedPattern`.
3. Search highlight memakai `<mark>` tag (HTML escaped sebelum injeksi).
4. Icon library: Iconoir, dengan backward-compatible map dari key Lucide lama.
5. Font classes: `text-narrative` untuk heading/title, `text-interface` untuk UI/mono, `text-signal` untuk badges/labels.

## 5. Search Architecture (Client-Side)

### 5.1 Gambaran Umum
Search berjalan sepenuhnya di client. Tidak ada server-side search query. Semua data di-fetch sekali via `getPublishedSections`, lalu di-index dan di-score di browser. Performa bergantung pada jumlah section dan panjang `searchText`.

### 5.2 Search Index
Index dibangun dari `useMemo` di `DocumentationPage.tsx`. Setiap section menghasilkan satu `SearchRecord`:
- `id`: slug
- `title`: judul asli
- `text`: `searchText` (precomputed aggregat dari semua block content)
- `stemTitle`: hasil stemming dari title
- `stemText`: hasil stemming dari searchText

### 5.3 Text Normalization Pipeline
Pipeline di `utils.tsx`, urutan:
1. `baseNorm()` — lowercase + strip diacritics (NFKD decomposition, hapus combining marks).
2. `tokenize()` — baseNorm, lalu hapus non-alphanumeric, lalu split whitespace, lalu filter empty.
3. `stemToken()` — strip non-letter boundaries, lalu hapus suffix Indonesian (`-nya`, `-lah`, `-kah`, `-pun`, `-ku`, `-mu`), lalu hapus suffix derivasi (`-kan`, `-an`, `-i`) hanya jika token > 4 karakter.
4. `tokensFromText()` — tokenize, lalu map stemToken, lalu filter empty.

### 5.4 Scoring (Dual-Strategy)
Scoring di `DocumentationPage.tsx` pakai dua strategi paralel, ambil skor tertinggi:

1. **Stem-based scoring** (`scoreDoc`): cocokkan stem query vs `stemTitle` dan `stemText`. Title hit bernilai 2x text hit.
2. **Plain includes scoring**: cocokkan raw query terms langsung ke `baseNorm(title + text)` tanpa stemming. Fallback untuk kata-kata yang stemming-nya terlalu agresif.

Skor akhir: `max(stemScore, rawScore) + bias` (bias +0.5 kalau section sedang aktif).

Hasil: filter score > 0, sort descending, potong max 6 hasil.

### 5.5 Snippet Generation
1. `makeSnippetAdvanced()` — cari posisi match pertama di teks via regex dari stems, ambil kurang-lebih 80 karakter sekitar match. Fallback: 120 karakter pertama.
2. `highlightSnippet()` — escape HTML via `escapeHtml()` dulu, baru inject mark tag pada stem matches. Aman dari XSS karena escape diterapkan sebelum injeksi tag.

### 5.6 `searchText` Precomputation
Field `searchText` di-generate oleh `buildSearchText()` di seed migration (`convex/migrations/seedDocumentationSections.ts`). Logic:
- Concat: title + summary + semua block content (title, description, paragraphs, list items, sub-items, CTA text).
- Collapse whitespace.
- **Kritis untuk CMS**: saat ini `searchText` hanya di-generate saat seed. Belum ada mekanisme auto-regenerate saat konten diubah via admin.

### 5.7 Keamanan Render Snippet
Snippet HTML di-render via inner HTML injection di `DocSidebar.tsx`. Safety chain:
1. `escapeHtml()` di-apply ke raw snippet text terlebih dahulu.
2. Baru kemudian mark tag di-inject via regex replace.
3. Sumber data: `searchText` dari database (admin-controlled, bukan user input publik).

## 6. Data & Query Publik yang Dipakai
1. Tabel: `documentationSections` di `convex/schema.ts`.
2. Schema fields:
   - `slug` (string) — identifier URL-safe, unique via index `by_slug`.
   - `title` (string) — judul section.
   - `group` (string) — nama grup navigasi ("Mulai", "Fitur Utama", "Panduan Lanjutan").
   - `order` (number) — urutan tampil, index `by_order`.
   - `icon` (optional string) — key Iconoir untuk sidebar.
   - `headerIcon` (optional string) — key Iconoir untuk header artikel.
   - `summary` (optional string) — intro text di bawah judul artikel.
   - `blocks` (array of `documentationBlock`) — konten utama, union: `infoCard | ctaCards | section`.
   - `searchText` (string) — precomputed aggregat untuk search index.
   - `isPublished` (boolean) — filter publik.
   - `createdAt`, `updatedAt` (number) — timestamps.
3. Indexes: `by_order`, `by_slug`, `by_published(isPublished, order)`.
4. Block type shared: `documentationBlock` validator dipakai juga oleh `blogSections`.
5. Query publik aktif:
   - `api.documentationSections.getPublishedSections` — satu-satunya query, filter `isPublished=true` via index `by_published`, return semua fields.
6. Sorting dilakukan di client (`orderedSections` sort by `order`).
7. Grouping dilakukan di client (`navigationGroups` dari `group` field).
8. Belum ada query admin, belum ada mutation CRUD.

## 7. Checklist Sinkronisasi
1. Route dokumentasi publik sudah memakai komponen dari `src/components/marketing/documentation`.
2. URL state sync `?section=slug#slug` sudah aktif.
3. Mobile Sheet pattern konsisten dengan blog (Sheet dari kanan, icon trigger, SheetHeader + SheetTitle).
4. DocSidebar reusable sebagai pure content component (desktop aside + mobile Sheet).
5. Search client-side dengan Indonesian stemming sudah aktif.
6. `searchText` precomputed di seed migration sudah dipakai oleh search index.
7. Block rendering support 3 tipe: `infoCard`, `ctaCards`, `section`.
8. Inline markdown renderer (`renderInline`) aktif untuk bold + code.
9. Icon map backward-compatible (Lucide keys ke Iconoir components).
