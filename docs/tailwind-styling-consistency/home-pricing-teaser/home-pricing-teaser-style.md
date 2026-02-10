# Home: Pricing Teaser — Styling Reference

Extracted from `src/components/marketing/pricing-teaser/`. Semua class di bawah ini **copy-paste dari source code**, bukan interpretasi.

---

## 1. Section Wrapper (PricingTeaser.tsx)

```html
<section
  class="relative h-[100svh] flex flex-col justify-center overflow-hidden bg-background"
  id="pemakaian-harga"
>
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative` | For z-index stacking with background patterns |
| Height | `h-[100svh]` | Full viewport height (small viewport height) |
| Layout | `flex flex-col justify-center` | Vertically centers content |
| Overflow | `overflow-hidden` | Clips background patterns |
| Background | `bg-background` | CSS variable `--background` |
| Section ID | `id="pemakaian-harga"` | Anchor link target |

---

## 2. Background Patterns (PricingTeaser.tsx)

```tsx
<GridPattern className="z-0" />
<DottedPattern spacing={24} withRadialMask={false} className="z-0" />
```

| Component | Props | Notes |
|-----------|-------|-------|
| `GridPattern` | `className="z-0"` | From `@/components/marketing/SectionBackground` |
| `DottedPattern` | `spacing={24} withRadialMask={false} className="z-0"` | 24px dot spacing, no radial fade mask |

> Both components are memoized React components. **No inline styles** (`gridStyle`/`dotsStyle` patterns sudah dihapus).

---

## 3. Content Container (PricingTeaser.tsx)

```html
<div class="relative z-10 w-full max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-10">
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative z-10` | Above background patterns (z-0) |
| Width | `w-full max-w-7xl` | Full width, max 80rem |
| Centering | `mx-auto` | Horizontal center |
| Padding | `px-4 py-6` | 16px horizontal, 24px vertical |
| Responsive padding | `md:px-8 md:py-10` | 32px horizontal, 40px vertical at md+ |

---

## 4. Grid Layout (PricingTeaser.tsx)

```html
<div class="grid grid-cols-16 gap-comfort content-center">
  <!-- Header area -->
  <div class="col-span-16 md:col-span-12 md:col-start-3 flex flex-col items-start gap-3 md:gap-4 mb-4 md:mb-8">
  <!-- Cards area -->
  <div class="col-span-16 md:col-span-12 md:col-start-3">
  <!-- CTA area -->
  <div class="col-span-16 md:col-span-12 md:col-start-3">
```

| Property | Class | Value |
|----------|-------|-------|
| Grid system | `grid grid-cols-16` | 16-column grid (Mechanical Grace standard) |
| Gap | `gap-comfort` | 16px (design system token) |
| Alignment | `content-center` | Vertically center grid content |
| Content span | `col-span-16 md:col-span-12 md:col-start-3` | Full mobile, 12 of 16 centered on desktop |

### Header sub-layout

| Property | Class | Value |
|----------|-------|-------|
| Direction | `flex flex-col` | Vertical stack |
| Alignment | `items-start` | Left-aligned |
| Gap | `gap-3 md:gap-4` | 12px → 16px |
| Bottom margin | `mb-4 md:mb-8` | 16px → 32px |

---

## 5. Desktop Card Grid (PricingTeaser.tsx)

```html
<div class="hidden md:grid grid-cols-3 gap-6 items-stretch">
```

| Property | Class | Value |
|----------|-------|-------|
| Visibility | `hidden md:grid` | Hidden mobile, grid on md+ |
| Columns | `grid-cols-3` | Three equal columns |
| Gap | `gap-6` | 24px between cards |
| Alignment | `items-stretch` | Cards fill equal height |

---

## 6. PricingTeaserBadge (PricingTeaserBadge.tsx)

```tsx
<SectionBadge>Pemakaian & Harga</SectionBadge>
```

Delegates entirely to `SectionBadge` from `@/components/ui/section-badge`. No local styling.

