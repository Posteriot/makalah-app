# Background Components Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert CSS background effects dari `globals.css` menjadi reusable React components dengan Tailwind-first approach.

**Architecture:**
- `background/` - shared utilities (TintOverlay)
- `PageBackground/` - page-level effects (Aurora, Vignette)
- `SectionBackground/` - section-level patterns (Grid, Stripes, Dots, Fade)

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Next.js 16

---

## Task 1: Create TintOverlay Component (Shared) - DONE ✅

**Files:**
- Create: `src/components/marketing/background/TintOverlay.tsx`
- Create: `src/components/marketing/background/index.ts`

**Step 1: Create TintOverlay.tsx**

```tsx
// src/components/marketing/background/TintOverlay.tsx
"use client"

import { cn } from "@/lib/utils"

interface TintOverlayProps {
  /** Intensity of the tint (0-100) */
  intensity?: number
  /** Additional className */
  className?: string
}

/**
 * TintOverlay - Dark/Light mode tint control
 *
 * Provides a semi-transparent overlay that adapts to theme.
 * Dark mode: darkens with black overlay
 * Light mode: lightens with white overlay
 */
export function TintOverlay({ intensity = 20, className }: TintOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none",
        "bg-black dark:bg-black",
        "light:bg-white",
        className
      )}
      style={{ opacity: intensity / 100 }}
      aria-hidden="true"
    />
  )
}
```

**Step 2: Create index.ts barrel export**

```ts
// src/components/marketing/background/index.ts
export { TintOverlay } from "./TintOverlay"
```

**Step 3: Verify file structure**

Run: `ls -la src/components/marketing/background/`
Expected: `TintOverlay.tsx` and `index.ts` exist

**Step 4: Commit**

```bash
git add src/components/marketing/background/
git commit -m "feat(background): add TintOverlay shared component"
```

---

## Task 2: Create AuroraBackground Component - DONE ✅

**Files:**
- Create: `src/components/marketing/PageBackground/AuroraBackground.tsx`

**Step 1: Create AuroraBackground.tsx**

```tsx
// src/components/marketing/PageBackground/AuroraBackground.tsx
"use client"

import { cn } from "@/lib/utils"

interface AuroraBackgroundProps {
  /** Additional className for the container */
  className?: string
}

/**
 * AuroraBackground - Multi-color radial gradient background
 *
 * Creates 4 layered radial gradients with blur effect.
 * Adapts intensity for dark/light mode.
 *
 * Layer order: z-index -2 (behind everything)
 */
export function AuroraBackground({ className }: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        "absolute pointer-events-none",
        "-inset-[10%]", // Extend beyond container for blur bleed
        "[z-index:-2]",
        className
      )}
      style={{
        background: `
          radial-gradient(800px 700px at 80% 18%, rgba(232, 102, 9, 0.6) 0%, rgba(232, 102, 9, 0.6) 35%, transparent 60%),
          radial-gradient(700px 600px at 14% 14%, rgba(115, 185, 4, 0.5) 0%, rgba(115, 185, 4, 0.5) 30%, transparent 58%),
          radial-gradient(720px 550px at 20% 78%, rgba(25, 196, 156, 0.45) 0%, rgba(25, 196, 156, 0.45) 28%, transparent 56%),
          radial-gradient(650px 520px at 86% 82%, rgba(154, 131, 18, 0.55) 0%, rgba(154, 131, 18, 0.55) 25%, transparent 54%)
        `.trim().replace(/\s+/g, ' '),
      }}
      aria-hidden="true"
    >
      {/* Dark mode: intense blur */}
      <div
        className={cn(
          "absolute inset-0",
          "dark:opacity-100 dark:[filter:blur(60px)_saturate(2.0)_brightness(1.4)]",
          "opacity-50 [filter:blur(80px)_saturate(1.2)_brightness(1.1)]"
        )}
        style={{
          background: 'inherit',
          backgroundAttachment: 'inherit'
        }}
      />
    </div>
  )
}
```

**Step 2: Verify file exists**

Run: `ls src/components/marketing/PageBackground/`
Expected: `AuroraBackground.tsx` exists

---

## Task 3: Create VignetteOverlay Component - DONE ✅

**Files:**
- Create: `src/components/marketing/PageBackground/VignetteOverlay.tsx`

**Step 1: Create VignetteOverlay.tsx**

