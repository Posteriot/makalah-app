# Blog Page — Styling Extraction

Tanggal: 11 Februari 2026
Scope: Seluruh CSS/Tailwind classes dan design tokens yang terimplementasi di halaman blog marketing `/blog` dan `/blog/[slug]`
Source files:
- `src/components/marketing/blog/BlogLandingPage.tsx`
- `src/components/marketing/blog/BlogArticlePage.tsx`
- `src/components/marketing/blog/BlogHeadlineSection.tsx`
- `src/components/marketing/blog/BlogFeedSection.tsx`
- `src/components/marketing/blog/BlogFiltersPanel.tsx`
- `src/components/marketing/blog/BlogNewsletterSection.tsx`
- `src/components/marketing/blog/utils.ts`

---

## 1. File dan Komponen

| File | Komponen | Fungsi |
|------|----------|--------|
| `BlogLandingPage.tsx` | `BlogLandingPage` | Landing page: layout, state, filters, mobile Sheet |
| `BlogArticlePage.tsx` | `BlogArticlePage`, `renderInline`, `BlockRenderer` | Article detail: fetch, states, blocks |
| `BlogHeadlineSection.tsx` | `BlogHeadlineSection` | Headline card: thumbnail, title, metadata bar |
| `BlogFeedSection.tsx` | `BlogFeedSection`, `RowThumbnail` | Feed accordion: rows, expand/collapse |
| `BlogFiltersPanel.tsx` | `BlogFiltersPanel` | Filters: search, category, time range, sort |
| `BlogNewsletterSection.tsx` | `BlogNewsletterSection` | Newsletter signup card |
| `utils.ts` | `normalizeCategory`, `isInTimeRange`, `createPlaceholderImageDataUri` | Category mapping, time filter, SVG placeholders |

Dependensi UI:
- `SectionBadge` dari `@/components/ui/section-badge`
- `SectionCTA` dari `@/components/ui/section-cta`
- `DottedPattern` dari `@/components/marketing/SectionBackground`
- `DiagonalStripes` dari `@/components/marketing/SectionBackground`
- `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` dari `@/components/ui/sheet`
- `Input` dari `@/components/ui/input`

---

## 2. Page Wrapper (BlogLandingPage)

```
bg-background text-foreground
```

The outer `<div>`. Same wrapper used in BlogArticlePage.

| Property | Class | Value |
|----------|-------|-------|
| Background | `bg-background` | Light: --slate-50, Dark: --slate-900 |
| Text | `text-foreground` | Light: --slate-900, Dark: --slate-50 |

---

## 3. Section Wrapper (BlogLandingPage)

```
relative isolate overflow-hidden border-b border-hairline bg-[color:var(--section-bg-alt)]
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative isolate` | Stacking context isolation |
| Overflow | `overflow-hidden` | Clip background patterns |
| Border bottom | `border-b border-hairline` | Thin bottom border (design token) |
| Background | `bg-[color:var(--section-bg-alt)]` | Section alternate background token |

---

## 4. Background Layer (DottedPattern)

Usage in BlogLandingPage and BlogArticlePage:
```tsx
<DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />
```

### DottedPattern Base Classes (dari `src/components/marketing/SectionBackground/DottedPattern.tsx`)

```
absolute inset-0 pointer-events-none z-[1]
```

Overridden: `z-0 opacity-100`

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute inset-0` | Full-cover overlay |
| Pointer events | `pointer-events-none` | Non-interactive decorative layer |
| Z-index (base) | `z-[1]` | Default z-index |
| Z-index (override) | `z-0` | Lowered to sit behind content |
| Opacity | `opacity-100` | Full opacity (no radial mask) |
| Light dots | `[background-image:radial-gradient(rgba(0,0,0,0.12)_1px,transparent_1px)]` | Dark dots at 12% opacity |
| Dark dots | `dark:[background-image:radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)]` | White dots at 12% opacity |
| Spacing | `background-size: 24px 24px` | Via `spacing={24}` prop (inline style) |
| Radial mask | disabled | `withRadialMask={false}` — no mask-image applied |

---

## 5. Content Container (BlogLandingPage)

```
relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 pt-[calc(var(--header-h)+16px)] md:px-8 md:pb-10 md:pt-[calc(var(--header-h)+20px)]
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative z-10` | Above background patterns |
| Width | `w-full max-w-7xl` | Full width, max 1280px |
| Centering | `mx-auto` | Horizontal center |
| Padding-x | `px-4` → `md:px-8` | 16px → 32px |
| Padding-bottom | `pb-8` → `md:pb-10` | 32px → 40px |
| Padding-top | `pt-[calc(var(--header-h)+16px)]` → `md:pt-[calc(var(--header-h)+20px)]` | Header height + 16px → + 20px |

---

## 6. Grid Layout (BlogLandingPage)

```
grid grid-cols-1 gap-comfort md:grid-cols-16
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `grid` | CSS Grid |
| Columns (mobile) | `grid-cols-1` | Single column |
| Columns (desktop) | `md:grid-cols-16` | 16-column grid |
| Gap | `gap-comfort` | Design token (comfortable spacing) |

Sidebar: `md:col-span-4` (4 of 16 columns)
Main content: `md:col-span-12` (12 of 16 columns)

---

## 7. Sidebar Card Wrapper (BlogLandingPage desktop aside)

```
<aside className="hidden md:col-span-4 md:block">
```

Card container:
```
rounded-shell border-hairline bg-card/90 p-comfort backdrop-blur-[1px] dark:bg-slate-900
```

Sticky positioning (inline style):
```css
position: sticky;
top: calc(var(--header-h) + 16px);
```

| Property | Class | Value |
|----------|-------|-------|
| Visibility | `hidden md:block` | Hidden mobile, shown desktop |
| Grid span | `md:col-span-4` | 4 of 16 columns |
| Border radius | `rounded-shell` | Design token (shell radius) |
| Border | `border-hairline` | Design token (thin border) |
| Background (light) | `bg-card/90` | Card color at 90% opacity |
| Background (dark) | `dark:bg-slate-900` | Slate-900 |
| Padding | `p-comfort` | Design token (comfortable padding) |
| Backdrop | `backdrop-blur-[1px]` | Subtle blur |
| Position | sticky (inline) | Stays visible while scrolling |
| Top offset | `calc(var(--header-h) + 16px)` (inline) | Below fixed header |