**SectionBadge provides:**

| Property | Class | Value |
|----------|-------|-------|
| Layout | `inline-flex w-fit items-center gap-2` | Inline with gap |
| Shape | `rounded-badge` | 6px border radius |
| Padding | `px-2.5 py-1` | Compact spacing |
| Background | `bg-[color:var(--emerald-600)]` | Emerald surface |
| Text color | `text-[color:var(--slate-50)]` | Light text on emerald |
| Dot | `h-2 w-2 rounded-full bg-[color:var(--amber-500)]` | Amber animated dot |
| Dot effect | `shadow-[0_0_6px_var(--amber-500)] animate-pulse` | Glow + pulse |
| Text style | `text-signal text-[10px] font-bold` | Mono uppercase signal |

---

## 7. PricingTeaserTitle (PricingTeaserTitle.tsx)

```html
<h2 class="text-narrative text-2xl sm:text-[2rem] md:text-[2.5rem] font-medium leading-[1.3] text-foreground">
```

| Property | Class | Value |
|----------|-------|-------|
| Font family | `text-narrative` | Geist Sans (NOT Geist Mono) |
| Size | `text-2xl sm:text-[2rem] md:text-[2.5rem]` | 24px → 32px → 40px |
| Weight | `font-medium` | 500 |
| Line height | `leading-[1.3]` | 1.3x |
| Color | `text-foreground` | Standard text color |

> **JSDoc in source says "Font: Geist Mono" — this is incorrect.** The actual class `text-narrative` maps to Geist Sans.

---

## 8. TeaserCard — Outer Wrapper (TeaserCard.tsx)

```html
<div class="group relative h-full">
```

| Property | Class | Value |
|----------|-------|-------|
| Group | `group` | Enables `group-hover:` on children |
| Position | `relative` | For absolute-positioned highlight tag |
| Height | `h-full` | Fills grid cell |

---

## 9. TeaserCard — Highlight Tag (TeaserCard.tsx)

Only rendered when `plan.isHighlighted === true`.

```html
<div class="absolute -top-3 left-1/2 -translate-x-1/2 z-10
            transition-transform duration-300 group-hover:-translate-y-1
            bg-[color:var(--emerald-500)] text-[color:var(--slate-50)]
            text-[11px] font-semibold uppercase tracking-wide
            px-3 py-1 rounded-full whitespace-nowrap">
  Solusi Terbaik
</div>
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute -top-3 left-1/2 -translate-x-1/2 z-10` | Centered above card |
| Hover | `transition-transform duration-300 group-hover:-translate-y-1` | Lifts with card on hover |
| Background | `bg-[color:var(--emerald-500)]` | Emerald pill |
| Text color | `text-[color:var(--slate-50)]` | White text |
| Typography | `text-[11px] font-semibold uppercase tracking-wide` | Small caps |
| Shape | `rounded-full` | Pill shape |
| Padding | `px-3 py-1` | Compact |
| Wrap | `whitespace-nowrap` | No line break |

---

## 10. TeaserCard — Card Body (TeaserCard.tsx)

```html
<div class="relative overflow-hidden h-full min-h-[240px] md:min-h-[280px]
            flex flex-col p-comfort md:p-airy rounded-shell
            border-1 border-[color:var(--slate-400)]
            group-hover:bg-[color:var(--slate-200)] dark:group-hover:bg-[color:var(--slate-700)]
            group-hover:-translate-y-1 transition-all duration-300
            {highlighted: border-2 border-[color:var(--emerald-500)]}">
```

