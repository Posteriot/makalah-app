# Documentation Page — Styling Extraction

Tanggal: 11 Februari 2026
Scope: Seluruh CSS/Tailwind classes dan design tokens yang terimplementasi di halaman dokumentasi marketing `/documentation`
Source files:
- `src/components/marketing/documentation/DocumentationPage.tsx`
- `src/components/marketing/documentation/DocSidebar.tsx`
- `src/components/marketing/documentation/DocArticle.tsx`
- `src/components/marketing/documentation/utils.tsx`

---

## 1. File dan Komponen

| File | Komponen | Fungsi |
|------|----------|--------|
| `DocumentationPage.tsx` | `DocumentationPage`, `DocumentationContent`, `DocumentationLoading` | Layout utama, state, routing, loading |
| `DocSidebar.tsx` | `DocSidebar` | Sidebar navigasi + search |
| `DocArticle.tsx` | `DocArticle` | Renderer konten artikel |
| `utils.tsx` | `getIcon`, `renderInline` | Icon map, inline markdown renderer |

Dependensi UI:
- `SectionBadge` dari `@/components/ui/section-badge`
- `DottedPattern` dari `@/components/marketing/SectionBackground`
- `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` dari `@/components/ui/sheet`

---

## 2. Section Wrapper (DocumentationPage)

```
relative isolate overflow-hidden bg-[color:var(--section-bg-alt)] pt-[var(--header-h)]
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative isolate` | Stacking context isolation |
| Overflow | `overflow-hidden` | Clip background patterns |
| Background | `bg-[color:var(--section-bg-alt)]` | Section alternate background token |
| Padding top | `pt-[var(--header-h)]` | Header height offset (dynamic CSS variable) |

---

## 3. Background Layer (DottedPattern)

```tsx
<DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />
```

### DottedPattern Base Classes (dari `DottedPattern.tsx`)

```
absolute inset-0 pointer-events-none z-[1]
```