---

## 8. Mobile Filter Button (BlogLandingPage)

```
mb-5 flex justify-end md:hidden
```

Button:
```
rounded-action p-1 text-foreground transition-colors hover:text-foreground/70
```

Icon: `FilterList` dari iconoir-react
```
h-7 w-7
```

| Property | Class | Value |
|----------|-------|-------|
| Container | `mb-5 flex justify-end` | Bottom margin, right-aligned |
| Visibility | `md:hidden` | Only shown on mobile |
| Button radius | `rounded-action` | Design token (action radius) |
| Button padding | `p-1` | 4px |
| Button color | `text-foreground` | Default foreground |
| Button hover | `hover:text-foreground/70` | 70% opacity on hover |
| Transition | `transition-colors` | Color transition |
| Icon size | `h-7 w-7` | 28x28px |
| Icon stroke | `strokeWidth={1.5}` | 1.5px stroke |
| Aria | `aria-label="Buka filter"` | Accessibility label |

---

## 9. Mobile Post Count (BlogLandingPage)

```
mt-4 mb-5 md:hidden
```

Text:
```
text-interface text-xs text-muted-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Container margin | `mt-4 mb-5` | Top 16px, bottom 20px |
| Visibility | `md:hidden` | Only shown on mobile |
| Typography | `text-interface` | Design token (interface text) |
| Size | `text-xs` | 12px |
| Color | `text-muted-foreground` | Muted foreground color |

---

## 10. Mobile Sheet (BlogLandingPage — dari `@/components/ui/sheet`)

Usage:
```tsx
<Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
  <SheetContent side="right" className="w-[320px] p-5 sm:max-w-[320px]">
