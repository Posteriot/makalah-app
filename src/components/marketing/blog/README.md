# Blog Section

Halaman blog marketing (`/blog` dan `/blog/[slug]`). Data-driven dari Convex CMS (`api.blog.getPublishedPosts`, `api.blog.getFeaturedPost`, `api.blog.getPostBySlug`).

## Scope

README ini untuk dev internal/agent agar paham struktur, perilaku, dan sumber konten tanpa baca semua file satu per satu. Semua poin di bawah ini sesuai dengan isi file di `src/components/marketing/blog`.

## Struktur

```
blog/
├── index.ts                # Re-exports 6 komponen
├── BlogLandingPage.tsx     # Landing page: data fetch, filters, layout, mobile Sheet
├── BlogArticlePage.tsx     # Article detail page: slug-based fetch, blocks renderer
├── BlogHeadlineSection.tsx # Headline card: thumbnail, title, metadata bar
├── BlogFeedSection.tsx     # Feed section: accordion post rows with expand/collapse
├── BlogFiltersPanel.tsx    # Filter panel: search, category, time range, sort
├── BlogNewsletterSection.tsx # Newsletter signup card
├── types.ts                # Type definitions + filter constants
├── utils.ts                # Category normalization, time range check, placeholder SVG
└── README.md               # Dokumentasi ini
```

## Penggunaan

```tsx
import { BlogLandingPage } from "@/components/marketing/blog"
```

Dua route:
- `/blog` → `src/app/(marketing)/blog/page.tsx` → thin wrapper rendering `<BlogLandingPage />`
- `/blog/[slug]` → `src/app/(marketing)/blog/[slug]/page.tsx` → async server component passing `slug` prop ke `<BlogArticlePage slug={slug} />`

## Ekspor (index.ts)

- `BlogLandingPage`
- `BlogArticlePage`
- `BlogFeedSection`
- `BlogFiltersPanel`
- `BlogHeadlineSection`
- `BlogNewsletterSection`

## Blog Routes

**page.tsx (`/blog`)**
- Server component, hanya render `<BlogLandingPage />`.

**[slug]/page.tsx (`/blog/[slug]`)**
- Async server component.
- Accepts `params: Promise<{ slug: string }>`.
- Awaits params, passes slug ke `<BlogArticlePage slug={slug} />`.

## Blog Landing Layout (BlogLandingPage.tsx)

- Page wrapper: `bg-background text-foreground`.
- Section wrapper: `relative isolate overflow-hidden border-b border-hairline bg-[color:var(--section-bg-alt)]`.
- Background: `DottedPattern` (spacing 24, tanpa radial mask, opacity-100, z-0).
- Content container: `max-w-7xl`, `px-4 md:px-8`, padding-top dynamic: `pt-[calc(var(--header-h)+16px)] md:pt-[calc(var(--header-h)+20px)]`.
- Grid: `grid-cols-1 md:grid-cols-16`, `gap-comfort`.
- Sidebar (desktop): `md:col-span-4`, `hidden md:block`, card wrapper (`rounded-shell border-hairline bg-card/90 p-comfort backdrop-blur-[1px] dark:bg-slate-900`), sticky positioning (`top: calc(var(--header-h) + 16px)`).
- Main content: `md:col-span-12`.
- Mobile filter button: `md:hidden`, `flex justify-end mb-5`, icon `FilterList` (h-7 w-7), aria-label "Buka filter".
- Content flow (top to bottom): BlogHeadlineSection → mobile post count → BlogFeedSection → BlogNewsletterSection.
- Mobile Sheet: side="right", `w-[320px] p-5 sm:max-w-[320px]`, header "Filter Konten" (`text-signal`, `text-[10px]`).
- Sheet reuses BlogFiltersPanel dengan `mobile` prop.

## Komponen dan Tanggung Jawab

