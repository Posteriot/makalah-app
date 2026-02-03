# PricingTeaser Background Standardization

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace inline style objects in PricingTeaser with standardized React background components for consistency and performance optimization.

**Architecture:** Remove 4 inline-styled divs (2 light, 2 dark) and `backgroundPatterns.ts`, replace with `<GridPattern />` and `<DottedPattern />` React components that handle dark/light mode internally via Tailwind `dark:` prefix. Components are already memoized with `React.memo` and `useMemo`.

**Tech Stack:** React 19, Tailwind CSS 4, existing SectionBackground components

---

## Task 1: Replace Inline Styles with React Components

**Files:**
- Modify: `src/components/marketing/pricing-teaser/PricingTeaser.tsx`

**Step 1: Update imports**

Remove:
```tsx
import { gridStyle, gridStyleDark, dotsStyle, dotsStyleDark } from "./backgroundPatterns"
```

Add:
```tsx
import { GridPattern, DottedPattern } from "@/components/marketing/SectionBackground"
```

**Step 2: Replace 4 background divs with 2 React components**

Remove lines 79-96:
```tsx
{/* Background patterns - light mode */}
<div
  className="absolute inset-0 z-0 pointer-events-none dark:hidden"
  style={gridStyle}
/>
<div
  className="absolute inset-0 z-0 pointer-events-none dark:hidden"
  style={dotsStyle}
/>
{/* Background patterns - dark mode */}
<div
  className="absolute inset-0 z-0 pointer-events-none hidden dark:block"
  style={gridStyleDark}
/>
<div
  className="absolute inset-0 z-0 pointer-events-none hidden dark:block"
  style={dotsStyleDark}
/>
```

Replace with:
```tsx
{/* Background patterns - using memoized React components */}
<GridPattern size={48} className="z-0" />
<DottedPattern spacing={24} withRadialMask={false} className="z-0" />
```

**Note:** `withRadialMask={false}` because PricingTeaser's dots don't have radial fade (unlike Benefits section).

**Step 3: Verify the component renders correctly**

Run: `npm run dev`
Open: `http://localhost:3000` and scroll to Pricing Teaser section
Expected: Background patterns should look identical (grid + dots)

**Step 4: Commit**

```bash
git add src/components/marketing/pricing-teaser/PricingTeaser.tsx
git commit -m "refactor(PricingTeaser): replace inline styles with React components

- Use GridPattern and DottedPattern from SectionBackground
- Remove 4 divs (2 light, 2 dark) → 2 memoized components
- Dark/light mode now handled via Tailwind dark: prefix
- Consistent with Hero and Benefits sections"
```

---

## Task 2: Delete Unused backgroundPatterns.ts

**Files:**
- Delete: `src/components/marketing/pricing-teaser/backgroundPatterns.ts`

**Step 1: Verify no other imports**

Run: `grep -r "backgroundPatterns" src/`
Expected: No results (only the file itself, now unused)

**Step 2: Delete the file**

```bash
rm src/components/marketing/pricing-teaser/backgroundPatterns.ts
```

**Step 3: Run lint and build to verify**

Run: `npm run lint && npm run build`
Expected: No errors

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove unused backgroundPatterns.ts

Dead code cleanup - patterns now rendered by React components"
```

---

## Task 3: Visual Verification in Both Themes

**Step 1: Test dark mode**

Open: `http://localhost:3000`
Toggle: Dark mode
Scroll to: Pricing Teaser section
Expected:
- Grid lines visible (slate-400 at 15% opacity)
- Dots visible (white at 12% opacity)
- Background: dark (`bg-black`)

**Step 2: Test light mode**

Toggle: Light mode
Scroll to: Pricing Teaser section
Expected:
- Grid lines visible (dark at ~4-15% opacity)
- Dots visible (dark at 12% opacity)
- Background: muted (`bg-muted/30`)

**Step 3: Compare with original**

Visual diff should show:
- Grid pattern: identical appearance
- Dot pattern: identical appearance (no radial mask)
- Theme switching: works correctly

---

## Summary

| Before | After |
|--------|-------|
| 4 inline-styled divs | 2 React components |
| `backgroundPatterns.ts` (33 lines) | Deleted |
| Manual dark/light toggle | Automatic via Tailwind `dark:` |
| No memoization | `React.memo` + `useMemo` |
| No GPU hints | `will-change` available |

**Files Changed:**
- `src/components/marketing/pricing-teaser/PricingTeaser.tsx` - Modified
- `src/components/marketing/pricing-teaser/backgroundPatterns.ts` - Deleted
