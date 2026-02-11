# Documentation Section README — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tulis README.md komprehensif untuk `src/components/marketing/documentation/` mengikuti pola hero/README.md.

**Architecture:** Single markdown file, 13 sections, data-driven dari analisis kode aktual. Bahasa Indonesia, English untuk istilah teknis.

**Output:** `src/components/marketing/documentation/README.md`

**Reference pattern:** `src/components/marketing/hero/README.md`

---

## Task 1: Header + Scope + Struktur

**File:** Create: `src/components/marketing/documentation/README.md`

**Step 1: Tulis 3 section awal**

Konten yang harus ditulis:

**Header:**
- `# Documentation Section`
- Deskripsi: Halaman dokumentasi marketing (`/documentation`), data-driven dari Convex CMS.

**Scope:**
- README untuk dev internal/agent
- Agar paham struktur, perilaku, dan sumber konten tanpa baca semua file
- Semua poin sesuai isi file di `src/components/marketing/documentation`

**Struktur (file tree):**
```
documentation/
├── index.ts              # Re-exports komponen utama
├── DocumentationPage.tsx # Orchestrator: data fetch, state, layout, mobile nav
├── DocSidebar.tsx        # Sidebar navigasi + search
├── DocArticle.tsx        # Renderer konten artikel
├── types.ts              # Type definitions
├── utils.tsx             # Icon map, stemming, search scoring, inline markdown
└── README.md             # Dokumentasi ini
```

Catatan: `DocMobileSidebar.tsx` tidak ada — mobile sidebar ditangani langsung di `DocumentationPage.tsx` via shadcn Sheet yang reuse `DocSidebar`.

---

## Task 2: Penggunaan + Ekspor

**Step 1: Tulis section Penggunaan**

Import example:
```tsx
import { DocumentationPage } from "@/components/marketing/documentation"
```

Integrasi utama di `src/app/(marketing)/documentation/page.tsx` — thin wrapper yang hanya render `<DocumentationPage />`.

**Step 2: Tulis section Ekspor (index.ts)**

Daftar exports:
- `DocumentationPage`
- `DocSidebar`
- `DocArticle`

---

## Task 3: Documentation Layout

**Step 1: Tulis section layout**

Fakta dari kode:
- Page wrapper: `relative isolate overflow-hidden bg-[color:var(--section-bg-alt)] pt-[var(--header-h)]`
- Background: `DottedPattern` (dari `@/components/marketing/SectionBackground`) dengan `spacing={24}`, `withRadialMask={false}`, `opacity-100`
- Content container: `max-w-7xl`, `px-4 lg:px-8`
- Grid: `grid-cols-1 md:grid-cols-16`, `gap-comfort`
- Sidebar (desktop): `md:col-span-4`, `hidden md:block`, wrapped dalam card (`rounded-shell border-hairline bg-card/90 backdrop-blur-[1px] dark:bg-slate-900 p-comfort`)
- Article area: `md:col-span-12`, `pt-4`
- Mobile nav button: `md:hidden`, icon `SidebarExpand` (7x7), membuka Sheet dari kanan (`side="right"`, `w-72`)
- Loading state: `Suspense` fallback dengan `RefreshDouble` spinner + text "Memuat dokumentasi..."

---

## Task 4: Komponen dan Tanggung Jawab

**Step 1: Tulis deskripsi tiap komponen**

- **`DocumentationPage.tsx`**: client component, orchestrator utama. Fetch sections dari Convex, kelola state (activeSection, mobileNavOpen, query, results). Build navigation groups dari sections. Build search index client-side. Sync URL (`?section=xxx#xxx`). Render layout grid dengan `DocSidebar` (desktop) + `DocArticle` + Sheet mobile nav.
- **`DocSidebar.tsx`**: presentational component (no state sendiri). Render search input, search results dropdown, navigation groups dengan icon dan active state. Dipakai di 2 tempat: desktop sidebar langsung dan mobile Sheet.
- **`DocArticle.tsx`**: presentational component. Render active section content: header (badge + icon + title + summary), blocks (3 types), dan prev/next navigation (mobile only). Delegates inline markdown ke `renderInline()`.
- **`types.ts`**: type definitions — `DocBlock` (discriminated union: infoCard | ctaCards | section), `DocumentationSection`, `SearchRecord`, `NavigationGroup`, `DocList`, `DocListItem`.
- **`utils.tsx`**: utility functions — icon map (8 icons dari iconoir-react), Indonesian-aware text stemming, search scoring, snippet generation dengan HTML highlight, inline markdown renderer (bold + code).

---

## Task 5: Client Components

**Step 1: Tulis section client vs server**

Client components (pakai `"use client"`):
- `DocumentationPage.tsx` — karena useQuery, useState, useEffect, useRouter, useSearchParams

Presentational components (tidak punya `"use client"` sendiri, tapi di-render dalam client tree):
- `DocSidebar.tsx`
- `DocArticle.tsx`

Pure utility (bukan component):
- `types.ts`
- `utils.tsx`

Page wrapper `src/app/(marketing)/documentation/page.tsx`: server component, hanya render `<DocumentationPage />`.

---

## Task 6: Perilaku Ringkas

**Step 1: Tulis perilaku DocumentationPage**

- Initial load: fetch sections dari Convex → sort by `order` → build navigation groups → build search index
- URL sync: `?section=slug#slug` — cek `searchParams.get("section")` → fallback ke `window.location.hash` → fallback ke section pertama
- URL update via `router.replace()` dengan `scroll: false` — no full page navigation
- Guard terhadap redundant URL updates (cek current section + hash sebelum replace)

**Step 2: Tulis perilaku search (DocSidebar + utils)**

