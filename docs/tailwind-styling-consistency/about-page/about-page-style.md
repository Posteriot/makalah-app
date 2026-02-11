# About Page — Styling Extraction

Tanggal: 11 Februari 2026
Scope: Seluruh CSS/Tailwind classes dan design tokens yang terimplementasi di about page
Source files: `src/app/(marketing)/about/page.tsx` (layout), `src/components/about/*.tsx` (komponen)

---

## 1. File dan Komponen

| File | Komponen | Fungsi |
|------|----------|--------|
| `page.tsx` | `AboutPage` | Page wrapper, menyusun 4 section |
| `ManifestoSection.tsx` | `ManifestoSection` | Hero manifesto dengan heading + terminal panel |
| `ManifestoTerminalPanel.tsx` | `ManifestoTerminalPanel` | Panel terminal desktop, paragraf bernomor |
| `ManifestoMobileAccordion.tsx` | `ManifestoMobileAccordion` | Accordion manifesto untuk mobile/tablet |
| `ProblemsSection.tsx` | `ProblemsSection` | 6 problem bento cards |
| `AgentsSection.tsx` | `AgentsSection` | 6 agent teaser cards + carousel |
| `CareerContactSection.tsx` | `CareerContactSection` | Career + contact cards |
| `AccordionAbout.tsx` | `AccordionAbout` | Reusable accordion (Collapsible + Badge) |
| `data.ts` | — | Static content data + type definitions |
| `icons.ts` | — | Icon map (iconoir-react) |
| `index.ts` | — | Re-export types, constants, components |

Dependensi UI:
- `SectionBadge` dari `@/components/ui/section-badge`
- `GridPattern`, `DiagonalStripes`, `DottedPattern` dari `@/components/marketing/SectionBackground`
- `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` dari `@/components/ui/collapsible`
- `Badge` dari `@/components/ui/badge`

---

## 2. Page Wrapper (page.tsx)

```
bg-background
```

| Property | Class | Value |
|----------|-------|-------|
| Element | `<main>` | Elemen utama pembungkus seluruh about page |
| Background | `bg-background` | Light: `--slate-50`, Dark: `--slate-900` |

Catatan: `<main>` hanya memiliki satu class. Tidak ada padding, min-height, atau layout class di level ini — setiap section mengatur layout-nya sendiri.

---

## 3. ManifestoSection Wrapper

```
relative isolate min-h-[100svh] overflow-hidden bg-background
```

Inline style: `padding-top: var(--header-h)`

| Property | Class | Value |
|----------|-------|-------|
| Element | `<section>` | Wrapper utama manifesto section |
| Position | `relative isolate` | Stacking context isolation |
| Min height | `min-h-[100svh]` | Full viewport (small viewport height) |
| Overflow | `overflow-hidden` | Clip background patterns |
| Background | `bg-background` | Light: `--slate-50`, Dark: `--slate-900` |
| Padding top | `var(--header-h)` (inline style) | Menyesuaikan tinggi header |
| ID | `manifesto` | Anchor link target |

---

## 4. ManifestoSection Background Layers

```tsx
<GridPattern className="z-0 opacity-80" />
<DiagonalStripes className="opacity-75" />
<DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-40" />
```

| Layer | Component | Z-Index | Opacity | Props Tambahan |
|-------|-----------|---------|---------|----------------|
| 1 (bottom) | `GridPattern` | `z-0` | 80% | — |
| 2 (middle) | `DiagonalStripes` | `z-0` (default) | 75% | — |
| 3 (top) | `DottedPattern` | `z-0` (override dari default `z-[1]`) | 40% | `spacing={24}`, `withRadialMask={false}` |
| Content | Hero container | `z-[1]` | 100% | — |

### GridPattern Base Classes (dari GridPattern.tsx)

```
absolute inset-0 pointer-events-none
bg-[linear-gradient(color-mix(in_oklab,var(--slate-400),transparent_85%)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--slate-400),transparent_85%)_1px,transparent_1px)]
bg-[length:48px_48px]
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute inset-0` | Full-bleed overlay |
| Events | `pointer-events-none` | Non-interactive |
| Pattern | `bg-[linear-gradient(...)]` | Grid lines 1px `--slate-400` at 15% opacity |
| Cell size | `bg-[length:48px_48px]` | 48px grid cells |

### DiagonalStripes Base Classes (dari DiagonalStripes.tsx)

```
absolute inset-0 pointer-events-none z-0
[background-image:repeating-linear-gradient(45deg,...)]
dark:[background-image:repeating-linear-gradient(45deg,...)]
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute inset-0 z-0` | Full-bleed overlay |
| Events | `pointer-events-none` | Non-interactive |
| Light mode | `[background-image:repeating-linear-gradient(45deg,...)]` | `--slate-900` stripes at 10% opacity, 1px width, 8px gap, 45deg |
| Dark mode | `dark:[background-image:repeating-linear-gradient(45deg,...)]` | `--slate-50` stripes at 12% opacity, 1px width, 8px gap, 45deg |

### DottedPattern Base Classes (dari DottedPattern.tsx)

```
absolute inset-0 pointer-events-none z-[1]
[background-image:radial-gradient(rgba(0,0,0,0.12)_1px,transparent_1px)]
dark:[background-image:radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)]
```

