# About Page

Section about untuk marketing page (`/about`). Komponen diakses dari route `src/app/(marketing)/about/page.tsx`.

## Scope

README ini untuk dev internal/agent agar paham struktur, perilaku, dan sumber konten. Semua poin sesuai dengan isi file di `src/components/about`.

## Struktur

```
about/
├── index.ts                     # Re-exports types, constants, components
├── data.ts                      # Static content data + type definitions
├── icons.ts                     # Icon map (iconoir-react)
├── AccordionAbout.tsx           # Reusable accordion (Collapsible + Badge)
├── ManifestoSection.tsx         # Hero-like manifesto section
├── ManifestoTerminalPanel.tsx   # Terminal UI mockup (desktop)
├── ManifestoMobileAccordion.tsx # Collapsible manifesto (mobile)
├── ProblemsSection.tsx          # 6 problem bento cards
├── AgentsSection.tsx            # 6 agent teaser cards + carousel
├── CareerContactSection.tsx     # Career + contact cards
└── README.md                    # Dokumentasi ini
```

## Penggunaan

```tsx
import {
  ManifestoSection,
  ProblemsSection,
  AgentsSection,
  CareerContactSection,
} from "@/components/about"
```

Types juga bisa di-import:

```tsx
import type {
  ProblemItem,
  AgentStatus,
  AgentItem,
  ContactContent,
  CareerContactItem,
} from "@/components/about"
```

Constants juga bisa di-import:

```tsx
import {
  PROBLEMS_ITEMS,
  AGENTS_ITEMS,
  AGENT_STATUS_LABELS,
  CAREER_CONTACT_ITEMS,
} from "@/components/about"
```

Utility component dan types-nya juga bisa di-import:

```tsx
import { AccordionAbout } from "@/components/about"
import type { AccordionAboutItem, AccordionAboutProps } from "@/components/about"
```

Integrasi utamanya ada di `src/app/(marketing)/about/page.tsx`.

## Ekspor (index.ts)

**Types**

- `ProblemItem`
- `AgentStatus`
- `AgentItem`
- `ContactContent`
- `CareerContactItem`
- `AccordionAboutItem`
- `AccordionAboutProps`

**Constants**

- `PROBLEMS_ITEMS`
- `AGENTS_ITEMS`
- `AGENT_STATUS_LABELS`
- `CAREER_CONTACT_ITEMS`

**Components**

- `AccordionAbout`
- `ManifestoSection`
- `ProblemsSection`
- `AgentsSection`
- `CareerContactSection`

## About Route (`/about`)

Route `/about` di-handle oleh `src/app/(marketing)/about/page.tsx` (server component).

Render 4 section dalam urutan tetap di dalam `<main className="bg-background">`:

1. `ManifestoSection` — `#manifesto`
2. `ProblemsSection` — `#problems`
3. `AgentsSection` — `#agents`
4. `CareerContactSection` — `#karier-kontak`

Setiap section punya anchor ID untuk navigasi langsung.

## About Page Layout (page.tsx)

- Main wrapper: `bg-background`
- 4 full-width section ditumpuk vertikal
- Alternating section backgrounds: `bg-background` / `bg-[color:var(--section-bg-alt)]`

| Section | Background | Patterns | Grid | Catatan |
|---|---|---|---|---|
| `ManifestoSection` | `bg-background` | GridPattern + DiagonalStripes + DottedPattern (3 layer) | 16-col, 7/9 split at `lg` | `min-h-[100svh]` |
| `ProblemsSection` | `bg-[color:var(--section-bg-alt)]` | DiagonalStripes + DottedPattern | 16-col, offset `md:col-start-3` | — |
| `AgentsSection` | `bg-background` | GridPattern + DottedPattern | 3-col grid desktop / carousel mobile | `md:h-[100svh]` |
| `CareerContactSection` | `bg-[color:var(--section-bg-alt)]` | DiagonalStripes + DottedPattern | 16-col, offset `md:col-start-3` | — |

## Komponen dan Tanggung Jawab