```

### SheetContent Base Classes (dari `src/components/ui/sheet.tsx`)

```
bg-background fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out
data-[state=open]:duration-500 data-[state=closed]:duration-300
data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right
inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm
```

Override classes:
```
w-[320px] p-5 sm:max-w-[320px]
```

| Property | Class | Value |
|----------|-------|-------|
| Background | `bg-background` | Same as page background |
| Position | `fixed z-50` | Fixed overlay, z-index 50 |
| Layout | `flex flex-col gap-4` | Flex column, 16px gap |
| Shadow | `shadow-lg` | Large shadow |
| Width (base) | `w-3/4` | 75% viewport |
| Width (override) | `w-[320px]` | Fixed 320px |
| Max width (override) | `sm:max-w-[320px]` | Max 320px at sm+ |
| Padding (override) | `p-5` | 20px all sides |
| Side | `right-0 inset-y-0 border-l` | Right side, full height |
| Animation open | `slide-in-from-right duration-500` | Slide in 500ms |
| Animation close | `slide-out-to-right duration-300` | Slide out 300ms |

### SheetOverlay (dari sheet.tsx)
```
fixed inset-0 z-50 bg-black/50
data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0
```

### SheetHeader Override
```
mb-4 p-0
```

Base: `flex flex-col gap-1.5 p-4` → Override: `p-0`

### SheetTitle Override
```
text-signal text-[10px] font-bold tracking-widest text-foreground
```

Base: `text-foreground font-semibold` → Override adds signal typography

| Property | Class | Value |
|----------|-------|-------|
| Typography | `text-signal` | Design token (signal text) |
| Size | `text-[10px]` | 10px |
| Weight | `font-bold` | Bold |
| Tracking | `tracking-widest` | Maximum letter spacing |
| Color | `text-foreground` | Default foreground |

### SheetClose (dari sheet.tsx)
```
ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70
transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2
```

---

## 11. BlogFiltersPanel — Container + Group Separator + Search Input + Filter Buttons

### Container
```
space-y-4
```

With `mobile` prop: adds `px-1 pb-4`

### Group Separator
```
border-b border-slate-300 dark:border-slate-700 pb-4 last:border-b-0 last:pb-0
```

| Property | Class | Value |
|----------|-------|-------|
| Spacing | `space-y-4` | 16px between groups |
| Border (light) | `border-b border-slate-300` | Light gray bottom border |
| Border (dark) | `dark:border-slate-700` | Dark gray bottom border |
| Padding bottom | `pb-4` | 16px |
| Last child | `last:border-b-0 last:pb-0` | No border/padding on last group |

### Group Label
```
text-narrative mb-2 text-sm font-medium text-slate-600 dark:text-slate-200
```

| Property | Class | Value |
|----------|-------|-------|
| Typography | `text-narrative` | Design token (narrative text) |
| Size | `text-sm` | 14px |
| Weight | `font-medium` | Medium weight |
| Color (light) | `text-slate-600` | Slate 600 |
| Color (dark) | `dark:text-slate-200` | Slate 200 |
| Margin | `mb-2` | 8px bottom |

### Search Input Container
```
relative
```

Search icon:
```
icon-interface absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground
```

### Search Input (dari `@/components/ui/input` + overrides)

Input base classes (dari `src/components/ui/input.tsx`):
```
file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground
dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1
text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
```

Override classes on search input:
```
blog-neutral-input text-interface h-10 rounded-action border-main border-slate-300 dark:border-slate-600 bg-background pr-3 pl-10 text-xs
```

| Property | Class | Value |
|----------|-------|-------|
| Custom class | `blog-neutral-input` | Project custom CSS class |
| Typography | `text-interface` | Design token (interface text) |
| Height | `h-10` | 40px (overrides base h-9) |
| Radius | `rounded-action` | Design token (overrides base rounded-md) |
| Border style | `border-main` | Design token |
| Border color (light) | `border-slate-300` | Slate 300 |
| Border color (dark) | `dark:border-slate-600` | Slate 600 |
| Background | `bg-background` | Page background |
| Padding left | `pl-10` | 40px (room for search icon) |
| Padding right | `pr-3` | 12px |
| Font size | `text-xs` | 12px |

### Category Buttons Grid
```
grid grid-cols-1 gap-2
```

### Time Range / Sort Buttons Grid
```
grid grid-cols-2 gap-2
```

### Filter Button — Active State
```
text-interface flex items-center justify-between rounded-action border-main px-3 py-2 text-sm transition-colors
border-slate-500 bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100
```

| Property | Class | Value |
|----------|-------|-------|
| Typography | `text-interface` | Design token |
| Layout | `flex items-center justify-between` | Flex, centered, space-between |
| Radius | `rounded-action` | Design token |
| Border style | `border-main` | Design token |
| Padding | `px-3 py-2` | 12px x, 8px y |
| Size (category) | `text-sm` | 14px |
| Border color | `border-slate-500` | Slate 500 |
| Background (light) | `bg-slate-900/60` | Slate 900 at 60% |
| Text (light) | `text-slate-100` | Slate 100 |
| Background (dark) | `dark:bg-slate-200/10` | Slate 200 at 10% |
| Text (dark) | `dark:text-slate-100` | Slate 100 |
| Transition | `transition-colors` | Color transition |

### Filter Button — Inactive State
```
border-border text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-500 hover:text-slate-50
```

| Property | Class | Value |
|----------|-------|-------|
| Border | `border-border` | Default border |
| Text | `text-muted-foreground` | Muted color |
| Hover bg (light) | `hover:bg-slate-200` | Slate 200 |
| Hover bg (dark) | `dark:hover:bg-slate-500` | Slate 500 |
| Hover text | `hover:text-slate-50` | Slate 50 |

### Time Range / Sort Button Size
```
text-xs
```

(Same active/inactive states as category, but `text-xs` instead of `text-sm`, no `justify-between`)

### Category Button Count
```
text-[11px]
```

Right-side count badge at 11px.

---

## 12. BlogHeadlineSection — Loading State

```
h-[220px] animate-pulse rounded-shell border-hairline bg-card/30 dark:bg-slate-800/40
```

| Property | Class | Value |
|----------|-------|-------|
| Height | `h-[220px]` | 220px fixed |
| Animation | `animate-pulse` | Pulse animation |
| Radius | `rounded-shell` | Design token |
| Border | `border-hairline` | Design token |
| Background (light) | `bg-card/30` | Card at 30% |
| Background (dark) | `dark:bg-slate-800/40` | Slate 800 at 40% |

---

## 13. BlogHeadlineSection — Empty State

```
rounded-shell border-hairline border-dashed bg-card/90 px-6 py-16 text-center backdrop-blur-[1px] dark:bg-slate-800/90
```

| Property | Class | Value |
|----------|-------|-------|
| Radius | `rounded-shell` | Design token |
| Border | `border-hairline border-dashed` | Thin dashed border |
| Background (light) | `bg-card/90` | Card at 90% |
| Background (dark) | `dark:bg-slate-800/90` | Slate 800 at 90% |
| Padding | `px-6 py-16` | 24px x, 64px y |
| Text align | `text-center` | Centered |
| Backdrop | `backdrop-blur-[1px]` | Subtle blur |

Text: `text-narrative text-sm text-muted-foreground`

---

## 14. BlogHeadlineSection — Card Container

```
overflow-hidden rounded-shell border-hairline bg-card/90 p-5 backdrop-blur-[1px] dark:bg-slate-900 md:p-6
```

| Property | Class | Value |
|----------|-------|-------|
| Overflow | `overflow-hidden` | Clip content |
| Radius | `rounded-shell` | Design token |
| Border | `border-hairline` | Design token |
| Background (light) | `bg-card/90` | Card at 90% |
| Background (dark) | `dark:bg-slate-900` | Slate 900 |
| Padding | `p-5` → `md:p-6` | 20px → 24px |
| Backdrop | `backdrop-blur-[1px]` | Subtle blur |

---

## 15. BlogHeadlineSection — Badge (SectionBadge dari `@/components/ui/section-badge`)

Usage: `<SectionBadge className="mb-3">Headline</SectionBadge>`

### SectionBadge Base Classes (dari `src/components/ui/section-badge.tsx`)

Outer container:
```
inline-flex w-fit items-center gap-2 rounded-badge px-2.5 py-1
bg-[color:var(--emerald-600)] text-[color:var(--slate-50)]
```

Animated dot:
```
h-2 w-2 rounded-full bg-[color:var(--amber-500)] shadow-[0_0_6px_var(--amber-500)] animate-pulse
```

Text:
```
text-signal text-[10px] font-bold
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `inline-flex w-fit items-center gap-2` | Inline flex, auto width, 8px gap |
| Radius | `rounded-badge` | Design token (badge radius) |
| Padding | `px-2.5 py-1` | 10px x, 4px y |
| Background | `bg-[color:var(--emerald-600)]` | Emerald 600 |
| Text color | `text-[color:var(--slate-50)]` | Slate 50 |
| Dot size | `h-2 w-2` | 8x8px |
| Dot color | `bg-[color:var(--amber-500)]` | Amber 500 |
| Dot glow | `shadow-[0_0_6px_var(--amber-500)]` | Amber glow effect |
| Dot animation | `animate-pulse` | Pulsing animation |
| Text typography | `text-signal text-[10px] font-bold` | Signal, 10px, bold |
| Override margin | `mb-3` | 12px bottom (from usage) |

---

## 16. BlogHeadlineSection — Thumbnail Grid

```
mt-1 mb-5 grid grid-cols-[84px_minmax(0,1fr)] gap-4 md:grid-cols-[112px_minmax(0,1fr)] md:items-start md:gap-5
```

| Property | Class | Value |
|----------|-------|-------|
| Margin | `mt-1 mb-5` | Top 4px, bottom 20px |
| Layout | `grid` | CSS Grid |
| Columns (mobile) | `grid-cols-[84px_minmax(0,1fr)]` | 84px thumbnail + fluid |
| Columns (desktop) | `md:grid-cols-[112px_minmax(0,1fr)]` | 112px thumbnail + fluid |
| Alignment (desktop) | `md:items-start` | Top-aligned |
| Gap | `gap-4` → `md:gap-5` | 16px → 20px |

