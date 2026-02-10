# Home Hero — Styling Extraction

Tanggal: 10 Februari 2026
Scope: Seluruh CSS/Tailwind classes dan design tokens yang terimplementasi di hero section
Source files: `src/app/(marketing)/page.tsx` (layout), `src/components/marketing/hero/*.tsx` (komponen)

---

## 1. File dan Komponen

| File | Komponen | Fungsi |
|------|----------|--------|
| `page.tsx` | `MarketingHomePage` | Hero section layout + background layers |
| `PawangBadge.tsx` | `PawangBadge` | Badge hero, delegates ke SectionBadge |
| `HeroHeading.tsx` | `HeroHeading` | H1 dengan SR text + SVG visual |
| `HeroHeadingSvg.tsx` | `HeroHeadingSvg` | Theme-aware SVG heading via next/image |
| `HeroSubheading.tsx` | `HeroSubheading` | Tagline text |
| `HeroCTA.tsx` | `HeroCTA` | Smart CTA, delegates ke SectionCTA |
| `HeroResearchMock.tsx` | `HeroResearchMock` | Mockup progress riset (back layer) |
| `ChatInputHeroMock.tsx` | `ChatInputHeroMock` | Mockup input chat (front layer) |
| `index.ts` | — | Re-export 7 komponen |

Dependensi UI:
- `SectionBadge` dari `@/components/ui/section-badge`
- `SectionCTA` dari `@/components/ui/section-cta`
- `GridPattern`, `DiagonalStripes` dari `@/components/marketing/SectionBackground`

---

## 2. Hero Section Wrapper (page.tsx)

```
relative isolate min-h-[100svh] overflow-hidden bg-background
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative isolate` | Stacking context isolation |
| Min height | `min-h-[100svh]` | Full viewport (small viewport height) |
| Overflow | `overflow-hidden` | Clip background patterns |
| Background | `bg-background` | Light: `--slate-50`, Dark: `--slate-900` |

---

## 3. Background Layers

```tsx
<GridPattern className="z-0 opacity-80" />
<DiagonalStripes className="opacity-80" />
```

| Layer | Component | Z-Index | Opacity |
|-------|-----------|---------|---------|
| Bottom | `GridPattern` | `z-0` | 80% |
| Middle | `DiagonalStripes` | (default) | 80% |
| Content | Hero container | `z-[1]` | 100% |

---

## 4. Hero Content Container (page.tsx)

```
relative z-[1] mx-auto flex min-h-[100svh] max-w-7xl items-center px-4 py-10 md:px-8 md:py-24
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative z-[1]` | Above background patterns |
| Layout | `flex items-center` | Flex, vertical center |
| Min height | `min-h-[100svh]` | Match section height |
| Max width | `max-w-7xl` | 1280px |
| Centering | `mx-auto` | Horizontal center |
| Padding-x | `px-4 md:px-8` | 16px mobile, 32px desktop |
| Padding-y | `py-10 md:py-24` | 40px mobile, 96px desktop |

---

## 5. Hero Grid (page.tsx)

```
grid grid-cols-1 gap-comfort lg:grid-cols-16 lg:gap-16
```

| Property | Mobile | Desktop (lg+) |
|----------|--------|---------------|
| Grid | `grid-cols-1` | `grid-cols-16` (16-column system) |
| Gap | `gap-comfort` (16px) | `gap-16` (64px) |

### Hero Left (Text Content)
```
flex flex-col items-start text-left justify-center lg:col-span-7 lg:justify-start
```

| Property | Class | Value |
|----------|-------|-------|
| Grid span | `lg:col-span-7` | 7 of 16 columns |
| Layout | `flex flex-col items-start` | Vertical, left-aligned |
| Alignment | `justify-center lg:justify-start` | Center mobile, top desktop |
| Text | `text-left` | Left-aligned |

### Hero Right (Mockup Container)
```
hidden lg:flex lg:col-span-9 lg:items-center lg:justify-end
```

| Property | Class | Value |
|----------|-------|-------|
| Visibility | `hidden lg:flex` | Hidden below lg breakpoint |
| Grid span | `lg:col-span-9` | 9 of 16 columns |
| Layout | `lg:items-center lg:justify-end` | Center, right-aligned |