Inline style: `background-size: 24px 24px` (dari `spacing={24}`)

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute inset-0 z-[1]` | Di-override menjadi `z-0` via className |
| Events | `pointer-events-none` | Non-interactive |
| Light mode | `radial-gradient(rgba(0,0,0,0.12)_1px,transparent_1px)` | Dark dots at 12% opacity, 1px radius |
| Dark mode | `radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)` | White dots at 12% opacity, 1px radius |
| Spacing | `background-size: 24px 24px` (inline style) | 24px grid spacing |
| Radial mask | Tidak aktif | `withRadialMask={false}` — tanpa fade-to-transparent dari center |

Catatan: About page ManifestoSection menggunakan 3 background layers (tambahan `DottedPattern`) dengan opacity lebih rendah, sedangkan Home Hero hanya menggunakan 2 layers (`GridPattern` + `DiagonalStripes`) keduanya pada `opacity-80`.

---

## 5. ManifestoSection Content Container

```
relative z-[1] mx-auto flex min-h-[100svh] w-full max-w-[var(--container-max-width)] items-center px-4 py-10 md:px-6 md:py-20
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative z-[1]` | Above background patterns |
| Layout | `flex items-center` | Flex, vertical center |
| Min height | `min-h-[100svh]` | Match section height |
| Width | `w-full` | 100% |
| Max width | `max-w-[var(--container-max-width)]` | CSS variable (berbeda dari Home Hero yang pakai `max-w-7xl`) |
| Centering | `mx-auto` | Horizontal center |
| Padding-x | `px-4 md:px-6` | 16px mobile, 24px desktop |
| Padding-y | `py-10 md:py-20` | 40px mobile, 80px desktop |

---

## 6. ManifestoSection Grid

```
grid grid-cols-1 gap-comfort lg:grid-cols-16 lg:gap-16
```

| Property | Mobile | Desktop (lg+) |
|----------|--------|---------------|
| Grid | `grid-cols-1` | `grid-cols-16` (16-column system) |
| Gap | `gap-comfort` (16px) | `gap-16` (64px) |

### Left Column (Text Content)

```
flex flex-col items-start justify-center text-left lg:col-span-7
```

| Property | Class | Value |
|----------|-------|-------|
| Grid span | `lg:col-span-7` | 7 of 16 columns |
| Layout | `flex flex-col items-start` | Vertical stack, left-aligned |
| Vertical align | `justify-center` | Center content vertically |
| Text | `text-left` | Left-aligned |

### Right Column (Terminal Panel — Desktop Only)

```
hidden lg:col-span-9 lg:flex lg:self-stretch lg:min-h-full lg:items-center lg:justify-end lg:-translate-y-8
```

| Property | Class | Value |
|----------|-------|-------|
| Visibility | `hidden lg:flex` | Hidden below lg breakpoint |
| Grid span | `lg:col-span-9` | 9 of 16 columns |
| Stretch | `lg:self-stretch lg:min-h-full` | Match parent height |
| Layout | `lg:items-center lg:justify-end` | Center vertically, align right |
| Offset | `lg:-translate-y-8` | -32px vertical shift (visual tuning) |

### Mobile Content Container (ManifestoMobileAccordion Wrapper)

```
mt-6 w-full lg:hidden
```

| Property | Class | Value |
|----------|-------|-------|
| Margin | `mt-6` | 24px top |
| Width | `w-full` | Full width |
| Visibility | `lg:hidden` | Hanya tampil di mobile/tablet |

---

## 7. ManifestoSection Left Column — SectionBadge

Badge text: **"Tentang Kami"**

### Outer Container (dari section-badge.tsx)

```
inline-flex w-fit items-center gap-2 rounded-badge px-2.5 py-1
bg-[color:var(--emerald-600)] text-[color:var(--slate-50)]
```

| Property | Class/Token | Value |
|----------|-------------|-------|
| Layout | `inline-flex items-center gap-2` | Inline, 8px gap |
| Width | `w-fit` | Shrink to content |
| Radius | `rounded-badge` | 6px (`--radius-s-md`) |
| Padding | `px-2.5 py-1` | 10px horizontal, 4px vertical |
| Background | `bg-[color:var(--emerald-600)]` | oklch(0.596 0.145 163.225) |
| Text | `text-[color:var(--slate-50)]` | oklch(0.984 0 0) |

Catatan: Tidak ada `href` prop — class `group`, `transition-colors`, `hover:bg-[color:var(--emerald-900)]` tidak diterapkan.

### Animated Dot

```
h-2 w-2 rounded-full bg-[color:var(--amber-500)] shadow-[0_0_6px_var(--amber-500)] animate-pulse
```

| Property | Class/Token | Value |
|----------|-------------|-------|
| Size | `h-2 w-2` | 8px circle |
| Shape | `rounded-full` | Circular |
| Color | `bg-[color:var(--amber-500)]` | oklch(0.769 0.188 70.08) |
| Glow | `shadow-[0_0_6px_var(--amber-500)]` | Amber glow 6px spread |
| Animation | `animate-pulse` | Pulse (opacity cycle) |

### Badge Text

```
text-signal text-[10px] font-bold
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-signal` | Geist Mono + uppercase + tracking 0.1em |
| Size | `text-[10px]` | 10px |
| Weight | `font-bold` | 700 |

---

## 8. ManifestoSection Left Column — h1 Heading

Text content: **"Kolaborasi / Penumbuh / Pikiran"** (masing-masing dalam `<span className="block">`)

```
text-interface mt-6 text-5xl font-medium leading-[0.82] tracking-[-0.06em] text-foreground md:text-5xl lg:text-7xl
```

| Property | Class | Value |
|----------|-------|-------|
| Font family | `text-interface` | Geist Mono |
| Size (mobile) | `text-5xl` | 48px / 3rem |
| Size (md) | `md:text-5xl` | 48px (tidak berubah) |
| Size (lg+) | `lg:text-7xl` | 72px / 4.5rem |
| Weight | `font-medium` | 500 |
| Line height | `leading-[0.82]` | 0.82 (sangat rapat — 82% dari font size) |
| Letter spacing | `tracking-[-0.06em]` | -0.06em (tight negative tracking) |
| Color | `text-foreground` | Light: `--neutral-950`, Dark: `--neutral-50` |
| Margin | `mt-6` | 24px top |

### Heading Line Spans

```
block
```

Setiap kata dirender di baris terpisah: `Kolaborasi`, `Penumbuh`, `Pikiran`.

---

## 9. ManifestoSection Left Column — Subheading

Text content: **"Teknologi tidak menggantikan manusia, melainkan melengkapi agar kian berdaya"**

```
text-narrative text-base md:text-2xl font-normal text-[color:var(--slate-600)] dark:text-[color:var(--slate-200)] max-w-[520px] mt-4 mb-0
```

| Property | Class | Value |
|----------|-------|-------|
| Font family | `text-narrative` | Geist Sans |
| Size (mobile) | `text-base` | 16px / 1rem |
| Size (md+) | `md:text-2xl` | 24px / 1.5rem |
| Weight | `font-normal` | 400 |
| Color (light) | `text-[color:var(--slate-600)]` | oklch(0.446 0 0) |
| Color (dark) | `dark:text-[color:var(--slate-200)]` | oklch(0.929 0 0) |
| Max width | `max-w-[520px]` | 520px |
| Margin top | `mt-4` | 16px |
| Margin bottom | `mb-0` | 0px |

---

## 10. ManifestoTerminalPanel

Panel terminal bergaya retro yang menampilkan paragraf manifesto bernomor. Menggunakan stone color palette secara eksklusif — **tidak mengikuti app theme** (selalu tampil gelap).

### 10a. Outer Wrapper

```
w-full max-w-[720px] overflow-hidden rounded-md border-[2px] border-stone-500 bg-stone-800 shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.3)] dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.2)]
```

| Property | Class | Value |
|----------|-------|-------|
| Width | `w-full max-w-[720px]` | Full width, max 720px |
| Overflow | `overflow-hidden` | Clip child content |
| Radius | `rounded-md` | 6px |
| Border | `border-[2px] border-stone-500` | 2px solid stone-500 |
| Background | `bg-stone-800` | Permanent dark |
| Shadow (light app) | `shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.3)]` | Stone-700 30% sharp diagonal kiri-bawah |
| Shadow (dark app) | `dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.2)]` | Stone-400 20% sharp diagonal kiri-bawah |

### 10b. Terminal Header Bar

```
flex items-center gap-4 border-b-[0.5px] border-stone-700 bg-stone-600 p-3
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `flex items-center gap-4` | Horizontal, 16px gap |
| Padding | `p-3` | 12px all sides |
| Background | `bg-stone-600` | Header bar surface |
| Border bottom | `border-b-[0.5px] border-stone-700` | Hairline separator |