### Thumbnail Link
```
group relative block aspect-square overflow-hidden rounded-action border-hairline
```

### Thumbnail Image Hover
```
object-cover transition-transform duration-300 group-hover:scale-[1.03]
```

| Property | Class | Value |
|----------|-------|-------|
| Scale | `group-hover:scale-[1.03]` | 3% zoom on hover |
| Duration | `duration-300` | 300ms transition |

### Content Container
```
min-w-0 self-center
```

---

## 17. BlogHeadlineSection — Title + Excerpt

Title link:
```
group mb-3 block
```

Title h1:
```
text-narrative text-slate-600 dark:text-slate-100 cursor-pointer text-xl font-medium leading-tight transition-colors group-hover:text-sky-700 dark:group-hover:text-sky-200 md:text-[2rem]
```

| Property | Class | Value |
|----------|-------|-------|
| Typography | `text-narrative` | Design token |
| Color (light) | `text-slate-600` | Slate 600 |
| Color (dark) | `dark:text-slate-100` | Slate 100 |
| Size | `text-xl` → `md:text-[2rem]` | 20px → 32px |
| Weight | `font-medium` | Medium |
| Leading | `leading-tight` | Tight line height |
| Hover (light) | `group-hover:text-sky-700` | Sky 700 |
| Hover (dark) | `dark:group-hover:text-sky-200` | Sky 200 |
| Cursor | `cursor-pointer` | Pointer cursor |
| Transition | `transition-colors` | Color transition |

Excerpt:
```
text-narrative line-clamp-2 text-md leading-relaxed text-muted-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Typography | `text-narrative` | Design token |
| Clamp | `line-clamp-2` | Max 2 lines |
| Size | `text-md` | Medium |
| Leading | `leading-relaxed` | Relaxed line height |
| Color | `text-muted-foreground` | Muted |

---

## 18. BlogHeadlineSection — Metadata Bar

Outer container:
```
relative overflow-hidden rounded-md border-hairline border bg-slate-100 px-2 py-4 dark:bg-slate-800 md:px-3 md:py-5 lg:px-4
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative` | For absolute children |
| Overflow | `overflow-hidden` | Clip stripes |
| Radius | `rounded-md` | Medium radius |
| Border | `border-hairline border` | Both hairline token and standard border |
| Background (light) | `bg-slate-100` | Slate 100 |
| Background (dark) | `dark:bg-slate-800` | Slate 800 |
| Padding-x | `px-2` → `md:px-3` → `lg:px-4` | 8px → 12px → 16px (3 breakpoints!) |
| Padding-y | `py-4` → `md:py-5` | 16px → 20px |

### DiagonalStripes (dari `src/components/marketing/SectionBackground/DiagonalStripes.tsx`)

Usage: `<DiagonalStripes className="opacity-40" />`

Base classes:
```
absolute inset-0 pointer-events-none z-0
```

Light mode stripes:
```
[background-image:repeating-linear-gradient(45deg,color-mix(in_oklab,var(--slate-900),transparent_90%)_0,color-mix(in_oklab,var(--slate-900),transparent_90%)_1px,transparent_1px,transparent_8px)]
```

Dark mode stripes:
```
dark:[background-image:repeating-linear-gradient(45deg,color-mix(in_oklab,var(--slate-50),transparent_88%)_0,color-mix(in_oklab,var(--slate-50),transparent_88%)_1px,transparent_1px,transparent_8px)]
```

Override: `opacity-40`

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute inset-0` | Full-cover |
| Pointer | `pointer-events-none` | Non-interactive |
| Z-index | `z-0` | Behind content |
| Angle | 45deg | Diagonal |
| Width | 1px | Stripe width |
| Gap | 8px | Between stripes |
| Light opacity | 10% (base) x 40% (override) | ~4% visible |
| Dark opacity | 12% (base) x 40% (override) | ~4.8% visible |

### Metadata Grid
```
relative z-10 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-6
```

### Category Label
```
text-signal text-[10px] font-bold tracking-widest text-muted-foreground
```

### Author / Date / ReadTime
```
text-interface text-sm text-foreground
```
```
text-interface text-sm text-muted-foreground
```

---

## 19. BlogHeadlineSection — SectionCTA (dari `@/components/ui/section-cta`)

Usage:
```tsx
<SectionCTA href={`/blog/${headlinePost.slug}`} className="w-full md:w-auto md:self-center">
  Baca <ArrowRight className="icon-interface" />
</SectionCTA>
```

### SectionCTA Base Classes (dari `src/components/ui/section-cta.tsx`)

```
group relative overflow-hidden
inline-flex items-center justify-center gap-2 rounded-action px-2 py-1
text-signal text-xs font-medium uppercase tracking-widest
border border-transparent bg-[color:var(--slate-800)] text-[color:var(--slate-100)]
hover:text-[color:var(--slate-800)] hover:border-[color:var(--slate-600)]
dark:bg-[color:var(--slate-100)] dark:text-[color:var(--slate-800)]
dark:hover:text-[color:var(--slate-100)] dark:hover:border-[color:var(--slate-400)]
transition-colors focus-ring
whitespace-nowrap [&_svg]:shrink-0 [&_svg]:self-center
```

Override: `w-full md:w-auto md:self-center`

### Stripes Animation (btn-stripes-pattern)
```
btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0
```

