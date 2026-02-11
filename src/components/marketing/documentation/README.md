# Documentation Section

Halaman dokumentasi marketing `/documentation`. Konten data-driven dari Convex CMS (`api.documentationSections.getPublishedSections`).

## Scope

README ini untuk dev internal/agent agar paham struktur, perilaku, dan sumber konten tanpa baca semua file satu per satu. Semua poin di bawah ini sesuai dengan isi file di `src/components/marketing/documentation`.

## Struktur

```
documentation/
├── index.ts              # Re-exports semua komponen
├── DocumentationPage.tsx # Layout utama, state, routing, search, mobile Sheet
├── DocSidebar.tsx        # Sidebar navigasi + search input + hasil pencarian
├── DocArticle.tsx        # Area artikel/konten dokumentasi + prev/next nav
├── types.ts              # Type definitions (DocumentationSection, DocBlock, dll)
├── utils.tsx             # Icon map, text normalisation, stemming, scoring, inline renderer
└── README.md             # Dokumentasi ini
```

> **Note:** Tidak ada `DocMobileSidebar.tsx`. Mobile sidebar ditangani langsung di `DocumentationPage.tsx` via shadcn `Sheet` yang me-reuse komponen `DocSidebar`.

## Penggunaan

```tsx
import { DocumentationPage } from "@/components/marketing/documentation"
```

Integrasi utamanya ada di `src/app/(marketing)/documentation/page.tsx`.

```tsx
// page.tsx
import { DocumentationPage } from "@/components/marketing/documentation"

export default function Page() {
  return <DocumentationPage />
}
```

## Ekspor (index.ts)

- `DocumentationPage`
- `DocSidebar`
- `DocArticle`

## Documentation Layout (page.tsx + DocumentationPage.tsx)

- `page.tsx` hanya render `<DocumentationPage />`, tanpa layout tambahan.
- `DocumentationPage` membungkus `DocumentationContent` di dalam `<Suspense>` dengan fallback `DocumentationLoading`.
- Loading state: spinner `RefreshDouble` (`animate-spin`) + teks "Memuat dokumentasi..." (`min-h-screen`, centered).
- Section wrapper: `relative isolate overflow-hidden bg-[color:var(--section-bg-alt)] pt-[var(--header-h)]`.
- Background: `DottedPattern` (spacing 24, tanpa radial mask, `opacity-100`, `z-0`).
- Content container: `relative z-10 mx-auto w-full max-w-7xl px-4 lg:px-8`.
- Grid: `grid-cols-1 gap-comfort pb-6 md:grid-cols-16`.
- Sidebar (desktop): `<aside>` di `md:col-span-4`, `hidden md:block`. Card wrapper: `mt-4 rounded-shell border-hairline bg-card/90 p-comfort backdrop-blur-[1px] dark:bg-slate-900`.
- Article area: `col-span-1 pt-4 md:col-span-12`.
- Mobile nav button: `md:hidden`, `flex justify-end mb-4`. Icon `SidebarExpand` (h-7 w-7), `aria-label="Buka navigasi"`.
- Mobile Sheet (shadcn): `side="right"`, `w-72 p-0`. Header: "Navigasi Dokumentasi" (`text-signal`, `text-[10px]`, bold, tracking-widest). Body: `overflow-y-auto p-comfort`, me-reuse `DocSidebar` dengan `handleMobileSelect` (select + tutup sheet).

## Komponen dan Tanggung Jawab