### Mockup Inner Container
```
relative h-[480px] w-full max-w-[560px]
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative` | For absolute-positioned mockups |
| Height | `h-[480px]` | Fixed 480px |
| Width | `w-full max-w-[560px]` | Full up to 560px |

---

## 6. PawangBadge

Delegates ke `SectionBadge` component. Badge sendiri nggak punya styling custom, hanya `className="mb-4"`.

### SectionBadge Styling (dari section-badge.tsx)

**Outer container:**
```
inline-flex w-fit items-center gap-2 rounded-badge px-2.5 py-1
bg-[color:var(--emerald-600)] text-[color:var(--slate-50)]
group transition-colors duration-300 hover:bg-[color:var(--emerald-900)]
```

| Property | Class/Token | Value |
|----------|-------------|-------|
| Layout | `inline-flex items-center gap-2` | Inline, 8px gap |
| Radius | `rounded-badge` | 6px (`--radius-s-md`) |
| Padding | `px-2.5 py-1` | 10px horizontal, 4px vertical |
| Background | `bg-[color:var(--emerald-600)]` | oklch(0.596 0.145 163.225) |
| Text | `text-[color:var(--slate-50)]` | oklch(0.984 0 0) |
| Hover bg | `hover:bg-[color:var(--emerald-900)]` | Darker emerald |
| Transition | `transition-colors duration-300` | 300ms |

**Animated dot:**
```
h-2 w-2 rounded-full bg-[color:var(--amber-500)] shadow-[0_0_6px_var(--amber-500)] animate-pulse
```

| Property | Class/Token | Value |
|----------|-------------|-------|
| Size | `h-2 w-2` | 8px circle |
| Shape | `rounded-full` | Circular |
| Color | `bg-[color:var(--amber-500)]` | oklch(0.769 0.188 70.08) |
| Glow | `shadow-[0_0_6px_var(--amber-500)]` | Amber glow 6px |
| Animation | `animate-pulse` | Pulse (opacity cycle) |

**Badge text:**
```
text-signal text-[10px] font-bold
group-hover:text-[color:var(--slate-100)]
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-signal` | Geist Mono + uppercase + tracking 0.1em |
| Size | `text-[10px]` | 10px |
| Weight | `font-bold` | 700 |
| Hover text | `group-hover:text-[color:var(--slate-100)]` | Lighter on hover |

---

## 7. HeroHeading

```
text-[0px] mt-4 leading-[0] w-full
```

| Property | Class | Value |
|----------|-------|-------|
| Font size | `text-[0px]` | 0px (hide text layout, SR text via `sr-only` span) |
| Line height | `leading-[0]` | 0 (collapse vertical space) |
| Margin | `mt-4` | 16px top |
| Width | `w-full` | 100% |

### SR text
```
sr-only
```
Screen reader only (visually hidden, accessible).

---

## 8. HeroHeadingSvg

### Container
```
block w-full max-w-[520px] h-auto
```

| Property | Class | Value |
|----------|-------|-------|
| Display | `block` | Block element |
| Width | `w-full max-w-[520px]` | Full, max 520px |
| Height | `h-auto` | Auto aspect ratio |
| Accessibility | `aria-hidden="true"` | Hidden from AT (SR text handles it) |

### Images (520x246, priority)

| Mode | File | Visibility Classes |
|------|------|--------------------|
| Dark mode | `heading-light-color.svg` | `hidden dark:block w-full h-auto object-contain` |
| Light mode | `heading-dark-color.svg` | `block dark:hidden w-full h-auto object-contain` |

Both: `priority` flag enabled (LCP optimization).

---

## 9. HeroSubheading

```
text-narrative text-base md:text-2xl font-normal text-slate-600 dark:text-slate-200 max-w-[520px] mt-4 mb-0
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-narrative` | Geist Sans |
| Size | `text-base md:text-2xl` | 16px mobile, 24px desktop |
| Weight | `font-normal` | 400 |
| Color (light) | `text-slate-600` | oklch(0.446 0 0) |
| Color (dark) | `dark:text-slate-200` | oklch(0.929 0 0) |
| Max width | `max-w-[520px]` | 520px (matches heading) |
| Margin | `mt-4 mb-0` | 16px top, 0 bottom |