- **`data.ts`** — static file. Semua type definitions dan content data: `ProblemItem`, `AgentStatus`, `AgentItem`, `ContactContent`, `CareerContactItem`, `PROBLEMS_ITEMS`, `AGENTS_ITEMS`, `AGENT_STATUS_LABELS`, `CAREER_CONTACT_ITEMS`.
- **`icons.ts`** — static file. Icon mapping (`Briefcase` → `Suitcase`, `Mail` → `Mail`) dari `iconoir-react`. Menyediakan function `getIcon(name)`.
- **`AccordionAbout.tsx`** — client component. Reusable accordion. Menerima array `AccordionItemData[]` + config props (icons, badges, anchor scroll, className overrides). Delegates ke `Collapsible` (dari `@/components/ui/collapsible`) + `Badge` (dari `@/components/ui/badge`). Dipakai oleh `ProblemsSection` dan `CareerContactSection`.
- **`ManifestoSection.tsx`** — client component. Hero-like section. Background: GridPattern + DiagonalStripes + DottedPattern. 16-col grid (7/9 split at `lg`). Left: `SectionBadge` "Tentang Kami" + h1 + subheading + `ManifestoMobileAccordion`. Right (desktop): `ManifestoTerminalPanel`. Container: `max-w-[var(--container-max-width)]`.
- **`ManifestoTerminalPanel.tsx`** — client component. Terminal UI mockup khusus desktop. Stone color palette (`stone-800` bg, `stone-600` header, `stone-500` border). Traffic light dots. Mono font. Numbered paragraphs. Sharp diagonal shadow.
- **`ManifestoMobileAccordion.tsx`** — client component. Collapsible manifesto content untuk mobile (`lg:hidden`). Card with heading + paragraphs + CTA-style button (stripes animation pattern). Delegates ke `Collapsible`.
- **`ProblemsSection.tsx`** — client component. 6 problem cards. Mobile: `AccordionAbout`. Desktop: 16-col bento grid (8/8 per card). Background: DiagonalStripes + DottedPattern. Amber pulse dots. Hover effects.
- **`AgentsSection.tsx`** — client component. 6 agent teaser cards. Mobile: swipe carousel (pointer events, 48px threshold). Desktop: 3-col grid. Background: GridPattern + DottedPattern. Status badges (teal = available, slate = in-progress). Hover lift. Rose pulse dots.
- **`CareerContactSection.tsx`** — client component. 2 cards (Karier + Kontak). Mobile: `AccordionAbout`. Desktop: 16-col bento (8/8). Background: DiagonalStripes + DottedPattern. Icon containers. Email link. Anchor ID navigation via `data-anchor-id`.

## Client Components

Semua section component dan utility component adalah client components (`"use client"`):

- `ManifestoSection.tsx`
- `ManifestoTerminalPanel.tsx`
- `ManifestoMobileAccordion.tsx`
- `ProblemsSection.tsx`
- `AgentsSection.tsx`
- `CareerContactSection.tsx`
- `AccordionAbout.tsx`

Static files (tidak perlu directive):

- `data.ts`
- `icons.ts`
- `index.ts`

Server component (tanpa `"use client"`):

- `src/app/(marketing)/about/page.tsx` (page route, bukan di folder ini)

> Tidak ada server component di dalam folder `src/components/about/`. Semua komponen React butuh interaktivitas (accordion, carousel, scroll behavior, responsive toggle).

## Perilaku Ringkas

**ManifestoSection**
- Client component. Renders full-viewport section (`min-h-[100svh]`) dengan padding-top inline style `var(--header-h)`.
- Section ID: `manifesto`.
- 3 background layers: `GridPattern` (opacity-80) + `DiagonalStripes` (opacity-75) + `DottedPattern` (spacing 24, `withRadialMask={false}`, opacity-40).
- 16-col grid: left `lg:col-span-7` (teks), right `lg:col-span-9` (terminal panel).
- Left column: `SectionBadge` "Tentang Kami" + h1 (3 baris: "Kolaborasi", "Penumbuh", "Pikiran" dari `MANIFESTO_HEADING_LINES`) + subheading `MANIFESTO_SUBHEADING` + `ManifestoMobileAccordion` (`lg:hidden`).
- Right column: `ManifestoTerminalPanel` (`hidden lg:flex`, offset `-translate-y-8`).
- Container: `max-w-[var(--container-max-width)]` (bukan `max-w-7xl`).
- `handleManifestoOpenChange`: jika accordion ditutup pada viewport `max-width: 1023px`, scroll ke section top dengan 220ms delay via `window.setTimeout` + `scrollIntoView`.
- Cleanup timeout ref pada unmount.