Overridden di DocumentationPage: `z-0 opacity-100`

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute inset-0` | Full-cover overlay |
| Pointer events | `pointer-events-none` | Non-interactive |
| Z-index (base) | `z-[1]` | Default layer |
| Z-index (override) | `z-0` | Pushed behind content |
| Opacity (override) | `opacity-100` | Full visibility |

### Background Image

| Mode | Class | Value |
|------|-------|-------|
| Light | `[background-image:radial-gradient(rgba(0,0,0,0.12)_1px,transparent_1px)]` | Dark dots at 12% opacity |
| Dark | `dark:[background-image:radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)]` | White dots at 12% opacity |

### Props

| Prop | Value | Effect |
|------|-------|--------|
| `spacing` | `24` | `backgroundSize: 24px 24px` (inline style) |
| `withRadialMask` | `false` | No `mask-image` / `WebkitMaskImage` applied, no `[will-change:mask-image]` |

`aria-hidden="true"` — hidden from assistive technology.

---

## 4. Content Container

```
relative z-10 mx-auto w-full max-w-7xl px-4 lg:px-8
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative z-10` | Above background layer |
| Width | `w-full max-w-7xl` | Full width up to 1280px |
| Centering | `mx-auto` | Horizontal center |
| Padding-x (mobile) | `px-4` | 16px |
| Padding-x (desktop) | `lg:px-8` | 32px |

---

## 5. Grid Layout

```
grid grid-cols-1 gap-comfort pb-6 md:grid-cols-16
```

| Property | Mobile | Desktop (md+) |
|----------|--------|---------------|
| Grid columns | `grid-cols-1` | `md:grid-cols-16` (16-column system) |
| Gap | `gap-comfort` (16px) | `gap-comfort` (16px) |
| Padding bottom | `pb-6` (24px) | `pb-6` (24px) |

### Sidebar Column

```
hidden md:col-span-4 md:block
```

| Property | Class | Value |
|----------|-------|-------|
| Visibility (mobile) | `hidden` | Hidden below md breakpoint |
| Visibility (desktop) | `md:block` | Visible on md+ |
| Grid span | `md:col-span-4` | 4 of 16 columns |

### Article Column

```
col-span-1 pt-4 md:col-span-12
```

| Property | Class | Value |
|----------|-------|-------|
| Grid span (mobile) | `col-span-1` | Full width |
| Grid span (desktop) | `md:col-span-12` | 12 of 16 columns |
| Padding top | `pt-4` | 16px |

---

## 6. Sidebar Card Wrapper

```
mt-4 rounded-shell border-hairline bg-card/90 p-comfort backdrop-blur-[1px] dark:bg-slate-900
```

| Property | Class | Value |
|----------|-------|-------|
| Margin top | `mt-4` | 16px |
| Border radius | `rounded-shell` | Design token (`--radius-shell`) |
| Border | `border-hairline` | Thin border token |
| Background (light) | `bg-card/90` | Card color at 90% opacity |
| Background (dark) | `dark:bg-slate-900` | slate-900 |
| Padding | `p-comfort` | 16px (design token) |
| Backdrop | `backdrop-blur-[1px]` | Subtle 1px blur |

---

## 7. DocSidebar — Search Input

### Search Wrapper

```
mb-6 rounded-action bg-background/70 px-3 py-3
```

| Property | Class | Value |
|----------|-------|-------|
| Margin bottom | `mb-6` | 24px |
| Border radius | `rounded-action` | 4px (`--radius-sm`) |
| Background | `bg-background/70` | Theme background at 70% opacity |
| Padding | `px-3 py-3` | 12px all |

### Search Icon Container

```
absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute left-3 top-1/2` | Left-aligned, vertically centered |
| Transform | `-translate-y-1/2` | Correct vertical centering |
| Size | `h-4 w-4` | 16px |
| Color | `text-muted-foreground` | Muted text token |

### Input Element

```
blog-neutral-input text-interface h-10 w-full rounded-action border-main border border-slate-300 bg-background pl-10 pr-3 text-xs text-foreground placeholder:text-muted-foreground dark:border-slate-600
```

| Property | Class | Value |
|----------|-------|-------|
| Custom class | `blog-neutral-input` | Custom styling (globals.css) |
| Font | `text-interface` | Geist Sans (UI control font) |
| Height | `h-10` | 40px |
| Width | `w-full` | 100% |
| Border radius | `rounded-action` | 4px (`--radius-sm`) |
| Border | `border-main border` | Standard border token |
| Border color (light) | `border-slate-300` | slate-300 |
| Border color (dark) | `dark:border-slate-600` | slate-600 |
| Background | `bg-background` | Theme background |
| Padding left | `pl-10` | 40px (space for search icon) |
| Padding right | `pr-3` | 12px |
| Text size | `text-xs` | 12px |
| Text color | `text-foreground` | Foreground token |
| Placeholder color | `placeholder:text-muted-foreground` | Muted foreground token |

---

## 8. DocSidebar — Search Results Dropdown

### Results Container

```
mt-2 rounded-action border-main border border-border bg-card/70
```

| Property | Class | Value |
|----------|-------|-------|
| Margin top | `mt-2` | 8px |
| Border radius | `rounded-action` | 4px (`--radius-sm`) |
| Border | `border-main border border-border` | Standard border with border token color |
| Background | `bg-card/70` | Card color at 70% opacity |

### Empty State

```
text-interface px-3 py-2 text-xs text-muted-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-interface` | Geist Sans (UI control font) |
| Padding | `px-3 py-2` | 12px horizontal, 8px vertical |
| Text size | `text-xs` | 12px |
| Text color | `text-muted-foreground` | Muted foreground token |

### Results List

```
max-h-56 overflow-auto
```

| Property | Class | Value |
|----------|-------|-------|
| Max height | `max-h-56` | 224px |
| Overflow | `overflow-auto` | Scrollable when content exceeds max height |

### Result Button

```
w-full px-3 py-2 text-left text-xs transition hover:bg-muted/50
```

Active result (via `cn` conditional): `bg-muted/70`

| Property | Class | Value |
|----------|-------|-------|
| Width | `w-full` | 100% |
| Padding | `px-3 py-2` | 12px horizontal, 8px vertical |
| Text alignment | `text-left` | Left-aligned |
| Text size | `text-xs` | 12px |
| Transition | `transition` | Default transition (all properties) |
| Hover background | `hover:bg-muted/50` | Muted at 50% opacity |
| Active background | `bg-muted/70` | Muted at 70% opacity (when `activeSection === result.id`) |

### Result Title

```
text-interface font-medium text-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-interface` | Geist Sans (UI control font) |
| Weight | `font-medium` | 500 |
| Color | `text-foreground` | Foreground token |

### Result Snippet

```
line-clamp-2 text-muted-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Line clamp | `line-clamp-2` | Max 2 lines, ellipsis overflow |
| Color | `text-muted-foreground` | Muted foreground token |