### Default state

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative overflow-hidden` | Contains children |
| Height | `h-full min-h-[240px] md:min-h-[280px]` | Fill + minimum |
| Layout | `flex flex-col` | Vertical stack |
| Padding | `p-comfort md:p-airy` | 16px → 24px+ |
| Shape | `rounded-shell` | 16px border radius |
| Border | `border-1 border-[color:var(--slate-400)]` | 1px slate border |

### Highlighted state (additive)

| Property | Class | Value |
|----------|-------|-------|
| Border | `border-2 border-[color:var(--emerald-500)]` | 2px emerald border (overrides default) |

### Hover state

| Property | Class | Value |
|----------|-------|-------|
| Background (light) | `group-hover:bg-[color:var(--slate-200)]` | Slate-200 on hover |
| Background (dark) | `dark:group-hover:bg-[color:var(--slate-700)]` | Slate-700 on hover |
| Lift | `group-hover:-translate-y-1` | -4px vertical lift |
| Transition | `transition-all duration-300` | Smooth 300ms |

---

## 11. TeaserCard — Inner Elements (TeaserCard.tsx)

### Plan name

```html
<h3 class="text-narrative font-light text-xl md:text-2xl text-foreground mb-3 text-center mt-4 md:mt-0">
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-narrative` | Geist Sans |
| Weight | `font-light` | 300 |
| Size | `text-xl md:text-2xl` | 20px → 24px |
| Color | `text-foreground` | Standard |
| Align | `text-center` | Centered |
| Spacing | `mb-3 mt-4 md:mt-0` | Bottom 12px, top 16px (mobile) / 0 (desktop) |

### Price

```html
<p class="text-interface text-3xl md:text-3xl font-medium tracking-tight tabular-nums text-foreground text-center mb-6">
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-interface` | Geist Mono (numbers MUST use mono) |
| Size | `text-3xl` | 30px |
| Weight | `font-medium` | 500 |
| Features | `tracking-tight tabular-nums` | Tight tracking + tabular figures |
| Color | `text-foreground` | Standard |
| Align | `text-center` | Centered |
| Spacing | `mb-6` | Bottom 24px |

### Price unit (optional)

```html
<span class="text-interface text-sm font-normal text-muted-foreground ml-1">
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-interface` | Geist Mono |
| Size | `text-sm` | 14px |
| Weight | `font-normal` | 400 |
| Color | `text-muted-foreground` | Subdued |
| Spacing | `ml-1` | Left margin 4px |

### Dot indicator

```html
<span class="w-2 h-2 min-w-2 rounded-full mt-3 bg-[color:var(--rose-500)] animate-pulse shadow-[0_0_8px_var(--rose-500)]" />
```

| Property | Class | Value |
|----------|-------|-------|
| Size | `w-2 h-2 min-w-2` | 8px, won't shrink |
| Shape | `rounded-full` | Circle |
| Position | `mt-3` | Top margin 12px (aligns with text) |
| Color | `bg-[color:var(--rose-500)]` | **Rose-500** (NOT amber like benefits) |
| Animation | `animate-pulse` | Breathing effect |
| Glow | `shadow-[0_0_8px_var(--rose-500)]` | Rose glow shadow |

> **Color signal difference:** Benefits section uses **amber-500** dots, pricing teaser uses **rose-500** dots. This is intentional.

### Description container

```html
<div class="flex items-start gap-3">
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `flex items-start gap-3` | Horizontal, top-aligned, 12px gap |

### Description text

```html
<p class="text-interface font-normal text-sm leading-relaxed text-foreground">
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-interface` | Geist Mono |
| Weight | `font-normal` | 400 |
| Size | `text-sm` | 14px |
| Line height | `leading-relaxed` | 1.625x |
| Color | `text-foreground` | Standard |

### Credit note

```html
<p class="text-interface text-xs leading-relaxed text-foreground mt-6 md:mt-0 pt-3 md:pt-6 mb-6 md:md-0">
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-interface` | Geist Mono |
| Size | `text-xs` | 12px |
| Line height | `leading-relaxed` | 1.625x |
| Color | `text-foreground` | Standard |
| Spacing | `mt-6 md:mt-0 pt-3 md:pt-6 mb-6 md:md-0` | Complex responsive spacing |

---

## 12. TeaserCarousel (TeaserCarousel.tsx)