**ManifestoTerminalPanel**
- Client component. Terminal-style mockup, desktop only (dirender di parent yang `hidden lg:flex`).
- Stone color palette (tidak ikut app theme toggle): `bg-stone-800`, header `bg-stone-600`, border `border-stone-500` (2px).
- Traffic light dots: `bg-rose-500`, `bg-amber-500`, `bg-emerald-500` (w-2 h-2 rounded-full).
- URL bar: `makalah.ai/about#manifesto` dalam `font-mono text-[9px]` bg-stone-800 text-stone-100.
- Label: "MANIFESTO_STREAM" dalam `font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500`.
- Sharp diagonal shadow: `shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.3)]` (light), `dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.2)]` (dark).
- Content: Numbered paragraphs (`padStart(2, "0")`), stone-500 numbers (`text-[10px] font-bold uppercase tracking-[0.2em]`), stone-200 text (`text-sm leading-relaxed`).
- Dashed separator antar paragraf: `border-dashed border-stone-700/30`.
- Footer: "MODE: GUIDED_COLLABORATION · SOURCE: HUMAN+AI" dalam `text-stone-400 font-mono text-[10px] uppercase tracking-[0.2em]`.

**ManifestoMobileAccordion**
- Client component. Mobile only (`lg:hidden`), dirender di dalam ManifestoSection.
- Menerima props: `heading`, `paragraphs`, `isOpen`, `onOpenChange`.
- Card wrapper: `rounded-shell border-main border-border bg-card/75 backdrop-blur-sm`.
- Heading: text `text-interface text-base font-medium leading-snug text-foreground`.
- Content: paragraf dengan `text-narrative text-base leading-relaxed` + warna `text-[color:var(--slate-600)] dark:text-[color:var(--slate-50)]`.
- CTA button: mimics `SectionCTA` pattern — `bg-[color:var(--slate-800)]` light / `dark:bg-[color:var(--slate-100)]` dark, dengan `btn-stripes-pattern` slide-in animation.
- Label button: "BACA LENGKAP" (closed) / "TUTUP" (open), dalam `text-signal text-[11px] font-bold`.
- NavArrowDown chevron rotates on open (`rotate-180`, `transition-transform duration-300`).
- `onOpenChange` callback triggers parent's `handleManifestoOpenChange` on close.
- Mobile heading dipisah dari paragraf: `MANIFESTO_MOBILE_HEADING` = kalimat pertama paragraf #1; `MANIFESTO_MOBILE_PARAGRAPHS` = sisa paragraf #1 + paragraf #2–#4.

**ProblemsSection**
- Client component. Section ID: `problems`, background `bg-[color:var(--section-bg-alt)]`.
- Background: `DiagonalStripes` (opacity-40) + `DottedPattern` (spacing 24, `withRadialMask={true}`).
- SectionBadge: "Persoalan".
- Heading: "Apa saja persoalan yang dijawab?" (`text-narrative text-3xl font-medium`).
- Mobile: `AccordionAbout` dengan custom className overrides.
- Desktop: 16-col grid, inner `md:col-span-12 md:col-start-3` offset. Bento cards 6 items dalam `col-span-8` pairs (2 per row).
- Each card: `hover:bg-slate-50 dark:hover:bg-slate-900` transition, `rounded-shell border-hairline`.
- Amber pulse dot: `bg-[color:var(--amber-500)] shadow-[0_0_8px_var(--amber-500)]` dengan `animate-pulse`.
- `DESKTOP_TITLE_LINES`: maps setiap problem `id` ke tuple `[string, string]` untuk balanced 2-line title layout.