- `BlogLandingPage.tsx`: client component, orchestrator utama. Fetch posts + featured post dari Convex. Manage state: `searchQuery`, `categoryFilter`, `timeRangeFilter`, `sortFilter`, `mobileFilterOpen`, `expandedRowKey`. Derive `headlinePost` (featured > latest > null), `feedPosts` (filtered, sorted, headline excluded). Render layout grid: BlogFiltersPanel (desktop sidebar) + BlogHeadlineSection + BlogFeedSection + BlogNewsletterSection + mobile Sheet.
- `BlogArticlePage.tsx`: client component, article detail page. Fetch single post by slug dari Convex. Render 4 states: loading (skeleton), not found ("Artikel Tidak Ditemukan"), unpublished ("Artikel Tidak Tersedia"), content (back link + header + cover image + metadata sidebar + article body). Has its own local `renderInline` and `BlockRenderer` (not shared dengan documentation page). Metadata sidebar: sticky, with date, author, read time, category, share buttons (Twitter/X + LinkedIn).
- `BlogHeadlineSection.tsx`: client component, headline card. Renders loading skeleton, empty state, atau headline article. Uses `SectionBadge` ("Headline"), thumbnail image (cover or placeholder), title with hover link, excerpt, metadata bar with `DiagonalStripes`, `SectionCTA`.
- `BlogFeedSection.tsx`: client component, accordion-style feed. Loading skeleton (4 rows), empty state with Search icon ("Konten Tidak Ditemukan"), atau post list. Each row: thumbnail (`RowThumbnail`), category+date label, title (double-click navigates), excerpt. Expand reveals metadata bar with `DiagonalStripes` + `SectionCTA`. Toggle button shows "+" atau "−".
- `BlogFiltersPanel.tsx`: client component, 4 filter groups. Search (with `Input` + Search icon), Category buttons (5 options incl "Semua" with counts), Time Range buttons (5 options: all/7d/30d/90d/year), Sort buttons (2 options: newest/oldest). Active/inactive states per button. `mobile` prop adds extra padding.
- `BlogNewsletterSection.tsx`: client component, newsletter signup. Card with title "Tetap Terhubung", description, email `Input` + `SectionCTA` "Gabung" button.
- `types.ts`: type definitions + filter constants. `BlogPost` (alias `Doc<"blogSections">`), `CATEGORY_OPTIONS` (5: Semua, Update, Tutorial, Opini, Event), `TIME_RANGE_OPTIONS` (5: all, 7d, 30d, 90d, year), `SORT_OPTIONS` (2: newest, oldest). Type aliases: `CategoryFilter`, `CanonicalCategory`, `TimeRangeFilter`, `SortFilter`.
- `utils.ts`: utility functions. `normalizeCategory`: maps raw + title + excerpt keywords ke 4 canonical categories (Update, Tutorial, Opini, Event). `isInTimeRange`: checks timestamp against time range filter. `createPlaceholderImageDataUri`: generates SVG data URI with category-colored gradient, border, lines, dot, category label, title text.

## Client Components

Komponen yang memakai `"use client"`:
- `BlogLandingPage.tsx` — `useQuery`, `useState`, `useMemo`
- `BlogArticlePage.tsx` — `useQuery`, `useMemo`
- `BlogHeadlineSection.tsx` — rendered dalam client tree, pakai `Image` + `Link`
- `BlogFeedSection.tsx` — `useRouter` (untuk double-click navigation)
- `BlogFiltersPanel.tsx` — rendered dalam client tree, pakai `Input`
- `BlogNewsletterSection.tsx` — rendered dalam client tree, pakai `Input` + `SectionCTA`

Pure utility/types (tanpa `"use client"`):
- `types.ts`
- `utils.ts`

Page wrappers:
- `src/app/(marketing)/blog/page.tsx`: server component, render `BlogLandingPage`.
- `src/app/(marketing)/blog/[slug]/page.tsx`: async server component, await `params.slug` lalu render `BlogArticlePage`.