### 10c. Traffic Lights

Container: `flex gap-1.5 px-1`

| Dot | Color Class | Value |
|-----|------------|-------|
| Close | `bg-rose-500` | Merah |
| Minimize | `bg-amber-500` | Kuning |
| Maximize | `bg-emerald-500` | Hijau |

Semua dots: `h-2 w-2 rounded-full`

### 10d. URL Bar

```
rounded-none border-[0.5px] border-stone-600 bg-stone-800 px-3 py-1 font-mono text-[9px] font-medium tracking-widest text-stone-100
```

Text content: `makalah.ai/about#manifesto`

| Property | Class | Value |
|----------|-------|-------|
| Font | `font-mono text-[9px] font-medium` | Mono, 9px, 500 |
| Tracking | `tracking-widest` | Maximum letter spacing (0.1em) |
| Background | `bg-stone-800` | Dark terminal |
| Text color | `text-stone-100` | Near-white |
| Radius | `rounded-none` | 0px (sharp corners) |
| Border | `border-[0.5px] border-stone-600` | Hairline |
| Padding | `px-3 py-1` | 12px horizontal, 4px vertical |

### 10e. Terminal Body

```
p-6
```

### 10f. Stream Label

```
font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500
```

Text content: `MANIFESTO_STREAM`

| Property | Class | Value |
|----------|-------|-------|
| Font | `font-mono` | Monospace |
| Size | `text-[10px]` | 10px |
| Weight | `font-bold` | 700 |
| Transform | `uppercase` | All caps |
| Tracking | `tracking-[0.3em]` | 0.3em letter spacing |
| Color | `text-amber-500` | Amber accent |

### 10g. Paragraphs Container

```
mt-4 font-mono
```

### 10h. Paragraph Item Wrapper

```
relative pb-4
```

### 10i. Paragraph Row Layout

```
flex gap-3
```

### 10j. Paragraph Number

```
pt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500
```

Format: `01`, `02`, `03`, `04` (via `padStart(2, "0")`)

| Property | Class | Value |
|----------|-------|-------|
| Padding | `pt-0.5` | 2px top (alignment tuning) |
| Size | `text-[10px]` | 10px |
| Weight | `font-bold` | 700 |
| Tracking | `tracking-[0.2em]` | 0.2em letter spacing |
| Color | `text-stone-500` | Muted stone |

### 10k. Paragraph Text

```
max-w-[620px] text-sm leading-relaxed text-stone-200
```

| Property | Class | Value |
|----------|-------|-------|
| Max width | `max-w-[620px]` | 620px |
| Size | `text-sm` | 14px / 0.875rem |
| Line height | `leading-relaxed` | 1.625 |
| Color | `text-stone-200` | Light stone text |

### 10l. Dashed Separator (antar paragraf)

```
absolute right-0 bottom-0 left-0 border-b-[0.5px] border-dashed border-stone-700/30
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute right-0 bottom-0 left-0` | Full width bottom |
| Border | `border-b-[0.5px] border-dashed` | Hairline dashed |
| Color | `border-stone-700/30` | Stone-700 at 30% opacity |

### 10m. Terminal Footer

```
mt-3 border-t-[0.5px] border-stone-700/50 pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-400
```

Text content: `MODE: GUIDED_COLLABORATION · SOURCE: HUMAN+AI`

| Property | Class | Value |
|----------|-------|-------|
| Margin | `mt-3` | 12px top |
| Border top | `border-t-[0.5px] border-stone-700/50` | Hairline, stone-700 at 50% opacity |
| Padding | `pt-3` | 12px top |
| Font | `font-mono text-[10px]` | Monospace, 10px |
| Transform | `uppercase` | All caps |
| Tracking | `tracking-[0.2em]` | 0.2em letter spacing |
| Color | `text-stone-400` | Muted stone |

### Ringkasan Stone Palette

| Elemen | Stone Shade | Fungsi |
|--------|-------------|--------|
| Outer bg | `stone-800` | Body background |
| Header bg | `stone-600` | Header bar |
| URL bar bg | `stone-800` | Input field |
| Border outer | `stone-500` | Primary border |
| Border header | `stone-700` | Separator |
| Border separator | `stone-700/30` | Dashed dividers |
| Border footer | `stone-700/50` | Footer separator |
| URL bar border | `stone-600` | URL field border |
| Paragraph number | `stone-500` | Muted numbering |
| Paragraph text | `stone-200` | Body text |
| URL bar text | `stone-100` | Bright text |
| Footer text | `stone-400` | Secondary text |
| Accent label | `amber-500` | Stream label highlight |
| Traffic light | `rose-500` / `amber-500` / `emerald-500` | Window controls |

---

## 11. ManifestoMobileAccordion

Source: `src/components/about/ManifestoMobileAccordion.tsx`
Primitif: `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` dari `@/components/ui/collapsible`

### Wrapper (Card shell)

```
overflow-hidden rounded-shell border-main border-border bg-card/75 backdrop-blur-sm
```

| Property | Class | Value |
|----------|-------|-------|
| Overflow | `overflow-hidden` | Clip konten yang meluap |
| Radius | `rounded-shell` | 16px (`--radius-xl`) |
| Border width | `border-main` | 1px |
| Border color | `border-border` | Token `--border` |
| Background | `bg-card/75` | Token `--card` pada 75% opacity |
| Blur | `backdrop-blur-sm` | 4px backdrop blur |

### Heading Area

```
px-4 pt-4 pb-3
```

### Heading Text

```
text-interface text-base font-medium leading-snug text-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-interface` | Geist Mono |
| Size | `text-base` | 16px |
| Weight | `font-medium` | 500 |
| Line height | `leading-snug` | 1.375 |
| Color | `text-foreground` | Token `--foreground` |

### CollapsibleContent (Animasi Buka/Tutup)

```
overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up
```

| Property | Class | Value |
|----------|-------|-------|
| Overflow | `overflow-hidden` | Clip selama animasi |
| Animasi buka | `data-[state=open]:animate-accordion-down` | `accordion-down 200ms ease-out` |
| Animasi tutup | `data-[state=closed]:animate-accordion-up` | `accordion-up 200ms ease-out` |

### Content Area