**AgentsSection**
- Client component. Section ID: `agents`, background `bg-background`, `md:h-[100svh] md:justify-center`.
- Background: `GridPattern` + `DottedPattern` (spacing 24, `withRadialMask={false}`).
- SectionBadge: "AI Agents".
- Heading: "Fitur & Pengembangan" (`text-narrative text-3xl font-medium`).
- Contains local `AgentTeaserCard` component + `AgentsTeaserCarousel`.
- `AgentTeaserCard`: min-h 240px (mobile) / 280px (desktop). Hover: `-translate-y-1` lift + background change. `isHighlighted` prop adds `border-2 border-[color:var(--teal-500)]`. Rose pulse dot (`bg-[color:var(--rose-500)] shadow-[0_0_8px_var(--rose-500)]`). Status badge: `available` = `bg-[color:var(--teal-500)] text-[color:var(--slate-100)]`, `in-progress` = `bg-[color:var(--slate-500)] text-[color:var(--slate-200)]`.
- `AgentsTeaserCarousel`: mobile only (`md:hidden`), pointer-event swipe dengan 48px threshold. Dot indicators: active = `bg-brand`, inactive = `bg-black/20 dark:bg-white/30`. Auto-slide via `translateX(-${activeSlide * 100}%)`. Default active slide = highlighted item index.
- Desktop: 3-col grid `md:grid-cols-3` gap-6, `hidden md:grid`.
- Swipe uses `onPointerDown/Up/Cancel` dengan `startXRef`. Transition: `transition-transform duration-300 ease-out`.

**CareerContactSection**
- Client component. Section ID: `karier-kontak`, background `bg-[color:var(--section-bg-alt)]`.
- Background: `DiagonalStripes` (opacity-40) + `DottedPattern` (spacing 24, `withRadialMask={true}`).
- SectionBadge: "Karier & Kontak".
- Heading: responsive — mobile: "Bergabung atau\nHubungi kami" (dengan `<br />`), desktop: "Bergabung atau Hubungi Kami" (`text-narrative text-3xl font-medium`).
- Mobile: `AccordionAbout` dengan custom className overrides.
- Desktop: 16-col grid, inner `md:col-span-12 md:col-start-3`. 2 cards (`col-span-8` each), `min-h-[180px]`.
- Icon container: `h-10 w-10 bg-[color:var(--slate-600)] dark:bg-[color:var(--slate-700)]` rounded-action.
- `renderContent` function: handles string (plain text paragraph) vs `ContactContent` (structured: company bold, address lines, email link).
- Email link: `text-[color:var(--slate-700)] dark:text-[color:var(--slate-50)] hover:underline`.
- Anchor: `id` + `data-anchor-id` attribute untuk hash navigation.
- Separator: `border-t border-hairline` antara icon/title row dan content.
- Card hover: `hover:bg-slate-50 dark:hover:bg-slate-900`.

**AccordionAbout**
- Client component. Reusable accordion untuk mobile views di ProblemsSection dan CareerContactSection.
- Uses `Collapsible` dari `@/components/ui/collapsible` + `Badge` dari `@/components/ui/badge`.
- Props: `items: AccordionItemData[]`, `defaultOpen`, `className`, `titleClassName`, `contentClassName`, `chevronClassName`, `onOpenChange`.
- Each item: `Collapsible` dengan `hover-slash` class, `p-comfort`, `border-b border-hairline`.
- Chevron: NavArrowDown default `text-[color:var(--amber-500)]` dengan `rotate-180` transition on open, overridable via `chevronClassName`.
- Icon support: `item.icon` rendered dalam `h-8 w-8 bg-[color:var(--amber-500)]/10` rounded-action container.
- Badge support: jika `item.badgeLabel`, renders `Badge` dengan variant `default` (emerald bg) atau `secondary`.
- Anchor scroll: on mount, reads `window.location.hash`, jika matches item `anchorId` atau `id`, auto-opens + scrolls dengan 100ms delay dan `behavior: "smooth"`.
- Wrapper: `rounded-shell border-main border-border border-t bg-card/30`.
- Single-open behavior: hanya satu item terbuka pada satu waktu, toggle menutup yang lain.

## Data & Konstanta

Semua data statik di `data.ts` — TIDAK di-fetch dari Convex.

**Type definitions:**
- `ProblemItem`: `{ id: string; title: string; description: string }`
- `AgentStatus`: `"available" | "in-progress"`
- `AgentItem`: `{ id: string; title: string; description: string; status: AgentStatus }`
- `ContactContent`: `{ company: string; address: string[]; email: string }`
- `CareerContactItem`: `{ id: string; anchorId: string; iconName: "Briefcase" | "Mail"; title: string; content: string | ContactContent }`

