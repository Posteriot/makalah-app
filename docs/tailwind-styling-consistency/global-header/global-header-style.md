# Global Header — Styling Extraction

Tanggal: 10 Februari 2026
Scope: Seluruh CSS/Tailwind classes dan design tokens yang terimplementasi di `src/components/layout/header/`
Source files: `GlobalHeader.tsx`, `UserDropdown.tsx`, `SegmentBadge.tsx` (dependensi)

---

## 1. File dan Komponen

| File | Komponen | Fungsi |
|------|----------|--------|
| `GlobalHeader.tsx` | `GlobalHeader` | Header utama: logo, nav desktop, theme toggle, auth state, mobile menu |
| `UserDropdown.tsx` | `UserDropdown` | Dropdown user desktop: trigger button, menu items, sign out |
| `SegmentBadge.tsx` | `SegmentBadge` | Badge tier subscription (GRATIS/BPP/PRO) |
| `index.ts` | — | Re-export `GlobalHeader`, `UserDropdown` |

---

## 2. Header Container (`<header>`)

```
fixed top-0 left-0 right-0 z-drawer h-[54px] bg-[var(--header-background)]
flex items-center transition-transform duration-200
```

| Property | Class/Token | Resolved Value |
|----------|-------------|----------------|
| Position | `fixed top-0 left-0 right-0` | Fixed full-width di atas viewport |
| Z-index | `z-drawer` | `50` (custom utility di globals.css) |
| Height | `h-[54px]` | 54px fixed |
| Background | `bg-[var(--header-background)]` | Light: `--slate-100` (oklch 0.968), Dark: `--slate-900` (oklch 0.208) |
| Layout | `flex items-center` | Flex horizontal, vertical center |
| Transition | `transition-transform duration-200` | Transform 200ms (untuk hide/show on scroll) |
| Hidden state | `-translate-y-full` (conditional) | Geser ke atas saat scroll down |

---

## 3. Inner Container (16-Column Grid)

```
mx-auto grid w-full max-w-7xl grid-cols-16 items-center gap-4 px-4 py-3 lg:px-8
```

| Property | Class | Value |
|----------|-------|-------|
| Centering | `mx-auto` | Horizontal center |
| Grid | `grid grid-cols-16` | 16-column system (Mechanical Grace) |
| Width | `w-full max-w-7xl` | Full width, max 1280px |
| Alignment | `items-center` | Vertical center |
| Gap | `gap-4` | 16px (1rem) |
| Padding-x | `px-4 lg:px-8` | 16px default, 32px on lg+ |
| Padding-y | `py-3` | 12px |

---

## 4. Header Left — Logo & Brand

### Container
```
col-span-8 md:col-span-4 flex items-center gap-dense flex-nowrap
```

| Property | Class | Value |
|----------|-------|-------|
| Grid span | `col-span-8 md:col-span-4` | 8 col mobile, 4 col desktop |
| Layout | `flex items-center flex-nowrap` | Flex, vertical center, no wrap |
| Gap | `gap-dense` | 8px (custom utility) |