```
space-y-4 border-t border-hairline px-4 py-4
```

| Property | Class | Value |
|----------|-------|-------|
| Spacing vertikal | `space-y-4` | 16px antar paragraf |
| Border atas | `border-t border-hairline` | 0.5px, `var(--border-hairline)` |
| Padding | `px-4 py-4` | 16px semua sisi |

### Paragraph Text

```
text-narrative text-base leading-relaxed text-[color:var(--slate-600)] dark:text-[color:var(--slate-50)]
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-narrative` | Geist Sans |
| Size | `text-base` | 16px |
| Line height | `leading-relaxed` | 1.625 |
| Color (light) | `text-[color:var(--slate-600)]` | oklch(0.446 0 0) |
| Color (dark) | `dark:text-[color:var(--slate-50)]` | oklch(0.984 0 0) |

### CTA Button (CollapsibleTrigger)

```
group relative overflow-hidden flex w-full items-center justify-center border border-transparent border-t border-hairline px-4 py-3
text-signal text-[11px] font-bold
bg-[color:var(--slate-800)] text-[color:var(--slate-100)]
hover:text-[color:var(--slate-800)] hover:border-[color:var(--slate-600)]
dark:bg-[color:var(--slate-100)] dark:text-[color:var(--slate-800)]
dark:hover:text-[color:var(--slate-100)] dark:hover:border-[color:var(--slate-400)]
text-left transition-colors focus-ring
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `flex w-full items-center justify-center` | Full-width, centered |
| Group | `group relative overflow-hidden` | Untuk stripes overlay |
| Border | `border border-transparent border-t border-hairline` | Top hairline, rest transparent |
| Padding | `px-4 py-3` | 16px x, 12px y |
| Font | `text-signal text-[11px] font-bold` | Geist Mono, 11px, 700, uppercase |
| Light bg | `bg-[color:var(--slate-800)]` | oklch(0.279) |
| Light text | `text-[color:var(--slate-100)]` | oklch(0.968) |
| Light hover text | `hover:text-[color:var(--slate-800)]` | Flip ke dark |
| Dark bg | `dark:bg-[color:var(--slate-100)]` | oklch(0.968) |
| Dark text | `dark:text-[color:var(--slate-800)]` | oklch(0.279) |
| Dark hover text | `dark:hover:text-[color:var(--slate-100)]` | Flip ke light |
| Focus | `focus-ring` | `outline: 2px solid var(--ring)` |

### Stripes Overlay (di dalam button)

```
btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0
```

| Property | Class | Value |
|----------|-------|-------|
| Pattern | `btn-stripes-pattern` | Light: `--slate-100` bg + `--slate-300` stripes; Dark: `--slate-800` bg + `--slate-500` stripes |
| Default | `translate-x-[101%]` | Tersembunyi di kanan |
| Hover | `group-hover:translate-x-0` | Slide masuk dari kanan |
| Transition | `transition-transform duration-300 ease-out` | 300ms ease-out |

### Button Label

```
relative z-10
```

Teks: `"TUTUP"` saat terbuka, `"BACA LENGKAP"` saat tertutup.

### Chevron (NavArrowDown)

```
pointer-events-none absolute right-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform duration-300
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute right-4 top-1/2 -translate-y-1/2` | Kanan, tengah vertikal |
| Z-index | `z-10` | Di atas stripes overlay |
| Size | `h-4 w-4` | 16px |
| Color | `text-muted-foreground` | Token `--muted-foreground` |
| Transition | `transition-transform duration-300` | 300ms |
| State buka | `rotate-180` | Rotasi 180 derajat |

---

## 12. ProblemsSection Wrapper

Source: `src/components/about/ProblemsSection.tsx`

```
relative isolate overflow-hidden bg-[color:var(--section-bg-alt)]
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative isolate` | Stacking context isolation |
| Overflow | `overflow-hidden` | Clip background patterns |
| Background | `bg-[color:var(--section-bg-alt)]` | Light: `--slate-200`, Dark: `--slate-800` |

---

## 13. ProblemsSection Background Layers

```tsx
<DiagonalStripes className="opacity-40" />
<DottedPattern spacing={24} withRadialMask={true} />
```

| Layer | Component | Z-Index | Opacity | Props |
|-------|-----------|---------|---------|-------|
| Bottom | `DiagonalStripes` | `z-0` (default) | 40% | — |
| Middle | `DottedPattern` | `z-[1]` (default) | 100% | `spacing={24}`, `withRadialMask={true}` |
| Content | Container div | `z-10` | 100% | — |

DottedPattern dengan `withRadialMask={true}`:
- Mask: `radial-gradient(circle at center, black 50%, transparent 100%)`
- Compositing hint: `[will-change:mask-image]`

---

## 14. ProblemsSection Content Container + Grid

### Content Container

```
relative z-10 mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative z-10` | Di atas background layers |
| Max width | `max-w-7xl` | 1280px |
| Centering | `mx-auto` | Horizontal center |
| Padding-x | `px-4 md:px-8` | 16px mobile, 32px desktop |
| Padding-y | `py-6 md:py-10` | 24px mobile, 40px desktop |

### Grid Layout

```
grid grid-cols-1 gap-comfort md:grid-cols-16
```

| Property | Mobile | Desktop (md+) |
|----------|--------|---------------|
| Grid | `grid-cols-1` | `md:grid-cols-16` (16-column system) |
| Gap | `gap-comfort` (16px) | `gap-comfort` (16px) |

### Section Header

```
col-span-1 mb-8 flex flex-col items-start gap-3 md:col-span-12 md:col-start-3 md:mb-12 md:gap-4
```

| Property | Class | Value |
|----------|-------|-------|
| Grid span (mobile) | `col-span-1` | Full width |
| Grid span (desktop) | `md:col-span-12 md:col-start-3` | 12 kolom, mulai kolom 3 (offset 2) |
| Gap | `gap-3 md:gap-4` | 12px mobile, 16px desktop |
| Margin bottom | `mb-8 md:mb-12` | 32px mobile, 48px desktop |

### Heading Text

```
text-narrative text-3xl font-medium leading-tight tracking-tight text-foreground md:text-3xl lg:text-4xl
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-narrative` | Geist Sans |
| Size | `text-3xl md:text-3xl lg:text-4xl` | 30px mobile/md, 36px lg+ |
| Weight | `font-medium` | 500 |
| Line height | `leading-tight` | 1.25 |
| Tracking | `tracking-tight` | -0.025em |

### Desktop Bento Grid Container

```
hidden md:col-span-12 md:col-start-3 md:grid grid-cols-16 gap-comfort
```

| Property | Class | Value |
|----------|-------|-------|
| Visibility | `hidden md:grid` | Hidden mobile, grid pada md+ |
| Grid span | `md:col-span-12 md:col-start-3` | 12 kolom, offset 2 |
| Inner grid | `grid-cols-16` | 16-column sub-grid |
| Gap | `gap-comfort` | 16px |

---

## 15. ProblemsSection — Desktop Bento Cards

### Individual Card

```
group relative col-span-8 flex flex-col rounded-shell border-hairline bg-transparent p-comfort transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-900
```

| Property | Class | Value |
|----------|-------|-------|
| Grid span | `col-span-8` | 8 dari 16 kolom (50% width, layout 8/8) |
| Radius | `rounded-shell` | 16px (`--radius-xl`) |
| Border | `border-hairline` | 0.5px, `var(--border-hairline)` |
| Background | `bg-transparent` | Transparan default |
| Padding | `p-comfort` | 16px |
| Transition | `transition-colors duration-200` | 200ms |
| Hover (light) | `hover:bg-slate-50` | Subtle light fill |
| Hover (dark) | `dark:hover:bg-slate-900` | Subtle dark fill |

### Card Title (h3)

```
text-narrative font-light text-3xl leading-[1.1] text-foreground m-0 mb-6
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-narrative` | Geist Sans |
| Weight | `font-light` | 300 |
| Size | `text-3xl` | 30px |
| Line height | `leading-[1.1]` | 1.1 (sangat rapat) |
| Margin | `m-0 mb-6` | Reset all, 24px bottom |

Judul dirender 2 baris via `<br />` menggunakan lookup `DESKTOP_TITLE_LINES`.

### Amber Pulse Dot

```
mt-1.5 h-2.5 w-2.5 min-w-2.5 rounded-full bg-[color:var(--amber-500)] shadow-[0_0_8px_var(--amber-500)] animate-pulse
```

| Property | Class | Value |
|----------|-------|-------|
| Size | `h-2.5 w-2.5 min-w-2.5` | 10px, minimum 10px |
| Shape | `rounded-full` | Lingkaran |
| Color | `bg-[color:var(--amber-500)]` | oklch(0.769 0.188 70.08) |
| Glow | `shadow-[0_0_8px_var(--amber-500)]` | Amber glow 8px |
| Animation | `animate-pulse` | Opacity cycle |

### Description Text

```
text-interface m-0 text-xs leading-relaxed text-muted-foreground hover:text-slate-900 dark:hover:text-slate-50
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-interface` | Geist Mono |
| Size | `text-xs` | 12px |
| Line height | `leading-relaxed` | 1.625 |
| Color | `text-muted-foreground` | Token `--muted-foreground` |
| Hover (light) | `hover:text-slate-900` | Near-black |
| Hover (dark) | `dark:hover:text-slate-50` | Near-white |

---

## 16. AgentsSection Wrapper

Source: `src/components/about/AgentsSection.tsx`

```
relative flex flex-col overflow-hidden bg-background md:h-[100svh] md:justify-center
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative` | Untuk background layers |
| Layout | `flex flex-col` | Kolom vertikal |
| Overflow | `overflow-hidden` | Clip background patterns |
| Background | `bg-background` | Light: `--slate-50`, Dark: `--slate-900` |
| Height (desktop) | `md:h-[100svh]` | Full viewport pada md+ |
| Vertical center (desktop) | `md:justify-center` | Konten di tengah |

---

## 17. AgentsSection Background Layers

```tsx
<GridPattern className="z-0" />
<DottedPattern spacing={24} withRadialMask={false} className="z-0" />
```

| Layer | Component | Z-Index | Opacity | Props |
|-------|-----------|---------|---------|-------|
| Bottom | `GridPattern` | `z-0` | 100% (default) | — |
| Same level | `DottedPattern` | `z-0` (override) | 100% (default) | `spacing={24}`, `withRadialMask={false}` |
| Content | Container div | `z-10` | 100% | — |

### Perbedaan Background per Section

| Aspek | ManifestoSection | ProblemsSection | AgentsSection | CareerContactSection |
|-------|------------------|-----------------|---------------|----------------------|
| Layer 1 | GridPattern (80%) | DiagonalStripes (40%) | GridPattern (100%) | DiagonalStripes (40%) |
| Layer 2 | DiagonalStripes (75%) | DottedPattern (radial mask) | DottedPattern (no mask) | DottedPattern (radial mask) |
| Layer 3 | DottedPattern (40%, no mask) | — | — | — |
| Total layers | 3 | 2 | 2 | 2 |

---

## 18. AgentsSection Content Container + Grid

### Content Container

```
relative z-10 mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10
```

### Grid Layout

```
grid grid-cols-16 content-center gap-comfort
```

| Property | Class | Value |
|----------|-------|-------|
| Grid | `grid-cols-16` | 16-column system (semua breakpoint) |
| Alignment | `content-center` | Konten di tengah vertikal |
| Gap | `gap-comfort` | 16px |

### Section Header

```
col-span-16 mb-4 flex flex-col items-start gap-3 md:col-span-12 md:col-start-3 md:mb-8 md:gap-4
```

| Property | Class | Value |
|----------|-------|-------|
| Grid span | `col-span-16 md:col-span-12 md:col-start-3` | Full mobile, 12/16 offset desktop |
| Gap | `gap-3 md:gap-4` | 12px mobile, 16px desktop |
| Margin bottom | `mb-4 md:mb-8` | 16px mobile, 32px desktop |

### Cards Wrapper

```
col-span-16 md:col-span-12 md:col-start-3
```

### Desktop Grid (3-kolom)

```
hidden items-stretch gap-6 md:grid md:grid-cols-3
```

| Property | Class | Value |
|----------|-------|-------|
| Visibility | `hidden md:grid` | Hidden mobile, grid pada md+ |
| Columns | `md:grid-cols-3` | 3 kolom equal-width |
| Alignment | `items-stretch` | Card sama tinggi |
| Gap | `gap-6` | 24px |

---

## 19. AgentTeaserCard

Komponen lokal di dalam `AgentsSection.tsx` (tidak di-export).

### Outer Wrapper

```
group relative h-full
```

### Card Shell (default)

```
relative flex h-full min-h-[240px] flex-col overflow-hidden rounded-shell p-comfort md:min-h-[280px] md:p-airy
border-1 border-[color:var(--slate-400)]
transition-all duration-300 group-hover:-translate-y-1
group-hover:bg-[color:var(--slate-200)] dark:group-hover:bg-[color:var(--slate-700)]
```

| Property | Class | Value |
|----------|-------|-------|
| Min height | `min-h-[240px] md:min-h-[280px]` | 240px mobile, 280px desktop |
| Radius | `rounded-shell` | 16px (`--radius-xl`) |
| Padding | `p-comfort md:p-airy` | 16px mobile, 24px desktop |
| Border | `border-1 border-[color:var(--slate-400)]` | 1px, slate-400 |
| Transition | `transition-all duration-300` | 300ms semua property |
| Hover lift | `group-hover:-translate-y-1` | -4px (naik ke atas) |
| Hover bg (light) | `group-hover:bg-[color:var(--slate-200)]` | Subtle fill |
| Hover bg (dark) | `dark:group-hover:bg-[color:var(--slate-700)]` | Dark subtle fill |

### Highlighted Card (conditional)

```
border-2 border-[color:var(--teal-500)]
```

| Property | Class | Value |
|----------|-------|-------|
| Border width | `border-2` | 2px (lebih tebal dari default 1px) |
| Border color | `border-[color:var(--teal-500)]` | Teal accent |

### Card Title (h3)

```
text-narrative mt-4 mb-3 text-center text-xl font-light text-foreground md:mt-0 md:text-2xl
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-narrative` | Geist Sans |
| Size | `text-xl md:text-2xl` | 20px mobile, 24px desktop |
| Weight | `font-light` | 300 |
| Alignment | `text-center` | Rata tengah |
| Margin | `mt-4 mb-3 md:mt-0` | 16px top mobile (0 desktop), 12px bottom |

### Rose Pulse Dot

```
mt-3 h-2 w-2 min-w-2 animate-pulse rounded-full bg-[color:var(--rose-500)] shadow-[0_0_8px_var(--rose-500)]
```

| Property | Class | Value |
|----------|-------|-------|
| Size | `h-2 w-2 min-w-2` | 8px, minimum 8px |
| Color | `bg-[color:var(--rose-500)]` | Rose-500 |
| Glow | `shadow-[0_0_8px_var(--rose-500)]` | Rose glow 8px |
| Animation | `animate-pulse` | Opacity cycle |

### Perbandingan Pulse Dot

| Aspek | ProblemsSection | AgentTeaserCard |
|-------|----------------|-----------------|
| Color | `--amber-500` | `--rose-500` |
| Size | 10px (`h-2.5 w-2.5`) | 8px (`h-2 w-2`) |
| Offset | `mt-1.5` (6px) | `mt-3` (12px) |

### Description Text

```
text-interface text-sm leading-relaxed text-foreground
```

### Status Badge — Available

```
inline-flex items-center rounded-badge px-2.5 py-1
text-signal text-[10px] font-bold
border bg-[color:var(--teal-500)] text-[color:var(--slate-100)]
dark:bg-[color:var(--teal-700)] dark:text-[color:var(--slate-100)]
```

| Property | Class | Value |
|----------|-------|-------|
| Radius | `rounded-badge` | 6px (`--radius-s-md`) |
| Font | `text-signal text-[10px] font-bold` | Geist Mono, 10px, 700, uppercase |
| Light bg | `bg-[color:var(--teal-500)]` | Teal solid |
| Light text | `text-[color:var(--slate-100)]` | Putih |
| Dark bg | `dark:bg-[color:var(--teal-700)]` | Teal lebih gelap |

### Status Badge — In-Progress

```
inline-flex items-center rounded-badge px-2.5 py-1
text-signal text-[10px] font-bold
border border-[color:var(--slate-600)] bg-[color:var(--slate-500)] text-[color:var(--slate-200)]
```

| Property | Class | Value |
|----------|-------|-------|
| Border | `border border-[color:var(--slate-600)]` | 1px, slate-600 |
| Background | `bg-[color:var(--slate-500)]` | Slate medium |
| Text | `text-[color:var(--slate-200)]` | Light slate |

---

## 20. AgentsTeaserCarousel (Mobile Carousel)

Komponen lokal di dalam `AgentsSection.tsx`. Hanya tampil di mobile (`md:hidden`).

### Container

```
relative overflow-hidden touch-pan-y pt-6 md:hidden
```

| Property | Class | Value |
|----------|-------|-------|
| Overflow | `overflow-hidden` | Clip slide di luar viewport |
| Touch | `touch-pan-y` | Izinkan scroll vertikal, tangkap horizontal swipe |
| Padding top | `pt-6` | 24px |
| Visibility | `md:hidden` | Hanya tampil < 768px |

### Slide Wrapper (flex strip)

```
flex touch-pan-y transition-transform duration-300 ease-out
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `flex` | Horizontal flex strip |
| Transition | `transition-transform duration-300 ease-out` | 300ms slide |
| Transform | `translateX(-${activeSlide * 100}%)` (inline) | Geser per slide |