Rendered via `innerHTML` dengan `<mark>` tags untuk keyword highlighting. HTML di-escape via `escapeHtml()` sebelum injeksi `<mark>` untuk mencegah XSS.

### Footer Hint

```
text-interface border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-interface` | Geist Sans (UI control font) |
| Border top | `border-t border-border` | Top separator with border token color |
| Padding | `px-3 py-1.5` | 12px horizontal, 6px vertical |
| Text size | `text-[10px]` | 10px |
| Color | `text-muted-foreground` | Muted foreground token |

---

## 9. DocSidebar — Navigation Groups

Nav container:

```
flex flex-col gap-6
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `flex flex-col` | Vertical flex column |
| Gap | `gap-6` | 24px between groups |

Group title:

```
text-signal text-[10px] font-bold text-muted-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-signal` | Geist Mono + uppercase + tracking 0.1em |
| Size | `text-[10px]` | 10px |
| Weight | `font-bold` | 700 |
| Color | `text-muted-foreground` | Muted theme color |

Items list:

```
mt-3 space-y-1
```

| Property | Class | Value |
|----------|-------|-------|
| Top margin | `mt-3` | 12px below group title |
| Item gap | `space-y-1` | 4px vertical spacing between items |

---

## 10. DocSidebar — Navigation Items (Active + Hover States)

Navigation button:

```
text-interface flex w-full items-center gap-3 rounded-action px-3 py-2 text-sm transition-colors
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-interface` | Geist Sans |
| Layout | `flex w-full items-center` | Full-width horizontal flex, centered |
| Gap | `gap-3` | 12px between icon / text / indicator |
| Radius | `rounded-action` | 4px (`--radius-sm`) |
| Padding | `px-3 py-2` | 12px horizontal, 8px vertical |
| Size | `text-sm` | 14px |
| Transition | `transition-colors` | Color transition |

Active state:

```
bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100
```

Inactive / default state:

```
text-muted-foreground hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-500 dark:hover:text-slate-50
```

| State | Background | Text Color | Dark Background | Dark Text |
|-------|------------|------------|-----------------|-----------|
| Active | `bg-slate-900/60` | `text-slate-100` | `dark:bg-slate-200/10` | `dark:text-slate-100` |
| Hover (inactive) | `hover:bg-slate-200` | `hover:text-slate-900` | `dark:hover:bg-slate-500` | `dark:hover:text-slate-50` |
| Default (inactive) | (none) | `text-muted-foreground` | (none) | `text-muted-foreground` |

Icon: `h-4 w-4 shrink-0`

Text span: `flex-1 truncate text-left`

Active indicator — `NavArrowRight`: `h-4 w-4 shrink-0` (hanya tampil saat `isActive`)

---

## 11. Mobile Nav Button

Wrapper:

```
mb-4 flex justify-end md:hidden
```

| Property | Class | Value |
|----------|-------|-------|
| Visibility | `md:hidden` | Visible only on mobile (< 768px) |
| Layout | `flex justify-end` | Right-aligned |
| Margin | `mb-4` | 16px bottom margin |

Button:

```
rounded-action p-1 text-foreground transition-colors hover:text-foreground/70
```

| Property | Class | Value |
|----------|-------|-------|
| Radius | `rounded-action` | 4px (`--radius-sm`) |
| Padding | `p-1` | 4px |
| Color | `text-foreground` | Theme foreground color |
| Hover | `hover:text-foreground/70` | 70% opacity on hover |
| Transition | `transition-colors` | Smooth color transition |

Icon (`SidebarExpand` dari iconoir-react):

| Property | Class / Prop | Value |
|----------|-------------|-------|
| Size | `h-7 w-7` | 28px |
| Stroke | `strokeWidth={1.5}` | 1.5px stroke |
| Aria | `aria-label="Buka navigasi"` | Accessibility label |

---

## 12. Mobile Sheet (shadcn Sheet)

Usage: `<SheetContent side="right" className="w-72 p-0">`

### SheetOverlay (dari `sheet.tsx`)

```
fixed inset-0 z-50 bg-black/50
data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `fixed inset-0` | Full-screen overlay |
| Z-index | `z-50` | 50 |
| Background | `bg-black/50` | Black at 50% opacity |
| Open animation | `data-[state=open]:animate-in fade-in-0` | Fade in from 0 |
| Close animation | `data-[state=closed]:animate-out fade-out-0` | Fade out to 0 |

