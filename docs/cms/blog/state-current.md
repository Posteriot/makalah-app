# Blog State Current (Makalah)

Tanggal update: 9 Februari 2026  
Owner: Codex (execution context)  
Scope: Kondisi implementasi blog publik yang aktif di kode saat ini

## 1. Tujuan
Dokumen ini jadi referensi implementasi aktual untuk:
1. Struktur route publik blog.
2. Struktur komponen modular di folder blog.
3. Behavior UI yang sudah aktif.
4. Kontrak data/query publik yang sedang dipakai.

## 2. Route Publik (Aktual)
1. `src/app/(marketing)/blog/page.tsx`
   - Wrapper tipis, hanya render `BlogLandingPage`.
2. `src/app/(marketing)/blog/[slug]/page.tsx`
   - Dynamic route artikel, render `BlogArticlePage`.
   - Menggunakan pola Next.js 16 (`params` async).

## 3. Struktur Komponen Blog (Aktual)
Lokasi: `src/components/marketing/blog`

1. `BlogLandingPage.tsx`
   - Mengambil data dengan `useQuery(api.blog.getPublishedPosts)` dan `useQuery(api.blog.getFeaturedPost)`.
   - Menentukan headline dengan rule: `featured` menang, fallback ke latest published.
   - Mengelola state filter: search, kategori, waktu, sort.
   - Mengelola state expand row feed (single-open).
2. `BlogFiltersPanel.tsx`
   - Search input.
   - Filter kategori: `Semua`, `Update`, `Tutorial`, `Opini`, `Event`.
   - Filter waktu: `Semua`, `7 hari`, `30 hari`, `90 hari`, `Tahun ini`.
   - Sort: `Terbaru`, `Terlama`.
   - Dipakai di desktop (sidebar sticky) dan mobile (sheet).
3. `BlogHeadlineSection.tsx`
   - Kartu headline utama.
   - Label menggunakan `SectionBadge` dengan teks `Headline`.
   - Thumbnail square di kiri judul (cover asli atau fallback `createPlaceholderImageDataUri`).
   - Judul headline bisa diklik ke detail artikel.
   - Metadata box 2 kolom + CTA, dengan overlay `DiagonalStripes`.
4. `BlogFeedSection.tsx`
   - List artikel berbasis row data asli (tanpa filler row statis).
   - Tiap row menampilkan thumbnail square, meta (`/ KATEGORI | TANGGAL`), judul, excerpt.
   - Expand/collapse via tanda `+` / `−`, dan hanya satu row terbuka.
   - Judul row mendukung double-click untuk navigasi ke detail artikel.
   - Area expanded memiliki metadata box + CTA + overlay `DiagonalStripes`.
5. `BlogNewsletterSection.tsx`
   - Form email + CTA `Gabung`.
6. `BlogArticlePage.tsx`
   - Menangani state: loading, slug tidak ditemukan, belum dipublikasikan, dan artikel valid.
   - Header artikel: tombol kembali, judul, excerpt, cover landscape.
   - Sidebar metadata sticky: tanggal, penulis, waktu baca, kategori, dan tombol share.
   - Konten artikel dirender dari `blocks` (`section`, `infoCard`, `ctaCards`).
7. `types.ts`
   - Definisi `BlogPost` dan semua opsi filter/sort.
8. `utils.ts`
   - `normalizeCategory`
   - `isInTimeRange`
   - `createPlaceholderImageDataUri`
9. `index.ts`
   - Re-export komponen blog utama.

## 4. Behavior UI Publik (Aktual)

### 4.1 Halaman `/blog`
1. Tidak memakai hero.
2. Section teratas adalah satu kartu headline.
3. Rule headline:
   - Jika ada `featured`, pakai featured.
   - Jika tidak ada `featured`, pakai latest published.
4. Feed dihitung dari hasil filter client-side:
   - Search query.
   - Kategori terpilih.
   - Rentang waktu.
   - Urutan terbaru/terlama.
5. Exclusion headline dari feed:
   - Secara default headline dikeluarkan dari list feed.
   - Jika hasil jadi kurang dari 4 row, headline boleh masuk lagi supaya list tetap terisi data nyata.
6. Sidebar filter:
   - Desktop: sticky.
   - Mobile: `Sheet`.
7. Surface utama memakai background card non-transparan di atas pattern agar keterbacaan stabil.

### 4.2 Halaman `/blog/[slug]`
1. Tombol `Kembali ke Blog` tampil konsisten dengan gaya interface.
2. Metadata kategori/tanggal tidak ditaruh lagi di atas judul.
3. Metadata utama dipusatkan di kartu sidebar.
4. Kontainer isi artikel memakai padding internal yang cukup untuk baca panjang.

### 4.3 Konvensi visual yang sudah aktif
1. CTA pada kartu blog memakai `SectionCTA`.
2. Label section memakai `SectionBadge`.
3. Pattern background halaman memakai `DottedPattern`.
4. Metadata box headline dan expanded feed memakai `DiagonalStripes`.
5. Pada dark mode judul feed state diam `dark:text-slate-100`, state hover `dark:group-hover:text-sky-200`.

## 5. Data & Query Publik yang Dipakai
1. Tabel: `blogSections` di `convex/schema.ts`.
2. Query publik aktif:
   - `api.blog.getPublishedPosts`
   - `api.blog.getFeaturedPost`
   - `api.blog.getPostBySlug`
3. Filter/search/sort masih diproses di client dari hasil query publik.
4. Belum ada pagination publik berbasis cursor.

## 6. Checklist Sinkronisasi
1. Semua route blog publik sudah memakai komponen dari `src/components/marketing/blog`.
2. Rule headline `featured > latest` sudah aktif.
3. Feed single-open expand/collapse sudah aktif.
4. Semua row feed memakai data nyata dari `blogSections`.
5. Thumbnail fallback generator (`createPlaceholderImageDataUri`) sudah dipakai di list dan detail.
6. Metadata stripes (`DiagonalStripes`) aktif di headline metadata dan expanded metadata feed.