| Property | Class | Value |
|----------|-------|-------|
| Structure | `group relative overflow-hidden` | For stripes animation |
| Layout | `inline-flex items-center justify-center gap-2` | Flex, centered, 8px gap |
| Radius | `rounded-action` | Design token |
| Padding | `px-2 py-1` | 8px x, 4px y |
| Typography | `text-signal text-xs font-medium uppercase tracking-widest` | Signal, 12px, medium, uppercase |
| Light bg | `bg-[color:var(--slate-800)]` | Slate 800 |
| Light text | `text-[color:var(--slate-100)]` | Slate 100 |
| Light hover bg | stripes slide in | Via btn-stripes-pattern |
| Light hover text | `hover:text-[color:var(--slate-800)]` | Slate 800 |
| Light hover border | `hover:border-[color:var(--slate-600)]` | Slate 600 |
| Dark bg | `dark:bg-[color:var(--slate-100)]` | Slate 100 |
| Dark text | `dark:text-[color:var(--slate-800)]` | Slate 800 |
| Dark hover text | `dark:hover:text-[color:var(--slate-100)]` | Slate 100 |
| Dark hover border | `dark:hover:border-[color:var(--slate-400)]` | Slate 400 |
| Stripes initial | `translate-x-[101%]` | Off-screen right |
| Stripes hover | `group-hover:translate-x-0` | Slides into view |
| Stripes duration | `duration-300 ease-out` | 300ms ease-out |
| Width override | `w-full md:w-auto` | Full mobile, auto desktop |

---

## 20. BlogFeedSection — Loading State

Container:
```
space-y-2 rounded-shell border-hairline bg-card/90 p-4 backdrop-blur-[1px] dark:bg-slate-800/90 md:p-5
```

Each skeleton row (4 rows):
```
h-20 animate-pulse rounded-action border-hairline bg-card/20 dark:bg-slate-800/40
```

| Property | Class | Value |
|----------|-------|-------|
| Container spacing | `space-y-2` | 8px between rows |
| Container radius | `rounded-shell` | Design token |
| Container border | `border-hairline` | Design token |
| Container bg (light) | `bg-card/90` | Card at 90% |
| Container bg (dark) | `dark:bg-slate-800/90` | Slate 800 at 90% |
| Container padding | `p-4` → `md:p-5` | 16px → 20px |
| Container backdrop | `backdrop-blur-[1px]` | Subtle blur |
| Row height | `h-20` | 80px |
| Row animation | `animate-pulse` | Pulse |
| Row radius | `rounded-action` | Design token |
| Row border | `border-hairline` | Design token |
| Row bg (light) | `bg-card/20` | Card at 20% |
| Row bg (dark) | `dark:bg-slate-800/40` | Slate 800 at 40% |

---

## 21. BlogFeedSection — Empty State

Container:
```
rounded-shell border-hairline border-dashed bg-card/90 px-6 py-16 text-center backdrop-blur-[1px] dark:bg-slate-800/90 md:py-20
```

Icon wrapper:
```
rounded-action mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-muted/30
```

Icon: `Search` dari iconoir-react, `icon-display text-muted-foreground`

Title:
```
text-narrative mb-2 text-lg font-medium text-foreground
```

Description:
```
text-narrative mx-auto max-w-sm text-sm text-muted-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Container radius | `rounded-shell` | Design token |
| Container border | `border-hairline border-dashed` | Thin dashed border |
| Container bg (light) | `bg-card/90` | Card at 90% |
| Container bg (dark) | `dark:bg-slate-800/90` | Slate 800 at 90% |
| Container padding | `px-6 py-16` → `md:py-20` | 24px x, 64px → 80px y |
| Container backdrop | `backdrop-blur-[1px]` | Subtle blur |
| Icon wrapper | `rounded-action h-14 w-14 bg-muted/30` | 56x56px, muted bg |
| Icon class | `icon-display` | Design token (display icon size) |

---

## 22. BlogFeedSection — Feed Container

```
overflow-hidden rounded-shell border-hairline bg-card/85 backdrop-blur-[1px] dark:bg-slate-900
```

Note: bg-card/85 (85% opacity, slightly lower than headline card's 90%)

| Property | Class | Value |
|----------|-------|-------|
| Overflow | `overflow-hidden` | Clip content |
| Radius | `rounded-shell` | Design token |
| Border | `border-hairline` | Design token |
| Background (light) | `bg-card/85` | Card at 85% |
| Background (dark) | `dark:bg-slate-900` | Slate 900 |
| Backdrop | `backdrop-blur-[1px]` | Subtle blur |

---

## 23. BlogFeedSection — Row Layout

Row article wrapper:
```
border-hairline border-b last:border-b-0
```

Row content area:
```
px-4 py-5 transition-colors md:px-5 md:py-5
```

Expanded background:
```
bg-slate-100 dark:bg-slate-700
```

Row flex container:
```
flex items-center gap-4
```

Expand button (title area):
```
group min-w-0 flex-1 text-left
```

| Property | Class | Value |
|----------|-------|-------|
| Row separator | `border-hairline border-b last:border-b-0` | Bottom border, none on last |
| Row padding | `px-4 py-5` → `md:px-5` | 16px/20px x, 20px y |
| Row transition | `transition-colors` | Color transition |
| Expanded bg (light) | `bg-slate-100` | Slate 100 |
| Expanded bg (dark) | `dark:bg-slate-700` | Slate 700 |
| Row layout | `flex items-center gap-4` | Flex, centered, 16px gap |

---

## 24. BlogFeedSection — RowThumbnail

Grid:
```
grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 md:grid-cols-[88px_minmax(0,1fr)]
```

Thumbnail container (cover image and placeholder):
```
relative aspect-square w-full overflow-hidden rounded-action border-hairline
```

Image: `object-cover`, sizes="88px"

| Property | Class | Value |
|----------|-------|-------|
| Grid (mobile) | `grid-cols-[72px_minmax(0,1fr)]` | 72px thumbnail |
| Grid (desktop) | `md:grid-cols-[88px_minmax(0,1fr)]` | 88px thumbnail |
| Alignment | `items-center` | Vertically centered |
| Gap | `gap-3` | 12px |
| Thumbnail | `aspect-square w-full overflow-hidden rounded-action border-hairline` | Square, clipped |

---

## 25. BlogFeedSection — Row Content

Category + date label:
```
text-signal mb-1 text-[10px] font-medium tracking-widest text-muted-foreground
```

Title h3:
```
text-narrative cursor-pointer text-base font-medium text-foreground/80 transition-colors group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-sky-200 md:text-lg
```

Excerpt:
```
text-narrative mt-1 line-clamp-1 text-xs text-muted-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Label typography | `text-signal text-[10px] font-medium tracking-widest` | Signal, 10px, medium, widest |
| Label color | `text-muted-foreground` | Muted |
| Title typography | `text-narrative text-base font-medium` → `md:text-lg` | 16px → 18px |
| Title color | `text-foreground/80` | 80% foreground |
| Title dark | `dark:text-slate-100` | Slate 100 |
| Title hover (light) | `group-hover:text-sky-700` | Sky 700 |
| Title hover (dark) | `dark:group-hover:text-sky-200` | Sky 200 |
| Title cursor | `cursor-pointer` | Pointer |
| Title transition | `transition-colors` | Color transition |
| Excerpt | `text-narrative text-xs text-muted-foreground` | 12px, muted |
| Excerpt clamp | `line-clamp-1` | Single line |

