# Aurora + Pillars Full-Page Background Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend aurora background dari hero-only menjadi full-page background dengan gradient pillars, fading ke hitam/putih di 50% bawah viewport.

**Architecture:**
- Lift background layers (aurora, grid, stripes, pillars) dari hero section ke marketing layout level
- Background elements menjadi fixed position, covering full viewport
- Hero section menjadi transparent, content only
- Gradient fade di bagian bawah untuk smooth transition ke solid background color

**Tech Stack:** CSS (globals.css), React components, next-themes (dark/light mode support)

**Reference Mockup:** `.development/knowledge-base/home-background/`

---

## Task 1: Create Page Background Component

**Files:**
- Create: `src/components/marketing/background/PageBackground.tsx`
- Create: `src/components/marketing/background/index.ts`

**Step 1: Create the component file**

```tsx
// src/components/marketing/background/PageBackground.tsx
"use client"

/**
 * PageBackground - Full-page aurora + pillars background
 *
 * Layer stack (z-index from back to front):
 * -15: Aurora glow (radial gradients)
 * -10: Grid system (48px)
 * -9: Diagonal stripes
 * -8: Gradient pillars
 */
export function PageBackground() {
  return (
    <div className="page-background" aria-hidden="true">
      {/* Layer 1: Aurora Glow */}
      <div className="page-bg-aurora" />

      {/* Layer 2: Grid System */}
      <div className="page-bg-grid" />

      {/* Layer 3: Diagonal Stripes */}
      <div className="page-bg-stripes" />

      {/* Layer 4: Gradient Pillars */}
      <div className="page-bg-pillars">
        <div className="pillar" style={{ height: '60%' }} />
        <div className="pillar" style={{ height: '40%' }} />
        <div className="pillar" style={{ height: '75%' }} />
        <div className="pillar" style={{ height: '55%' }} />
        <div className="pillar" style={{ height: '85%' }} />
        <div className="pillar" style={{ height: '35%' }} />
        <div className="pillar" style={{ height: '65%' }} />
        <div className="pillar" style={{ height: '50%' }} />
        <div className="pillar" style={{ height: '90%' }} />
      </div>

      {/* Layer 5: Bottom Fade Gradient */}
      <div className="page-bg-fade" />
    </div>
  )
}
```

**Step 2: Create the barrel export**

```ts
// src/components/marketing/background/index.ts
export { PageBackground } from "./PageBackground"
```

**Step 3: Commit**

```bash
git add src/components/marketing/background/
git commit -m "feat(background): create PageBackground component structure"
```

---

## Task 2: Add CSS for Page Background Layers

**Files:**
- Modify: `src/app/globals.css` (add new section after hero styles, ~line 1400)

**Step 1: Add page background CSS**

Add this CSS block in globals.css (in the `@layer components` section):