### Carousel wrapper

```html
<div class="relative overflow-hidden touch-pan-y pt-6 md:hidden">
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative` | For contained children |
| Overflow | `overflow-hidden` | Clips off-screen slides |
| Touch | `touch-pan-y` | Allow vertical scroll, capture horizontal |
| Padding | `pt-6` | Top 24px (room for highlight tag) |
| Visibility | `md:hidden` | Mobile only |

### Slide track

```html
<div class="flex transition-transform duration-300 ease-out touch-pan-y"
     style="transform: translateX(-${activeSlide * 100}%)">
```

| Property | Class / Style | Value |
|----------|---------------|-------|
| Layout | `flex` | Horizontal slides |
| Animation | `transition-transform duration-300 ease-out` | 300ms slide transition |
| Touch | `touch-pan-y` | Vertical passthrough |
| Position | `translateX(-N%)` | Slide offset (inline style, dynamic) |

### Individual slide

```html
<div class="flex-shrink-0 w-full px-2 box-border">
  <div class="w-full max-w-[300px] mx-auto">
```

| Property | Class | Value |
|----------|-------|-------|
| Shrink | `flex-shrink-0` | No shrink in flex |
| Width | `w-full` | Full carousel width |
| Padding | `px-2` | 8px horizontal gutter |
| Box model | `box-border` | Padding inside width |
| Max width | `max-w-[300px]` | Card capped at 300px |
| Centering | `mx-auto` | Centered in slide |

### Swipe mechanism (JavaScript)

| Behavior | Implementation |
|----------|---------------|
| Start | `onPointerDown` → `setPointerCapture(pointerId)` + record `clientX` |
| End | `onPointerUp` → `releasePointerCapture(pointerId)` + calculate diff |
| Cancel | `onPointerCancel` → same as end (graceful handling) |
| Threshold | `48px` minimum horizontal distance |
| Direction | `diff > 0` → next slide, `diff < 0` → previous slide |
| Clamping | `Math.max(0, Math.min(index, plans.length - 1))` |
| Initial slide | `plans.findIndex(p => p.isHighlighted)` (defaults to 0) |

### Navigation dots

```html
<div class="flex justify-center gap-2 mt-6">
  <!-- Per dot -->
  <button class="w-2 h-2 rounded-full border-none cursor-pointer
                 transition-colors duration-200
                 {active: bg-brand}
                 {inactive: bg-black/20 dark:bg-white/30}">
```

| Property | Class | Value |
|----------|-------|-------|
| Container | `flex justify-center gap-2 mt-6` | Centered, 8px gap, 24px top |
| Size | `w-2 h-2` | 8px dots |
| Shape | `rounded-full` | Circle |
| Border | `border-none` | No border |
| Cursor | `cursor-pointer` | Clickable |
| Transition | `transition-colors duration-200` | 200ms color change |
| Active color | `bg-brand` | Brand color (amber) |
| Inactive (light) | `bg-black/20` | 20% black |
| Inactive (dark) | `dark:bg-white/30` | 30% white |

---

## 13. TeaserSkeleton (TeaserSkeleton.tsx)

### Section wrapper

```html
<section class="relative py-20 md:py-28 px-4 md:px-6 overflow-hidden bg-background"
         id="pemakaian-harga">
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative` | For z-stacking |
| Padding Y | `py-20 md:py-28` | 80px → 112px |
| Padding X | `px-4 md:px-6` | 16px → 24px |
| Overflow | `overflow-hidden` | Clip background |
| Background | `bg-background` | Standard bg |

### Background

```tsx
<GridPattern className="z-0" />
```

Only `GridPattern`, no `DottedPattern` (simpler loading state).

### Container

```html
<div class="relative z-10 max-w-[var(--container-max-width)] mx-auto">
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative z-10` | Above pattern |
| Width | `max-w-[var(--container-max-width)]` | CSS variable max-width |
| Centering | `mx-auto` | Horizontal center |