## Perilaku Ringkas

**BlogLandingPage**
- Fetch: `getPublishedPosts` (limit 200) + `getFeaturedPost` dari Convex.
- Headline logic: `featuredPost ?? latestPost ?? null`. Latest = sort by `publishedAt` desc, take first.
- Feed filtering: category → time range → search query (haystack: title + excerpt + author + normalized category).
- Feed sorting: newest (desc) atau oldest (asc) by `publishedAt`.
- Feed excludes headline post jika memungkinkan; kalau remaining < 4, headline dimasukkan kembali (keeps min 4 rows).
- Expand/collapse: satu row expanded at a time (`expandedRowKey`). Click title button → expand. Click toggle → toggle. Stale key auto-cleared ketika `rowKeys` berubah.
- Mobile filter: `Sheet` side `"right"`, reuses `BlogFiltersPanel` dengan prop `mobile`.

**BlogArticlePage**
- Fetch: `getPostBySlug` dari Convex dengan slug param.
- 4 render states:
  1. `post === undefined` → loading skeleton (4 animated blocks).
  2. `post === null` → "Artikel Tidak Ditemukan" with back link.
  3. `!post.isPublished` → "Artikel Tidak Tersedia" with back link.
  4. Published post → full article layout.
- Cover image: `post.coverImage` atau placeholder SVG (1920x1080).
- Article URL computed dari `NEXT_PUBLIC_APP_URL` untuk share links.
- Share buttons: Twitter/X intent URL + LinkedIn sharing URL.
- Metadata sidebar: sticky, 4 fields (tanggal, penulis, waktu baca, kategori) + share buttons.

**BlogHeadlineSection**
- 3 states: loading (skeleton), no post (dashed border empty state), headline post (card dengan image + title + excerpt + metadata bar).
- Thumbnail: 84px mobile, 112px desktop (aspect-square).
- Image hover: `scale-[1.03]` transition.
- Title hover: `text-sky-700` (light) / `text-sky-200` (dark).
- Metadata bar: `DiagonalStripes` background, category + author + date + read time + `SectionCTA` "Baca".

**BlogFeedSection**
- 3 states: loading (4 skeleton rows), empty ("Konten Tidak Ditemukan" dengan `Search` icon), posts (accordion list).
- Row thumbnail: 72px mobile, 88px desktop.
- Row title: double-click navigates ke `/blog/[slug]` via `router.push`.
- Expanded row: background `bg-slate-100 dark:bg-slate-700`, shows excerpt + metadata bar.
- Toggle button: `"+"` (collapsed) / `"−"` (expanded), text `[1.9rem]`.

**BlogFiltersPanel**
- 4 groups dipisahkan oleh `border-b border-slate-300 dark:border-slate-700`.
- Setiap group punya label (`text-narrative text-sm font-medium`).
- Category buttons: full width (`grid-cols-1`), show count, active state matches sidebar nav styling.
- Time range: `grid-cols-2`.
- Sort: `grid-cols-2`.
- Active button: `border-slate-500 bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100`.
- Inactive button: `border-border text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-500 hover:text-slate-50`.
- Prop `mobile` menambahkan `px-1 pb-4`.

**BlogNewsletterSection**
- Card dengan title "Tetap Terhubung", description, email input + `SectionCTA`.
- Hover: `hover:bg-card dark:hover:bg-slate-800` dengan `transition-colors duration-200`.

## Data & Konstanta

**Convex data source:**
- Table: `blogSections`
- Queries:
  - `api.blog.getPublishedPosts` — params: `{ category: undefined, limit: 200 }`. Returns published blog posts.
  - `api.blog.getFeaturedPost` — no params. Returns featured post atau null.
  - `api.blog.getPostBySlug` — params: `{ slug: string }`. Returns single post atau null.
- Fields yang dipakai: `_id`, `slug`, `title`, `excerpt`, `author`, `readTime`, `category`, `publishedAt`, `coverImage`, `isPublished`, `blocks`.