```css
/* ==========================================================================
 * PAGE BACKGROUND - Full-page aurora + pillars
 * ========================================================================== */

.page-background {
  position: fixed;
  inset: 0;
  z-index: -20;
  pointer-events: none;
  isolation: isolate;
}

/* Layer 1: Aurora Glow */
.page-bg-aurora {
  position: absolute;
  inset: -10%;
  background:
    radial-gradient(800px 700px at 80% 18%, rgba(232, 102, 9, 0.45) 0 35%, transparent 60%),
    radial-gradient(700px 600px at 14% 14%, rgba(115, 185, 4, 0.35) 0 30%, transparent 58%),
    radial-gradient(720px 550px at 20% 78%, rgba(25, 196, 156, 0.35) 0 28%, transparent 56%),
    radial-gradient(650px 520px at 86% 82%, rgba(154, 131, 18, 0.4) 0 25%, transparent 54%);
  filter: blur(60px) saturate(1.8);
  opacity: 0.8;
  z-index: -15;
}

/* Layer 2: Grid System (48px) */
.page-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px);
  background-size: 48px 48px;
  z-index: -10;
}

/* Layer 3: Diagonal Stripes */
.page-bg-stripes {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(45deg,
      rgba(255, 255, 255, 0.05) 0,
      rgba(255, 255, 255, 0.05) 1px,
      transparent 1px,
      transparent 8px);
  z-index: -9;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, transparent 60%);
}

/* Light mode: dark stripes */
:root:not(.dark) .page-bg-stripes,
.light .page-bg-stripes {
  background-image: repeating-linear-gradient(45deg,
      rgba(0, 0, 0, 0.06) 0,
      rgba(0, 0, 0, 0.06) 1px,
      transparent 1px,
      transparent 8px);
}

/* Layer 4: Gradient Pillars */
.page-bg-pillars {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 0 48px;
  z-index: -8;
}

.page-bg-pillars .pillar {
  width: 96px;
  background: linear-gradient(to top,
      rgba(255, 255, 255, 0.08) 0%,
      rgba(255, 255, 255, 0.03) 50%,
      transparent 100%);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  mask-image: linear-gradient(to top, black 30%, transparent 100%);
}

.page-bg-pillars .pillar:nth-child(even) {
  width: 48px;
}

/* Light mode: dark pillars */
:root:not(.dark) .page-bg-pillars .pillar,
.light .page-bg-pillars .pillar {
  background: linear-gradient(to top,
      rgba(0, 0, 0, 0.06) 0%,
      rgba(0, 0, 0, 0.02) 50%,
      transparent 100%);
  border-left: 1px solid rgba(0, 0, 0, 0.08);
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}

/* Layer 5: Bottom Fade - gradasi ke background color */
.page-bg-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50vh;
  background: linear-gradient(to bottom, transparent 0%, var(--background) 100%);
  z-index: -5;
}

/* Light mode aurora adjustments */
:root:not(.dark) .page-bg-aurora,
.light .page-bg-aurora {
  opacity: 0.5;
  filter: blur(60px) saturate(1.5);
}
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "style(background): add CSS for full-page aurora + pillars layers"
```

---

## Task 3: Integrate PageBackground into Marketing Layout

**Files:**
- Modify: `src/app/(marketing)/layout.tsx`

**Step 1: Import and render PageBackground**

Update the layout to include PageBackground:

```tsx
// src/app/(marketing)/layout.tsx
import { GlobalHeader } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { PageBackground } from "@/components/marketing/background"
import { auth, currentUser } from "@clerk/nextjs/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"

// ... ensureConvexUser function stays the same ...

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await ensureConvexUser()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageBackground />
      <GlobalHeader />
      <main className="global-main">{children}</main>
      <Footer />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/\(marketing\)/layout.tsx
git commit -m "feat(marketing): integrate PageBackground into layout"
```

---

## Task 4: Clean Up Hero Section - Remove Duplicate Background

**Files:**
- Modify: `src/app/(marketing)/page.tsx`
- Modify: `src/app/globals.css`

**Step 1: Update hero section in page.tsx**

Remove background elements from hero, keep only content:

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

export default function MarketingHomePage() {
  return (
    <>
      {/* Waitlist Toast Handler */}
      <Suspense fallback={null}>
        <WaitlistToast />
      </Suspense>

      {/* Hero Section - Content only (background from PageBackground) */}
      <section className="hero-section">
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
      </section>

      {/* Benefits Section */}
      <BenefitsSection />

      {/* Pricing Teaser */}
      <PricingTeaser />
    </>
  )
}
```

**Step 2: Update hero-section CSS**

Remove background classes from hero-section, make it transparent:

Find in globals.css (around line 1006-1020):
```css
/* OLD - to be replaced */
.hero-section {
  position: relative;
  overflow: hidden;
  /* ... existing padding, etc. */
}
```

Replace with:
```css
/* Hero section container - content only, transparent bg */
.hero-section {
  position: relative;
  overflow: visible;
  padding: calc(var(--header-h) + 20px) var(--section-padding-x) 40px;
  text-align: left;
  height: auto;
  min-height: 100vh;
  min-height: 100dvh;
  background-color: transparent;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}