### Logo Link
```
flex items-center gap-3 shrink-0
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `flex items-center` | Flex, center |
| Gap | `gap-3` | 12px |
| Shrink | `shrink-0` | Prevent shrink |

### Logo Icon (24x24)
```
h-6 w-6 rounded-[4px]
hidden dark:block    (light logo, for dark mode)
block dark:hidden    (dark logo, for light mode)
```

| Property | Class | Value |
|----------|-------|-------|
| Size | `h-6 w-6` | 24x24px |
| Radius | `rounded-[4px]` | 4px (NOTE: bukan `rounded-action`, hardcoded) |
| Theme switch | `hidden dark:block` / `block dark:hidden` | Light/dark logo swap |

### Brand Text (wordmark)
```
h-[18px] w-auto
hidden dark:block    (white text, for dark mode)
block dark:hidden    (black text, for light mode)
```

| Property | Class | Value |
|----------|-------|-------|
| Height | `h-[18px]` | 18px fixed |
| Width | `w-auto` | Auto based on aspect ratio |
| Theme switch | `hidden dark:block` / `block dark:hidden` | Light/dark wordmark swap |

---

## 5. SegmentBadge (Subscription Tier)

Dirender di header left, setelah logo. Hanya muncul saat `SignedIn`.

### Badge Container (dari `SegmentBadge.tsx`)
```
inline-flex items-center px-2 py-0.5 rounded-badge
text-signal text-[10px] font-bold
```

| Property | Class/Token | Value |
|----------|-------------|-------|
| Layout | `inline-flex items-center` | Inline flex, center |
| Padding | `px-2 py-0.5` | 8px horizontal, 2px vertical |
| Radius | `rounded-badge` | 6px (`--radius-s-md`) |
| Font | `text-signal` | Geist Mono + uppercase + `letter-spacing: 0.1em` |
| Size | `text-[10px]` | 10px |
| Weight | `font-bold` | 700 |

### Tier Colors (CSS Variables)

| Tier | Class | Background Token | Resolved OKLCH |
|------|-------|------------------|----------------|
| GRATIS | `bg-segment-gratis text-white` | `--segment-gratis` = `--emerald-600` | oklch(0.596 0.145 163.225) |
| BPP | `bg-segment-bpp text-white` | `--segment-bpp` = `--sky-600` | oklch(0.588 0.158 241.966) |
| PRO | `bg-segment-pro text-black` | `--segment-pro` = `--amber-500` | oklch(0.769 0.188 70.08) |

### Loading State (dalam GlobalHeader)
```
animate-spin text-muted-foreground
```
Icon: `RefreshDouble` (`icon-interface` = 16x16)

---

## 6. Header Right — Nav, Theme, Auth

### Container
```
col-span-8 md:col-span-12 flex items-center justify-end gap-comfort
```

| Property | Class | Value |
|----------|-------|-------|
| Grid span | `col-span-8 md:col-span-12` | 8 col mobile, 12 col desktop |
| Layout | `flex items-center justify-end` | Flex, center, right-align |
| Gap | `gap-comfort` | 16px (custom utility) |

---

## 7. Desktop Navigation

### Nav Container
```
hidden md:flex items-center gap-4
```

| Property | Class | Value |
|----------|-------|-------|
| Visibility | `hidden md:flex` | Hidden mobile, flex desktop |
| Alignment | `items-center` | Vertical center |
| Gap | `gap-4` | 16px |

### Nav Link (normal state)
```
relative px-2.5 py-1.5 text-narrative text-xs uppercase
text-foreground transition-colors hover:text-muted-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative` | For pseudo-element underline |
| Padding | `px-2.5 py-1.5` | 10px horizontal, 6px vertical |
| Font | `text-narrative` | Geist Sans |
| Size | `text-xs` | 12px |
| Case | `uppercase` | All caps |
| Color (diam) | `text-foreground` | Light: neutral-950, Dark: neutral-50 |
| Color (hover) | `hover:text-muted-foreground` | Dimmed |
| Transition | `transition-colors` | Color transition |

### Nav Link — Underline (pseudo-element)
```
after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-1
after:border-b after:border-dotted after:border-current
after:scale-x-0 after:origin-left after:transition-transform
hover:after:scale-x-100
```

| Property | Class | Value |
|----------|-------|-------|
| Type | `after:border-b after:border-dotted` | Dotted bottom border |
| Color | `after:border-current` | Inherits text color |
| Position | `after:absolute after:left-2 after:right-2 after:bottom-1` | 8px inset sides, 4px from bottom |
| Default | `after:scale-x-0 after:origin-left` | Hidden, animate from left |
| Hover | `hover:after:scale-x-100` | Scale to full width |
| Transition | `after:transition-transform` | Smooth scale |

### Nav Link — Active State
```
text-muted-foreground after:scale-x-100
```
Active = dimmed text + underline visible permanently.

---

## 8. Theme Toggle Button

Dua varian: Mobile (left of hamburger) dan Desktop (setelah nav). Pola styling identik, perbedaan di size.

### Mobile Theme Toggle
```
group relative overflow-hidden
md:hidden inline-flex h-6 w-6 items-center justify-center rounded-action mr-2
border border-transparent bg-slate-800 text-slate-100
hover:text-slate-800 hover:border-slate-600
dark:bg-slate-100 dark:text-slate-800
dark:hover:text-slate-100 dark:hover:border-slate-400
transition-colors focus-ring
```

### Desktop Theme Toggle
```
group relative overflow-hidden
hidden md:inline-flex h-7.5 w-7.5 items-center justify-center rounded-action
border border-transparent bg-slate-800 text-slate-100
hover:text-slate-800 hover:border-slate-600
dark:bg-slate-100 dark:text-slate-800
dark:hover:text-slate-100 dark:hover:border-slate-400
transition-colors focus-ring
```

| Property | Mobile | Desktop |
|----------|--------|---------|
| Visibility | `md:hidden` | `hidden md:inline-flex` |
| Size | `h-6 w-6` (24px) | `h-7.5 w-7.5` (30px) |
| Margin | `mr-2` | none |
| Radius | `rounded-action` | `rounded-action` |
| Light bg | `bg-slate-800` | `bg-slate-800` |
| Light text | `text-slate-100` | `text-slate-100` |
| Light hover text | `hover:text-slate-800` | `hover:text-slate-800` |
| Light hover border | `hover:border-slate-600` | `hover:border-slate-600` |
| Dark bg | `dark:bg-slate-100` | `dark:bg-slate-100` |
| Dark text | `dark:text-slate-800` | `dark:text-slate-800` |
| Dark hover text | `dark:hover:text-slate-100` | `dark:hover:text-slate-100` |
| Dark hover border | `dark:hover:border-slate-400` | `dark:hover:border-slate-400` |
| Focus | `focus-ring` | `focus-ring` |
| Animation group | `group relative overflow-hidden` | `group relative overflow-hidden` |

### Diagonal Stripes Overlay (Theme Toggle)
```
btn-stripes-pattern absolute inset-0 pointer-events-none
translate-x-[101%] transition-transform duration-300 ease-out
group-hover:translate-x-0
```

| Property | Class/Token | Value |
|----------|-------------|-------|
| Pattern class | `btn-stripes-pattern` | Custom CSS (globals.css) |
| Light mode | bg: `--slate-100`, stripes: `--slate-400` 1px every 6px at 45deg |
| Dark mode | bg: `--slate-800`, stripes: `--slate-500` 1px every 6px at 45deg |
| Default | `translate-x-[101%]` | Hidden off-screen right |
| Hover | `group-hover:translate-x-0` | Slide in from right |
| Transition | `transition-transform duration-300 ease-out` | 300ms slide |
| Pointer | `pointer-events-none` | Non-interactive overlay |

### Theme Icons (Mobile)
```
relative z-10 h-3.5 w-3.5
```
- Dark mode: `SunLight` (14px)
- Light mode: `HalfMoon` (14px)

### Theme Icons (Desktop)
```
relative z-10 icon-interface block dark:hidden   (SunLight)
relative z-10 icon-interface hidden dark:block   (HalfMoon)
```
- `icon-interface` = 16x16

---

## 9. Mobile Menu Toggle (Hamburger/Close)

```
md:hidden inline-flex h-9 w-9 items-center justify-center
text-foreground transition-opacity hover:opacity-70
```

| Property | Class | Value |
|----------|-------|-------|
| Visibility | `md:hidden` | Mobile only |
| Size | `h-9 w-9` | 36px container |
| Layout | `inline-flex items-center justify-center` | Centered |
| Color | `text-foreground` | Inherit theme foreground |
| Hover | `hover:opacity-70` | Opacity fade |
| Transition | `transition-opacity` | Smooth opacity |
| Icons | `icon-interface` (16x16) | `Menu` or `Xmark` |

---

## 10. Desktop "Masuk" Button (SignedOut)

```
hidden md:inline-flex items-center justify-center gap-2
rounded-action border-main border-slate-950 bg-slate-950 px-2 py-1
text-xs font-medium text-narrative uppercase text-slate-50
transition-colors hover:bg-slate-900
dark:border-slate-50 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200
focus-ring
```

| Property | Class | Value |
|----------|-------|-------|
| Visibility | `hidden md:inline-flex` | Desktop only |
| Layout | `items-center justify-center gap-2` | Centered, 8px gap |
| Radius | `rounded-action` | 4px |
| Border | `border-main border-slate-950` | 1px solid slate-950 |
| Background | `bg-slate-950` | oklch(0.129) |
| Padding | `px-2 py-1` | 8px horizontal, 4px vertical |
| Font | `text-narrative text-xs uppercase font-medium` | Geist Sans, 12px, caps, 500 |
| Text color | `text-slate-50` | Near-white |
| Hover | `hover:bg-slate-900` | Slightly lighter |
| Dark bg | `dark:bg-slate-50` | Near-white |
| Dark text | `dark:text-slate-950` | Near-black |
| Dark border | `dark:border-slate-50` | Near-white |
| Dark hover | `dark:hover:bg-slate-200` | Slightly darker |
| Focus | `focus-ring` | `outline: 2px solid var(--ring)`, offset 2px. `--ring` = `--sky-500-a50` |

---

## 11. UserDropdown — Trigger Button (Desktop)

```
group relative overflow-hidden
flex items-center justify-center gap-2 rounded-action px-2 py-1
text-sm font-medium text-narrative
border border-transparent bg-[color:var(--slate-800)] text-[color:var(--slate-100)]
hover:text-[color:var(--slate-800)] hover:border-[color:var(--slate-600)]
aria-expanded:text-[color:var(--slate-800)] aria-expanded:border-[color:var(--slate-600)]
dark:bg-[color:var(--slate-100)] dark:text-[color:var(--slate-800)]
dark:hover:text-[color:var(--slate-100)] dark:hover:border-[color:var(--slate-400)]
dark:aria-expanded:text-[color:var(--slate-100)] dark:aria-expanded:border-[color:var(--slate-400)]
transition-colors focus-ring
```

| Property | Class | Value |
|----------|-------|-------|
| Radius | `rounded-action` | 4px |
| Padding | `px-2 py-1` | 8px horizontal, 4px vertical |
| Font | `text-sm font-medium text-narrative` | Geist Sans, 14px, 500 |
| Light bg | `bg-[color:var(--slate-800)]` | oklch(0.279) |
| Light text | `text-[color:var(--slate-100)]` | oklch(0.968) |
| Light hover/expanded text | `hover:text-[color:var(--slate-800)]` | Flip to dark |
| Light hover/expanded border | `hover:border-[color:var(--slate-600)]` | oklch(0.446) |
| Dark bg | `dark:bg-[color:var(--slate-100)]` | oklch(0.968) |
| Dark text | `dark:text-[color:var(--slate-800)]` | oklch(0.279) |
| Dark hover/expanded text | `dark:hover:text-[color:var(--slate-100)]` | Flip to light |
| Dark hover/expanded border | `dark:hover:border-[color:var(--slate-400)]` | oklch(0.704) |
| Focus | `focus-ring` | Sky-500 ring |
| `aria-expanded` | Same as hover | Maintains hover appearance when dropdown open |

### User Name in Trigger
```
relative z-10 hidden sm:block text-sm font-medium text-narrative max-w-[120px] truncate
```

| Property | Class | Value |
|----------|-------|-------|
| Visibility | `hidden sm:block` | Hidden on smallest screens |
| Max width | `max-w-[120px]` | 120px truncation |
| Overflow | `truncate` | Ellipsis |

### Chevron Icon
```
relative z-10 icon-interface transition-transform duration-200
rotate-180 (when open)
```

### Stripes Overlay (UserDropdown Trigger)
```
btn-stripes-pattern absolute inset-0 pointer-events-none
translate-x-[101%] transition-transform duration-300 ease-out
group-hover:translate-x-0 group-aria-expanded:translate-x-0
```
Sama dengan theme toggle, PLUS `group-aria-expanded:translate-x-0` (tetap visible saat dropdown open).

---

## 12. UserDropdown — Menu Panel

```
absolute right-0 top-full mt-2 w-48
rounded-md border border-border bg-popover shadow-md z-drawer py-2 px-2
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute right-0 top-full mt-2` | Below trigger, right-aligned, 8px gap |
| Width | `w-48` | 192px |
| Radius | `rounded-md` | 6px (NOTE: bukan `rounded-action` atau `rounded-badge`) |
| Border | `border border-border` | 1px, theme border color |
| Background | `bg-popover` | Popover background token |
| Shadow | `shadow-md` | Medium box-shadow |
| Z-index | `z-drawer` | 50 |
| Padding | `py-2 px-2` | 8px all |

### Menu Item (Link: Atur Akun, Subskripsi, Admin Panel)
```
flex items-center gap-dense p-dense text-sm font-medium text-narrative
text-foreground dark:text-slate-50
hover:bg-slate-900 hover:text-slate-50
dark:hover:bg-slate-100 dark:hover:text-slate-900
transition-colors w-full rounded-action
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `flex items-center` | Horizontal, center |
| Gap | `gap-dense` | 8px |
| Padding | `p-dense` | 8px all |
| Font | `text-sm font-medium text-narrative` | Geist Sans, 14px, 500 |
| Text (diam) | `text-foreground dark:text-slate-50` | Theme foreground |
| Hover bg | `hover:bg-slate-900 dark:hover:bg-slate-100` | Full inversion |
| Hover text | `hover:text-slate-50 dark:hover:text-slate-900` | Full inversion |
| Radius | `rounded-action` | 4px |
| Icons | `icon-interface` (16px) | `User`, `CreditCard`, `Settings` |