- Client-side search, index dibangun dari `searchText` field tiap section
- Dual scoring: stemmed token matching (`scoreDoc`) + plain substring matching (`plainIncludesScore`), ambil `Math.max`
- Indonesian stemming: strip suffix `-nya`, `-lah`, `-kah`, `-pun`, `-ku`, `-mu`, `-kan`, `-an`, `-i` (hanya kalau token > 4 char)
- Diacritics stripping via NFKD normalization
- Max 6 results, active section diberi bias +0.5
- Enter key di search input → navigasi ke hasil teratas
- Snippet generation: cari posisi match di teks, ambil 80 char sebelum/sesudah, highlight via `<mark>` tag
- HTML escaping sebelum highlight injection (`escapeHtml`)

**Step 3: Tulis perilaku DocArticle**

- Render 3 block types berdasarkan `block.type`:
  - `infoCard`: card dengan border-left accent (info color), title, description, bullet list
  - `ctaCards`: grid 2 kolom (`sm:grid-cols-2`), card dengan icon + title + description + button navigasi ke `targetSection`
  - `section`: heading + description + paragraphs + list (bullet atau numbered, support sub-items)
- Inline markdown: `**bold**` → `<strong>`, `` `code` `` → `<code>`
- Prev/next navigation: hanya tampil di mobile (`md:hidden`), disabled state kalau di awal/akhir

---

## Task 7: Data & Konstanta

**Step 1: Tulis section data source dan konstanta**

**Convex data source:**
- Table: `documentationSections`
- Query: `api.documentationSections.getPublishedSections` — filter `isPublished: true`
- Fields yang dipakai: `slug`, `title`, `group`, `order`, `icon`, `headerIcon`, `summary`, `blocks`, `searchText`

**Icon map (utils.tsx):**
Key → iconoir-react component:
- `BookOpen` → `Book`
- `FileText` → `Page`
- `Globe` → `Globe`
- `Lightbulb` → `LightBulb`
- `Settings` → `Settings`
- `ShieldCheck` → `ShieldCheck`
- `Users` → `Group`
- `Zap` → `Flash`

**Search config:**
- Max results: 6
- Active section bias: +0.5
- Snippet span: 80 chars
- Fallback snippet: 120 chars
- Title match weight: 2x (vs body 1x)

---

## Task 8: Konten yang Ditampilkan

**Step 1: Tulis section block types**

3 block types (discriminated union `DocBlock`):

**infoCard:**
- Title (text-info, font-medium)
- Description opsional
- Bullet list items — tiap item di-render via `renderInline()`

**ctaCards:**
- Array of cards, tiap card punya: icon opsional, title, description, targetSection, ctaText
- Button navigasi ke section lain via `onSelectSection(item.targetSection)`

**section:**
- Title (heading h2)
- Description opsional
- Paragraphs array — di-render via `renderInline()`
- List opsional: variant `"bullet"` atau `"numbered"`, items dengan optional sub-items

**Inline markdown (renderInline):**
- `**text**` → `<strong className="text-narrative font-semibold text-foreground">`
- `` `code` `` → `<code className="text-interface rounded-sm bg-slate-950/10 px-1 py-0.5 text-xs text-foreground dark:bg-slate-950">`

---

## Task 9: Styling + Dependencies

**Step 1: Tulis section styling**

Fakta styling dari kode — ringkas, tanpa duplikasi dengan section layout:
- Typography: `text-narrative` untuk body/paragraphs, `text-interface` untuk UI labels/controls, `text-signal` untuk badges/tracking text
- Card containers: `rounded-shell border-hairline bg-card/90 backdrop-blur-[1px] dark:bg-slate-900`
- Interactive elements: `rounded-action` untuk buttons dan inputs
- Borders: `border-hairline` (thin), `border-main` (standard)
- Search input: custom class `blog-neutral-input`, border `border-slate-300 dark:border-slate-600`
- Active sidebar item: `bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100`
- Hover sidebar item: `hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-500 dark:hover:text-slate-50`
- CTA cards hover: `hover:-translate-y-1 hover:border-slate-400 hover:bg-[color:var(--slate-100)] dark:hover:border-slate-500 dark:hover:bg-[color:var(--slate-800)]`
- Info card: `border-info/20 bg-info/5`, left border `border-l-4 border-info`
- Loading spinner: `RefreshDouble` dengan `animate-spin text-primary`

**Step 2: Tulis section dependencies**

- `convex/react` (`useQuery`) untuk data fetch
- `@convex/_generated/api` untuk query reference
- `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`) untuk URL sync
- `iconoir-react` (8 icons: `Book`, `Page`, `Globe`, `LightBulb`, `Settings`, `ShieldCheck`, `Group`, `Flash`, `Search`, `NavArrowRight`, `NavArrowLeft`, `RefreshDouble`, `SidebarExpand`)
- `@/components/ui/sheet` (Sheet, SheetContent, SheetHeader, SheetTitle) untuk mobile nav
- `@/components/ui/section-badge` (SectionBadge) untuk group badge di artikel
- `@/components/marketing/SectionBackground` (DottedPattern) untuk background
- `cn` dari `@/lib/utils` untuk className composition

---

## Task 10: Review + Commit

**Step 1: Review README**

Verifikasi:
- Semua 13 sections ada
- Konsistensi bahasa (Indonesia + English teknis)
- Semua fakta sesuai kode aktual
- Tidak ada duplikasi antar section
- Pola konsisten dengan `hero/README.md`

**Step 2: Commit**

```bash
git add src/components/marketing/documentation/README.md
git commit -m "docs: add documentation section README with component audit"
```