### Individual Slide

```
box-border w-full flex-shrink-0 px-2
```

### Slide Inner Constraint

```
mx-auto w-full max-w-[300px]
```

### Dot Indicators Container

```
mt-6 flex justify-center gap-2
```

### Individual Dot

```
h-2 w-2 cursor-pointer rounded-full border-none transition-colors duration-200
```

| State | Class | Value |
|-------|-------|-------|
| Active | `bg-brand` | `var(--brand)` = `var(--amber-500)` |
| Inactive | `bg-black/20 dark:bg-white/30` | Hitam 20% / putih 30% |

---

## 21. CareerContactSection Wrapper

Source: `src/components/about/CareerContactSection.tsx`

```
relative isolate overflow-hidden bg-[color:var(--section-bg-alt)]
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative isolate` | Stacking context isolation |
| Overflow | `overflow-hidden` | Clip background patterns |
| Background | `bg-[color:var(--section-bg-alt)]` | Light: `--slate-200`, Dark: `--slate-800` |
| ID | `karier-kontak` | Anchor link target |

---

## 22. CareerContactSection Background Layers

```tsx
<DiagonalStripes className="opacity-40" />
<DottedPattern spacing={24} withRadialMask={true} />
```

| Layer | Component | Z-Index | Opacity | Props |
|-------|-----------|---------|---------|-------|
| Bottom | `DiagonalStripes` | `z-0` (default) | 40% | — |
| Top | `DottedPattern` | `z-[1]` (default) | 100% | `spacing={24}`, `withRadialMask={true}` |
| Content | Container | `z-10` | 100% | — |