---

## 10. HeroCTA

### Wrapper Container
```
flex justify-center lg:justify-start w-full mt-4
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `flex w-full` | Full-width flex |
| Alignment | `justify-center lg:justify-start` | Centered mobile, left desktop |
| Margin | `mt-4` | 16px top |

### SectionCTA Styling (dari section-cta.tsx)

**Button:**
```
group relative overflow-hidden
inline-flex items-center justify-center gap-2 rounded-action px-2 py-1
text-signal text-xs font-medium uppercase tracking-widest
border border-transparent bg-[color:var(--slate-800)] text-[color:var(--slate-100)]
hover:text-[color:var(--slate-800)] hover:border-[color:var(--slate-600)]
dark:bg-[color:var(--slate-100)] dark:text-[color:var(--slate-800)]
dark:hover:text-[color:var(--slate-100)] dark:hover:border-[color:var(--slate-400)]
transition-colors focus-ring
whitespace-nowrap
```

| Property | Class | Value |
|----------|-------|-------|
| Animation group | `group relative overflow-hidden` | For stripes overlay |
| Radius | `rounded-action` | 4px (`--radius-sm`) |
| Padding | `px-2 py-1` | 8px horizontal, 4px vertical |
| Font | `text-signal text-xs font-medium uppercase tracking-widest` | Geist Mono, 12px, 500, caps |
| Light bg | `bg-[color:var(--slate-800)]` | oklch(0.279) |
| Light text | `text-[color:var(--slate-100)]` | oklch(0.968) |
| Light hover text | `hover:text-[color:var(--slate-800)]` | Flip dark |
| Light hover border | `hover:border-[color:var(--slate-600)]` | oklch(0.446) |
| Dark bg | `dark:bg-[color:var(--slate-100)]` | oklch(0.968) |
| Dark text | `dark:text-[color:var(--slate-800)]` | oklch(0.279) |
| Dark hover text | `dark:hover:text-[color:var(--slate-100)]` | Flip light |
| Dark hover border | `dark:hover:border-[color:var(--slate-400)]` | oklch(0.704) |
| Focus | `focus-ring` | Sky-500 ring |
| Loading | `pointer-events-none opacity-70` | Disabled look |
| `aria-busy` | Active during loading | Accessibility |

**Stripes overlay:**
```
btn-stripes-pattern absolute inset-0 pointer-events-none
translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0
```

---

## 11. HeroResearchMock (Back Layer)

### Card Container
```
hidden md:block absolute w-full transition-all duration-300
bg-stone-800 border-stone-500
border-[2px] rounded-md
dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.2)]
shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.3)]
z-10 top-1/2 -translate-y-1/2 scale-[0.88] -translate-x-[60px]
```

| Property | Class | Value |
|----------|-------|-------|
| Visibility | `hidden md:block` | Hidden mobile, block md+ |
| Position | `absolute z-10` | Back layer |
| Transform | `top-1/2 -translate-y-1/2 scale-[0.88] -translate-x-[60px]` | Centered, scaled down, shifted left |
| Background | `bg-stone-800` | Permanent dark theme |
| Border | `border-[2px] border-stone-500` | 2px solid stone-500 |
| Radius | `rounded-md` | 6px |
| Shadow (light app) | `shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.3)]` | Stone-700 30% sharp diagonal |
| Shadow (dark app) | `dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.2)]` | Stone-400 20% sharp diagonal |
| Transition | `transition-all duration-300` | 300ms |

### Browser Header
```
flex items-center gap-4 p-3 rounded-t-md border-b-[0.5px] border-stone-700 bg-stone-600
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `flex items-center gap-4 p-3` | 16px gap, 12px padding |
| Background | `bg-stone-600` | Header bar |
| Border bottom | `border-b-[0.5px] border-stone-700` | Hairline separator |
| Radius | `rounded-t-md` | Top corners only |