### SheetContent (dari `sheet.tsx`, side = right)

Base:

```
bg-background fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out
data-[state=closed]:duration-300 data-[state=open]:duration-500
```

Side-specific (right):

```
inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm
data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right
```

Override dari DocumentationPage: `w-72 p-0`

| Property | Class | Value |
|----------|-------|-------|
| Background | `bg-background` | Theme background |
| Position | `fixed inset-y-0 right-0` | Fixed, full height, right edge |
| Z-index | `z-50` | 50 |
| Layout | `flex flex-col gap-4` | Vertical flex, 16px gap |
| Shadow | `shadow-lg` | Large shadow |
| Default width | `w-3/4 sm:max-w-sm` | 75% viewport, max 384px |
| Override width | `w-72` | 288px (overrides default) |
| Override padding | `p-0` | 0 (overrides default) |
| Border | `border-l` | Left border |
| Open animation | `slide-in-from-right` | Slide in from right |
| Close animation | `slide-out-to-right` | Slide out to right |

| State | Animation | Duration |
|-------|-----------|----------|
| Opening | `slide-in-from-right` + `fade-in-0` (overlay) | 500ms |
| Closing | `slide-out-to-right` + `fade-out-0` (overlay) | 300ms |

### Close Button (dari `sheet.tsx`)

```
ring-offset-background focus:ring-ring data-[state=open]:bg-secondary
absolute top-4 right-4 rounded-xs opacity-70 transition-opacity
hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden
disabled:pointer-events-none
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute top-4 right-4` | Top-right corner, 16px inset |
| Radius | `rounded-xs` | Extra-small radius |
| Opacity | `opacity-70` | 70% default |
| Hover | `hover:opacity-100` | Full opacity on hover |
| Focus ring | `focus:ring-2 focus:ring-offset-2 focus:ring-ring` | 2px ring with offset |
| Disabled | `disabled:pointer-events-none` | No interaction when disabled |
| Icon | `Xmark` dari iconoir-react, `size-4` | 16px |

### SheetHeader (dari `sheet.tsx` + override)

Base: `flex flex-col gap-1.5 p-4`
Override: `border-b border-border px-5 py-4`

| Property | Base Class | Override Class | Resolved Value |
|----------|-----------|---------------|----------------|
| Layout | `flex flex-col gap-1.5` | — | Vertical flex, 6px gap |
| Padding | `p-4` | `px-5 py-4` | 20px horizontal, 16px vertical |
| Border | — | `border-b border-border` | 1px bottom border, theme border color |

### SheetTitle (dari `sheet.tsx` + override)

Base: `text-foreground font-semibold`
Override: `text-signal text-[10px] font-bold tracking-widest text-foreground`

