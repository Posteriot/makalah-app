# Home Benefits Section — Styling Extraction

Dokumentasi lengkap seluruh CSS/Tailwind class dan design tokens yang terimplementasi di benefits section (`src/components/marketing/benefits/`).

---

## 1. Section Wrapper (BenefitsSection.tsx)

### `<section>` Root Element

| Property | Class/Value |
|----------|-------------|
| Position | `relative` |
| Stacking | `isolate` |
| Height | `h-[100svh] min-h-[100svh]` |
| Overflow | `overflow-hidden` |
| Background | `bg-[var(--section-bg-alt)]` |
| Anchor | `id="kenapa-makalah-ai"` |

### Inner Content Container

| Property | Class/Value |
|----------|-------------|
| Position | `relative z-10` |
| Centering | `mx-auto` |
| Size | `h-full w-full` |
| Max width | `max-w-7xl` (1280px) |
| Padding mobile | `px-4 py-6` |
| Padding desktop | `md:px-8 md:py-10` |

### Main Grid

| Property | Class/Value |
|----------|-------------|
| Display | `grid` |
| Height | `h-full` |
| Columns | `grid-cols-16` |
| Vertical align | `content-center` |
| Gap | `gap-comfort` (16px) |

---

## 2. Background Layers

Dua React component dari `@/components/marketing/SectionBackground`, di-render sebagai layer dekoratif di belakang konten.

### DiagonalStripes

```tsx
<DiagonalStripes className="opacity-40" />
```

| Property | Class/Value |
|----------|-------------|
| Position | `absolute inset-0 pointer-events-none` |
| Z-index | `z-0` |
| Opacity (via prop) | `opacity-40` |
| Light mode | `repeating-linear-gradient(45deg, slate-900 at 10% opacity, 1px width, 8px gap)` |
| Dark mode | `repeating-linear-gradient(45deg, slate-50 at 12% opacity, 1px width, 8px gap)` |
| Memoized | `React.memo` |

### DottedPattern

```tsx
<DottedPattern spacing={24} withRadialMask={true} />
```

| Property | Class/Value |
|----------|-------------|
| Position | `absolute inset-0 pointer-events-none` |
| Z-index | `z-[1]` |
| Dot spacing | `24px × 24px` (via `backgroundSize` style) |
| Light mode | `radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)` |
| Dark mode | `radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)` |
| Radial mask | `radial-gradient(circle at center, black 50%, transparent 100%)` |
| Performance | `[will-change:mask-image]` |
| Memoized | `React.memo` + `useMemo` (style object) |

### Z-Index Layering

```
DiagonalStripes (z-0) → DottedPattern (z-[1]) → Content (z-10)
```

---

## 3. Content Grid Layout

Semua child elements menggunakan pola kolom yang identik:

| Breakpoint | Class |
|------------|-------|
| Mobile | `col-span-16` (full width) |
| Desktop | `md:col-span-12 md:col-start-3` (centered 12 dari 16) |

### Header Container (Badge + Title)

| Property | Class/Value |
|----------|-------------|
| Span | `col-span-16 md:col-span-12 md:col-start-3` |
| Layout | `flex flex-col` |
| Gap | `gap-comfort` (16px) |

---

## 4. BenefitsBadge (via SectionBadge)

`BenefitsBadge` adalah thin wrapper yang delegasi ke `SectionBadge` dari `@/components/ui/section-badge`.

### SectionBadge Container

| Property | Class/Value |
|----------|-------------|
| Layout | `inline-flex w-fit items-center gap-2` |
| Radius | `rounded-badge` (6px) |
| Padding | `px-2.5 py-1` |
| Background | `bg-[color:var(--emerald-600)]` |
| Text color | `text-[color:var(--slate-50)]` |

### Animated Amber Dot (SectionBadge)

| Property | Class/Value |
|----------|-------------|
| Size | `h-2 w-2` (8px) |
| Shape | `rounded-full` |
| Color | `bg-[color:var(--amber-500)]` |
| Glow | `shadow-[0_0_6px_var(--amber-500)]` |
| Animation | `animate-pulse` |

### Badge Text (SectionBadge)

| Property | Class/Value |
|----------|-------------|
| Font | `text-signal` (Geist Mono, uppercase, wide tracking) |
| Size | `text-[10px]` |
| Weight | `font-bold` |

---

## 5. BenefitsTitle

### `<h2>` Element

| Property | Class/Value |
|----------|-------------|
| Font | `text-narrative` (Geist Sans) |
| Size mobile | `text-3xl` |
| Size desktop | `md:text-4xl` |
| Line height | `leading-tight` |
| Weight | `font-medium` |
| Tracking | `tracking-tight` |
| Color | `text-foreground` |