### Traffic Lights
```
flex gap-1.5 px-1
```
Dots: `w-2 h-2 rounded-full` with `bg-rose-500`, `bg-amber-500`, `bg-emerald-500`.

### URL Bar
```
font-mono text-[9px] font-medium px-3 py-1 rounded-none border-[0.5px] tracking-widest
bg-stone-800 text-stone-100 border-stone-600
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `font-mono text-[9px] font-medium` | Mono, 9px, 500 |
| Tracking | `tracking-widest` | Maximum letter spacing |
| Background | `bg-stone-800` | Dark terminal |
| Radius | `rounded-none` | 0px (sharp) |
| Border | `border-[0.5px] border-stone-600` | Hairline |

### Progress Section

**Progress label:**
```
font-mono text-sm font-bold uppercase tracking-[0.3em] text-amber-500 mb-2
```

**Progress title:**
```
font-mono text-base font-normal tracking-wider truncate mb-4 text-stone-100
```

**Progress bar:**
```
h-1.5 border-[0.5px] border-stone-700 bg-stone-900 rounded-none overflow-hidden
```
Fill: `h-full bg-emerald-500 transition-all duration-500 ease-out` (width via inline style).

**Progress counter:**
```
font-mono text-xs text-right mt-2 uppercase tracking-[0.25em] text-stone-400
```

### Timeline Dots

| State | Dot Classes |
|-------|------------|
| Completed | `bg-emerald-400 border-emerald-400` |
| Current | `bg-amber-400 border-amber-400` |
| Pending | `bg-transparent border-stone-700` |

All dots: `w-2 h-2 rounded-full border-[1px] flex-shrink-0 z-[1] transition-colors duration-300`.

### Timeline Connecting Line

| State | Line Color |
|-------|-----------|
| Completed | `bg-emerald-500/40` |
| Other | `bg-stone-700` |

Line: `w-px flex-1 min-h-[32px] transition-colors`.

### Timeline Labels

| State | Text Classes |
|-------|-------------|
| Current | `text-stone-50 font-medium` |
| Pending | `text-stone-500` |
| Completed | `text-stone-400` |

All: `font-mono text-sm tracking-wider transition-colors`.

### Timeline Status Labels

| State | Status Text | Classes |
|-------|------------|---------|
| Completed | "SELESAI" | `text-emerald-400/70` |
| Current | "IN PROGRESS" | `text-amber-500` |

All: `font-mono text-xs font-bold mt-1 uppercase tracking-[0.2em] transition-colors`.

### Dashed Separators
```
absolute left-6 right-0 bottom-0 border-b-[0.5px] border-dashed border-stone-700/30
```

### More Stages Indicator
```
font-mono text-sm font-bold text-center pt-4 pb-2 mt-2 uppercase tracking-[0.3em] text-stone-500
```

---

## 12. ChatInputHeroMock (Front Layer)

### Card Container
```
hidden md:block absolute w-full max-w-[440px] transition-all duration-300
bg-stone-200 border-stone-300
border-[1px] rounded-md
dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.2)]
shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.3)]
z-20 top-1/2 right-0 -translate-y-1/2
```

| Property | Class | Value |
|----------|-------|-------|
| Visibility | `hidden md:block` | Hidden mobile, block md+ |
| Position | `absolute z-20` | Front layer |
| Transform | `top-1/2 right-0 -translate-y-1/2` | Centered, right-aligned |
| Max width | `max-w-[440px]` | 440px |
| Background | `bg-stone-200` | Light stone shell |
| Border | `border-[1px] border-stone-300` | 1px stone-300 |
| Radius | `rounded-md` | 6px |
| Shadow | Same as HeroResearchMock | Sharp diagonal bottom-left |

### Browser Header
```
flex items-center gap-4 p-3 rounded-t-md border-b-[0.5px] border-stone-600 bg-stone-500
```

| Property | Class | Value |
|----------|-------|-------|
| Background | `bg-stone-500` | Header bar (lighter than research mock) |
| Border bottom | `border-b-[0.5px] border-stone-600` | Hairline |

Traffic lights: same as HeroResearchMock.

### Content Area
```
relative min-h-[120px] flex flex-col justify-start p-6 pr-[60px]
```

| Property | Class | Value |
|----------|-------|-------|
| Min height | `min-h-[120px]` | 120px |
| Padding | `p-6 pr-[60px]` | 24px all, 60px right (space for send button) |

### Placeholder Text
```
absolute top-6 left-6 font-mono text-xs flex items-center transition-all tracking-wider text-stone-500
```

**Animated dots:**
```
opacity-30 animate-pulse
opacity-30 animate-pulse delay-150
opacity-30 animate-pulse delay-300
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute top-6 left-6` | Positioned within content |
| Font | `font-mono text-xs tracking-wider` | Mono, 12px |
| Color | `text-stone-500` | Muted |
| Dots | `animate-pulse` | Staggered: 0ms, 150ms, 300ms delay |
| Visibility | `opacity-100` / `opacity-0` | Toggle with showPlaceholder state |

### Typewriter Text
```
absolute top-6 left-6 right-[60px] font-mono text-xs whitespace-pre-wrap leading-relaxed transition-all tracking-widest text-stone-950
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute top-6 left-6 right-[60px]` | Constrained by send button |
| Font | `font-mono text-xs tracking-widest` | Mono, 12px, widest tracking |
| Color | `text-stone-950` | Near-black on light bg |
| Wrap | `whitespace-pre-wrap leading-relaxed` | Preserve whitespace, relaxed line height |

### Typing Cursor (Caret)
```
inline-block w-1.5 h-[1.1em] ml-1 translate-y-0.5 bg-stone-950
```

| Property | Class | Value |
|----------|-------|-------|
| Size | `w-1.5 h-[1.1em]` | 6px wide, 1.1em tall |
| Color | `bg-stone-950` | Near-black |
| Offset | `ml-1 translate-y-0.5` | 4px left margin, slight vertical shift |
| Hold phase | `animate-pulse` (conditional) | Blinks during hold phase |

### Send Button
```
absolute bottom-4 right-4 w-9 h-9 border-[1px] transition-all duration-200
flex items-center justify-center rounded-none
```

| State | Classes |
|-------|---------|
| Default | `bg-stone-500 border-stone-600 text-stone-100` |
| Hovered | `bg-stone-700 border-stone-600 text-stone-100 shadow-lg shadow-stone-800/20 scale-105` |
| Clicked | `bg-stone-800 border-stone-700 text-stone-500 scale-95 translate-y-0.5` |

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute bottom-4 right-4` | Bottom-right corner |
| Size | `w-9 h-9` | 36px square |
| Radius | `rounded-none` | 0px (sharp, radius contrast) |
| Icon | `Send` from iconoir-react | `w-4.5 h-4.5` (18px, animated) / `w-4 h-4` (16px, static) |