| Property | Base Class | Override Class | Resolved Value |
|----------|-----------|---------------|----------------|
| Font | — | `text-signal` | Geist Mono + uppercase + tracking 0.1em |
| Size | — | `text-[10px]` | 10px |
| Weight | `font-semibold` | `font-bold` | 700 (override wins) |
| Tracking | — | `tracking-widest` | 0.1em |
| Color | `text-foreground` | `text-foreground` | Theme foreground |

### Sheet Body

```
overflow-y-auto p-comfort
```

| Property | Class | Value |
|----------|-------|-------|
| Overflow | `overflow-y-auto` | Vertical scroll when content overflows |
| Padding | `p-comfort` | 16px |

---

## 13. DocArticle — Article Container

```
mx-auto w-full max-w-4xl rounded-shell border-hairline bg-card/90 px-5 py-6 backdrop-blur-[1px] dark:bg-slate-900 md:px-8
```

| Property | Class | Value |
|----------|-------|-------|
| Centering | `mx-auto` | Horizontal center |
| Width | `w-full max-w-4xl` | Full width up to 896px |
| Radius | `rounded-shell` | Design token (`--radius-shell`) |
| Border | `border-hairline` | Thin border token |
| Background (light) | `bg-card/90` | Card color at 90% opacity |
| Background (dark) | `dark:bg-slate-900` | Slate-900 |
| Padding-x (mobile) | `px-5` | 20px |
| Padding-x (desktop) | `md:px-8` | 32px |
| Padding-y | `py-6` | 24px |
| Backdrop | `backdrop-blur-[1px]` | Subtle 1px blur |

Article inner: `space-y-8` (32px between article children)

---

## 14. DocArticle — Article Header

Header wrapper: `space-y-4` (16px between badge, title row, dan summary)

### SectionBadge (dari `section-badge.tsx`)

Outer container:

```
inline-flex w-fit items-center gap-2 rounded-badge px-2.5 py-1
bg-[color:var(--emerald-600)] text-[color:var(--slate-50)]
```

Animated amber dot:

```
h-2 w-2 rounded-full bg-[color:var(--amber-500)] shadow-[0_0_6px_var(--amber-500)] animate-pulse
```

Badge text:

```
text-signal text-[10px] font-bold
```

| Property | Class / Token | Value |
|----------|--------------|-------|
| Layout | `inline-flex items-center gap-2` | Inline flex, 8px gap |
| Fit | `w-fit` | Shrink-wrap to content |
| Radius | `rounded-badge` | 6px (`--radius-s-md`) |
| Padding | `px-2.5 py-1` | 10px horizontal, 4px vertical |
| Background | `bg-[color:var(--emerald-600)]` | `oklch(0.596 0.145 163.225)` |
| Text color | `text-[color:var(--slate-50)]` | `oklch(0.984 0 0)` |
| Dot size | `h-2 w-2` | 8px circle |
| Dot shape | `rounded-full` | Fully rounded |
| Dot color | `bg-[color:var(--amber-500)]` | `oklch(0.769 0.188 70.08)` |
| Dot glow | `shadow-[0_0_6px_var(--amber-500)]` | Amber glow |
| Dot animation | `animate-pulse` | Opacity pulse cycle |
| Font | `text-signal text-[10px] font-bold` | Geist Mono, uppercase, 10px, 700 |

Note: Di konteks dokumentasi, tidak ada `href` yang di-pass, sehingga group hover styles tidak aktif.

### Icon + Title Row

```
flex items-center gap-3
```

Icon: `h-6 w-6 text-foreground` (24px)

Title h1:

```
text-narrative text-2xl font-medium tracking-tight text-foreground md:text-3xl
```

| Property | Mobile | Desktop (md+) |
|----------|--------|---------------|
| Font | `text-narrative` (Geist Sans) | `text-narrative` (Geist Sans) |
| Size | `text-2xl` (24px) | `md:text-3xl` (30px) |
| Weight | `font-medium` (500) | `font-medium` (500) |
| Tracking | `tracking-tight` (-0.025em) | `tracking-tight` (-0.025em) |
| Color | `text-foreground` | `text-foreground` |

### Summary