**CATEGORY_OPTIONS (types.ts):**
- `["Semua", "Update", "Tutorial", "Opini", "Event"]`
- Canonical categories (exclude "Semua"): `Update`, `Tutorial`, `Opini`, `Event`.

**TIME_RANGE_OPTIONS (types.ts):**
- `all` → "Semua"
- `7d` → "7 hari"
- `30d` → "30 hari"
- `90d` → "90 hari"
- `year` → "Tahun ini"

**SORT_OPTIONS (types.ts):**
- `newest` → "Terbaru"
- `oldest` → "Terlama"

**PLACEHOLDER_PALETTE (utils.ts):**
- `Update`: start `#0f3b35`, end `#0a2622`, accent `#34d399` (emerald).
- `Tutorial`: start `#1f355e`, end `#121f39`, accent `#60a5fa` (blue).
- `Opini`: start `#493410`, end `#2f2208`, accent `#f59e0b` (amber).
- `Event`: start `#3e1947`, end `#220c28`, accent `#e879f9` (fuchsia).

## Konten yang Ditampilkan

**BlogHeadlineSection**
- Badge: "Headline" via `SectionBadge`.
- Thumbnail: cover image atau placeholder SVG (512x512).
- Title: `h1`, `text-xl md:text-[2rem]`, hover color change.
- Excerpt: `line-clamp-2`.
- Metadata bar: `"/ KATEGORI"`, author, date (format: "1 Januari 2026"), read time, `SectionCTA` "Baca".

**BlogFeedSection (per row)**
- Thumbnail: cover image atau placeholder SVG (256x256).
- Category+date label: `"/ KATEGORI | DD/MM/YYYY"`.
- Title: `h3`, `text-base md:text-lg`, hover color, double-click navigates.
- Excerpt: `line-clamp-1`.
- Expanded detail: full excerpt, metadata bar sama pattern seperti headline.

**BlogFiltersPanel**
- Group labels: "Cari Konten", "Kategori", "Waktu", "Urutkan".
- Search: `Input` dengan `Search` icon, placeholder `"Cari..."`.
- Category buttons: text + count (right side), 5 opsi.
- Time range buttons: 5 opsi dalam 2-col grid.
- Sort buttons: 2 opsi dalam 2-col grid.

**BlogNewsletterSection**
- Title: "Tetap Terhubung".
- Description: "Dapatkan update terbaru dari Makalah langsung di email Anda."
- Input: placeholder `"Alamat email..."`.
- CTA: "Gabung" via `SectionCTA`.

## Article Page States (BlogArticlePage)

**Loading state (`post === undefined`):**
- Section wrapper sama seperti content state.
- 4 skeleton blocks dengan `animate-pulse`:
  - Badge placeholder: `h-16 w-48`.
  - Title placeholder: `h-[4.5rem] w-full md:w-3/4`.
  - Excerpt placeholder: `h-6 w-full md:w-1/2`.
  - Cover placeholder: `h-[420px]` full width.

**Not found state (`post === null`):**
- Title: "Artikel Tidak Ditemukan".
- Message: "Slug artikel tidak tersedia atau sudah dihapus."
- Back link: "Kembali ke Blog" dengan `ArrowLeft` icon, `border-amber-500/40` + `text-amber-500`.

**Unpublished state (`!post.isPublished`):**
- Title: "Artikel Tidak Tersedia".
- Message: "Artikel ini belum dipublikasikan."
- Back link style sama seperti not found.

**Content state (published post):**
- Back link: "Kembali ke Blog" dengan `border-border` styling.
- Header: `h1` dengan `text-[2.35rem] md:text-[5.2rem]` + excerpt.
- Cover image: `rounded-shell`, `h-[220px] md:h-[460px]`, `object-cover`, `priority`.
- Grid: `grid-cols-1 md:grid-cols-16`.
- Aside (`md:col-span-4`): sticky metadata card — label `"/ METADATA"`, 4 rows (tanggal, penulis, waktu baca, kategori), share buttons (Twitter/X + LinkedIn).
- Article (`md:col-span-12`): blocks rendered oleh `BlockRenderer`, fallback ke excerpt kalau tidak ada blocks.