### Mouse Cursor (Mechanical Stylus)
```
absolute w-5 h-5 pointer-events-none z-50 transition-all duration-800
```

| State | Position |
|-------|----------|
| Start | `bottom-[60px] right-[80px]` |
| At target | `bottom-6 right-6` |

| Property | Class | Value |
|----------|-------|-------|
| Size | `w-5 h-5` | 20px |
| Color | `text-stone-950` | Near-black |
| Z-index | `z-50` | Above everything |
| Transition | `transition-all duration-800` | 800ms movement |
| Click state | `scale-90 opacity-80` | Shrink + dim |
| Visibility | `opacity-100` / `opacity-0` | Toggle with cursorVisible state |

SVG path: `M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z` (standard pointer cursor).

---

## 13. Reduced Motion Fallback (ChatInputHeroMock)

When `prefers-reduced-motion: reduce` is active, static version is rendered:

- Same card container styling as animated version.
- Placeholder: "Ketik obrolan..." (static text, no animation).
- Send button: default state only (no hover/click simulation).
- Send button size in static: `border-[0.5px]` (thinner) + `w-4 h-4` icon (smaller).
- No cursor, no typewriter, no phase cycling.

---

## 14. Custom CSS Classes (dari globals.css)

### Design Token Utilities yang Dipakai