### Sign Out Button (Desktop)
```
w-full flex items-center gap-dense p-dense text-sm font-medium text-narrative
transition-colors rounded-action
```

State normal:
```
text-rose-400 hover:bg-rose-900 hover:text-rose-50
```

State disabled (signing out):
```
text-muted-foreground cursor-not-allowed
```

| Property | Normal | Disabled |
|----------|--------|----------|
| Text | `text-rose-400` | `text-muted-foreground` |
| Hover bg | `hover:bg-rose-900` | — |
| Hover text | `hover:text-rose-50` | — |
| Cursor | default | `cursor-not-allowed` |
| Icon | `LogOut` (icon-interface 16px) | `RefreshDouble` (icon-interface 16px) + `animate-spin` |

---

## 13. Mobile Menu Panel

### Container
```
absolute top-full left-0 right-0 md:hidden flex flex-col
bg-background border-b border-hairline p-4
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `absolute top-full left-0 right-0` | Full width below header |
| Visibility | `md:hidden` | Mobile only |
| Layout | `flex flex-col` | Vertical stack |
| Background | `bg-background` | Theme background (light: slate-50, dark: slate-900) |
| Border | `border-b border-hairline` | Bottom 0.5px, `var(--border-hairline)` |
| Padding | `p-4` | 16px |

### Mobile Nav Link
```
block px-3 py-2 text-narrative text-[11px] uppercase tracking-wider rounded-action
text-foreground hover:bg-accent transition-colors
```

| Property | Class | Value |
|----------|-------|-------|
| Display | `block` | Full-width block |
| Padding | `px-3 py-2` | 12px horizontal, 8px vertical |
| Font | `text-narrative text-[11px] uppercase tracking-wider` | Geist Sans, 11px, caps, wide tracking |
| Color (diam) | `text-foreground` | Theme foreground |
| Hover | `hover:bg-accent` | Accent background |
| Active | `text-muted-foreground` | Dimmed |
| Radius | `rounded-action` | 4px |

### Mobile "Masuk" Button (SignedOut)
```
mt-2 inline-flex items-center justify-center
rounded-action border-main border-border px-3 py-2
text-signal text-[11px] font-bold uppercase tracking-widest
text-foreground hover:bg-accent transition-colors
```

| Property | Class | Value |
|----------|-------|-------|
| Margin | `mt-2` | 8px top |
| Radius | `rounded-action` | 4px |
| Border | `border-main border-border` | 1px, theme border |
| Padding | `px-3 py-2` | 12px horizontal, 8px vertical |
| Font | `text-signal text-[11px] font-bold uppercase tracking-widest` | Geist Mono, 11px, bold, caps, widest tracking |
| Color | `text-foreground` | Theme foreground |
| Hover | `hover:bg-accent` | Accent background |

---

## 14. Mobile Auth Section (SignedIn, Accordion)

### Outer Container
```
mt-3 rounded-shell border-hairline bg-slate-100 dark:bg-slate-900 p-3
```

| Property | Class | Value |
|----------|-------|-------|
| Margin | `mt-3` | 12px top |
| Radius | `rounded-shell` | 16px (`--radius-xl`) |
| Border | `border-hairline` | 0.5px, `var(--border-hairline)` |
| Background | `bg-slate-100 dark:bg-slate-900` | Light: oklch(0.968), Dark: oklch(0.208) |
| Padding | `p-3` | 12px |

### Accordion Item
```
border-none
```
No accordion border.

### Accordion Trigger (user row)
```
p-0 hover:no-underline
```

### User Row (inside trigger)
```
flex items-center gap-3 w-full text-left px-2 py-2 rounded-action
hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `flex items-center gap-3 w-full text-left` | Horizontal, center, full width |
| Padding | `px-2 py-2` | 8px all |
| Radius | `rounded-action` | 4px |
| Hover | `hover:bg-slate-200 dark:hover:bg-slate-800` | Subtle highlight |