## Block Renderer (BlogArticlePage)

BlogArticlePage punya sistem block rendering LOCAL sendiri (TIDAK shared dengan documentation page).

**renderInline (local di BlogArticlePage.tsx):**
- `**text**` → `<strong className="font-semibold text-foreground">` (catatan: tanpa prefix `text-narrative`, berbeda dari documentation page)
- `` `code` `` → `<code className="rounded-action border-main border-border bg-muted/40 px-1 py-0.5 text-xs text-foreground">` (catatan: pakai `rounded-action` + `border` alih-alih `rounded-sm` + `bg-slate-950/10`)
- Plain text → `<span>`

**BlockRenderer — 3 block types (discriminated union DocBlock):**

`section` type:
- h2: `text-narrative mb-3 text-2xl leading-tight font-medium md:text-3xl`
- Description: `text-narrative mb-5 text-base leading-relaxed text-muted-foreground`
- Paragraphs: `text-narrative text-lg leading-relaxed text-foreground/90` (lebih besar dari documentation)
- Numbered list: custom counter `text-signal mr-2 text-xs font-bold tracking-widest text-amber-500` dengan `padStart(2, "0")`
- Bullet list: amber dash marker `text-amber-500`
- Sub-items: `mt-2 ml-8 space-y-1`, `text-sm text-muted-foreground`, dash prefix

`infoCard` type:
- Container: `rounded-shell border-hairline bg-card/30 p-5 dark:bg-slate-800/40 md:p-6`
- Title: `text-narrative mb-2 text-xl font-medium`
- Description: `text-narrative mb-4 text-sm leading-relaxed text-muted-foreground`
- Items: amber dash marker, `text-narrative text-sm leading-relaxed text-foreground/90`

`ctaCards` type:
- Container: `rounded-shell border-hairline bg-card/20 p-5 dark:bg-slate-800/35 md:p-6`
- Grid: `grid-cols-1 md:grid-cols-2`, `gap-4`
- Each card: Link ke `/documentation?section=xxx#xxx`
- Card: `rounded-action border-main border-border bg-background/60 p-4 transition-colors hover:bg-accent`
- Title: `text-narrative mb-2 text-base font-medium`
- Description: `text-narrative mb-3 text-sm leading-relaxed text-muted-foreground`
- CTA: `text-signal text-[10px] font-bold tracking-widest text-amber-500` dengan ArrowRight icon

**Perbedaan utama dari block renderer documentation page:**
- Blog pakai `text-amber-500` untuk list markers (documentation pakai `text-info`)
- Blog infoCard pakai `bg-card/30` (documentation pakai `border-info/20 bg-info/5` dengan left accent)
- Blog renderInline code element pakai `rounded-action border-main border-border bg-muted/40` (documentation pakai `rounded-sm bg-slate-950/10`)
- Blog section paragraphs pakai `text-lg` (documentation pakai `text-sm`)
- Blog numbered list pakai custom amber counter alih-alih standard `list-decimal`

## Placeholder Image System (utils.ts)

**`createPlaceholderImageDataUri`:**
- Generate inline SVG sebagai data URI (`data:image/svg+xml;charset=UTF-8,...`).
- Input: `title`, `category`, `width`, `height`.
- Category → canonical category → palette lookup.
- SVG berisi: gradient background, rounded border, 2 horizontal lines, circle accent, category label (monospace, uppercase), title label (sans-serif, uppercase, max 32 chars).
- Dipakai di 3 konteks:
  - BlogHeadlineSection: 512x512 thumbnail
  - BlogFeedSection (RowThumbnail): 256x256 thumbnail
  - BlogArticlePage: 1920x1080 cover