### Header skeleton

```html
<div class="text-left mb-12">
  <!-- Badge placeholder -->
  <div class="inline-flex items-center gap-2.5 bg-muted rounded-full px-4 py-2 mb-6">
    <span class="h-2 w-2 bg-muted-foreground/30 rounded-full animate-pulse" />
    <span class="h-3 w-28 bg-muted-foreground/30 rounded animate-pulse" />
  </div>
  <!-- Title placeholder -->
  <div class="h-10 w-64 bg-muted rounded mt-4 animate-pulse" />
</div>
```

| Element | Classes | Description |
|---------|---------|-------------|
| Header area | `text-left mb-12` | Left aligned, 48px bottom margin |
| Badge pill | `inline-flex items-center gap-2.5 bg-muted rounded-full px-4 py-2 mb-6` | Pill skeleton |
| Badge dot | `h-2 w-2 bg-muted-foreground/30 rounded-full animate-pulse` | Dot placeholder |
| Badge text | `h-3 w-28 bg-muted-foreground/30 rounded animate-pulse` | Text placeholder |
| Title | `h-10 w-64 bg-muted rounded mt-4 animate-pulse` | Title placeholder |

### Card grid skeleton

```html
<div class="hidden md:grid grid-cols-3 gap-6">
  <!-- 3 identical card placeholders -->
  <div class="p-6 md:p-8 bg-card border border-border rounded-2xl animate-pulse">
    <div class="h-5 bg-muted rounded w-24 mx-auto" />
    <div class="h-8 bg-muted rounded w-28 mx-auto mt-3" />
    <div class="h-px bg-border my-4" />
    <div class="h-16 bg-muted rounded w-full mt-3" />
    <div class="h-8 bg-muted rounded w-full mt-3" />
  </div>
</div>
```

| Property | Class | Value |
|----------|-------|-------|
| Grid | `hidden md:grid grid-cols-3 gap-6` | Desktop only, 3 cols, 24px gap |
| Card | `p-6 md:p-8 bg-card border border-border rounded-2xl animate-pulse` | Card skeleton shell |

> Skeleton uses `rounded-2xl` instead of `rounded-shell`. This is a minor inconsistency but does not affect UX.

---

## 14. TeaserCTA (TeaserCTA.tsx)

```tsx
<div class="flex justify-center mt-8">
  <SectionCTA href="/pricing">LIHAT DETAIL PAKET</SectionCTA>
</div>
```

### CTA wrapper

| Property | Class | Value |
|----------|-------|-------|
| Layout | `flex justify-center` | Centered |
| Spacing | `mt-8` | Top margin 32px |

### SectionCTA provides (from `@/components/ui/section-cta`):

| Property | Class | Value |
|----------|-------|-------|
| Structure | `group relative overflow-hidden` | For stripes animation |
| Layout | `inline-flex items-center justify-center gap-2 rounded-action px-2 py-1` | Compact button |
| Typography | `text-signal text-xs font-medium uppercase tracking-widest` | Signal text |
| Light mode | `border border-transparent bg-[color:var(--slate-800)] text-[color:var(--slate-100)]` | Dark button |
| Light hover | `hover:text-[color:var(--slate-800)] hover:border-[color:var(--slate-600)]` | Inverts on hover |
| Dark mode | `dark:bg-[color:var(--slate-100)] dark:text-[color:var(--slate-800)]` | Light button |
| Dark hover | `dark:hover:text-[color:var(--slate-100)] dark:hover:border-[color:var(--slate-400)]` | Inverts on hover |
| Transition | `transition-colors focus-ring` | Color transition + focus ring |
| Hover overlay | `btn-stripes-pattern ... translate-x-[101%] group-hover:translate-x-0` | Diagonal stripes slide in |
| Duration | `transition-transform duration-300 ease-out` | 300ms stripes animation |

---

## 15. Color Signal Summary