- `DocumentationPage.tsx`: client component, layout utama. Fetch data via `useQuery(api.documentationSections.getPublishedSections)`. Mengelola state: `activeSection`, `mobileNavOpen`, `query`, `results`. Sorting sections by `order`. Grouping sections ke `NavigationGroup[]` by `group` field. Client-side search: tokenize, stem (Indonesian-aware), score, rank (max 6 hasil). URL sync via `useRouter`/`useSearchParams` (`?section=slug#slug`). Resolve initial section dari search param, hash, atau fallback ke section pertama. Prev/next section navigation. Menyediakan `Suspense` boundary dengan `DocumentationLoading` fallback.
- `DocSidebar.tsx`: presentational component, sidebar navigasi. Search input (`placeholder="Cari dokumentasi..."`). Hasil pencarian dengan snippet + highlight (HTML-escaped sebelum inject `<mark>` tags). Enter untuk buka hasil teratas. Grouped navigation list dengan icon per item (`getIcon`). Active state styling: `bg-slate-900/60` (light) / `bg-slate-200/10` (dark) + `NavArrowRight` indicator.
- `DocArticle.tsx`: presentational component, area konten. Render `DocumentationSection` aktif. Header: `SectionBadge` (group name) + icon + `h1` title + summary. Block renderer mendukung 3 tipe: `infoCard` (bordered card, bullet list, left border accent `border-info`), `ctaCards` (grid 2-col, hover lift `-translate-y-1`, navigasi ke `targetSection`), `section` (heading + description + paragraphs + ordered/unordered list dengan sub-items). Prev/next navigation buttons (`md:hidden`, border-t separator). Empty state: "Dokumentasi sedang dimuat."
- `types.ts`: type definitions. `DocBlock` (discriminated union: `infoCard` | `ctaCards` | `section`), `DocumentationSection` (slug, title, group, order, icon, headerIcon, summary, blocks, searchText), `SearchRecord` (id, title, text, stemTitle, stemText), `NavigationGroup` (title, items), `DocListItem`, `DocList`.
- `utils.tsx`: utility functions. `getIcon`: map string key ke `iconoir-react` component (8 icon: Book, Page, Globe, LightBulb, Settings, ShieldCheck, Group, Flash). Text processing: `stripDiacritics`, `baseNorm`, `stemToken` (strip Indonesian suffixes: -nya, -lah, -kah, -pun, -ku, -mu, -kan, -an, -i), `tokenize`, `tokensFromText`. Scoring: `scoreDoc` (title hits x2 + text hits). Snippets: `makeSnippet`, `makeSnippetAdvanced`, `highlightSnippet` (HTML-safe via `escapeHtml`). `renderInline`: parse bold (`**text**`) dan code (backtick) jadi React elements.

## Client Components

Komponen yang memakai `"use client"`:
- `DocumentationPage.tsx`

Presentational components (tanpa `"use client"`, tapi di-render di dalam client tree):
- `DocSidebar.tsx`
- `DocArticle.tsx`

Utility / types (tanpa `"use client"`):
- `types.ts`
- `utils.tsx`

Server component:
- `src/app/(marketing)/documentation/page.tsx` (server, hanya import dan render `DocumentationPage`)

## Perilaku Ringkas

**DocumentationPage**
- Initial load: fetch `getPublishedSections` dari Convex, sort by `order`, bangun `navigationGroups` (Map by `group`), bangun `searchIndex` (stem title + stem searchText per section).
- URL sync: baca `?section=slug` dari `searchParams`, fallback ke `window.location.hash`, fallback ke section pertama. Format URL: `?section=slug#slug`.
- Navigasi pakai `router.replace` dengan `{ scroll: false }`.
- Guard redundant update: skip `updateUrl` kalau `searchParams.get("section")` dan `window.location.hash` sudah cocok dengan target.

**Search (DocSidebar + utils)**
- Client-side search; index dibangun dari field `searchText` tiap section.
- Dual scoring: stemmed token matching via `scoreDoc` + plain substring matching via `baseNorm`, ambil `Math.max` dari keduanya.
- Indonesian stemming (`stemToken`): strip suffix `-nya`, `-lah`, `-kah`, `-pun`, `-ku`, `-mu` tanpa syarat; strip `-kan`, `-an`, `-i` hanya kalau token > 4 karakter.
- Diacritics stripping via NFKD normalization (`stripDiacritics`).
- Maksimal 6 hasil. Active section bias: `+0.5` pada skor.
- Enter pada input memilih hasil teratas (`results[0]`).
- Snippet generation: `makeSnippet` dengan span 80 karakter dari posisi match, fallback 120 karakter dari awal teks.
- HTML highlight via `<mark>` tag; `escapeHtml` dipanggil sebelum injeksi tag untuk mencegah XSS.

**DocArticle**
- 3 block types:
  - `infoCard`: left border accent (`border-l-4 border-info`), title `text-info`, optional description, bullet list dengan `renderInline`.
  - `ctaCards`: grid 2-kolom (`sm:grid-cols-2`), tiap card punya optional icon, title, description, `targetSection`, `ctaText`; button navigasi via `onSelectSection`.
  - `section`: heading `h2`, optional description, paragraphs via `renderInline`, optional list (variant `bullet` atau `numbered`) dengan sub-items.
- Inline markdown (`renderInline`): `**text**` menjadi `<strong>`, `` `code` `` menjadi `<code>`.
- Navigasi prev/next hanya tampil di mobile (`md:hidden`). Tombol disabled di section pertama (prev) dan terakhir (next) dengan `cursor-not-allowed`.