```tsx
// src/components/marketing/PageBackground/VignetteOverlay.tsx
"use client"

import { cn } from "@/lib/utils"

interface VignetteOverlayProps {
  /** Additional className */
  className?: string
}

/**
 * VignetteOverlay - Edge darkening effect
 *
 * Creates radial gradient that darkens edges.
 * Lighter in light mode, stronger in dark mode.
 *
 * Layer order: z-index -1 (above aurora, below content)
 */
export function VignetteOverlay({ className }: VignetteOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none",
        "[z-index:-1]",
        // Dark mode: stronger vignette
        "dark:[background:radial-gradient(circle_at_50%_40%,rgba(0,0,0,0.15)_20%,rgba(0,0,0,0.35)_55%,rgba(0,0,0,0.55)_100%)]",
        // Light mode: subtle vignette
        "[background:radial-gradient(circle_at_50%_40%,transparent_30%,rgba(0,0,0,0.05)_60%,rgba(0,0,0,0.12)_100%)]",
        className
      )}
      aria-hidden="true"
    />
  )
}
```

**Step 2: Verify file exists**

Run: `ls src/components/marketing/PageBackground/`
Expected: `AuroraBackground.tsx` and `VignetteOverlay.tsx` exist

---

## Task 4: Create PageBackground index.ts - DONE ✅

**Files:**
- Create: `src/components/marketing/PageBackground/index.ts`

**Step 1: Create index.ts barrel export**

```ts
// src/components/marketing/PageBackground/index.ts
/**
 * PageBackground Components
 *
 * Page-level background effects untuk marketing pages.
 * Gunakan bersama untuk layered background effect.
 *
 * Layer order (bottom to top):
 * 1. AuroraBackground (z-index: -2)
 * 2. VignetteOverlay (z-index: -1)
 * 3. TintOverlay from background/ (optional, z-index: 0)
 */

export { AuroraBackground } from "./AuroraBackground"
export { VignetteOverlay } from "./VignetteOverlay"
```

**Step 2: Commit PageBackground components**

```bash
git add src/components/marketing/PageBackground/
git commit -m "feat(PageBackground): add Aurora and Vignette components"
```

---

## Task 5: Create GridPattern Component - DONE ✅

**Files:**
- Create: `src/components/marketing/SectionBackground/GridPattern.tsx`

**Step 1: Create GridPattern.tsx**

```tsx
// src/components/marketing/SectionBackground/GridPattern.tsx
"use client"

import { cn } from "@/lib/utils"

interface GridPatternProps {
  /** Grid cell size in pixels */
  size?: number
  /** Line color (supports Tailwind arbitrary values) */
  color?: string
  /** Additional className */
  className?: string
}

/**
 * GridPattern - Research grid overlay
 *
 * Creates a subtle grid pattern overlay.
 * Default: 48px cells with slate-400 lines at 15% opacity.
 */
export function GridPattern({
  size = 48,
  color = "rgba(148, 163, 184, 0.15)",
  className
}: GridPatternProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none",
        className
      )}
      style={{
        backgroundImage: `
          linear-gradient(${color} 1px, transparent 1px),
          linear-gradient(90deg, ${color} 1px, transparent 1px)
        `.trim(),
        backgroundSize: `${size}px ${size}px`,
      }}
      aria-hidden="true"
    />
  )
}
```

**Step 2: Verify file exists**

Run: `ls src/components/marketing/SectionBackground/`
Expected: `GridPattern.tsx` exists

---

## Task 6: Create DiagonalStripes Component - DONE ✅

**Files:**
- Create: `src/components/marketing/SectionBackground/DiagonalStripes.tsx`

**Step 1: Create DiagonalStripes.tsx**

```tsx
// src/components/marketing/SectionBackground/DiagonalStripes.tsx
"use client"

import { cn } from "@/lib/utils"

interface DiagonalStripesProps {
  /** Stripe width in pixels */
  stripeWidth?: number
  /** Gap between stripes in pixels */
  gap?: number
  /** Angle in degrees */
  angle?: number
  /** Enable fade mask from top to bottom */
  withFadeMask?: boolean
  /** Additional className */
  className?: string
}

/**
 * DiagonalStripes - 45° repeating stripe pattern
 *
 * Dark mode: white stripes
 * Light mode: dark stripes
 * Optional fade mask from top to bottom.
 */
export function DiagonalStripes({
  stripeWidth = 1,
  gap = 8,
  angle = 45,
  withFadeMask = true,
  className
}: DiagonalStripesProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none z-0",
        // Dark mode: white stripes
        "dark:[background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.12)_0,rgba(255,255,255,0.12)_1px,transparent_1px,transparent_8px)]",
        // Light mode: dark stripes
        "[background-image:repeating-linear-gradient(45deg,rgba(0,0,0,0.10)_0,rgba(0,0,0,0.10)_1px,transparent_1px,transparent_8px)]",
        className
      )}
      style={{
        backgroundImage: undefined, // Let className handle it
        ...(withFadeMask && {
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 90%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 90%)",
        }),
      }}
      aria-hidden="true"
    />
  )
}
```