Note: Title supports double-click navigation to `/blog/[slug]` via `router.push`.

---

## 26. BlogFeedSection — Toggle Button

```
cursor-pointer self-center text-center text-[1.9rem] leading-none text-muted-foreground transition-colors
hover:text-slate-700 focus-visible:text-slate-700 dark:hover:text-slate-300 dark:focus-visible:text-slate-300
```

Expanded state adds:
```
text-slate-700 dark:text-slate-300
```

| Property | Class | Value |
|----------|-------|-------|
| Cursor | `cursor-pointer` | Pointer |
| Alignment | `self-center text-center` | Vertically and horizontally centered |
| Size | `text-[1.9rem]` | 30.4px |
| Leading | `leading-none` | No line height |
| Color | `text-muted-foreground` | Muted default |
| Hover (light) | `hover:text-slate-700` | Slate 700 |
| Hover (dark) | `dark:hover:text-slate-300` | Slate 300 |
| Focus (light) | `focus-visible:text-slate-700` | Slate 700 |
| Focus (dark) | `dark:focus-visible:text-slate-300` | Slate 300 |
| Expanded (light) | `text-slate-700` | Slate 700 |
| Expanded (dark) | `dark:text-slate-300` | Slate 300 |
| Content | `"+"` collapsed / `"−"` expanded | Plus/minus symbols |

---

## 27. BlogFeedSection — Expanded Detail

Expanded container:
```
border-hairline border-t bg-slate-100 px-4 py-5 md:px-5 md:py-6 dark:bg-slate-700
```

Excerpt in expanded:
```
text-narrative mb-5 max-w-3xl text-sm leading-relaxed text-foreground md:text-base
```

Metadata bar: identical pattern to BlogHeadlineSection (section 18) — same DiagonalStripes + SectionCTA pattern.

| Property | Class | Value |
|----------|-------|-------|
| Container border | `border-hairline border-t` | Top border separator |
| Container bg (light) | `bg-slate-100` | Slate 100 |
| Container bg (dark) | `dark:bg-slate-700` | Slate 700 |
| Container padding | `px-4 py-5` → `md:px-5 md:py-6` | 16/20px → 20/24px |
| Excerpt max-width | `max-w-3xl` | 768px max |
| Excerpt size | `text-sm` → `md:text-base` | 14px → 16px |

---

## 28. BlogNewsletterSection — Card Container

Outer wrapper:
```
mt-8
```

Card:
```
rounded-shell border-hairline bg-card/90 p-8 text-center backdrop-blur-[1px] transition-colors duration-200 hover:bg-card dark:bg-slate-800/90 dark:hover:bg-slate-800 md:p-10
```

| Property | Class | Value |
|----------|-------|-------|
| Outer margin | `mt-8` | 32px top |
| Radius | `rounded-shell` | Design token |
| Border | `border-hairline` | Design token |
| Background (light) | `bg-card/90` | Card at 90% |
| Background (dark) | `dark:bg-slate-800/90` | Slate 800 at 90% |
| Padding | `p-8` → `md:p-10` | 32px → 40px |
| Text align | `text-center` | Centered |
| Backdrop | `backdrop-blur-[1px]` | Subtle blur |
| Hover bg (light) | `hover:bg-card` | Full card (100%) |
| Hover bg (dark) | `dark:hover:bg-slate-800` | Slate 800 (100%) |
| Transition | `transition-colors duration-200` | 200ms color transition |

---

## 29. BlogNewsletterSection — Content + Input + CTA

Title:
```
text-narrative mb-3 text-2xl font-medium tracking-tight text-foreground md:text-3xl
```

Description:
```
text-narrative mx-auto mb-8 max-w-xl text-sm text-muted-foreground
```

Input container:
```
mx-auto flex w-full max-w-lg flex-col gap-3 sm:flex-row
```

Input override:
```
blog-neutral-input text-interface text-xs h-8 rounded-action border-main border-border bg-background
```

SectionCTA override: `className="px-6"` (wider padding)

