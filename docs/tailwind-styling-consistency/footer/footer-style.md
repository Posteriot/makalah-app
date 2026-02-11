# Footer — Styling Extraction

Tanggal: 10 Februari 2026
Scope: Seluruh CSS/Tailwind classes dan design tokens yang terimplementasi di `src/components/layout/footer/`
Source files: `Footer.tsx`

---

## 1. File dan Komponen

| File | Komponen | Fungsi |
|------|----------|--------|
| `Footer.tsx` | `Footer` | Footer global: logo, 3 link groups, hairline separator, copyright, social icons |
| `index.ts` | — | Re-export `Footer` |

Dependensi eksternal:
- `DiagonalStripes` dari `@/components/marketing/SectionBackground`

---

## 2. Wrapper Luar (`<div id="footer">`)

```
bg-background text-foreground
```

| Property | Class/Token | Resolved Value |
|----------|-------------|----------------|
| Background | `bg-background` | Light: `--slate-50` (oklch 0.984), Dark: `--slate-900` (oklch 0.208) |
| Text color | `text-foreground` | Light: `--neutral-950`, Dark: `--neutral-50` |
| ID | `id="footer"` | Anchor target |

---

## 3. Footer Element (`<footer>`)

```
relative overflow-hidden bg-[color:var(--footer-background)]
```

| Property | Class/Token | Resolved Value |
|----------|-------------|----------------|
| Position | `relative` | For z-stacking above pattern |
| Overflow | `overflow-hidden` | Clip diagonal stripes pattern |
| Background | `bg-[color:var(--footer-background)]` | Light: `--slate-50` (oklch 0.984), Dark: `--slate-900` (oklch 0.208) |

---

## 4. Background Pattern

```tsx
<DiagonalStripes className="opacity-40" />
```

| Property | Class | Value |
|----------|-------|-------|
| Component | `DiagonalStripes` | React component (bukan CSS class) |
| Import | `@/components/marketing/SectionBackground` | Shared marketing pattern |
| Opacity | `opacity-40` | 40% opacity |

---

## 5. Content Container

```
relative z-[1] mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8
```

| Property | Class | Value |
|----------|-------|-------|
| Position | `relative z-[1]` | Above background pattern |
| Centering | `mx-auto` | Horizontal center |
| Max width | `max-w-7xl` | 1280px (matches header) |
| Padding-x | `px-4 md:px-8` | 16px mobile, 32px desktop |
| Padding-y | `py-6 md:py-8` | 24px mobile, 32px desktop |

---

## 6. Main Grid (Brand + Links)

```
mb-10 grid grid-cols-16 gap-comfort text-center md:mb-16
```

| Property | Class | Value |
|----------|-------|-------|
| Grid | `grid grid-cols-16` | 16-column system (Mechanical Grace) |
| Gap | `gap-comfort` | 16px (custom utility) |
| Text align | `text-center` | Centered (mobile default) |
| Margin bottom | `mb-10 md:mb-16` | 40px mobile, 64px desktop |

---

## 7. Brand Area (Logo)

### Container
```
col-span-16 flex items-center justify-center md:col-span-4 md:items-start md:justify-start
```

| Property | Class | Value |
|----------|-------|-------|
| Grid span | `col-span-16 md:col-span-4` | Full-width mobile, 4 col desktop |
| Layout | `flex items-center justify-center` | Centered mobile |
| Desktop | `md:items-start md:justify-start` | Left-aligned desktop |

### Logo Images (32x32)
```
hidden dark:block    (light logo, for dark mode)
block dark:hidden    (dark logo, for light mode)
```

| Property | Light Mode | Dark Mode |
|----------|-----------|-----------|
| File | `makalah_logo_dark.svg` | `makalah_logo_light.svg` |
| Visibility | `block dark:hidden` | `hidden dark:block` |
| Size | 32x32 (via Image width/height props) | 32x32 |

---

## 8. Links Area

### Container
```
col-span-16 grid grid-cols-1 justify-items-center gap-comfort
md:col-span-7 md:col-start-10 md:grid-cols-3 md:items-start md:justify-items-center
```

| Property | Mobile | Desktop |
|----------|--------|---------|
| Grid span | `col-span-16` (full width) | `col-span-7 col-start-10` (7 col, start col 10) |
| Sub-grid | `grid-cols-1` (single column) | `grid-cols-3` (3 columns) |
| Alignment | `justify-items-center` | `items-start justify-items-center` |
| Gap | `gap-comfort` (16px) | `gap-comfort` (16px) |

### Link Category Container
```
text-center md:text-left
```

| Property | Mobile | Desktop |
|----------|--------|---------|
| Text align | `text-center` | `text-left` |

### Category Heading (`<h4>`)
```
text-narrative mb-3 text-[14px] font-medium text-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-narrative` | Geist Sans |
| Size | `text-[14px]` | 14px |
| Weight | `font-medium` | 500 |
| Color | `text-foreground` | Theme foreground |
| Margin | `mb-3` | 12px bottom |