**PROBLEMS_ITEMS** (6 items):
1. `curiosity` — "Ai Mematikan Rasa Ingin Tahu?"
2. `prompting` — "Prompting Yang Ribet"
3. `citation` — "Sitasi & Provenance"
4. `plagiarism` — "Plagiarisme? Dipagari Etis"
5. `transparency` — "Transparansi proses penyusunan"
6. `detection` — "Deteksi AI Problematik"

**AGENTS_ITEMS** (6 items):
1. `sparring-partner` — "Sparring Partner" — status: `available`
2. `dosen-pembimbing` — "Dosen Pembimbing" — status: `in-progress`
3. `peer-reviewer` — "Peer Reviewer" — status: `in-progress`
4. `gap-thinker` — "Gap Thinker" — status: `in-progress`
5. `novelty-finder` — "Novelty Finder" — status: `in-progress`
6. `graph-elaborator` — "Graph Elaborator" — status: `in-progress`

**CAREER_CONTACT_ITEMS** (2 items):
1. `karier` — "Karier" — iconName: `"Briefcase"`, content: string, anchorId: `"bergabung-dengan-tim"`
2. `kontak` — "Kontak" — iconName: `"Mail"`, content: `ContactContent { company: "PT The Management Asia", address: ["Jl. H. Jian, Kebayoran Baru, Jakarta Selatan"], email: "dukungan@makalah.ai" }`, anchorId: `"hubungi-kami"`

**AGENT_STATUS_LABELS:**
- `"available"` → `"Tersedia"`
- `"in-progress"` → `"Proses"`

**Konstanta di ManifestoSection.tsx:**
- `MANIFESTO_HEADING_LINES`: `["Kolaborasi", "Penumbuh", "Pikiran"]`
- `MANIFESTO_SUBHEADING`: "Teknologi tidak menggantikan manusia, melainkan melengkapi agar kian berdaya"
- `MANIFESTO_PARAGRAPHS`: 4 paragraf tentang filosofi Makalah
- `MANIFESTO_MOBILE_HEADING`: kalimat pertama dari paragraf #1
- `MANIFESTO_MOBILE_PARAGRAPHS`: sisa paragraf #1 + paragraf #2–#4

**Konstanta di ProblemsSection.tsx:**
- `DESKTOP_TITLE_LINES`: Record yang memetakan setiap problem `id` ke tuple 2 baris untuk balanced layout desktop.

**icons.ts:**
- Icon map: `{ Briefcase: Suitcase, Mail: Mail }` dari `iconoir-react`
- `getIcon(iconName)`: returns mapped icon component

## Konten yang Ditampilkan

**ManifestoSection**
- Badge: "Tentang Kami" (`SectionBadge`, tanpa href)
- Heading (h1): 3 baris — "Kolaborasi", "Penumbuh", "Pikiran"
  - `text-interface text-5xl font-medium leading-[0.82] tracking-[-0.06em] md:text-5xl lg:text-7xl`
  - Line breaks via `<span className="block">` per kata
- Subheading: "Teknologi tidak menggantikan manusia, melainkan melengkapi agar kian berdaya"
  - `text-narrative text-base md:text-2xl font-normal`, max-w `520px`