```
text-narrative text-sm leading-relaxed text-muted-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-narrative` | Geist Sans |
| Size | `text-sm` | 14px |
| Line height | `leading-relaxed` | 1.625 |
| Color | `text-muted-foreground` | Muted theme color |

---

## 15. DocArticle — Block: infoCard

Outer container:

```
rounded-shell border-main border border-info/20 bg-info/5
```

| Property | Class | Value |
|----------|-------|-------|
| Radius | `rounded-shell` | Design token (`--radius-shell`) |
| Border width | `border-main border` | 1px solid |
| Border color | `border-info/20` | Info color at 20% opacity |
| Background | `bg-info/5` | Info color at 5% opacity |

Inner container with left accent:

```
border-l-4 border-info px-5 py-4
```

| Property | Class | Value |
|----------|-------|-------|
| Left accent | `border-l-4` | 4px left border |
| Accent color | `border-info` | Info theme color |
| Padding | `px-5 py-4` | 20px horizontal, 16px vertical |

Title:

```
text-interface text-base font-medium text-info
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-interface` | Geist Sans |
| Size | `text-base` | 16px |
| Weight | `font-medium` | 500 |
| Color | `text-info` | Info theme color |

Description:

```
text-narrative mt-1 text-sm text-muted-foreground
```

Items wrapper: `px-5 pb-5 pt-4`

Items list:

```
space-y-2 text-narrative text-sm text-muted-foreground
```

List item: `relative pl-4`

Bullet marker:

```
absolute left-0 top-1 text-info
```

Character: `•`

---

## 16. DocArticle — Block: ctaCards

Grid container:

```
grid gap-4 sm:grid-cols-2
```

Card:

```
group flex h-full flex-col rounded-shell border border-main bg-card px-5 py-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-slate-400 hover:bg-[color:var(--slate-100)] dark:hover:border-slate-500 dark:hover:bg-[color:var(--slate-800)]
```

Card inner top: `mb-4`

Icon: `mb-3 h-7 w-7 text-foreground`

Card title:

```
text-interface text-base font-medium text-foreground
```

Card description:

```
text-narrative mt-1 text-sm text-muted-foreground
```

CTA button:

```
text-signal mt-auto inline-flex w-fit cursor-pointer items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground transition-colors hover:text-foreground hover:underline
```

CTA arrow icon: `NavArrowRight` dengan class `icon-interface`

### Hover States

| State | Property | Class | Value |
|-------|----------|-------|-------|
| Default | Background | `bg-card` | Card background token |
| Default | Border | `border-main` | Standard border token |
| Hover | Translate | `hover:-translate-y-1` | Lift up 4px |
| Hover (light) | Border | `hover:border-slate-400` | Slate 400 border |
| Hover (light) | Background | `hover:bg-[color:var(--slate-100)]` | `--slate-100` |
| Hover (dark) | Border | `dark:hover:border-slate-500` | Slate 500 border |
| Hover (dark) | Background | `dark:hover:bg-[color:var(--slate-800)]` | `--slate-800` |
| All | Transition | `transition-all duration-300` | 300ms all properties |

### Responsive Grid

| Property | Mobile | Desktop (sm+) |
|----------|--------|---------------|
| Grid columns | stacked (single column) | `sm:grid-cols-2` |

---

## 17. DocArticle — Block: section

Section container: `space-y-3`

Title h2:

```
text-interface text-base font-medium text-foreground
```

Description:

```
text-narrative text-sm leading-relaxed text-muted-foreground
```

Paragraph:

```
text-narrative text-sm leading-relaxed text-muted-foreground
```

List container (conditional on variant):

Bullet variant:
```
space-y-2 text-sm text-muted-foreground list-disc pl-5
```

Numbered variant:
```
space-y-2 text-sm text-muted-foreground list-decimal pl-5
```

Sub-items list:

