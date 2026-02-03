# Benefits Section Background Standardization

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace CSS-based background patterns in BenefitsSection with React components for consistency and performance optimization.

**Architecture:** Remove `.benefits-bg-stripes` and `.benefits-bg-dots` CSS classes, replace with `<DiagonalStripes />` and `<DottedPattern />` React components that are already memoized with `React.memo` and `useMemo`. Background color stays in CSS.

**Tech Stack:** React 19, Tailwind CSS 4, existing SectionBackground components

---

## Task 1: Update BenefitsSection to Use React Components

**Status:** Done

**Files:**
- Modify: `src/components/marketing/benefits/BenefitsSection.tsx`

**Step 1: Add imports for SectionBackground components**

Add import at top of file:

```tsx
import { DiagonalStripes, DottedPattern } from "@/components/marketing/SectionBackground"
```

**Step 2: Replace CSS class divs with React components**

Replace:
```tsx
{/* Background patterns */}
<div className="benefits-bg-stripes" />
<div className="benefits-bg-dots" />
```

With:
```tsx
{/* Background patterns - using memoized React components */}
<DiagonalStripes withFadeMask={true} className="opacity-40" />
<DottedPattern spacing={24} withRadialMask={true} />
```

**Step 3: Verify the component renders correctly**

Run: `npm run dev`
Open: `http://localhost:3000` and scroll to Benefits section
Expected: Background patterns should look identical to before (stripes with fade, dots with radial mask)

**Step 4: Commit**

```bash
git add src/components/marketing/benefits/BenefitsSection.tsx
git commit -m "refactor(BenefitsSection): replace CSS backgrounds with React components

- Use DiagonalStripes and DottedPattern from SectionBackground
- Benefit from React.memo optimization (prevents re-renders)
- Consistent with hero section pattern"
```

---

## Task 2: Clean Up Unused CSS Classes

**Status:** Done

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Remove `.benefits-bg-stripes` CSS rules**

Remove these lines (around line 1426-1452):
```css
.benefits-bg-stripes {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.08) 0,
    rgba(255, 255, 255, 0.08) 1px,
    transparent 1px,
    transparent 10px
  );
  z-index: 0; /* Layer paling belakang */
  pointer-events: none;
  opacity: 0.4;
  mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
}

:root:not(.dark) .benefits-bg-stripes,
.light .benefits-bg-stripes {
  background-image: repeating-linear-gradient(
    45deg,
    rgba(0, 0, 0, 0.07) 0,
    rgba(0, 0, 0, 0.07) 1px,
    transparent 1px,
    transparent 10px
  );
  opacity: 0.6;
}
```

**Step 2: Remove `.benefits-bg-dots` CSS rules**

Remove these lines (around line 1454-1467):
```css
.benefits-bg-dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
  z-index: 1; /* Di atas stripes, di belakang content */
  mask-image: radial-gradient(circle at center, black 50%, transparent 100%);
}

:root:not(.dark) .benefits-bg-dots,
.light .benefits-bg-dots {
  background-image: radial-gradient(rgba(0, 0, 0, 0.12) 1px, transparent 1px);
}
```

**Step 3: Verify no visual regression**

Run: `npm run dev`
Open: `http://localhost:3000` and scroll to Benefits section
Expected: Background patterns unchanged (now rendered by React components)

**Step 4: Run lint to ensure no issues**

Run: `npm run lint`
Expected: No errors

**Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "chore(css): remove unused benefits-bg-stripes and benefits-bg-dots

Dead code cleanup - these patterns are now rendered by React components"
```

---

## Task 3: Visual Verification in Both Themes

**Status:** Done

**Step 1: Test dark mode**

Open: `http://localhost:3000`
Toggle: Dark mode (if available) or check system preference
Scroll to: Benefits section
Expected:
- White stripes (12% opacity) with fade mask top→bottom
- White dots (12% opacity) with radial mask center→edge
- Background color: `#1c1c21`

**Step 2: Test light mode**

Toggle: Light mode
Scroll to: Benefits section
Expected:
- Dark stripes (10% opacity) with fade mask
- Dark dots (12% opacity) with radial mask
- Background color: `#f4f4f5`

**Step 3: Test mobile viewport**

Open DevTools → Toggle device toolbar
Select: iPhone 14 Pro (390×844)
Scroll to: Benefits section
Expected: Patterns scale correctly, no overflow

---

## Summary

| Before | After |
|--------|-------|
| CSS classes (`.benefits-bg-stripes`, `.benefits-bg-dots`) | React components (`<DiagonalStripes />`, `<DottedPattern />`) |
| No memoization | `React.memo` + `useMemo` |
| No GPU hints | `will-change: mask-image` |
| Duplicated pattern logic in CSS | Single source of truth in components |