Teks: "Kolaborasi dengan AI, `<br />` bukan dibuatkan AI."

---

## 6. BentoBenefitsGrid (Desktop)

### Grid Container

| Property | Class/Value |
|----------|-------------|
| Visibility | `hidden md:grid` (desktop only) |
| Columns | `grid-cols-16` |
| Gap | `gap-comfort` (16px) |

### Bento Card (per benefit item)

| Property | Class/Value |
|----------|-------------|
| Span | `col-span-8` (2 cards per row = 2×2 grid) |
| Layout | `flex flex-col` |
| Radius | `rounded-shell` (16px) |
| Border | `border-hairline` (0.5px) |
| Background idle | `bg-transparent` |
| Background hover (light) | `hover:bg-slate-50` |
| Background hover (dark) | `dark:hover:bg-slate-900` |
| Padding | `p-comfort` (16px) |
| Transition | `transition-colors duration-200` |
| Group | `group` (untuk child hover effects) |
| Position | `relative` |

### Card Inner Content

| Property | Class/Value |
|----------|-------------|
| Layout | `relative flex-1 flex flex-col` |

### Card Heading `<h3>`

| Property | Class/Value |
|----------|-------------|
| Font | `text-narrative` (Geist Sans) |
| Weight | `font-light` |
| Size | `text-3xl` |
| Line height | `leading-[1.1]` |
| Color | `text-foreground` |
| Margin | `m-0 mb-6` |

Title di-render sebagai 2-line: `title[0]<br />title[1]`.

### Dot + Description Wrapper

| Property | Class/Value |
|----------|-------------|
| Layout | `flex items-start gap-3` |

### Amber Dot (Desktop)

| Property | Class/Value |
|----------|-------------|
| Alignment | `mt-1.5` (align with text baseline) |
| Size | `h-2.5 w-2.5 min-w-2.5` (10px) |
| Shape | `rounded-full` |
| Color | `bg-amber-500` |
| Animation | `animate-pulse` |
| Glow | `shadow-[0_0_8px] shadow-amber-500` |

### Description `<p>`

| Property | Class/Value |
|----------|-------------|
| Font | `text-interface` (Geist Mono) |
| Size | `text-xs` |
| Line height | `leading-relaxed` |
| Color | `text-muted-foreground` |
| Margin | `m-0` |

---

## 7. BenefitsAccordion (Mobile)

### Outer Container

| Property | Class/Value |
|----------|-------------|
| Visibility | `md:hidden` (mobile only) |

### Accordion Root

| Property | Class/Value |
|----------|-------------|
| Type | `single` (one item open at a time) |
| Collapsible | `true` |
| Layout | `flex flex-col` |
| Gap | `gap-comfort` (16px) |

### AccordionItem (per benefit)

| Property | Class/Value |
|----------|-------------|
| Group | `group` |
| Position | `relative` |
| Overflow | `overflow-hidden` |
| Radius | `rounded-md` (8px) |
| Border | `border-hairline` (0.5px) |
| Background idle | `bg-transparent` |
| Background hover (light) | `hover:bg-slate-200` |
| Background hover (dark) | `dark:hover:bg-slate-900` |
| Transition | `transition-colors duration-200` |

### AccordionTrigger

| Property | Class/Value |
|----------|-------------|
| Padding | `px-4 py-3` |
| Underline | `hover:no-underline` |

### Trigger Inner Layout

| Property | Class/Value |
|----------|-------------|
| Layout | `flex items-center gap-3` |

### Amber Dot (Mobile)

| Property | Class/Value |
|----------|-------------|
| Size | `h-2.5 w-2.5 min-w-2.5` (10px) |
| Shape | `rounded-full` |
| Color | `bg-amber-500` |
| Animation | `animate-pulse` |
| Glow | `shadow-[0_0_8px] shadow-amber-500` |

Noot: tidak ada `mt-1.5` (beda dari desktop — dot sudah center via `items-center`).

### Title `<span>`

| Property | Class/Value |
|----------|-------------|
| Font | `text-narrative` (Geist Sans) |
| Weight | `font-medium` |
| Size | `text-base` |
| Color | `text-foreground` |

### AccordionContent

| Property | Class/Value |
|----------|-------------|
| Padding | `px-4 pb-4` |

### Description `<p>`

| Property | Class/Value |
|----------|-------------|
| Font | `text-interface` (Geist Mono) |
| Size | `text-xs` |
| Line height | `leading-relaxed` |
| Color | `text-muted-foreground` |
| Indent | `pl-5` (align with title, past dot) |