**`normalizeCategory`:**
- Input: raw category + title + excerpt.
- Direct matches: `"update"`, `"tutorial"`, `"opini"`, `"event"`.
- Alias mappings: `"produk"`/`"dinamika"` → Update, `"penelitian"`/`"perspektif"` → Opini.
- Keyword search di combined source: `"tutorial"`/`"panduan"`/`"how-to"` → Tutorial, `"event"`/`"webinar"`/`"launch"`/`"rilis"` → Event, `"opini"`/`"perspektif"`/`"analisis"` → Opini.
- Fallback: `"Update"`.

**`isInTimeRange`:**
- `"all"` → selalu `true`.
- `"7d"`/`"30d"`/`"90d"` → timestamp >= (now - days).
- `"year"` → timestamp >= awal tahun berjalan.

## Styling

- Kelas utility/Tailwind dipakai langsung di komponen.
- Typography semantic: `text-narrative` untuk body/paragraf, `text-interface` untuk UI labels/kontrol, `text-signal` untuk badge/tracking text.
- Card containers: `rounded-shell border-hairline bg-card/90 backdrop-blur-[1px] dark:bg-slate-900` (sidebar, headline, newsletter).
- Feed container: `rounded-shell border-hairline bg-card/85 dark:bg-slate-900` (opacity sedikit lebih rendah).
- Elemen interaktif (button, input): `rounded-action`.
- Filter buttons active: `border-slate-500 bg-slate-900/60 text-slate-100 dark:bg-slate-200/10` (pattern sama dengan documentation sidebar).
- Filter buttons hover: `hover:bg-slate-200 dark:hover:bg-slate-500 hover:text-slate-50`.
- Feed row expanded: `bg-slate-100 dark:bg-slate-700`.
- Title hover: `group-hover:text-sky-700 dark:group-hover:text-sky-200` (sky color scheme untuk links).
- Newsletter card hover: `hover:bg-card dark:hover:bg-slate-800` dengan `transition-colors duration-200`.
- Metadata bar: `DiagonalStripes` background (opacity-40), `rounded-md border-hairline border bg-slate-100 dark:bg-slate-800`.
- Article page title: extra large `text-[2.35rem] md:text-[5.2rem]` dengan tight tracking.
- Loading skeletons: `animate-pulse border-hairline bg-card/40 dark:bg-slate-800/45`.
- Search input: `blog-neutral-input` custom class, pattern sama dengan documentation.

## Dependencies

- `convex/react` (`useQuery`) untuk data fetch posts dari Convex.
- `@convex/_generated/api` untuk referensi query `api.blog.getPublishedPosts`, `api.blog.getFeaturedPost`, `api.blog.getPostBySlug`.
- `@convex/_generated/dataModel` untuk `Doc<"blogSections">` type.
- `next/navigation` (`useRouter`) untuk double-click navigation di feed rows.
- `next/link` untuk article links, back navigation, share links.
- `next/image` untuk cover images dan thumbnails.
- `iconoir-react`: `FilterList` (mobile filter button), `Search` (filter panel icon, empty state), `ArrowRight` (SectionCTA, ctaCards), `ArrowLeft` (back link).
- `@/components/ui/sheet` (`Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`) untuk mobile filter drawer.
- `@/components/ui/section-badge` (`SectionBadge`) untuk headline badge.
- `@/components/ui/section-cta` (`SectionCTA`) untuk CTA buttons (headline, feed rows, newsletter).
- `@/components/ui/input` (`Input`) untuk search dan newsletter email input.
- `@/components/marketing/SectionBackground` (`DottedPattern`) untuk background pattern.
- `@/components/marketing/SectionBackground` (`DiagonalStripes`) untuk metadata bar backgrounds.
- `cn` dari `@/lib/utils` untuk komposisi className.