Sama persis dengan ProblemsSection (Section 13).

---

## 23. CareerContactSection Content + Cards

### Content Container

```
relative z-10 mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10
```

### Grid Container

```
grid grid-cols-1 gap-comfort md:grid-cols-16
```

### Section Header

```
col-span-1 mb-8 flex flex-col items-start gap-3 md:col-span-12 md:col-start-3 md:mb-12 md:gap-4
```

### Desktop Card Grid

```
hidden md:col-span-12 md:col-start-3 md:grid grid-cols-16 gap-comfort
```

### Desktop Card Wrapper

```
group relative col-span-8 flex h-full min-h-[180px] flex-col overflow-hidden rounded-shell border-hairline bg-transparent p-airy
transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-900
```

| Property | Class | Value |
|----------|-------|-------|
| Grid span | `col-span-8` | 8/16 kolom (50%) |
| Min height | `min-h-[180px]` | 180px minimum |
| Radius | `rounded-shell` | 16px |
| Border | `border-hairline` | 0.5px |
| Padding | `p-airy` | 24px |
| Hover (light) | `hover:bg-slate-50` | Subtle fill |
| Hover (dark) | `dark:hover:bg-slate-900` | Dark subtle fill |

### Icon Container

```
rounded-action flex h-10 w-10 shrink-0 items-center justify-center bg-[color:var(--slate-600)] dark:bg-[color:var(--slate-700)]
```