### Category Link (`<Link>`)
```
text-narrative mb-3 block text-[14px] font-medium text-muted-foreground
transition-colors duration-300 hover:text-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Display | `block` | Full-width block |
| Font | `text-narrative` | Geist Sans |
| Size | `text-[14px]` | 14px |
| Weight | `font-medium` | 500 |
| Color (diam) | `text-muted-foreground` | Muted theme color |
| Color (hover) | `hover:text-foreground` | Full theme foreground |
| Transition | `transition-colors duration-300` | 300ms color |
| Margin | `mb-3` | 12px bottom |

---

## 9. Hairline Separator

```
h-[0.5px] w-full bg-[color:var(--border-hairline)]
```

| Property | Class/Token | Resolved Value |
|----------|-------------|----------------|
| Height | `h-[0.5px]` | 0.5px (hairline) |
| Width | `w-full` | 100% |
| Color | `bg-[color:var(--border-hairline)]` | Light: rgba(0,0,0,0.15), Dark: rgba(255,255,255,0.2) |

Implementasi: `<div>` element, bukan CSS border. Konsisten dengan Mechanical Grace `border-hairline` concept tapi tanpa pakai utility class.

---

## 10. Bottom Section (Copyright + Socials)

### Container
```
flex flex-col items-center gap-6 pt-6 text-center
md:flex-row md:justify-between md:text-left
```

| Property | Mobile | Desktop |
|----------|--------|---------|
| Direction | `flex-col` (vertical) | `flex-row` (horizontal) |
| Alignment | `items-center text-center` | `justify-between text-left` |
| Gap | `gap-6` (24px) | `gap-6` (24px) |
| Padding | `pt-6` (24px top) | `pt-6` (24px top) |

### Copyright Text (`<p>`)
```
text-interface m-0 text-[12px] text-muted-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Font | `text-interface` | Geist Mono |
| Size | `text-[12px]` | 12px |
| Color | `text-muted-foreground` | Muted theme color |
| Margin | `m-0` | Zero margin |

### Social Links Container
```
flex justify-center gap-6
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `flex justify-center` | Centered flex |
| Gap | `gap-6` | 24px |

### Social Link (`<a>`)
```
flex items-center justify-center text-muted-foreground
transition-colors duration-300 hover:text-foreground
```

| Property | Class | Value |
|----------|-------|-------|
| Layout | `flex items-center justify-center` | Centered |
| Color (diam) | `text-muted-foreground` | Muted theme color |
| Color (hover) | `hover:text-foreground` | Full foreground |
| Transition | `transition-colors duration-300` | 300ms color |
| Target | `target="_blank" rel="noopener noreferrer"` | New tab, secure |

### Social Icon
```
icon-interface
```

| Property | Class | Value |
|----------|-------|-------|
| Size | `icon-interface` | 16px (custom utility) |

---

## 11. Custom CSS Classes (dari globals.css)

### Design Token Utilities yang Dipakai

| Class | Definition | Value |
|-------|-----------|-------|
| `text-narrative` | `font-family: var(--font-sans)` | Geist Sans |
| `text-interface` | `font-family: var(--font-mono)` | Geist Mono |
| `gap-comfort` | `gap: 1rem` | 16px |
| `icon-interface` | `width: 16px; height: 16px` | 16x16 |

### CSS Variables yang Dipakai

| Variable | Light Mode | Dark Mode |
|----------|-----------|-----------|
| `--footer-background` | `--slate-50` = oklch(0.984 0 0) | `--slate-900` = oklch(0.208 0 0) |
| `--background` | `--slate-50` = oklch(0.984 0 0) | `--slate-900` = oklch(0.208 0 0) |
| `--foreground` | `--neutral-950` | `--neutral-50` |
| `--muted-foreground` | (theme dependent) | (theme dependent) |
| `--border-hairline` | rgba(0, 0, 0, 0.15) | rgba(255, 255, 255, 0.2) |

---

## 12. Iconography

Semua icon dari `iconoir-react`. Stroke default 1.5px (Iconoir default).

| Icon | Import Name | Label | Size Class |
|------|------------|-------|-----------|
| X (Twitter) | `X as XIcon` | "X" | `icon-interface` (16px) |
| LinkedIn | `Linkedin` | "LinkedIn" | `icon-interface` (16px) |
| Instagram | `Instagram` | "Instagram" | `icon-interface` (16px) |

Catatan: Semua social links masih placeholder (`href: "#"`).

---

## 13. Perbedaan Styling: Mobile vs Desktop

| Aspek | Mobile | Desktop |
|-------|--------|---------|
| Brand alignment | `justify-center` (centered) | `justify-start` (left) |
| Brand grid span | `col-span-16` (full) | `col-span-4` |
| Links grid span | `col-span-16` (full) | `col-span-7 col-start-10` |
| Links sub-grid | `grid-cols-1` (stacked) | `grid-cols-3` (3 columns) |
| Text alignment | `text-center` | `text-left` |
| Bottom layout | `flex-col items-center` | `flex-row justify-between` |
| Main grid margin | `mb-10` (40px) | `md:mb-16` (64px) |
| Container padding-x | `px-4` (16px) | `md:px-8` (32px) |
| Container padding-y | `py-6` (24px) | `md:py-8` (32px) |

---

## 14. Perbandingan: Footer vs Header Styling Pattern

| Aspek | Footer | Header |
|-------|--------|--------|
| Position | Static (in-flow) | `fixed top-0` |
| Z-index | None (content `z-[1]`) | `z-drawer` (50) |
| Background | `--footer-background` | `--header-background` |
| Max width | `max-w-7xl` | `max-w-7xl` (sama) |
| Grid | `grid-cols-16` | `grid-cols-16` (sama) |
| Pattern | `DiagonalStripes opacity-40` | None |
| Separator | `h-[0.5px] bg-[color:var(--border-hairline)]` | None |
| Interactive states | Hover only (links) | Hover, focus, aria-expanded, scroll hide |
| Stripes animation | None (static background) | `btn-stripes-pattern` on buttons |
| Typography heading | `text-narrative text-[14px]` | `text-narrative text-xs uppercase` |
| Typography body | `text-interface text-[12px]` | `text-narrative text-sm` |
| Icon library | Iconoir | Iconoir (sama) |
| Icon size | `icon-interface` (16px) | `icon-interface` (16px, sama) |
| Transition duration | `duration-300` | `duration-200` (header), `duration-300` (stripes) |
