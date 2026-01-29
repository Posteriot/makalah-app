# Home Page Design System

Dokumentasi visual design system untuk halaman home Makalah AI. File ini menjadi **source of truth** untuk implementasi desain di halaman lain.

---

## Daftar Isi

1. [Files Reference](#files-reference)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Layout Dimensions](#layout-dimensions)
5. [Component Patterns](#component-patterns)
6. [Background Patterns](#background-patterns)
7. [Light/Dark Mode](#lightdark-mode)
8. [Button Styles](#button-styles)
9. [Shadow & Effects](#shadow--effects)

---

## Files Reference

### Core Styling

| File | Deskripsi |
|------|-----------|
| `src/app/globals.css` | CSS variables, semua component styles; dipanggil di `src/app/layout.tsx` |
| `src/app/layout.tsx` | Font definitions (Inter, Nunito Sans, Victor Mono, JetBrains Mono); dipanggil di Next.js App Router sebagai root layout |
| `src/app/providers.tsx` | Provider app (Clerk, Theme, Convex); dipanggil di `src/app/layout.tsx` |
| `src/app/(marketing)/layout.tsx` | Layout khusus route group `(marketing)`; dipanggil di Next.js App Router |

### Home Page Components

| File | Section |
|------|---------|
| `src/app/(marketing)/page.tsx` | Main page composition; dipanggil di Next.js App Router sebagai entry route `/` |
| `src/components/layout/GlobalHeader.tsx` | Header navigation dengan scroll behavior; dipanggil di `src/app/(marketing)/layout.tsx` |
| `src/components/layout/Footer.tsx` | Luxe footer dengan 3 link groups; dipanggil di `src/app/(marketing)/layout.tsx` |
| `src/components/marketing/PawangBadge.tsx` | Hero badge "Anda Pawang, Ai Tukang"; dipanggil di `src/app/(marketing)/page.tsx` |
| `src/components/marketing/HeroHeadingSvg.tsx` | Hero heading SVG (light/dark asset switch); dipanggil di `src/app/(marketing)/page.tsx` |
| `src/components/marketing/ChatInputHeroMock.tsx` | Animated chat mockup; dipanggil di `src/app/(marketing)/page.tsx` |
| `src/components/marketing/HeroResearchMock.tsx` | Code research mockup; dipanggil di `src/app/(marketing)/page.tsx` |
| `src/components/marketing/BenefitsSection.tsx` | Bento grid "Kenapa Makalah AI?"; dipanggil di `src/app/(marketing)/page.tsx` |
| `src/components/marketing/PricingSection.tsx` | Pricing cards dengan carousel; dipanggil di `src/app/(marketing)/page.tsx` |
| `src/components/marketing/WaitlistToast.tsx` | Toast sukses waiting list (query param); dipanggil di `src/app/(marketing)/page.tsx` |

### Login Kondisional (Header)

| File | Deskripsi |
|------|-----------|
| `src/components/layout/UserDropdown.tsx` | Dropdown user saat signed-in; dipanggil di `src/components/layout/GlobalHeader.tsx` |
| `src/components/settings/UserSettingsModal.tsx` | Modal pengaturan akun; dipanggil di `src/components/layout/UserDropdown.tsx` |
| `src/components/admin/RoleBadge.tsx` | Badge role di modal akun; dipanggil di `src/components/settings/UserSettingsModal.tsx` |
| `src/components/ui/SegmentBadge.tsx` | Badge tier subscription di header; dipanggil di `src/components/layout/GlobalHeader.tsx` |

### Hook + Util

| File | Deskripsi |
|------|-----------|
| `src/lib/hooks/useCurrentUser.ts` | Query user Convex berdasarkan Clerk; dipanggil di `src/components/layout/UserDropdown.tsx` dan `src/components/settings/UserSettingsModal.tsx` |
| `src/lib/utils.ts` | Helper `cn()` untuk className; dipanggil di `src/components/layout/GlobalHeader.tsx`, `src/components/layout/UserDropdown.tsx`, `src/components/settings/UserSettingsModal.tsx`, `src/components/marketing/PricingSection.tsx`, `src/components/marketing/HeroHeadingSvg.tsx`, `src/components/marketing/ChatInputHeroMock.tsx` |

### UI Infra

| File | Deskripsi |
|------|-----------|
| `src/components/ui/sonner.tsx` | Toaster global; dipanggil di `src/app/layout.tsx` |

### Dependensi Data (Convex)

| File | Deskripsi |
|------|-----------|
| `convex/pricingPlans.ts` | Query `getActivePlans` untuk pricing; dipanggil via `api.pricingPlans.getActivePlans` di `src/components/marketing/PricingSection.tsx` |
| `convex/users.ts` | Query `getUserByClerkId` untuk status user; dipanggil via `api.users.getUserByClerkId` di `src/lib/hooks/useCurrentUser.ts` |
| `convex/_generated/api.d.ts` | Tipe `api` untuk `useQuery`; dipakai di `src/components/marketing/PricingSection.tsx` dan `src/lib/hooks/useCurrentUser.ts` |
| `convex/_generated/api.js` | Export runtime `api`; dipakai di `src/components/marketing/PricingSection.tsx` dan `src/lib/hooks/useCurrentUser.ts` |

### Aset Public

| File | Deskripsi |
|------|-----------|
| `public/logo/makalah_logo_500x500.png` | Logo header; dipanggil di `src/components/layout/GlobalHeader.tsx` |
| `public/logo/makalah_logo_white_500x500.png` | Logo footer; dipanggil di `src/components/layout/Footer.tsx` |
| `public/makalah_brand_text.svg` | Brand text (light); dipanggil di `src/components/layout/GlobalHeader.tsx` |
| `public/makalah_brand_text_dark.svg` | Brand text (dark); dipanggil di `src/components/layout/GlobalHeader.tsx` |
| `public/hero-heading-light.svg` | Hero heading light; dipanggil di `src/components/marketing/HeroHeadingSvg.tsx` |
| `public/hero-heading-dark.svg` | Hero heading dark; dipanggil di `src/components/marketing/HeroHeadingSvg.tsx` |

---

## Color Palette

### Brand Colors

```css
/* Brand Orange - Primary accent */
--brand: oklch(0.65 0.2 45);           /* ~#e86609 */
--brand-foreground: oklch(1 0 0);      /* white */
```
Sumber CSS: `src/app/globals.css:143-145`

### Deep Emerald (Login + Badge)

```css
/* Deep Emerald - Login button + badge */
.btn-green-solid {
  background-color: #006d5b;
  color: #ffffff;
}
.btn-green-solid:hover {
  background-color: #005a4b;
}
```
Sumber CSS: `src/app/globals.css:942-949`

Sumber CSS tambahan (pemakaian warna yang sama): `src/app/globals.css:1909-1915`, `src/app/globals.css:2522-2529`

Digunakan pada:
- Button "Masuk" di header (`.btn-green-solid`)
- Badge "Kenapa Makalah AI" di benefits section (`.benefits-badge`)
- Badge group "Pemakaian & Harga" di pricing (`.pricing .badge-group`)
Catatan: tombol upgrade pakai `--success` (bukan #006d5b).
Gunakan `.btn-upgrade` untuk styling standar.

### Hairline Borders

```css
/* Light mode: dark lines */
--border-hairline: rgba(0, 0, 0, 0.15);
--border-hairline-soft: rgba(0, 0, 0, 0.08);

/* Dark mode: light lines */
.dark {
  --border-hairline: rgba(255, 255, 255, 0.2);
  --border-hairline-soft: rgba(255, 255, 255, 0.08);
}
```
Sumber CSS: `src/app/globals.css:190-192` dan `src/app/globals.css:258-260`

### Segment Colors (Subscription + Role Badges)

| Label | CSS Variable | Tailwind | OKLCH |
|------|--------------|----------|-------|
| GRATIS | `--segment-gratis` | `bg-segment-gratis` | `oklch(0.55 0.15 165)` |
| BPP | `--segment-bpp` | `bg-segment-bpp` | `oklch(0.55 0.2 260)` |
| PRO | `--segment-pro` | `bg-segment-pro` | `oklch(0.65 0.18 70)` |
| ADMIN | `--segment-admin` | `bg-segment-admin` | `oklch(0.55 0.18 250)` |
| SUPERADMIN | `--segment-superadmin` | `bg-segment-superadmin` | `oklch(0.55 0.2 300)` |

Sumber CSS: `src/app/globals.css:170-177`

Catatan:
- `SegmentBadge` menampilkan GRATIS/BPP/PRO.
- Admin/Superadmin dipakai untuk badge avatar di mobile menu header.

---

## Typography

### Font Stack

```tsx
// src/app/layout.tsx
const inter = Inter({ variable: "--font-sans" })           // Body text
const nunitoSans = Nunito_Sans({ variable: "--font-heading" }) // Heading utility
const victorMono = Victor_Mono({ variable: "--font-hero" })    // Hero/nav
const jetbrainsMono = JetBrains_Mono({ variable: "--font-mono" }) // Code
```
Sumber TS: `src/app/layout.tsx:12-37`

### Usage

| Element | Font Family | Weight | Size |
|---------|-------------|--------|------|
| Body (default) | Inter (`--font-sans`) | default | default (tidak di-override di base) |
| Headings (h1–h6 default) | Inter (`--font-sans`) | 700 | mengikuti ukuran elemen/utility |
| Heading utility (`.font-heading`) | Nunito Sans (`--font-heading`) | 400/600/700 | mengikuti utility |
| Navigation (`.nav-link`) | Victor Mono (`--font-hero`) | 500 | 14px |
| Code blocks (`.code-block`) | JetBrains Mono (`--font-mono`) | 400 | 13px |
| Hero heading | SVG asset (HeroHeadingSvg) + fallback `.hero-heading` | 400 (fallback) | 2.5rem–3.5rem (fallback) |

Sumber CSS: `src/app/globals.css:299-312`, `src/app/globals.css:4490-4491`, `src/app/globals.css:484-492`, `src/app/globals.css:1507-1512`

### Hero Typography

```css
.hero-heading {
  font-family: var(--font-mono), 'Victor Mono', monospace;
  font-size: 2.5rem;
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.hero-heading--svg {
  font-size: 0;
  line-height: 0;
}

.hero-heading-svg {
  display: block;
  width: min(720px, 100%);
  height: auto;
}

@media (min-width: 768px) {
  .hero-heading {
    font-size: 3.5rem;
  }
}

@media (min-width: 1024px) {
  .hero-heading {
    font-size: 3.5rem;
  }
}

@media (max-width: 1024px) {
  .hero-heading {
    font-size: 2.625rem;
  }
}
```
Sumber CSS: `src/app/globals.css:1188-1234`

Catatan: hero heading utama dirender via `HeroHeadingSvg` (asset `public/hero-heading-*.svg`), teks aslinya `sr-only`.

---

## Layout Dimensions

### CSS Variables

```css
:root {
  --header-h: 72px;
  --footer-h: 32px;
  --sidebar-w: 220px;
  --section-padding-x: 1.5rem;
  --section-padding-y: 4rem;
  --container-max-width: 1200px;
}
```
Sumber CSS: `src/app/globals.css:182-188`

### Header

- Height: `72px` (includes 10px untuk diagonal stripes)
- Position: `fixed`, `z-index: 100`
- Max-width inner: `1200px`
- Padding horizontal: `24px`

### Container Pattern (Home)

```css
/* Header */
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Pricing */
.pricing-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Footer */
.footer-luxe .container {
  max-width: var(--container-max-width); /* 1200px */
  margin: 0 auto;
  padding: 0 24px;
}
```
Sumber CSS: `src/app/globals.css:389-396`, `src/app/globals.css:2506-2513`, `src/app/globals.css:3014-3018`

---

## Component Patterns

### Header Scroll Behavior

```tsx
// src/components/layout/GlobalHeader.tsx
const SCROLL_THRESHOLD = 100  // px before header changes state
const SCROLL_DOWN_DELTA = 8   // less sensitive to hide
const SCROLL_UP_DELTA = 2     // more sensitive to show
```
Sumber TS: `src/components/layout/GlobalHeader.tsx:31-33`

States:
- **Default**: Transparent background
- **Scrolled** (past 100px): Solid background (white/dark)
- **Hidden** (scrolling down): `translateY(-100%)`
- **Hover**: Always shows solid background

### Pricing Cards

```css
.pricing .pricing-card {
  position: relative;
  overflow: visible;  /* Untuk popular-tag overflow */
}

/* Inner wrapper - clips aurora effect */
.pricing .card-content {
  overflow: hidden;
  border-radius: 24px;
  position: relative;
  z-index: 1;
  padding: 32px;
}

/* Aurora effect via ::after pseudo-element */
.pricing .card-content::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background:
    radial-gradient(circle at 20% 100%, rgba(232, 102, 9, 0.5) 0%, transparent 70%),
    radial-gradient(circle at 80% 100%, rgba(25, 196, 156, 0.4) 0%, transparent 60%);
  filter: blur(40px);
  opacity: 0;
  transition: opacity 0.6s ease, transform 0.6s ease;
  z-index: 0;
  pointer-events: none;
}

.pricing .pricing-card:hover .card-content::after {
  opacity: 1;
  transform: translateY(-20px) scale(1.05);
}
```
Sumber CSS: `src/app/globals.css:2567-2624` dan `src/app/globals.css:2726-2743`

**Penting**: Aurora harus di-clip oleh `.card-content`, bukan `.pricing-card`, karena `.popular-tag` perlu overflow visible.

Catatan: di kode, aurora aktif saat hover; highlighted card tidak memakai aurora statis.

### Footer (Luxe Style)

```css
/* Outer wrapper */
.luxe-footer-wrapper {
  padding: 0 24px 24px;
  background-color: #000000;  /* Dark mode */
}

/* Main container */
.footer-luxe {
  background-color: #0c0c0e;
  border: 1px solid var(--border-hairline);
  border-radius: 24px;
  padding: 80px 0 40px;
}

/* Light mode */
:root .luxe-footer-wrapper {
  background-color: #f8f8f8;
}
:root .footer-luxe {
  background-color: #ffffff;
}
```
Sumber CSS: `src/app/globals.css:2982-3011` dan `src/app/globals.css:3155-3163`

---

## Background Patterns

### Diagonal Stripes

```css
/* Hero (kelas .hero-diagonal-stripes) */
background-image:
  repeating-linear-gradient(45deg,
    rgba(255, 255, 255, 0.04) 0,
    rgba(255, 255, 255, 0.04) 1px,
    transparent 1px,
    transparent 8px),
  repeating-linear-gradient(-45deg,
    rgba(255, 255, 255, 0.02) 0,
    rgba(255, 255, 255, 0.02) 1px,
    transparent 1px,
    transparent 24px);
opacity: 0.6;
mask-image: linear-gradient(to bottom,
  rgba(0, 0, 0, 1) 0%,
  rgba(0, 0, 0, 0.3) 40%,
  rgba(0, 0, 0, 0) 85%);

/* Footer (kelas .bg-diagonal-stripes) - Dark mode */
background-image: repeating-linear-gradient(
  45deg,
  rgba(255, 255, 255, 0.1) 0,
  rgba(255, 255, 255, 0.1) 1px,
  transparent 1px,
  transparent 10px
);

/* Footer (kelas .bg-diagonal-stripes) - Light mode */
background-image: repeating-linear-gradient(
  45deg,
  rgba(0, 0, 0, 0.06) 0,
  rgba(0, 0, 0, 0.06) 1px,
  transparent 1px,
  transparent 10px
);
```
Sumber CSS: `src/app/globals.css:1346-1367`, `src/app/globals.css:2998-3010`, `src/app/globals.css:3165-3172`

Digunakan pada: Hero section (hero-diagonal-stripes) dan Footer (bg-diagonal-stripes)

### Benefits Stripes (Bento)

```css
/* Dark mode */
.benefits-bg-stripes {
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.08) 0,
    rgba(255, 255, 255, 0.08) 1px,
    transparent 1px,
    transparent 10px
  );
}

/* Light mode */
:root:not(.dark) .benefits-bg-stripes,
.light .benefits-bg-stripes {
  background-image: repeating-linear-gradient(
    45deg,
    rgba(0, 0, 0, 0.07) 0,
    rgba(0, 0, 0, 0.07) 1px,
    transparent 1px,
    transparent 10px
  );
}
```
Sumber CSS: `src/app/globals.css:1838-1861`

### Dotted Grid

```css
/* Dark mode */
background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
background-size: 24px 24px;

/* Light mode */
background-image: radial-gradient(rgba(0, 0, 0, 0.12) 1px, transparent 1px);
```
Sumber CSS: `src/app/globals.css:1866-1873` dan `src/app/globals.css:2495-2502`

Digunakan pada: Benefits section, Pricing section
Catatan: kedua section menambah `mask-image` radial untuk fade-out pola.

### Thin Grid Lines

```css
/* Hero (.hero-grid-thin) */
background-image:
  linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px),
  linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px);
background-size: 48px 48px;

/* Pricing (.pricing .grid-thin) */
mask-image: linear-gradient(to bottom,
  rgba(0, 0, 0, 1) 0%,
  rgba(0, 0, 0, 0.4) 50%,
  rgba(0, 0, 0, 0) 90%);
```
Sumber CSS: `src/app/globals.css:1338-1343` dan `src/app/globals.css:2476-2488`

Digunakan pada: Hero section, Pricing section

---

## Light/Dark Mode

### Pattern CSS

Gunakan pattern berikut untuk light/dark mode support:

```css
/* Default (biasanya dark) */
.component {
  background: #0c0c0e;
  color: white;
}

/* Light mode - gunakan :root:not(.dark) atau .light */
:root:not(.dark) .component,
.light .component {
  background: #ffffff;
  color: black;
}

/* Dark mode explicit */
.dark .component {
  background: #0c0c0e;
  color: white;
}
```
Sumber CSS: contoh pola di `src/app/globals.css:1329-1336` dan `src/app/globals.css:1832-1834`

### Checklist untuk Light Mode Support

Ketika menambah section baru, pastikan:

1. [ ] Background color ada versi light
2. [ ] Text color ada versi light
3. [ ] Border/hairline colors menyesuaikan
4. [ ] Background patterns (stripes, dots) menyesuaikan opacity/color
5. [ ] Hover states menyesuaikan

---

## Button Styles

### Brand Button (Orange CTA)

```css
.btn-brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--brand-foreground);  /* white */
  background-color: var(--brand);   /* orange */
  border-radius: var(--radius);
  transition: opacity 0.2s, transform 0.2s;
}

.btn-brand:hover {
  opacity: 0.9;
}

.btn-brand:active {
  transform: scale(0.98);
}
```
Sumber CSS: `src/app/globals.css:1732-1752`

### Outline Button

```css
.btn-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--foreground);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);  /* dark mode */
  border-radius: var(--radius);
}

/* Light mode */
.light .btn-outline,
:root.light .btn-outline {
  border-color: rgba(0, 0, 0, 0.3);
}

.light .btn-outline:hover,
:root.light .btn-outline:hover {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.5);
}
```
Sumber CSS: `src/app/globals.css:1755-1789`

### Green Solid Button (Login/Masuk)

```css
.btn-green-solid {
  background-color: #006d5b;  /* Deep Emerald */
  color: #ffffff;
  /* ... same structure as btn-brand */
}

.btn-green-solid:hover {
  background-color: #005a4b;
}
```
Sumber CSS: `src/app/globals.css:942-949`

### Upgrade Button (Success)

```css
.btn-upgrade {
  background-color: var(--success);
  color: white;
}

.btn-upgrade:hover {
  background-color: oklch(0.65 0.181 125.2);
}
```
Sumber CSS: `src/app/globals.css:954-960`

### Vivid Brand Button (Highlighted Cards)

```css
.pricing .btn-brand-vivid {
  background: var(--brand);
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 20px rgba(232, 102, 9, 0.2);
}

.pricing .btn-brand-vivid:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(232, 102, 9, 0.4);
}
```
Sumber CSS: `src/app/globals.css:2706-2712`

---

## Shadow & Effects

### Hero Illustration Shadow

```css
/* Sharp shadow tanpa blur */
.hero-mockup {
  box-shadow: -25px 30px 0 rgba(0, 0, 0, 0.46);
}

/* Dark mode: glow putih subtle */
.dark .hero-mockup {
  box-shadow: -25px 30px 0 rgba(255, 255, 255, 0.08);
}
```
Sumber CSS: `src/app/globals.css:1411-1426`

Catatan:
- X offset negatif = shadow ke kiri
- Y offset positif = shadow ke bawah
- Blur = 0 untuk sharp edge
- Spread = 0

### Card Hover Aurora Effect

```css
.pricing .card-content::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background:
    radial-gradient(circle at 20% 100%, rgba(232, 102, 9, 0.5) 0%, transparent 70%),
    radial-gradient(circle at 80% 100%, rgba(25, 196, 156, 0.4) 0%, transparent 60%);
  filter: blur(40px);
  opacity: 0;
  transition: opacity 0.6s ease, transform 0.6s ease;
  z-index: 0;
  pointer-events: none;
}

.pricing .pricing-card:hover .card-content::after {
  opacity: 1;
  transform: translateY(-20px) scale(1.05);
}
```
Sumber CSS: `src/app/globals.css:2726-2743`

---

## Responsive Breakpoints

```css
/* Small mobile */
@media (max-width: 640px) { }

/* Mobile */
@media (max-width: 768px) { }

/* Tablet down */
@media (max-width: 1024px) { }

/* Tablet up */
@media (min-width: 768px) { }

/* Desktop up */
@media (min-width: 1024px) { }

/* Large desktop */
@media (min-width: 1200px) { }
```
Sumber CSS: contoh @media di `src/app/globals.css:2252-2265`, `src/app/globals.css:1534-1555`, `src/app/globals.css:1082-1100`, `src/app/globals.css:1214-1223`, `src/app/globals.css:1039-1043`

### Mobile Adjustments Checklist

1. [ ] Stack horizontal layouts vertically
2. [ ] Reduce padding (24px → 12px)
3. [ ] Reduce font sizes
4. [ ] Hide decorative elements jika perlu
5. [ ] Use carousel untuk multiple cards

---

## Home-only Overrides

Catatan: kelas di bawah didefinisikan di `src/app/globals.css`, tapi dipakai khusus halaman home.

- Hero: `.hero-section`, `.hero-vivid`, `.hero-grid-thin`, `.hero-diagonal-stripes`, `.hero-ide-line-y`, `.hero-heading--svg`, `.hero-heading-svg`
- Benefits: `.benefits-section`, `.benefits-badge`, `.benefits-bg-stripes`, `.benefits-bg-dots`
- Pricing: `section.pricing`, `.pricing-container`, `.pricing-card`, `.card-content`, `.popular-tag`, `.pricing-carousel`
- Footer (home): `.luxe-footer-wrapper`, `.footer-luxe`, `.bg-diagonal-stripes`

Sumber CSS: `src/app/globals.css:1021-1555`, `src/app/globals.css:1817-2448`, `src/app/globals.css:2440-2963`, `src/app/globals.css:2977-3230`

---

## Quick Reference: CSS Classes

### Sections
- `.hero-section` - Hero dengan aurora background
- `.benefits-section` - Bento grid section
- `section.pricing` - Pricing cards section
- `.luxe-footer-wrapper` - Footer wrapper
- `.footer-luxe` - Footer main container

### Backgrounds
- `.hero-vivid` - Aurora gradient background
- `.hero-grid-thin` - Thin grid lines
- `.hero-diagonal-stripes` - Diagonal stripes
- `.bg-dot-grid` - Dotted pattern
- `.grid-thin` - Thin grid pattern
- `.bg-diagonal-stripes` - Footer stripes

### Buttons
- `.btn-brand` - Orange CTA
- `.btn-outline` - Transparent with border
- `.btn-green-solid` - Deep Emerald (login)
- `.btn-upgrade` - Success/upgrade CTA
- `.btn-brand-vivid` - Orange solid (var(--brand))
- `.btn-disabled` - Disabled state

### Cards
- `.pricing-card` - Card container
- `.card-content` - Inner wrapper (clips aurora)
- `.popular-tag` - "Solusi Terbaik" badge

---

## Implementation Notes untuk AI Agent

Ketika mengimplementasikan page baru:

1. **Selalu cek light/dark mode** - Setiap warna harus punya versi light dan dark
2. **Gunakan CSS variables** - Utamakan variable; jika ada hardcode, ikuti nilai yang sudah dipakai di `globals.css`
3. **Pattern backgrounds** - Copy dari section yang sudah ada, sesuaikan opacity
4. **Container max-width** - Selalu gunakan `--container-max-width: 1200px`
5. **Border hairlines** - Gunakan `--border-hairline` untuk consistency
6. **Overflow handling** - Perhatikan inner wrapper pattern untuk clipping effects
7. **Responsive** - Test di mobile, tablet, desktop

### Common Mistakes to Avoid

- Aurora bleeding outside card → Gunakan inner wrapper dengan `overflow: hidden`
- Shadow tidak visible di dark mode → Tambahkan white glow untuk dark mode
- Light mode tidak matching → Selalu tambahkan `:root .class` overrides
- Scroll behavior terlalu sensitif/lambat → Gunakan asymmetric thresholds