| Element | Color | Token / CSS Variable | Signal |
|---------|-------|---------------------|--------|
| Section background | neutral | `bg-background` | Clean canvas |
| Badge background | emerald | `var(--emerald-600)` | Trust/validation |
| Badge dot | amber | `var(--amber-500)` | Brand signal |
| Card border (default) | slate | `var(--slate-400)` | Neutral boundary |
| Card border (highlight) | emerald | `var(--emerald-500)` | Best value signal |
| Highlight tag bg | emerald | `var(--emerald-500)` | Best value pill |
| Dot indicator | rose | `var(--rose-500)` | Pricing/investment signal |
| Card hover bg (light) | slate | `var(--slate-200)` | Subtle feedback |
| Card hover bg (dark) | slate | `var(--slate-700)` | Subtle feedback |
| CTA bg (light) | slate | `var(--slate-800)` | Industrial dark button |
| Carousel active dot | brand | `bg-brand` | Active state |

---

## 16. Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| **Mobile** (`<md`) | Full-width cards in carousel (`TeaserCarousel`), `col-span-16`, `gap-3`, `pt-6` for highlight tag clearance |
| **Desktop** (`md+`) | 3-column grid (`grid-cols-3 gap-6`), centered in `col-span-12 col-start-3`, carousel hidden |

### Font size scaling

| Element | Mobile | sm | md+ |
|---------|--------|-----|------|
| Title | `text-2xl` (24px) | `text-[2rem]` (32px) | `text-[2.5rem]` (40px) |
| Plan name | `text-xl` (20px) | — | `text-2xl` (24px) |
| Price | `text-3xl` (30px) | — | `text-3xl` (30px) |

### Spacing scaling

| Element | Mobile | Desktop |
|---------|--------|---------|
| Card padding | `p-comfort` (16px) | `p-airy` (24px+) |
| Card min-height | `min-h-[240px]` | `min-h-[280px]` |
| Content container padding | `px-4 py-6` | `px-8 py-10` |
| Header gap | `gap-3` (12px) | `gap-4` (16px) |

---

## 17. Animation & Transition Summary

| Element | Type | Duration | Easing | Trigger |
|---------|------|----------|--------|---------|
| Card lift | `group-hover:-translate-y-1` | 300ms | `transition-all` | Card hover |
| Highlight tag lift | `group-hover:-translate-y-1` | 300ms | default | Card hover (group) |
| Card hover bg | `group-hover:bg-*` | 300ms | `transition-all` | Card hover |
| Carousel slide | `translateX` | 300ms | `ease-out` | Swipe/dot click |
| Dot navigation | color change | 200ms | `transition-colors` | Dot click |
| Rose dot | `animate-pulse` | default | CSS animation | Always |
| Badge amber dot | `animate-pulse` | default | CSS animation | Always |
| Skeleton elements | `animate-pulse` | default | CSS animation | Always |
| CTA stripes | `translate-x-[101%] → 0` | 300ms | `ease-out` | CTA hover |

---

## 18. Design System Token Usage

| Token | Class | Used In |
|-------|-------|---------|
| `text-narrative` | Geist Sans | Title (`PricingTeaserTitle`), plan name |
| `text-interface` | Geist Mono | Price, unit, description, credit note |
| `text-signal` | Mono + uppercase | SectionBadge text, SectionCTA text |
| `rounded-shell` | 16px | Card body |
| `rounded-badge` | 6px | SectionBadge |
| `rounded-action` | 8px | SectionCTA button |
| `rounded-full` | pill | Highlight tag, carousel dots |
| `p-comfort` | 16px | Card padding (mobile) |
| `p-airy` | 24px+ | Card padding (desktop) |
| `gap-comfort` | 16px | 16-column grid gap |
| `border-1` | 1px | Card default border |
| `border-2` | 2px | Card highlighted border |
| `bg-background` | CSS var | Section background |
| `bg-brand` | CSS var | Active carousel dot |
| `focus-ring` | CSS var | SectionCTA focus state |