| Property | Class | Value |
|----------|-------|-------|
| Size | `h-10 w-10` | 40px square |
| Radius | `rounded-action` | 4px (`--radius-sm`) |
| Background (light) | `bg-[color:var(--slate-600)]` | oklch(0.446) |
| Background (dark) | `dark:bg-[color:var(--slate-700)]` | Darker slate |

### Icon (inner)

```
h-5 w-5 text-slate-50
```

### Card Title

```
text-narrative pt-2 text-lg font-medium leading-tight text-foreground
```

### Separator

```
mb-4 border-t border-hairline
```

### Content: Plain Text (Karier)

```
text-narrative text-sm text-muted-foreground
```

### Content: Company Name (Kontak)

```
text-interface font-bold text-foreground
```

### Content: Address (Kontak)

```
text-narrative text-sm text-muted-foreground
```

### Content: Email Link (Kontak)

```
text-interface text-sm text-[color:var(--slate-700)] dark:text-[color:var(--slate-50)] hover:underline
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-interface` | Geist Mono |
| Color (light) | `text-[color:var(--slate-700)]` | Dark slate |
| Color (dark) | `dark:text-[color:var(--slate-50)]` | Near-white |
| Hover | `hover:underline` | Underline on hover |

---

## 24. AccordionAbout

Source: `src/components/about/AccordionAbout.tsx`
Reusable accordion, digunakan di ProblemsSection dan CareerContactSection (mobile view).

### Accordion Wrapper

```
rounded-shell border-main border-border border-t bg-card/30
```

| Property | Class | Value |
|----------|-------|-------|
| Radius | `rounded-shell` | 16px (`--radius-xl`) |
| Border width | `border-main` | 1px |
| Border color | `border-border` | Tema-aware border |
| Border top | `border-t` | Explicit top border |
| Background | `bg-card/30` | Card color at 30% opacity |

### Item Container

```
border-b border-hairline
```

### Item Trigger (button)