```
mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Section gap | `space-y-3` | 12px |
| Title font | `text-interface text-base font-medium` | Geist Sans, 16px, 500 |
| Description font | `text-narrative text-sm` | Geist Sans, 14px |
| List marker (bullet) | `list-disc` | Disc bullets |
| List marker (numbered) | `list-decimal` | Decimal numbers |
| List indent | `pl-5` | 20px |
| List spacing | `space-y-2` | 8px between items |
| Sub-items size | `text-xs` | 12px |
| Sub-items indent | `pl-5` | 20px additional |
| Sub-items spacing | `space-y-1` | 4px |

---

## 18. DocArticle — Inline Markdown Renderer (renderInline)

Bold (`**text**`) renders as `<strong>`:

```
text-narrative font-semibold text-foreground
```

Code (`` `code` ``) renders as `<code>`:

```
text-interface rounded-sm bg-slate-950/10 px-1 py-0.5 text-xs text-foreground dark:bg-slate-950
```

Plain text renders as `<span>` (no additional classes).

| Element | Class | Value |
|---------|-------|-------|
| Bold font | `text-narrative font-semibold` | Geist Sans, 600 |
| Bold color | `text-foreground` | Theme foreground |
| Code font | `text-interface` | Geist Sans (UI control) |
| Code size | `text-xs` | 12px |
| Code bg (light) | `bg-slate-950/10` | Near-black at 10% opacity |
| Code bg (dark) | `dark:bg-slate-950` | Solid near-black |
| Code radius | `rounded-sm` | 2px |
| Code padding | `px-1 py-0.5` | 4px horizontal, 2px vertical |

---

## 19. DocArticle — Prev/Next Navigation (Mobile)

Container:

```
flex items-center justify-between border-t border-hairline pt-4 md:hidden
```

Button base (prev dan next):

```
text-signal inline-flex items-center gap-2 rounded-action border-main border px-3 py-2 text-[10px]
```

Button enabled state:

```
border-border text-foreground
```

Button disabled state:

```
cursor-not-allowed border-border/50 text-muted-foreground
```

Prev icon: `NavArrowLeft` `h-4 w-4`
Next icon: `NavArrowRight` `h-4 w-4`

| Property | Class | Value |
|----------|-------|-------|
| Visibility | `md:hidden` | Mobile only |
| Layout | `flex items-center justify-between` | Space between |
| Border top | `border-t border-hairline` | Thin top separator |
| Padding top | `pt-4` | 16px |
| Font | `text-signal text-[10px]` | Geist Mono, 10px |
| Radius | `rounded-action` | 4px |
| Border (enabled) | `border-border` | Theme border |
| Border (disabled) | `border-border/50` | 50% opacity |
| Text (enabled) | `text-foreground` | Theme foreground |
| Text (disabled) | `text-muted-foreground` + `cursor-not-allowed` | Muted, no pointer |

---

## 20. DocArticle — Empty State

Container:

```
rounded-shell border-main border border-border bg-card/60 p-6 text-center
```

Text:

```
text-interface text-xs uppercase tracking-widest text-muted-foreground
```

Content: "Dokumentasi sedang dimuat."

| Property | Class | Value |
|----------|-------|-------|
| Radius | `rounded-shell` | Design token |
| Border | `border-main border border-border` | Standard border |
| Background | `bg-card/60` | Card at 60% opacity |
| Padding | `p-6` | 24px |
| Text alignment | `text-center` | Centered |
| Font | `text-interface` | Geist Sans |
| Size | `text-xs` | 12px |
| Case | `uppercase` | All caps |
| Tracking | `tracking-widest` | Maximum letter spacing |
| Color | `text-muted-foreground` | Muted foreground |

---

## 21. Loading State (DocumentationLoading)

Outer container:

```
min-h-screen pt-[var(--header-h)]
```

Inner container:

```
flex min-h-screen items-center justify-center
```

Content wrapper:

```
flex flex-col items-center gap-4
```

Spinner icon (`RefreshDouble`):

```
h-8 w-8 animate-spin text-primary
```

Loading text:

```
text-interface text-xs uppercase tracking-widest text-muted-foreground
```

Content: "Memuat dokumentasi..."

| Property | Class | Value |
|----------|-------|-------|
| Min height | `min-h-screen` | 100vh |
| Offset | `pt-[var(--header-h)]` | Header height variable |
| Layout | `flex items-center justify-center` | Centered both axes |
| Spinner size | `h-8 w-8` | 32px |
| Spinner animation | `animate-spin` | Continuous rotation |
| Spinner color | `text-primary` | Primary theme color |
| Text font | `text-interface` | Geist Sans |
| Text size | `text-xs` | 12px |
| Text case | `uppercase tracking-widest` | All caps, max spacing |
| Text color | `text-muted-foreground` | Muted foreground |

---

## 22. Custom CSS Classes / Design Tokens yang Dipakai

| Class | Definition | Value |
|-------|-----------|-------|
| `text-narrative` | `font-family: var(--font-sans)` | Geist Sans |
| `text-interface` | `font-family: var(--font-sans)` | Geist Sans (UI controls) |
| `text-signal` | `font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.1em` | Geist Mono + caps |
| `rounded-shell` | `border-radius: var(--radius-shell)` | Shell radius token |
| `rounded-action` | `border-radius: var(--radius-sm)` | 4px |
| `rounded-badge` | `border-radius: var(--radius-s-md)` | 6px |
| `border-hairline` | Border-width token | Thin border |
| `border-main` | Border-width token | Standard border |
| `gap-comfort` | `gap: 1rem` | 16px |
| `p-comfort` | `padding: 1rem` | 16px |
| `blog-neutral-input` | Custom input styling class | Specific to blog/documentation inputs |
| `icon-interface` | Icon sizing token | Standard icon size |

### CSS Variables

| Variable | Context | Value |
|----------|---------|-------|
| `--section-bg-alt` | Section wrapper | Alternate section background |
| `--header-h` | Section wrapper | Global header height offset |
| `--info` | Info card | Info theme color (blue) |
| `--emerald-600` | SectionBadge | `oklch(0.596 0.145 163.225)` |
| `--amber-500` | SectionBadge dot | `oklch(0.769 0.188 70.08)` |
| `--slate-50` | SectionBadge text | `oklch(0.984 0 0)` |
| `--slate-100` | CTA card hover (light) | `oklch(0.968 0 0)` |
| `--slate-800` | CTA card hover (dark) | `oklch(0.279 0 0)` |

### Animations

| Animation | Element | Behavior |
|-----------|---------|----------|
| `animate-spin` | Loading spinner (`RefreshDouble`) | Continuous rotation |
| `animate-pulse` | SectionBadge amber dot | Opacity cycle |
| `animate-in` / `animate-out` | Sheet overlay + content | shadcn enter/exit animations |
| `slide-in-from-right` | Sheet content | Slide from right edge |
| `fade-in-0` / `fade-out-0` | Sheet overlay | Fade in/out |

---

## 23. Perbedaan Styling: Mobile vs Desktop

| Aspek | Mobile | Desktop (md+ / lg+) |
|-------|--------|---------------------|
| Grid | `grid-cols-1` | `md:grid-cols-16` |
| Sidebar | `hidden` | `md:block md:col-span-4` |
| Article | `col-span-1` | `md:col-span-12` |
| Mobile nav button | Visible (`flex justify-end`) | `md:hidden` (hidden) |
| Mobile Sheet | Available (`side="right"`, `w-72`) | Not used (sidebar visible) |
| Content padding-x | `px-4` (16px) | `lg:px-8` (32px) |
| Article padding-x | `px-5` (20px) | `md:px-8` (32px) |
| Article title | `text-2xl` (24px) | `md:text-3xl` (30px) |
| Prev/next nav | Visible (`flex`) | `md:hidden` (hidden) |
| CTA cards grid | Stacked (single column) | `sm:grid-cols-2` |
| Search results dropdown | Same styling | Same styling |

> **Note:** Halaman dokumentasi punya DUA mode navigasi:
> - **Desktop:** persistent sidebar (`md:block`) yang langsung render `DocSidebar`.
> - **Mobile:** hamburger button memicu `Sheet` drawer (`side="right"`) yang reuse komponen `DocSidebar` yang sama di dalam drawer panel.