| Class | Definition | Value |
|-------|-----------|-------|
| `text-narrative` | `font-family: var(--font-sans)` | Geist Sans |
| `text-signal` | `font-family: var(--font-mono); uppercase; letter-spacing: 0.1em` | Geist Mono + caps |
| `rounded-action` | `border-radius: var(--radius-sm)` | 4px |
| `rounded-badge` | `border-radius: var(--radius-s-md)` | 6px |
| `gap-comfort` | `gap: 1rem` | 16px |
| `focus-ring` | `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }` | Sky-500 ring |
| `btn-stripes-pattern` | Diagonal stripes overlay | Light: slate-100 bg + slate-400 stripes, Dark: slate-800 bg + slate-500 stripes |

### Animations

| Animation | Element | Behavior |
|-----------|---------|----------|
| `animate-pulse` | PawangBadge dot, placeholder dots, typing caret (hold phase) | CSS pulse (opacity cycle) |
| Staggered pulse | Placeholder dots | `delay-150`, `delay-300` classes |
| `btn-stripes-pattern` slide | SectionCTA | `translate-x-[101%]` to `translate-x-0` on hover, 300ms |

---

## 15. CSS Variables Resolved Values (Hero Context)

| Variable | Light Mode | Dark Mode |
|----------|-----------|-----------|
| `--background` | `--slate-50` = oklch(0.984 0 0) | `--slate-900` = oklch(0.208 0 0) |
| `--foreground` | `--neutral-950` | `--neutral-50` |
| `--emerald-600` | oklch(0.596 0.145 163.225) | same |
| `--emerald-900` | (darker emerald) | same |
| `--amber-500` | oklch(0.769 0.188 70.08) | same |
| `--slate-50` | oklch(0.984 0 0) | same |
| `--slate-100` | oklch(0.968 0 0) | same |
| `--slate-400` | oklch(0.704 0 0) | same |
| `--slate-600` | oklch(0.446 0 0) | same |
| `--slate-800` | oklch(0.279 0 0) | same |
| `--ring` | `--sky-500-a50` | same |

---

## 16. Iconography

| Icon | Source | Component | Size |
|------|--------|-----------|------|
| `Send` | `iconoir-react` | ChatInputHeroMock | Animated: `w-4.5 h-4.5` (18px), Static: `w-4 h-4` (16px) |
| SVG cursor | Inline SVG path | ChatInputHeroMock | `w-5 h-5` (20px) |

---

## 17. Perbedaan Styling: Mobile vs Desktop

| Aspek | Mobile | Desktop (lg+) |
|-------|--------|---------------|
| Grid | `grid-cols-1` | `grid-cols-16` |
| Grid gap | `gap-comfort` (16px) | `gap-16` (64px) |
| Text column | Full width | `col-span-7` |
| Mockup column | Hidden | `col-span-9` (`hidden lg:flex`) |
| Padding-x | `px-4` (16px) | `md:px-8` (32px) |
| Padding-y | `py-10` (40px) | `md:py-24` (96px) |
| CTA alignment | `justify-center` | `lg:justify-start` |
| Subheading size | `text-base` (16px) | `md:text-2xl` (24px) |
| Mockups | Hidden (`hidden md:block`) | Visible with layered positioning |

---

## 18. Perbandingan: HeroResearchMock vs ChatInputHeroMock

| Aspek | HeroResearchMock (Back) | ChatInputHeroMock (Front) |
|-------|------------------------|--------------------------|
| Z-index | `z-10` | `z-20` |
| Background | `bg-stone-800` (dark) | `bg-stone-200` (light) |
| Border | `border-[2px] border-stone-500` | `border-[1px] border-stone-300` |
| Header bg | `bg-stone-600` | `bg-stone-500` |
| Shadow | Identical sharp diagonal | Identical sharp diagonal |
| Radius | `rounded-md` | `rounded-md` |
| Scale | `scale-[0.88]` (smaller) | Default (1.0) |
| Position | `-translate-x-[60px]` (left offset) | `right-0` (flush right) |
| Max width | Full (`w-full`) | `max-w-[440px]` |
| Content | Timeline + progress bar | Typewriter + send button |
| Has URL bar | Yes | No |
| Interactivity | None (static) | Animated (typewriter cycle) |