| Property | Class | Value |
|----------|-------|-------|
| Title size | `text-2xl` → `md:text-3xl` | 24px → 30px |
| Title tracking | `tracking-tight` | Tight |
| Description max-w | `max-w-xl` | 576px |
| Input container | `max-w-lg flex-col sm:flex-row` | Stack mobile, row desktop |
| Input height | `h-8` | 32px (smaller than filter's h-10) |
| CTA padding | `px-6` | 24px (wider than default px-2) |

---

## 30. BlogArticlePage — Loading Skeleton

Page wrapper + section wrapper: same as landing page (sections 2-4).

Container (slightly different padding):
```
relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 pt-[calc(var(--header-h)+16px)] md:px-8 md:pb-12 md:pt-[calc(var(--header-h)+20px)]
```

Note: `md:pb-12` (48px) vs landing page's `md:pb-10` (40px).

4 skeleton blocks:
```
h-16 w-48 animate-pulse rounded-action border-hairline bg-card/40 dark:bg-slate-800/45
```
```
mt-5 h-[4.5rem] w-full animate-pulse rounded-action border-hairline bg-card/40 dark:bg-slate-800/45 md:w-3/4
```
```
mt-3 h-6 w-full animate-pulse rounded-action border-hairline bg-card/40 dark:bg-slate-800/45 md:w-1/2
```
```
mt-8 h-[420px] animate-pulse rounded-shell border-hairline bg-card/30 dark:bg-slate-800/40
```

| Property | Class | Value |
|----------|-------|-------|
| Skeleton radius | `rounded-action` | Design token (first 3 blocks) |
| Cover radius | `rounded-shell` | Design token (cover block) |
| Skeleton bg (light) | `bg-card/40` | Card at 40% |
| Skeleton bg (dark) | `dark:bg-slate-800/45` | Slate 800 at 45% |
| Cover bg (light) | `bg-card/30` | Card at 30% |
| Cover bg (dark) | `dark:bg-slate-800/40` | Slate 800 at 40% |
| Animation | `animate-pulse` | All blocks pulse |
| Badge size | `h-16 w-48` | 64x192px |
| Title size | `h-[4.5rem] w-full md:w-3/4` | 72px, full → 75% |
| Excerpt size | `h-6 w-full md:w-1/2` | 24px, full → 50% |
| Cover size | `h-[420px]` | 420px full width |

---

## 31. BlogArticlePage — Not Found + Unpublished States

Container (narrower than normal):
```
relative z-10 mx-auto w-full max-w-5xl px-4 pb-10 pt-[calc(var(--header-h)+20px)] md:px-8 md:pt-[calc(var(--header-h)+24px)]
```

Note: `max-w-5xl` (1024px) vs normal `max-w-7xl` (1280px).

Card:
```
rounded-shell border-hairline bg-card/90 p-8 text-center backdrop-blur-[1px] dark:bg-slate-800/90 md:p-12
```

Title:
```
text-narrative mb-2 text-2xl font-medium md:text-3xl
```

Message:
```
text-narrative mb-6 text-sm text-muted-foreground
```

Back link:
```
text-signal inline-flex items-center gap-2 rounded-action border-main border-amber-500/40 px-3 py-2 text-[10px] font-bold tracking-widest text-amber-500 transition-colors hover:bg-amber-500/10
```

Icon: `ArrowLeft` dengan `icon-interface`

| Property | Class | Value |
|----------|-------|-------|
| Container max-w | `max-w-5xl` | 1024px (narrower) |
| Card padding | `p-8` → `md:p-12` | 32px → 48px |
| Card bg (dark) | `dark:bg-slate-800/90` | Slate 800 at 90% |
| Link border | `border-amber-500/40` | Amber at 40% |
| Link text | `text-amber-500` | Amber 500 |
| Link hover | `hover:bg-amber-500/10` | Amber bg at 10% |
| Link typography | `text-signal text-[10px] font-bold tracking-widest` | Signal, 10px, bold |

---

## 32. BlogArticlePage — Content State Layout

### Back Link (content state — different from not-found)
```
text-signal mb-6 inline-flex items-center gap-2 rounded-action border-main border-border px-3 py-2 text-[10px] font-bold tracking-widest text-muted-foreground transition-colors hover:bg-accent hover:text-foreground
```

Note: uses `border-border` + `text-muted-foreground` (neutral), not amber like not-found.

### Header
```
mb-8 md:mb-10
```

Title h1:
```
text-narrative max-w-6xl text-[2.35rem] leading-[0.98] font-medium tracking-tight md:text-[5.2rem]
```

Excerpt:
```
text-narrative mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base
```

| Property | Class | Value |
|----------|-------|-------|
| Title size | `text-[2.35rem]` → `md:text-[5.2rem]` | 37.6px → 83.2px |
| Title leading | `leading-[0.98]` | 0.98 line height (very tight) |
| Title tracking | `tracking-tight` | Tight letter spacing |
| Title max-w | `max-w-6xl` | 1152px |
| Excerpt max-w | `max-w-3xl` | 768px |
| Excerpt size | `text-sm` → `md:text-base` | 14px → 16px |

### Cover Image
Container:
```
mb-8 overflow-hidden rounded-shell border-hairline md:mb-10
```

Image wrapper:
```
relative h-[220px] w-full md:h-[460px]
```

Image: `object-cover`, `priority`, `unoptimized` if no real cover.

| Property | Class | Value |
|----------|-------|-------|
| Image height | `h-[220px]` → `md:h-[460px]` | 220px → 460px |
| Container radius | `rounded-shell` | Design token |
| Container border | `border-hairline` | Design token |
| Margin | `mb-8` → `md:mb-10` | 32px → 40px |

### Content Grid
```
grid grid-cols-1 gap-7 md:grid-cols-16 md:gap-8
```

Sidebar: `md:col-span-4`
Article: `md:col-span-12`

---

## 33. BlogArticlePage — Metadata Sidebar + Share Buttons + Article Body + BlockRenderer + renderInline

### Metadata Sidebar Card
```
rounded-shell border-hairline bg-card/90 p-4 backdrop-blur-[1px] dark:bg-slate-800/90 md:p-5
```

Sticky (inline): `position: sticky; top: calc(var(--header-h) + 16px)`

Label:
```
text-signal mb-3 text-[10px] font-bold tracking-widest text-muted-foreground
```

### Metadata Rows Container
```
rounded-action border-hairline overflow-hidden
```

Each row:
```
border-hairline flex items-center justify-between px-4 py-3.5 text-sm
```

Labels: `text-interface text-muted-foreground`
Values: `text-interface`

### Share Buttons
Container: `mt-4 grid grid-cols-2 gap-2`

Each button:
```
text-signal inline-flex items-center justify-center rounded-action border-main border-border px-3 py-2 text-[10px] font-bold tracking-widest text-foreground transition-colors hover:bg-accent
```

### Article Body Container
```
rounded-shell bg-card/90 p-6 dark:bg-slate-800/90 md:p-8
```

With blocks: adds `space-y-8`

Note: No `border-hairline` on article body (different from sidebar).

### BlockRenderer — section type

h2: `text-narrative mb-3 text-2xl leading-tight font-medium md:text-3xl`
Description: `text-narrative mb-5 text-base leading-relaxed text-muted-foreground`
Paragraphs wrapper: `space-y-4`
Paragraph: `text-narrative text-lg leading-relaxed text-foreground/90`
List wrapper: `mt-5`

Numbered list: `space-y-2`
- Item: `text-narrative text-base leading-relaxed text-foreground/90`
- Counter: `text-signal mr-2 text-xs font-bold tracking-widest text-amber-500` with padStart(2, "0")
- Sub-items: `mt-2 ml-8 space-y-1`
- Sub-item: `text-sm text-muted-foreground`

Bullet list: `space-y-2`
- Item: `text-narrative text-base leading-relaxed text-foreground/90`
- Marker: `mr-2 text-amber-500` (dash character)
- Sub-items: same as numbered

### BlockRenderer — infoCard type
Container: `rounded-shell border-hairline bg-card/30 p-5 dark:bg-slate-800/40 md:p-6`
Title: `text-narrative mb-2 text-xl font-medium`
Description: `text-narrative mb-4 text-sm leading-relaxed text-muted-foreground`
Items list: `space-y-2`
Item: `text-narrative text-sm leading-relaxed text-foreground/90`
Marker: `mr-2 text-amber-500` (dash)

### BlockRenderer — ctaCards type
Container: `rounded-shell border-hairline bg-card/20 p-5 dark:bg-slate-800/35 md:p-6`
Grid: `grid grid-cols-1 gap-4 md:grid-cols-2`
Card (Link): `rounded-action border-main border-border bg-background/60 p-4 transition-colors hover:bg-accent`
Title: `text-narrative mb-2 text-base font-medium`
Description: `text-narrative mb-3 text-sm leading-relaxed text-muted-foreground`
CTA text: `text-signal inline-flex items-center gap-1 text-[10px] font-bold tracking-widest text-amber-500`
Arrow icon: `icon-micro`

### renderInline (local di BlogArticlePage)

Bold (`**text**`):
```
font-semibold text-foreground
```

Code (backtick):
```
rounded-action border-main border-border bg-muted/40 px-1 py-0.5 text-xs text-foreground
```

Plain text: `<span>` (no extra classes)

**Perbedaan dari documentation page renderInline:**
- Blog bold: `font-semibold text-foreground` (tanpa `text-narrative`)
- Doc bold: `text-narrative font-semibold text-foreground`
- Blog code: `rounded-action border-main border-border bg-muted/40`
- Doc code: `rounded-sm bg-slate-950/10 dark:bg-slate-950`

---

## 34. Custom CSS Classes / Design Tokens yang Dipakai

| Token/Class | Tipe | Dipakai Di |
|-------------|------|-----------|
| `text-narrative` | Typography | Semua komponen — body, paragraf, title |
| `text-interface` | Typography | Filter buttons, metadata labels, search input |
| `text-signal` | Typography | Badges, tracking text, CTA buttons, metadata labels |
| `rounded-shell` | Border Radius | Card containers, feed container, cover image |
| `rounded-action` | Border Radius | Buttons, inputs, thumbnails, skeleton blocks |
| `rounded-badge` | Border Radius | SectionBadge (dari section-badge.tsx) |
| `border-hairline` | Border Width | Semua card borders, row separators, skeleton blocks |
| `border-main` | Border Width | Buttons, inputs, back links, share buttons |
| `gap-comfort` | Spacing | Landing page grid |
| `p-comfort` | Spacing | Sidebar card padding |
| `blog-neutral-input` | Custom CSS | Search input, newsletter input |
| `icon-interface` | Icon Size | Arrow icons, search icon |
| `icon-display` | Icon Size | Feed empty state search icon |
| `icon-micro` | Icon Size | ctaCards arrow icon |
| `focus-ring` | Focus Style | SectionCTA focus state |
| `btn-stripes-pattern` | Animation | SectionCTA hover stripes |
| `bg-[color:var(--section-bg-alt)]` | CSS Variable | Section background |
| `var(--header-h)` | CSS Variable | Sticky positioning, padding-top calculations |
| `var(--slate-800)` | CSS Variable | SectionCTA light bg |
| `var(--slate-100)` | CSS Variable | SectionCTA dark bg |
| `var(--emerald-600)` | CSS Variable | SectionBadge bg |
| `var(--amber-500)` | CSS Variable | SectionBadge dot + list markers + back link |

---

## 35. Perbedaan Styling: Mobile vs Desktop

| Aspek | Mobile | Desktop |
|-------|--------|---------|
| Grid layout | `grid-cols-1` (stacked) | `md:grid-cols-16` (sidebar + main) |
| Sidebar | `hidden` | `md:block md:col-span-4` (sticky) |
| Main content | Full width | `md:col-span-12` |
| Filter access | Sheet drawer (right) | Inline sidebar card |
| Mobile filter button | Visible (`flex`) | Hidden (`md:hidden`) |
| Mobile post count | Visible | Hidden (`md:hidden`) |
| Content container px | `px-4` (16px) | `md:px-8` (32px) |
| Content container pt | `calc(var(--header-h)+16px)` | `calc(var(--header-h)+20px)` |
| Headline thumbnail | 84px | 112px |
| Headline title | `text-xl` (20px) | `md:text-[2rem]` (32px) |
| Feed thumbnail | 72px | 88px |
| Feed title | `text-base` (16px) | `md:text-lg` (18px) |
| Metadata bar px | `px-2` | `md:px-3` → `lg:px-4` |
| Metadata bar grid | `grid-cols-1` | `md:grid-cols-[1fr_1fr_auto]` |
| SectionCTA width | `w-full` | `md:w-auto` |
| Newsletter padding | `p-8` (32px) | `md:p-10` (40px) |
| Newsletter input layout | `flex-col` | `sm:flex-row` |
| Article title | `text-[2.35rem]` (37.6px) | `md:text-[5.2rem]` (83.2px) |
| Article cover height | `h-[220px]` | `md:h-[460px]` |
| Article metadata | Full width | `md:col-span-4` (sticky sidebar) |
| Article body | Full width | `md:col-span-12` |
| Article body padding | `p-6` | `md:p-8` |
| Feed empty state py | `py-16` | `md:py-20` |
| Sheet width | `w-[320px]` | N/A (desktop uses sidebar) |