---

## 8. DocsCTA (via SectionCTA)

`DocsCTA` adalah thin wrapper yang delegasi ke `SectionCTA` dari `@/components/ui/section-cta`.

### Wrapper `<div>`

| Property | Class/Value |
|----------|-------------|
| Layout | `flex justify-center` |
| Spacing | `mt-8` |

### SectionCTA Button/Link

| Property | Class/Value |
|----------|-------------|
| Structure | `group relative overflow-hidden` |
| Layout | `inline-flex items-center justify-center gap-2` |
| Radius | `rounded-action` (8px) |
| Padding | `px-2 py-1` |
| Typography | `text-signal text-xs font-medium uppercase tracking-widest` |
| Whitespace | `whitespace-nowrap` |
| SVG handling | `[&_svg]:shrink-0 [&_svg]:self-center` |
| Transition | `transition-colors` |
| Focus | `focus-ring` |

### SectionCTA — Light Mode

| State | Classes |
|-------|---------|
| Idle | `border border-transparent bg-[color:var(--slate-800)] text-[color:var(--slate-100)]` |
| Hover | `hover:text-[color:var(--slate-800)] hover:border-[color:var(--slate-600)]` |

### SectionCTA — Dark Mode

| State | Classes |
|-------|---------|
| Idle | `dark:bg-[color:var(--slate-100)] dark:text-[color:var(--slate-800)]` |
| Hover | `dark:hover:text-[color:var(--slate-100)] dark:hover:border-[color:var(--slate-400)]` |

### SectionCTA — Diagonal Stripes Overlay

```
btn-stripes-pattern absolute inset-0 pointer-events-none
translate-x-[101%] transition-transform duration-300 ease-out
group-hover:translate-x-0
```

Stripes slide in dari kanan saat hover. Background warna stripes sesuai tema (light: slate-100 + diagonal gradient, dark: slate-800 + diagonal gradient).

### SectionCTA — Text Content Span

| Property | Class/Value |
|----------|-------------|
| Position | `relative z-10` (di atas stripes overlay) |
| Layout | `inline-flex items-center gap-2 whitespace-nowrap` |

---

## 9. Shared Design Tokens

Tokens yang dipakai konsisten di desktop dan mobile:

### Amber Dot

| Property | Desktop (BentoBenefitsGrid) | Mobile (BenefitsAccordion) | SectionBadge |
|----------|---------------------------|---------------------------|--------------|
| Size | `h-2.5 w-2.5` (10px) | `h-2.5 w-2.5` (10px) | `h-2 w-2` (8px) |
| Min width | `min-w-2.5` | `min-w-2.5` | — |
| Shape | `rounded-full` | `rounded-full` | `rounded-full` |
| Color | `bg-amber-500` | `bg-amber-500` | `bg-[color:var(--amber-500)]` |
| Animation | `animate-pulse` | `animate-pulse` | `animate-pulse` |
| Glow | `shadow-[0_0_8px] shadow-amber-500` | `shadow-[0_0_8px] shadow-amber-500` | `shadow-[0_0_6px_var(--amber-500)]` |
| Top margin | `mt-1.5` | — | — |

### Typography

| Role | Class | Font Family |
|------|-------|-------------|
| Heading | `text-narrative` | Geist Sans |
| Body/Data | `text-interface` | Geist Mono |
| Badge/Label | `text-signal` | Geist Mono + uppercase + tracking |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `gap-comfort` | 16px | Grid gap, accordion gap, header gap |
| `p-comfort` | 16px | Bento card padding |
| `mt-8` | 32px | DocsCTA wrapper top margin |

### Border

| Token | Value | Usage |
|-------|-------|-------|
| `border-hairline` | 0.5px | Bento cards, accordion items |

### Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-shell` | 16px | Bento cards (desktop) |
| `rounded-md` | 8px | Accordion items (mobile) |
| `rounded-badge` | 6px | SectionBadge |
| `rounded-action` | 8px | SectionCTA button |

---

## 10. CSS Variables

### `--section-bg-alt`

| Mode | Value | Mapped From |
|------|-------|-------------|
| Light | `var(--slate-200)` | `oklch(0.929 0 0)` |
| Dark | `var(--slate-800)` | `oklch(0.279 0 0)` |

Didefinisikan di `globals.css`: light mode (line 157), dark mode (line 651).

### Bento Token Definitions (Legacy — Tidak Dipakai di Komponen)

Token berikut **didefinisikan** di `globals.css` tapi **tidak dipakai** oleh BentoBenefitsGrid (komponen sudah migrasi ke inline Tailwind):

