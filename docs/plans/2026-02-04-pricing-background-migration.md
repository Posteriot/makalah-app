# Pricing Page Background Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate pricing page backgrounds from custom CSS to reusable React components, reducing ~100 lines of CSS while achieving visual consistency with other marketing sections.

**Architecture:** Replace raw CSS divs (`.grid-thin`, `.bg-dot-grid`) with existing memoized React components (`GridPattern`, `DottedPattern`) from `SectionBackground/`. Keep section container inline Tailwind. Remove corresponding custom CSS from globals.css.

**Tech Stack:** React 19, Tailwind CSS 4, Next.js 16 App Router

---

## Task 1: Update Pricing Page Section Container

**Files:**
- Modify: `src/app/(marketing)/pricing/page.tsx:288-343`

**Step 1: Add component imports**

Add these imports at top of file:

```tsx
import { GridPattern, DottedPattern } from "@/components/marketing/SectionBackground"
```

**Step 2: Replace section element and background divs**

Replace lines 306-310:

```tsx
{/* Pricing Cards Section */}
<section className="pricing" id="pricing-cards">
  {/* Background patterns */}
  <div className="grid-thin" />
  <div className="bg-dot-grid" />
```

With:

```tsx
{/* Pricing Cards Section */}
<section
  className="relative py-[5vh] bg-muted/30 dark:bg-black border-t border-black/10 dark:border-white/[0.14] z-10"
  id="pricing-cards"
>
  {/* Background patterns - using memoized React components */}
  <GridPattern size={48} className="z-0 [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_0%,rgba(0,0,0,0.4)_50%,rgba(0,0,0,0)_90%)]" />
  <DottedPattern spacing={24} withRadialMask={true} className="z-0" />
```

**Step 3: Run dev server to verify visual parity**

Run: `npm run dev`
Expected: Pricing page at localhost:3000/pricing shows identical grid + dot pattern as before

**Step 4: Commit**

```bash
git add src/app/(marketing)/pricing/page.tsx
git commit -m "refactor(pricing): replace CSS backgrounds with React components

- Replace .grid-thin with GridPattern component
- Replace .bg-dot-grid with DottedPattern component
- Move section styling to inline Tailwind classes
- Matches pattern used in BenefitsSection and PricingTeaser"
```

---

## Task 2: Update Pricing Container Styling

**Files:**
- Modify: `src/app/(marketing)/pricing/page.tsx:311`

**Step 1: Replace pricing-container class**

Replace line 311:

```tsx
<div className="pricing-container">
```

With:

```tsx
<div className="relative z-10 w-full max-w-[var(--container-max-width)] mx-auto px-6">
```

**Step 2: Verify container alignment**

Run: `npm run dev`
Expected: Cards container matches header/footer max-width alignment (1200px)

**Step 3: Commit**

```bash
git add src/app/(marketing)/pricing/page.tsx
git commit -m "refactor(pricing): replace pricing-container with inline Tailwind"
```

---

## Task 3: Remove Background CSS from globals.css

**Files:**
- Modify: `src/app/globals.css:1457-1500` (approximately)

**Step 1: Remove section.pricing background rules**

Delete these CSS blocks (lines ~1457-1463):

```css
section.pricing {
  padding: 5vh 0;
  position: relative;
  background: #000000;
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  z-index: 10;
}
```

**Step 2: Remove .pricing .grid-thin rules**

Delete these CSS blocks (lines ~1466-1479):

```css
.pricing .grid-thin {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px);
  background-size: 48px 48px;
  z-index: 0;
  pointer-events: none;
  mask-image: linear-gradient(to bottom,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    rgba(0, 0, 0, 0) 90%);
}
```

**Step 3: Remove .pricing .bg-dot-grid rules**

Delete these CSS blocks (lines ~1482-1490):

```css
.pricing .bg-dot-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
  z-index: 0;
  mask-image: radial-gradient(circle at center, black 50%, transparent 100%);
}
```

**Step 4: Remove .pricing-container rules**

Delete these CSS blocks (lines ~1493-1501):

```css
.pricing-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  box-sizing: border-box;
}
```

**Step 5: Remove light mode section/background overrides**

Delete these CSS blocks (lines ~1830-1846):

```css
:root section.pricing {
  background: #f8f8f8;
  border-top-color: rgba(0, 0, 0, 0.1);
}

:root .pricing .grid-thin {
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px);
}

:root .pricing .bg-dot-grid {
  background-image: radial-gradient(rgba(0, 0, 0, 0.12) 1px, transparent 1px);
  mask-image: radial-gradient(circle at center, black 50%, transparent 100%);
}
```

**Step 6: Remove dark mode section/background overrides**

Delete these CSS blocks (lines ~1898-1914):

```css
.dark section.pricing {
  background: #000000;
  border-top-color: rgba(255, 255, 255, 0.14);
}

.dark .pricing .grid-thin {
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px);
}

.dark .pricing .bg-dot-grid {
  background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
  mask-image: radial-gradient(circle at center, black 50%, transparent 100%);
}
```

**Step 7: Verify no visual regression**

Run: `npm run dev`
Expected:
- Dark mode: Black background with grid + dots (identical to before)
- Light mode: Light gray background with grid + dots (identical to before)

**Step 8: Commit**

```bash
git add src/app/globals.css
git commit -m "refactor(css): remove pricing background CSS (~60 lines)

Background patterns now handled by:
- GridPattern component (theme-aware)
- DottedPattern component (theme-aware)
- Inline Tailwind for section container"
```

---

## Task 4: Visual QA - Both Themes

**Files:**
- None (QA only)

**Step 1: Test dark mode appearance**

Run: `npm run dev`
Navigate to: localhost:3000/pricing
Toggle: Ensure dark mode active
Expected:
- Black section background
- Subtle grid lines (slate-400 at 15% opacity)
- Dot pattern with radial fade
- Cards visible and styled correctly

**Step 2: Test light mode appearance**

Toggle: Switch to light mode
Expected:
- Light gray section background (muted/30)
- Subtle grid lines (dark at lower opacity)
- Dot pattern with radial fade
- Cards visible and styled correctly

**Step 3: Test mobile carousel**

Resize: Browser to mobile width (<768px)
Expected:
- Carousel swipe works
- Dots navigation works
- Background patterns scale correctly

**Step 4: Document any issues**

If issues found, create follow-up task. Otherwise proceed.

---

## Task 5: Final Cleanup Commit

**Files:**
- None (aggregate commit)

**Step 1: Verify all changes**

```bash
git status
git diff --stat main
```

Expected: ~3-4 files changed, significant CSS deletion

**Step 2: Run linter**

Run: `npm run lint`
Expected: No new errors

**Step 3: Push branch**

```bash
git push -u origin refactor/pricing-background-migration
```

---

## Summary

**Total CSS Reduction:** ~60-80 lines removed from globals.css
**Components Reused:** GridPattern, DottedPattern
**Consistency Achieved:** Pricing now uses same pattern as BenefitsSection and PricingTeaser

**Next Phase (Future):** Card styling migration (borders, shadows, typography) - separate plan