## Data & Konstanta

**Convex data source**
- Tabel: `documentationSections`.
- Query: `getPublishedSections` (filter `isPublished: true`).
- Field yang dipakai: `slug`, `title`, `group`, `order`, `icon`, `headerIcon`, `summary`, `blocks`, `searchText`.

**Icon map (utils.tsx)**
- 8 mapping key ke komponen iconoir-react:
  - `BookOpen` → `Book`
  - `FileText` → `Page`
  - `Globe` → `Globe`
  - `Lightbulb` → `LightBulb`
  - `Settings` → `Settings`
  - `ShieldCheck` → `ShieldCheck`
  - `Users` → `Group`
  - `Zap` → `Flash`

**Search config**
- Max results: `6`.
- Active section bias: `+0.5`.
- Snippet span: `80` karakter.
- Fallback snippet: `120` karakter.
- Title weight: `2x` (via `titleHits * 2` di `scoreDoc`).

## Konten yang Ditampilkan

**infoCard**
- Title: `text-info`, ditampilkan dalam container dengan `border-l-4 border-info` dan `bg-info/5`.
- Optional description di bawah title.
- Bullet list: tiap item di-render via `renderInline`, bullet marker `text-info`.

**ctaCards**
- Array of cards dalam grid `sm:grid-cols-2`.
- Tiap card: optional icon (via `getIcon`), title (`text-interface`), description (`text-narrative`), button navigasi.
- Button pakai `onSelectSection(item.targetSection)` dengan label dari `item.ctaText`.
- Hover effect: `-translate-y-1`, border dan background shift.

**section**
- `h2` title (`text-interface text-base font-medium`).
- Optional description (`text-narrative text-sm`).
- Paragraphs: tiap string di-render via `renderInline`.
- Optional list: variant `bullet` (list-disc) atau `numbered` (list-decimal), tiap item punya optional `subItems` (nested `ul` dengan `list-disc text-xs`).

**Inline markdown (renderInline)**
- `**text**` → `<strong>` dengan class `text-narrative font-semibold text-foreground`.
- `` `code` `` → `<code>` dengan class `text-interface rounded-sm bg-slate-950/10 px-1 py-0.5 text-xs text-foreground dark:bg-slate-950`.
- Teks biasa di-wrap dalam `<span>`.

## Styling

- Kelas utility/Tailwind dipakai langsung di komponen.
- Typography semantic: `text-narrative` untuk body/paragraf, `text-interface` untuk UI label/kontrol, `text-signal` untuk badge/tracking text.
- Card container: `rounded-shell border-hairline bg-card/90 backdrop-blur-[1px] dark:bg-slate-900` (sidebar dan article wrapper).
- Elemen interaktif (button, input): `rounded-action`.
- Border variant: `border-hairline` (tipis), `border-main` (standar).
- Search input: class `blog-neutral-input`, border `border-slate-300 dark:border-slate-600`.
- Sidebar item aktif: `bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100`.
- Sidebar item hover: `hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-500 dark:hover:text-slate-50`.
- CTA cards hover: `hover:-translate-y-1 hover:border-slate-400 hover:bg-[color:var(--slate-100)] dark:hover:border-slate-500 dark:hover:bg-[color:var(--slate-800)]` dengan `transition-all duration-300`.
- Info card: outer border `border-info/20 bg-info/5`, inner accent `border-l-4 border-info`.
- Inline code: `rounded-sm bg-slate-950/10 px-1 py-0.5 dark:bg-slate-950`.
- Loading spinner: `RefreshDouble` icon dengan `animate-spin text-primary`.

## Dependencies

- `convex/react` (`useQuery`) untuk data fetch sections dari Convex.
- `@convex/_generated/api` untuk referensi query `api.documentationSections.getPublishedSections`.
- `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`) untuk sinkronisasi URL/hash.
- `iconoir-react` untuk ikon: `Book`, `Page`, `Globe`, `LightBulb`, `Settings`, `ShieldCheck`, `Group`, `Flash`, `Search`, `NavArrowRight`, `NavArrowLeft`, `RefreshDouble`, `SidebarExpand`.
- `@/components/ui/sheet` (`Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`) untuk mobile sidebar drawer.
- `@/components/ui/section-badge` (`SectionBadge`) untuk group badge di article header.
- `@/components/marketing/SectionBackground` (`DottedPattern`) untuk background pattern.
- `cn` dari `@/lib/utils` untuk komposisi className.