**Step 2: Verify file exists**

Run: `ls src/components/marketing/SectionBackground/`
Expected: `GridPattern.tsx` and `DiagonalStripes.tsx` exist

---

## Task 7: Create DottedPattern Component - DONE ✅

**Files:**
- Create: `src/components/marketing/SectionBackground/DottedPattern.tsx`

**Step 1: Create DottedPattern.tsx**

```tsx
// src/components/marketing/SectionBackground/DottedPattern.tsx
"use client"

import { cn } from "@/lib/utils"

interface DottedPatternProps {
  /** Dot spacing in pixels */
  spacing?: number
  /** Dot size in pixels */
  dotSize?: number
  /** Enable radial fade mask from center */
  withRadialMask?: boolean
  /** Additional className */
  className?: string
}

/**
 * DottedPattern - Radial dot grid overlay
 *
 * Creates a subtle dot pattern.
 * Dark mode: white dots
 * Light mode: dark dots
 * Optional radial mask fading from center.
 */
export function DottedPattern({
  spacing = 24,
  dotSize = 1,
  withRadialMask = true,
  className
}: DottedPatternProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none z-[1]",
        // Dark mode: white dots
        "dark:[background-image:radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)]",
        // Light mode: dark dots
        "[background-image:radial-gradient(rgba(0,0,0,0.12)_1px,transparent_1px)]",
        className
      )}
      style={{
        backgroundSize: `${spacing}px ${spacing}px`,
        ...(withRadialMask && {
          maskImage: "radial-gradient(circle at center, black 50%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 50%, transparent 100%)",
        }),
      }}
      aria-hidden="true"
    />
  )
}
```

**Step 2: Verify file exists**

Run: `ls src/components/marketing/SectionBackground/`
Expected: `GridPattern.tsx`, `DiagonalStripes.tsx`, and `DottedPattern.tsx` exist

---

## Task 8: Create FadeBottom Component - DONE ✅

**Files:**
- Create: `src/components/marketing/SectionBackground/FadeBottom.tsx`

**Step 1: Create FadeBottom.tsx**

```tsx
// src/components/marketing/SectionBackground/FadeBottom.tsx
"use client"

import { cn } from "@/lib/utils"

interface FadeBottomProps {
  /** Height of fade area in pixels */
  height?: number
  /** Additional className */
  className?: string
}

/**
 * FadeBottom - Bottom gradient fade to background
 *
 * Creates smooth transition from section to next section.
 * Uses CSS variable --background for theme-aware fade.
 *
 * Layer order: z-index 1 (above patterns, below content)
 */
export function FadeBottom({ height = 120, className }: FadeBottomProps) {
  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 pointer-events-none z-[1]",
        "[background:linear-gradient(to_bottom,transparent,var(--background))]",
        className
      )}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    />
  )
}
```

**Step 2: Verify file exists**

Run: `ls src/components/marketing/SectionBackground/`
Expected: All 4 component files exist

---

## Task 9: Create SectionBackground index.ts - DONE ✅

**Files:**
- Create: `src/components/marketing/SectionBackground/index.ts`

**Step 1: Create index.ts barrel export**

```ts
// src/components/marketing/SectionBackground/index.ts
/**
 * SectionBackground Components
 *
 * Section-level background patterns untuk marketing sections.
 * Composable - mix and match sesuai kebutuhan.
 *
 * Common compositions:
 * - Hero: GridPattern + DiagonalStripes + FadeBottom
 * - Benefits/Pricing: GridPattern + DottedPattern
 */

export { GridPattern } from "./GridPattern"
export { DiagonalStripes } from "./DiagonalStripes"
export { DottedPattern } from "./DottedPattern"
export { FadeBottom } from "./FadeBottom"
```

**Step 2: Commit SectionBackground components**

```bash
git add src/components/marketing/SectionBackground/
git commit -m "feat(SectionBackground): add Grid, Stripes, Dots, Fade components"
```

---