```
flex w-full items-center justify-between p-comfort
rounded-action hover-slash overflow-hidden
bg-transparent text-left text-base text-foreground
transition-colors duration-200
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `flex w-full items-center justify-between` | Full-width, space-between |
| Padding | `p-comfort` | 16px |
| Radius | `rounded-action` | 4px |
| Hover effect | `hover-slash` | Slash pattern overlay (opacity 0 -> 0.1 on hover, 150ms) |
| Focus | `focus-visible:ring-2 focus-visible:ring-ring` | Accessible focus ring |

### Icon Container (optional)

```
flex h-8 w-8 shrink-0 items-center justify-center rounded-action bg-[color:var(--amber-500)]/10
```

| Property | Class | Value |
|----------|-------|-------|
| Size | `h-8 w-8` | 32px square |
| Radius | `rounded-action` | 4px |
| Background | `bg-[color:var(--amber-500)]/10` | Amber at 10% opacity |

### Icon (inner)

```
text-[color:var(--amber-500)] [&>svg]:h-4 [&>svg]:w-4
```

### Title Text (default)

```
text-interface flex-1 font-bold tracking-tight
```

Catatan: `titleClassName` prop dapat override. ProblemsSection dan CareerContactSection override ke `text-interface font-mono text-base font-medium leading-snug text-foreground tracking-normal`.

### Badge (optional)

```
text-signal ml-auto mr-3 shrink-0 rounded-badge text-[10px] font-bold tracking-widest
```

Variant `default`: `bg-[color:var(--emerald-500)] text-[color:var(--slate-950)]`

Badge base classes (dari badge.tsx cva):
```
inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0
transition-[color,box-shadow] overflow-hidden
```

### Chevron (NavArrowDown)

```
h-4 w-4 shrink-0 text-[color:var(--amber-500)] transition-transform duration-300
```

State open: `rotate-180`

Catatan: `chevronClassName` prop dapat override warna. ProblemsSection dan CareerContactSection override ke `text-muted-foreground`.

### Collapsible Content Wrapper

```
overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up
```

### Content Area (inner div)

```
text-narrative p-dense pb-4 text-sm leading-relaxed text-muted-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-narrative` | Geist Sans |
| Padding | `p-dense` | 8px |
| Padding bottom | `pb-4` | 16px (override p-dense bottom) |
| Size | `text-sm` | 14px |
| Line height | `leading-relaxed` | 1.625 |

Catatan: `contentClassName` prop dapat override. Override di sections: `!px-4 !pb-4 text-base leading-relaxed text-[color:var(--slate-600)] dark:text-[color:var(--slate-50)]`.

---

## 25. SectionBadge (Shared Component)

Source: `src/components/ui/section-badge.tsx`
Digunakan di semua section pada halaman About. Optional `href` prop menjadikannya link.

### Outer Container

```
inline-flex w-fit items-center gap-2 rounded-badge px-2.5 py-1
bg-[color:var(--emerald-600)] text-[color:var(--slate-50)]
```

Jika `href` diberikan, tambah:
```
group transition-colors duration-300 hover:bg-[color:var(--emerald-900)]
```

### Animated Dot

```
h-2 w-2 rounded-full bg-[color:var(--amber-500)] shadow-[0_0_6px_var(--amber-500)] animate-pulse
```

### Badge Text

```
text-signal text-[10px] font-bold
```

Jika `href` diberikan, tambah: `group-hover:text-[color:var(--slate-100)]`

---

## 26. Custom CSS Classes / Design Tokens

### Custom Utility Classes

| Class | Definition | Value |
|-------|-----------|-------|
| `text-narrative` | `font-family: var(--font-sans)` | Geist Sans |
| `text-interface` | `font-family: var(--font-mono)` | Geist Mono |
| `text-signal` | `font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.1em` | Geist Mono + caps + wide tracking |
| `rounded-shell` | `border-radius: var(--radius-xl)` | 16px |
| `rounded-action` | `border-radius: var(--radius-sm)` | 4px |
| `rounded-badge` | `border-radius: var(--radius-s-md)` | 6px |
| `border-hairline` | `border-width: 0.5px; border-color: var(--border-hairline)` | Light: `rgba(0,0,0,0.15)`, Dark: `rgba(255,255,255,0.2)` |
| `border-main` | `border-width: 1px` | 1px |
| `p-comfort` | `padding: 1rem` | 16px |
| `p-dense` | `padding: 0.5rem` | 8px |
| `p-airy` | `padding: 1.5rem` | 24px |
| `gap-comfort` | `gap: 1rem` | 16px |
| `hover-slash` | `position: relative` + `::before` pseudo-element | Slash pattern overlay, opacity 0 -> 0.1 on hover, 150ms ease |
| `focus-ring` | `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }` | Ring color = `var(--ring)` |
| `bg-brand` | `background-color: var(--brand)` | `var(--brand)` = `var(--amber-500)` |
| `btn-stripes-pattern` | Diagonal stripes overlay pattern | Light: `--slate-100` bg + `--slate-300` stripes. Dark: `--slate-800` bg + `--slate-500` stripes |

### CSS Variables

| Variable | Light Mode | Dark Mode |
|----------|-----------|-----------|
| `--container-max-width` | `1200px` | `1200px` |
| `--header-h` | `54px` | `54px` |
| `--section-bg-alt` | `var(--slate-200)` | `var(--slate-800)` |
| `--border-hairline` | `rgba(0, 0, 0, 0.15)` | `rgba(255, 255, 255, 0.2)` |
| `--brand` | `var(--amber-500)` | `var(--amber-500)` |
| `--amber-500` | oklch(0.769 0.188 70.08) | same |
| `--teal-500` | (oklch teal) | same |
| `--teal-700` | (oklch darker teal) | same |
| `--emerald-500` | (oklch emerald) | same |
| `--emerald-600` | oklch(0.596 0.145 163.225) | same |
| `--slate-50` | oklch(0.984 0 0) | same |
| `--slate-100` | oklch(0.968 0 0) | same |
| `--slate-200` | oklch(0.929 0 0) | same |
| `--slate-400` | oklch(0.704 0 0) | same |
| `--slate-500` | (oklch mid-slate) | same |
| `--slate-600` | oklch(0.446 0 0) | same |
| `--slate-700` | (oklch dark-slate) | same |
| `--slate-800` | oklch(0.279 0 0) | same |
| `--slate-950` | (oklch near-black) | same |
| `--rose-500` | (oklch rose) | same |

### Animasi

| Animation | Trigger | Behavior | Durasi |
|-----------|---------|----------|--------|
| Pulse | `animate-pulse` | Opacity cycle (fade in/out) | Default CSS pulse |
| Accordion open | `data-[state=open]:animate-accordion-down` | Height 0 -> auto, opacity 0 -> 1 | 200ms ease-out |
| Accordion close | `data-[state=closed]:animate-accordion-up` | Height auto -> 0, opacity 1 -> 0 | 200ms ease-out |
| Transform slide | `transition-transform duration-300 ease-out` | Carousel slide translateX | 300ms ease-out |
| Color transition | `transition-colors duration-200` | Card hover, trigger hover | 200ms |
| Color transition | `transition-colors duration-300` | SectionBadge hover | 300ms |
| Chevron rotate | `transition-transform duration-300` + `rotate-180` | AccordionAbout chevron | 300ms |
| Card lift | `transition-all duration-300 group-hover:-translate-y-1` | AgentTeaserCard hover | 300ms |
| Btn stripes | `translate-x-[101%] → group-hover:translate-x-0` | ManifestoMobileAccordion CTA | 300ms ease-out |

---

## 27. Perbedaan Styling: Mobile vs Desktop

| Element | Mobile (< md / < lg) | Desktop (md+ / lg+) |
|---------|----------------------|----------------------|
| **ManifestoSection grid** | `grid-cols-1 gap-comfort` | `lg:grid-cols-16 lg:gap-16` |
| **ManifestoSection text column** | Full width, `justify-center` | `lg:col-span-7` |
| **ManifestoSection content** | `ManifestoMobileAccordion` (`lg:hidden`) | `ManifestoTerminalPanel` (`hidden lg:flex lg:col-span-9`) |
| **ManifestoSection padding** | `px-4 py-10` | `md:px-6 md:py-20` |
| **ProblemsSection content** | `AccordionAbout` (`md:hidden`) | Bento cards (`hidden md:grid`) |
| **ProblemsSection cards** | Accordion items (stacked, collapsible) | `col-span-8` cards (grid 2-kolom) |
| **ProblemsSection header gap** | `gap-3 mb-8` | `md:gap-4 md:mb-12` |
| **AgentsSection content** | `AgentsTeaserCarousel` (`md:hidden`, swipe) | `hidden md:grid md:grid-cols-3` (3-col grid) |
| **AgentTeaserCard** | `min-h-[240px] p-comfort`, title `text-xl mt-4` | `md:min-h-[280px] md:p-airy`, title `md:text-2xl md:mt-0` |
| **AgentTeaserCard badge** | `mt-8` (fixed) | `md:mt-auto md:pt-4` (push ke bottom) |
| **CareerContactSection content** | `AccordionAbout` (`md:hidden`) | Bento cards (`hidden md:grid`) |
| **CareerContactSection heading** | Dengan line break (`md:hidden`) | Single line (`hidden md:inline`) |
| **Section heading size** | `text-3xl` (30px) | `md:text-3xl lg:text-4xl` (36px) |
| **Container padding-x** | `px-4` (16px) | `md:px-8` (32px) |
| **Container padding-y** | `py-6` (24px) | `md:py-10` (40px) |
| **Grid column span** | `col-span-1` / `col-span-16` | `md:col-span-12 md:col-start-3` (centered) |

### Breakpoint Summary

| Breakpoint | Pixel | Komponen yang Berubah |
|------------|-------|----------------------|
| `md` (768px) | >= 768px | ProblemsSection (accordion -> cards), AgentsSection (carousel -> grid), CareerContactSection (accordion -> cards), padding scale |
| `lg` (1024px) | >= 1024px | ManifestoSection (accordion -> terminal panel, grid 1-col -> 16-col), heading size scale |

### Pola Umum Mobile vs Desktop

1. **Accordion -> Cards**: ProblemsSection dan CareerContactSection menggunakan `AccordionAbout` di mobile dan bento card grid di desktop. Peralihan di `md`.
2. **Carousel -> Grid**: AgentsSection menampilkan swipe carousel di mobile dan 3-column grid di desktop. Peralihan di `md`.
3. **Collapsible -> Terminal**: ManifestoSection menggunakan `ManifestoMobileAccordion` di mobile dan `ManifestoTerminalPanel` di desktop. Peralihan di `lg`.
4. **16-column system**: Desktop layout menggunakan `grid-cols-16` konsisten, content area di `col-span-12 col-start-3` (centered) atau sub-grid `col-span-8` untuk card pairs.