| Token | Value | Status |
|-------|-------|--------|
| `--color-bento` | `#2a2a2e` | Unused |
| `--color-bento-hover` | `#3a3a3e` | Unused |
| `--color-bento-light` | `#ffffff` | Unused |
| `--color-bento-light-hover` | `#fafafa` | Unused |
| `--color-bento-border` | `rgba(255,255,255,0.15)` | Unused |
| `--color-bento-border-hover` | `rgba(255,255,255,0.25)` | Unused |
| `--color-bento-border-light` | `rgba(0,0,0,0.1)` | Unused |
| `--color-bento-border-light-hover` | `rgba(0,0,0,0.15)` | Unused |
| `--font-size-bento-heading` | `2rem` | Unused |
| `--font-size-bento-paragraph` | `0.9375rem` | Unused |
| `--line-height-bento-heading` | `1.1` | Unused |

---

## 11. Custom CSS Classes (globals.css)

| Class | Definisi | Dipakai Di |
|-------|----------|------------|
| `text-narrative` | `font-family: var(--font-sans)` (Geist Sans) | BenefitsTitle, BentoBenefitsGrid h3, BenefitsAccordion title |
| `text-interface` | `font-family: var(--font-mono)` (Geist Mono) | BentoBenefitsGrid description, BenefitsAccordion description |
| `text-signal` | `font-mono + uppercase + tracking` | SectionBadge text, SectionCTA text |
| `rounded-shell` | `border-radius: 16px` | BentoBenefitsGrid cards |
| `rounded-badge` | `border-radius: 6px` | SectionBadge |
| `rounded-action` | `border-radius: 8px` | SectionCTA |
| `border-hairline` | `border: 0.5px` | Bento cards, accordion items |
| `gap-comfort` | `gap: 16px` | Main grid, accordion, header |
| `p-comfort` | `padding: 16px` | Bento cards |
| `focus-ring` | Sky/Info focus ring | SectionCTA |
| `btn-stripes-pattern` | 45° diagonal stripes overlay (theme-aware) | SectionCTA hover |

---

## 12. Desktop vs Mobile Comparison

| Aspect | Desktop (BentoBenefitsGrid) | Mobile (BenefitsAccordion) |
|--------|---------------------------|---------------------------|
| Visibility | `hidden md:grid` | `md:hidden` |
| Layout | `grid grid-cols-16` (2×2 bento) | `flex flex-col` (vertical stack) |
| Card radius | `rounded-shell` (16px) | `rounded-md` (8px) |
| Card padding | `p-comfort` (16px) | Trigger: `px-4 py-3`, Content: `px-4 pb-4` |
| Hover light | `hover:bg-slate-50` | `hover:bg-slate-200` |
| Hover dark | `dark:hover:bg-slate-900` | `dark:hover:bg-slate-900` |
| Title font | `text-narrative font-light text-3xl` | `text-narrative font-medium text-base` |
| Title format | Array → 2-line via `<br />` | String → single line |
| Description indent | Via `flex gap-3` (next to dot) | `pl-5` (fixed indent past dot) |
| Dot alignment | `mt-1.5` (top-aligned with text) | — (center-aligned via `items-center`) |
| Interaction | Hover only (no expand/collapse) | Accordion expand/collapse |
| State mgmt | None (server component) | `useState` (client component) |
| Card overflow | — | `overflow-hidden` (clip accordion animation) |

---

## 13. Bento Grid vs Accordion — Card Comparison

| Element | Bento Card | Accordion Item |
|---------|-----------|----------------|
| **Border** | `border-hairline` | `border-hairline` |
| **Idle bg** | `bg-transparent` | `bg-transparent` |
| **Transition** | `transition-colors duration-200` | `transition-colors duration-200` |
| **Dot size** | 10px (`h-2.5 w-2.5`) | 10px (`h-2.5 w-2.5`) |
| **Dot color** | `bg-amber-500` | `bg-amber-500` |
| **Dot glow** | `shadow-[0_0_8px] shadow-amber-500` | `shadow-[0_0_8px] shadow-amber-500` |
| **Dot animation** | `animate-pulse` | `animate-pulse` |
| **Heading font** | `text-narrative` | `text-narrative` |
| **Body font** | `text-interface text-xs` | `text-interface text-xs` |
| **Body color** | `text-muted-foreground` | `text-muted-foreground` |
| **Body line-height** | `leading-relaxed` | `leading-relaxed` |

Identik: dot, description font/size/color. Beda: card shape (shell vs md), title weight (light vs medium), title size (3xl vs base).