## Task 10: Update Marketing Homepage to Use New Components - DONE ✅

**Files:**
- Modify: `src/app/(marketing)/page.tsx`

**Step 1: Update imports and replace CSS classes with components**

```tsx
// src/app/(marketing)/page.tsx
import { Suspense } from "react"
import {
  PawangBadge,
  ChatInputHeroMock,
  HeroResearchMock,
  HeroHeading,
  HeroSubheading,
  HeroCTA,
} from "@/components/marketing/hero"
import { BenefitsSection } from "@/components/marketing/benefits"
import { PricingTeaser } from "@/components/marketing/pricing-teaser"
import { WaitlistToast } from "@/components/marketing/WaitlistToast"

// New background components
import { AuroraBackground, VignetteOverlay } from "@/components/marketing/PageBackground"
import { GridPattern, DiagonalStripes, FadeBottom } from "@/components/marketing/SectionBackground"

export default function MarketingHomePage() {
  return (
    <>
      {/* Waitlist Toast Handler */}
      <Suspense fallback={null}>
        <WaitlistToast />
      </Suspense>

      {/* Hero Section */}
      <section className="hero-section relative isolate overflow-hidden">
        {/* Background Layers (bottom to top) */}
        <AuroraBackground />
        <VignetteOverlay />
        <GridPattern />
        <DiagonalStripes />

        {/* Hero Flex Container */}
        <div className="hero-flex">
          {/* Hero Left - Text Content */}
          <div className="hero-left">
            <PawangBadge />
            <HeroHeading />
            <HeroSubheading />
            <div className="hero-actions">
              <HeroCTA />
            </div>
          </div>

          {/* Hero Right - Layered Mockup */}
          <div className="hero-right">
            <div className="mockup-layered-container">
              <HeroResearchMock />
              <ChatInputHeroMock />
            </div>
          </div>
        </div>

        {/* Bottom Fade */}
        <FadeBottom />
      </section>

      {/* Benefits Section */}
      <BenefitsSection />

      {/* Pricing Teaser */}
      <PricingTeaser />
    </>
  )
}
```

**Step 2: Verify the page renders correctly**

Run: `npm run dev`
Expected: Homepage loads with same visual appearance as before

**Step 3: Commit the integration**

```bash
git add src/app/\(marketing\)/page.tsx
git commit -m "refactor(marketing): use new background components in homepage"
```

---

## Task 11: Final Verification & Cleanup - DONE ✅

**Step 1: Verify folder structure**

Run: `tree src/components/marketing/background src/components/marketing/PageBackground src/components/marketing/SectionBackground`

Expected output:
```
src/components/marketing/background
└── TintOverlay.tsx
└── index.ts

src/components/marketing/PageBackground
├── AuroraBackground.tsx
├── VignetteOverlay.tsx
└── index.ts

src/components/marketing/SectionBackground
├── DiagonalStripes.tsx
├── DottedPattern.tsx
├── FadeBottom.tsx
├── GridPattern.tsx
└── index.ts
```

**Step 2: Run build to check for type errors**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 3: Visual regression check**

1. Open `http://localhost:3000` in browser
2. Toggle dark/light mode
3. Verify aurora, vignette, grid, stripes, and fade all render correctly in both modes

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(background): complete migration to component-based backgrounds

- Add TintOverlay shared component
- Add PageBackground: AuroraBackground, VignetteOverlay
- Add SectionBackground: GridPattern, DiagonalStripes, DottedPattern, FadeBottom
- Update homepage to use new components
- CSS in globals.css kept for backward compatibility"
```

---

## Summary

| Task | Component | Location |
|------|-----------|----------|
| 1 | TintOverlay | `background/` |
| 2 | AuroraBackground | `PageBackground/` |
| 3 | VignetteOverlay | `PageBackground/` |
| 4 | PageBackground index | `PageBackground/` |
| 5 | GridPattern | `SectionBackground/` |
| 6 | DiagonalStripes | `SectionBackground/` |
| 7 | DottedPattern | `SectionBackground/` |
| 8 | FadeBottom | `SectionBackground/` |
| 9 | SectionBackground index | `SectionBackground/` |
| 10 | Homepage integration | `(marketing)/page.tsx` |
| 11 | Final verification | - |

**Note:** CSS di `globals.css` **tidak dihapus** karena masih dipakai oleh pages lain (pricing, blog, auth, about). Cleanup bisa dilakukan di phase berikutnya setelah semua pages di-migrate.