### Avatar Circle (Mobile)
```
h-7 w-7 rounded-action flex items-center justify-center text-[12px] font-semibold
+ segmentConfig.className
```

| Property | Class | Value |
|----------|-------|-------|
| Size | `h-7 w-7` | 28px |
| Radius | `rounded-action` | 4px (NOTE: square-ish avatar, not circular) |
| Font | `text-[12px] font-semibold` | 12px, 600 |
| Color | Per tier | `bg-segment-gratis/bpp/pro text-white` (PRO: `text-black`) |

### User Name (Mobile)
```
text-narrative text-[11px] font-medium text-foreground flex-1
```

### Accordion Content
```
pt-2 pl-2
```

### Mobile Menu Items (Atur Akun, Subskripsi, Admin Panel)
```
w-full flex items-center gap-3 px-2 py-2 text-[11px] text-narrative
text-foreground rounded-action hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `w-full flex items-center gap-3` | Full-width, 12px gap |
| Padding | `px-2 py-2` | 8px all |
| Font | `text-narrative text-[11px]` | Geist Sans, 11px |
| Color | `text-foreground` | Theme foreground |
| Hover | `hover:bg-slate-200 dark:hover:bg-slate-800` | Subtle highlight |
| Radius | `rounded-action` | 4px |
| Icons | `icon-interface` (16px) | `User`, `CreditCard`, `Settings` |

### Mobile Sign Out Button
```
w-full flex items-center gap-3 px-2 py-2 text-[11px] text-narrative rounded-action transition-colors
```

State normal:
```
text-rose-500 hover:bg-rose-500/10
```

State disabled:
```
text-muted-foreground cursor-not-allowed
```

| Property | Normal | Disabled |
|----------|--------|----------|
| Text | `text-rose-500` | `text-muted-foreground` |
| Hover bg | `hover:bg-rose-500/10` | — |
| Cursor | default | `cursor-not-allowed` |
| Icon | `LogOut` (icon-interface) | `RefreshDouble` (icon-interface) + `animate-spin` |

---

## 15. Custom CSS Classes (dari globals.css)

### Design Token Utilities

| Class | Definition | Value |
|-------|-----------|-------|
| `text-narrative` | `font-family: var(--font-sans)` | Geist Sans |
| `text-interface` | `font-family: var(--font-mono)` | Geist Mono |
| `text-signal` | `font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.1em` | Mono + caps + wide tracking |
| `rounded-shell` | `border-radius: var(--radius-xl)` | 16px |
| `rounded-action` | `border-radius: var(--radius-sm)` | 4px |
| `rounded-badge` | `border-radius: var(--radius-s-md)` | 6px |
| `border-hairline` | `border-width: 0.5px; border-color: var(--border-hairline)` | 0.5px, light: rgba(0,0,0,0.15), dark: rgba(255,255,255,0.2) |
| `border-main` | `border-width: 1px` | 1px (color set separately) |
| `p-comfort` | `padding: 1rem` | 16px |
| `p-dense` | `padding: 0.5rem` | 8px |
| `gap-comfort` | `gap: 1rem` | 16px |
| `gap-dense` | `gap: 0.5rem` | 8px |
| `z-drawer` | `z-index: 50` | 50 |
| `focus-ring` | `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }` | `--ring` = `--sky-500-a50` |

### Icon Scale Utilities

| Class | Width/Height |
|-------|-------------|
| `icon-micro` | 12px |
| `icon-interface` | 16px |
| `icon-display` | 24px |

### btn-stripes-pattern (Diagonal Stripes)

Light mode:
```css
background-color: var(--slate-100);
background-image: repeating-linear-gradient(
  45deg, var(--slate-400) 0, var(--slate-400) 1px,
  transparent 1px, transparent 6px
);
```

Dark mode:
```css
background-color: var(--slate-800);
background-image: repeating-linear-gradient(
  45deg, var(--slate-500) 0, var(--slate-500) 1px,
  transparent 1px, transparent 6px
);
```

---

## 16. CSS Variables Resolved Values (Header Context)

| Variable | Light Mode | Dark Mode |
|----------|-----------|-----------|
| `--header-background` | `--slate-100` = oklch(0.968 0 0) | `--slate-900` = oklch(0.208 0 0) |
| `--background` | `--slate-50` = oklch(0.984 0 0) | `--slate-900` = oklch(0.208 0 0) |
| `--foreground` | `--neutral-950` | `--neutral-50` |
| `--border-hairline` | rgba(0, 0, 0, 0.15) | rgba(255, 255, 255, 0.2) |
| `--ring` | `--sky-500-a50` | `--sky-500-a50` |
| `--segment-gratis` | `--emerald-600` = oklch(0.596 0.145 163.225) | same |
| `--segment-bpp` | `--sky-600` = oklch(0.588 0.158 241.966) | same |
| `--segment-pro` | `--amber-500` = oklch(0.769 0.188 70.08) | same |

### Slate Scale (OKLCH, dipakai langsung di header)

| Token | OKLCH |
|-------|-------|
| `--slate-50` | oklch(0.984 0 0) |
| `--slate-100` | oklch(0.968 0 0) |
| `--slate-200` | oklch(0.929 0 0) |
| `--slate-400` | oklch(0.704 0 0) |
| `--slate-600` | oklch(0.446 0 0) |
| `--slate-800` | oklch(0.279 0 0) |
| `--slate-900` | oklch(0.208 0 0) |
| `--slate-950` | oklch(0.129 0 0) |

---

## 17. Iconography

Semua icon dari `iconoir-react`. Stroke default 1.5px (Iconoir default).

| Icon | Komponen | Lokasi | Size Class |
|------|----------|--------|-----------|
| `Menu` | GlobalHeader | Mobile hamburger | `icon-interface` (16px) |
| `Xmark` | GlobalHeader | Mobile close | `icon-interface` (16px) |
| `SunLight` | GlobalHeader | Theme toggle (dark mode) | Mobile: `h-3.5 w-3.5` (14px), Desktop: `icon-interface` (16px) |
| `HalfMoon` | GlobalHeader | Theme toggle (light mode) | Mobile: `h-3.5 w-3.5` (14px), Desktop: `icon-interface` (16px) |
| `User` | GlobalHeader, UserDropdown | Atur Akun link | `icon-interface` (16px) |
| `CreditCard` | GlobalHeader, UserDropdown | Subskripsi link | `icon-interface` (16px) |
| `Settings` | GlobalHeader, UserDropdown | Admin Panel link | `icon-interface` (16px) |
| `LogOut` | GlobalHeader, UserDropdown | Sign out | `icon-interface` (16px) |
| `RefreshDouble` | GlobalHeader, UserDropdown | Loading spinner | `icon-interface` (16px) + `animate-spin` |
| `NavArrowDown` | UserDropdown | Chevron dropdown | `icon-interface` (16px) |

---

## 18. Perbedaan Styling: Desktop vs Mobile

| Aspek | Desktop | Mobile |
|-------|---------|--------|
| Nav links | `text-xs uppercase` + dotted underline pseudo | `text-[11px] uppercase tracking-wider` + block layout |
| Theme toggle size | `h-7.5 w-7.5` (30px) | `h-6 w-6` (24px) |
| Theme icon size | `icon-interface` (16px) | `h-3.5 w-3.5` (14px) |
| "Masuk" button | Dark fill (`bg-slate-950`) + `text-narrative` | Outline (`border-main border-border`) + `text-signal` |
| Auth (signed in) | `UserDropdown` component | Accordion dalam mobile menu panel |
| Sign out color | `text-rose-400` + `hover:bg-rose-900` | `text-rose-500` + `hover:bg-rose-500/10` |
| Menu items font | `text-sm` (14px) | `text-[11px]` (11px) |
| Menu items gap | `gap-dense` (8px) | `gap-3` (12px) |
| Menu items hover | `hover:bg-slate-900` (full inversion) | `hover:bg-slate-200` (subtle) |
| Avatar | Not shown in trigger (name + chevron only) | `h-7 w-7 rounded-action` with tier color |
| User section bg | `bg-popover` dropdown | `bg-slate-100 dark:bg-slate-900` card |

---

## 19. Perbedaan Styling: UserDropdown Trigger vs Theme Toggle vs "Masuk" Button

Ketiga elemen ini pakai pattern "inverted button" tapi dengan variasi:

| Aspek | Theme Toggle | UserDropdown Trigger | "Masuk" Button |
|-------|-------------|---------------------|----------------|
| Color approach | Tailwind classes (`bg-slate-800`) | CSS vars (`bg-[color:var(--slate-800)]`) | Tailwind classes (`bg-slate-950`) |
| Light bg | `slate-800` | `--slate-800` | `slate-950` (darker) |
| Dark bg | `slate-100` | `--slate-100` | `slate-50` |
| Light border hover | `slate-600` | `--slate-600` | — (no hover border) |
| Dark border hover | `slate-400` | `--slate-400` | — |
| `aria-expanded` | none | Yes (mirrors hover) | N/A |
| Stripes | Yes | Yes + `group-aria-expanded` | No |
| Font | — (icon only) | `text-sm font-medium text-narrative` | `text-xs font-medium text-narrative uppercase` |
| Content | Icon only | Name + chevron | "Masuk" text |

---

## 20. Scroll Behavior Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `SCROLL_THRESHOLD` | 100px | Scroll position before header auto-hide activates |
| `SCROLL_DOWN_DELTA` | 8px | Min scroll-down to trigger hide (less sensitive) |
| `SCROLL_UP_DELTA` | 2px | Min scroll-up to trigger show (more sensitive) |

Behavior: Asymmetric — showing header is 4x more sensitive than hiding it.