- Terminal content: 4 numbered paragraphs tentang filosofi Makalah
- Mobile accordion: heading (kalimat pertama paragraf #1) + sisa paragraf dalam collapsible format
- CTA text: "BACA LENGKAP" (closed) / "TUTUP" (open)

**ProblemsSection**
- Badge: "Persoalan"
- Heading: "Apa saja persoalan yang dijawab?" (`text-narrative text-3xl font-medium leading-tight tracking-tight`)
- 6 problem cards dengan title + description + amber pulse dot
- Desktop titles di-split ke 2 baris via `DESKTOP_TITLE_LINES` map
- Desktop title font: `text-narrative font-light text-3xl leading-[1.1]`
- Description font: `text-interface text-xs leading-relaxed text-muted-foreground`

**AgentsSection**
- Badge: "AI Agents"
- Heading: "Fitur & Pengembangan" (`text-narrative text-3xl font-medium leading-tight tracking-tight`)
- 6 agent cards dengan name, description, status badge
- Card title: `text-narrative text-xl font-light md:text-2xl`, center-aligned
- Highlighted card (Sparring Partner) memiliki teal border + badge "Tersedia"
- Lainnya memiliki badge "Proses" dengan slate background
- Rose pulse dot pada setiap card

**CareerContactSection**
- Badge: "Karier & Kontak"
- Heading (mobile): "Bergabung atau" + line break + "hubungi kami"
- Heading (desktop): "Bergabung atau Hubungi Kami" (`text-narrative text-3xl font-medium`)
- Karier card: Suitcase icon + "Karier" title + paragraph text
- Kontak card: Mail icon + "Kontak" title + structured content:
  - Company: "PT The Management Asia" (bold)
  - Address: "Jl. H. Jian, Kebayoran Baru, Jakarta Selatan"
  - Email: dukungan@makalah.ai (hover underline)

## Manifesto Terminal Panel

Section khusus untuk terminal panel yang unik pada ManifestoTerminalPanel.

**Visual design:**
- Stone color palette (tidak ikut app theme toggle): `bg-stone-800`, `border-stone-500` (2px)
- Header: `bg-stone-600`, traffic lights (`bg-rose-500`, `bg-amber-500`, `bg-emerald-500` — w-2 h-2 rounded-full)
- URL bar: "makalah.ai/about#manifesto" dalam `font-mono text-[9px]` dengan `bg-stone-800 text-stone-100`
- Label: "MANIFESTO_STREAM" dalam `text-amber-500 font-mono text-[10px] font-bold uppercase tracking-[0.3em]`
- Shadow: `shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.3)]` (light) / `dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.2)]` (dark) — sharp diagonal bottom-left

**Content format:**
- 4 numbered paragraphs, numbers dalam `text-stone-500 text-[10px] font-bold uppercase tracking-[0.2em]`, teks dalam `text-stone-200 text-sm leading-relaxed`
- Numbers generated via `padStart(2, "0")` — 01, 02, 03, 04
- Font body: `font-mono`
- Dashed separator antar paragraf: `border-dashed border-stone-700/30`

**Footer:**
- "MODE: GUIDED_COLLABORATION · SOURCE: HUMAN+AI"
- `text-stone-400 font-mono text-[10px] uppercase tracking-[0.2em]`
- Border top: `border-t-[0.5px] border-stone-700/50`

**Layout:**
- Desktop only: parent wrapper `hidden lg:flex`
- Offset: `-translate-y-8` dari grid center (diterapkan di parent)
- Rounded: `rounded-md`
- Max-width: `max-w-[720px]`
- Overflow: `overflow-hidden`

**Konten (4 paragraf, Bahasa Indonesia):**
1. Platform ini disiapkan untuk merespons disrupsi teknologi dalam aktivitas akademik dan riset...
2. Bagaimana dengan detektor AI — apakah absah? Problematik...
3. Yang diperlukan sekarang: mengatur penggunaan AI agar transparan, bisa dipertanggungjawabkan...
4. Makalah berdiri di posisi: Penggunaan AI harus transparan, terjejak, dan terdidik.

## AccordionAbout System

Komponen accordion reusable yang dipakai di ProblemsSection dan CareerContactSection.

### Arsitektur

- Berbasis `Collapsible` dari `@/components/ui/collapsible` (Radix primitive).
- `Badge` dari `@/components/ui/badge` untuk status indicator.
- `NavArrowDown` dari `iconoir-react` untuk chevron icon.

### Type Definitions

**AccordionItemData:**

```tsx
{
  id: string                        // unique identifier
  title: string                     // judul di trigger
  content: React.ReactNode          // konten saat expanded
  icon?: React.ReactNode            // ikon komponen (opsional)
  anchorId?: string                 // untuk URL hash navigation
  badgeLabel?: string               // teks badge (opsional)
  badgeVariant?: "default" | "secondary"  // variant badge
}
```

**AccordionAboutProps:**

```tsx
{
  items: AccordionItemData[]
  defaultOpen?: string | null       // ID item yang terbuka default
  className?: string                // class tambahan wrapper
  titleClassName?: string           // override styling title
  contentClassName?: string         // override styling content
  chevronClassName?: string         // override styling chevron
  onOpenChange?: (openId: string | null) => void  // callback open/close
}
```

### Fitur

1. **Single-item accordion** — hanya satu item bisa terbuka pada satu waktu (exclusive toggle via `openId` state). Klik item yang sama menutupnya, klik item lain menggantikan yang terbuka.
2. **Icon support** — jika `item.icon` tersedia, render di dalam amber container `h-8 w-8 bg-[color:var(--amber-500)]/10` dengan warna ikon `text-[color:var(--amber-500)]`.
3. **Badge support** — variant `"default"` = emerald bg, variant `"secondary"` = standard secondary dari Badge.
4. **Anchor scroll** — pada mount, baca `window.location.hash`. Jika hash cocok dengan `item.anchorId` atau `item.id`, auto-open item + scroll into view dengan `100ms` delay dan `behavior: "smooth"`.
5. **Hover effect** — `hover-slash` custom class pada trigger button.
6. **Chevron animation** — `NavArrowDown` rotate `180deg` saat open via class `rotate-180` dengan `transition-transform duration-300`.
7. **Customizable styling** — `titleClassName`, `contentClassName`, `chevronClassName` sebagai prop override. Wrapper punya `rounded-shell border-main border-border border-t bg-card/30`.

### Pemakaian di Tiap Section

| Section | Icon | Badge | Jumlah Item |
|---|---|---|---|
| ProblemsSection | Ya (per item) | Tidak | 6 |
| CareerContactSection | Ya (Suitcase, Mail) | Tidak | 2 |

## Mobile Carousel System

Sistem carousel swipe di AgentsSection, khusus tampilan mobile.

### Komponen AgentsTeaserCarousel

Komponen lokal di dalam `AgentsSection.tsx` (tidak di-export).

**Swipe mechanics:**
- Memakai `onPointerDown`, `onPointerUp`, `onPointerCancel` events.
- Threshold: `48px` horizontal movement untuk trigger pergantian slide.
- `startXRef` menyimpan posisi pointer awal, `isDraggingRef` melacak status dragging.
- `setPointerCapture` / `releasePointerCapture` memastikan event tidak hilang di luar elemen.
- `touch-pan-y` class mencegah interference dengan vertical scrolling.

**Navigasi:**
- Slide transition: `translateX(-${activeSlide * 100}%)` dengan `transition-transform duration-300 ease-out`.
- Dot indicators: `h-2 w-2 rounded-full`. Active: `bg-brand`. Inactive: `bg-black/20 dark:bg-white/30`.
- Dots clickable untuk jump ke slide tertentu via `onClick`.
- Initial slide: otomatis set ke index item yang `isHighlighted` (agent "available").

**Layout:**
- Container: `overflow-hidden touch-pan-y pt-6 md:hidden`.
- Inner flex row: `flex touch-pan-y transition-transform duration-300 ease-out`.
- Tiap slide: `w-full flex-shrink-0 px-2` dengan inner `max-w-[300px] mx-auto`.
- Mobile only: seluruh komponen di-render dalam container `md:hidden`.
- Desktop alternative: `hidden md:grid md:grid-cols-3 gap-6` grid langsung dari `AgentTeaserCard`.

### Komponen AgentTeaserCard

Komponen lokal di dalam `AgentsSection.tsx` (tidak di-export).

**Dimensi & layout:**
- Min height: `min-h-[240px]` mobile, `min-h-[280px]` desktop.
- Padding: `p-comfort` mobile, `md:p-airy` desktop.
- Border default: `border-1 border-[color:var(--slate-400)]`.

**Hover & highlight:**
- Hover lift: `group-hover:-translate-y-1` dengan `transition-all duration-300`.
- Hover background: `group-hover:bg-[color:var(--slate-200)] dark:group-hover:bg-[color:var(--slate-700)]`.
- Highlighted card (available agent): `border-2 border-[color:var(--teal-500)]`.

**Rose pulse dot:**
- `bg-[color:var(--rose-500)] shadow-[0_0_8px_var(--rose-500)]` dengan `animate-pulse`.
- Ukuran: `h-2 w-2 min-w-2 rounded-full`.

**Status badge:**
- Container: `rounded-badge px-2.5 py-1 text-signal text-[10px] font-bold`.
- Available: `border bg-[color:var(--teal-500)] text-[color:var(--slate-100)]` (dark: `dark:bg-[color:var(--teal-700)]`).
- In-progress: `border border-[color:var(--slate-600)] bg-[color:var(--slate-500)] text-[color:var(--slate-200)]`.

## Styling

- Kelas utility/Tailwind dipakai langsung di komponen.
- Design token custom: `rounded-shell`, `rounded-action`, `rounded-badge`, `border-hairline`, `border-main`, `p-comfort`, `p-airy`, `p-dense`, `gap-comfort`, `text-narrative`, `text-interface`, `text-signal`, `hover-slash`, `focus-ring`, `bg-brand`.
- CSS variables: `--container-max-width` (ManifestoSection), `--header-h` (padding-top), `--section-bg-alt`, `--amber-500`, `--teal-500`, `--teal-700`, `--slate-600`, `--slate-500`, `--slate-400`, `--slate-200`, `--slate-100`, `--slate-950`, `--rose-500`, `--emerald-500`.
- Background layers:
  - `GridPattern`: 48px grid, slate-400 15% opacity (ManifestoSection, AgentsSection).
  - `DiagonalStripes`: repeating-linear-gradient 45deg (ManifestoSection, ProblemsSection, CareerContactSection).
  - `DottedPattern`: radial-gradient dots dengan radial mask (semua sections).
- Terminal panel: Stone palette permanent (`stone-800`/`600`/`500`/`400`/`300`/`200`/`100`), tidak ikut app theme.
- CTA button di ManifestoMobileAccordion: `btn-stripes-pattern` slide-in animation (same pattern as SectionCTA).
- Animasi yang dipakai:
  - `animate-pulse` — amber dots di SectionBadge, rose dots di AgentsSection card.
  - `transition-all duration-300` — agent card hover lift.
  - `transition-transform duration-300 ease-out` — carousel slide.
  - `transition-transform duration-300` + `rotate-180` — accordion chevron.
  - `transition-colors duration-200` — accordion trigger, dot indicators.
  - `btn-stripes-pattern` keyframe — ManifestoMobileAccordion CTA.
- Responsive breakpoints:
  - `md`: grid offset, section height (`md:h-[100svh]`), card min-height, carousel hidden, desktop grid shown.
  - `lg`: grid columns (16-col), terminal panel visibility, accordion visibility.
- 16-col grid system: `grid-cols-16` di `lg`, dipakai di ManifestoSection (7/9), ProblemsSection (12+offset), CareerContactSection (12+offset).

## Dependencies

- `@radix-ui/react-collapsible` via `Collapsible` (dari `@/components/ui/collapsible`) untuk `AccordionAbout` dan `ManifestoMobileAccordion`.
- `class-variance-authority` via `Badge` (dari `@/components/ui/badge`) untuk `AccordionAbout`.
- `iconoir-react` (`NavArrowDown`, `Suitcase`, `Mail`, dan icons via `item.icon`) untuk `AccordionAbout`, `CareerContactSection`, `AgentsSection`.
- `SectionBadge` dari `@/components/ui/section-badge` untuk semua section components.
- `GridPattern` dari `@/components/marketing/SectionBackground/GridPattern` untuk `ManifestoSection`, `AgentsSection`.
- `DiagonalStripes` dari `@/components/marketing/SectionBackground/DiagonalStripes` untuk `ManifestoSection`, `ProblemsSection`, `CareerContactSection`.
- `DottedPattern` dari `@/components/marketing/SectionBackground/DottedPattern` untuk semua section components.
- `cn` dari `@/lib/utils` untuk komposisi className (semua komponen).
- `react` (`useState`, `useRef`, `useEffect`, `useCallback`, `memo`) untuk state management dan lifecycle.
- No external data fetching — semua data statik dari `data.ts`.
- No auth dependency — halaman about tidak memerlukan autentikasi.
- No Convex dependency — berbeda dari blog/documentation yang fetch dari Convex.