```

**Step 3: Remove or deprecate old hero background classes**

Comment out (don't delete yet) these classes in globals.css:
- `.hero-vivid` and `.hero-vivid::before`
- `.hero-vignette`
- `.hero-diagonal-stripes`
- `.hero-grid-thin`
- `.hero-fade-bottom`

Add comment:
```css
/* ==========================================================================
 * DEPRECATED: Hero-specific background classes
 * Background now handled by PageBackground component at layout level.
 * Keeping for reference, will remove in future cleanup.
 * ========================================================================== */
```

**Step 4: Commit**

```bash
git add src/app/\(marketing\)/page.tsx src/app/globals.css
git commit -m "refactor(hero): remove duplicate background, use PageBackground"
```

---

## Task 5: Visual QA & Responsive Adjustments

**Files:**
- Modify: `src/app/globals.css` (if needed)

**Step 1: Test in browser**

Run dev server and check:
```bash
npm run dev
```

Checklist:
- [ ] Dark mode: Aurora visible, pillars visible, fade to black at bottom
- [ ] Light mode: Softer aurora, dark pillars, fade to white at bottom
- [ ] Mobile (< 768px): Pillars should hide or simplify
- [ ] Scroll behavior: Background stays fixed, content scrolls over it
- [ ] No visual artifacts at section boundaries

**Step 2: Add mobile responsive rules if needed**

```css
/* Mobile: simplify pillars */
@media (max-width: 768px) {
  .page-bg-pillars {
    display: none; /* Hide pillars on mobile for cleaner look */
  }

  .page-bg-aurora {
    opacity: 0.6; /* Slightly reduce aurora intensity */
  }
}
```

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style(background): add responsive adjustments for mobile"
```

---

## Task 6: Final Cleanup & Documentation

**Files:**
- Modify: `src/app/globals.css` (remove deprecated hero bg classes)
- Create: `src/components/marketing/background/README.md`

**Step 1: Remove deprecated CSS**

After confirming everything works, remove the commented-out hero background classes:
- `.hero-vivid`, `.hero-vivid::before`
- `.hero-vignette`
- `.hero-diagonal-stripes`
- `.hero-grid-thin`
- `.hero-fade-bottom`

**Step 2: Create README**

```markdown
# Page Background

Full-page aurora + pillars background for marketing pages.

## Layer Stack

| Layer | Class | Z-Index | Description |
|-------|-------|---------|-------------|
| 1 | `.page-bg-aurora` | -15 | Aurora radial gradients |
| 2 | `.page-bg-grid` | -10 | 48px grid overlay |
| 3 | `.page-bg-stripes` | -9 | 45° diagonal stripes |
| 4 | `.page-bg-pillars` | -8 | Vertical gradient pillars |
| 5 | `.page-bg-fade` | -5 | Bottom fade to background color |

## Usage

Rendered in `(marketing)/layout.tsx` - applies to all marketing pages.

## Theme Support

- **Dark mode:** White/bright elements, fade to black
- **Light mode:** Dark elements, fade to white

## Mobile

Pillars hidden on screens < 768px for cleaner appearance.
```

**Step 3: Final commit**

```bash
git add src/app/globals.css src/components/marketing/background/
git commit -m "docs(background): add README, cleanup deprecated hero bg CSS"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Create PageBackground component | `background/PageBackground.tsx`, `background/index.ts` |
| 2 | Add CSS for all layers | `globals.css` |
| 3 | Integrate into marketing layout | `(marketing)/layout.tsx` |
| 4 | Clean up hero section | `page.tsx`, `globals.css` |
| 5 | Visual QA & responsive | `globals.css` |
| 6 | Final cleanup & docs | `globals.css`, `background/README.md` |

**Estimated commits:** 6
