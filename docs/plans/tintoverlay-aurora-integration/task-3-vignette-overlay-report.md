# Task 3: Simplify VignetteOverlay - Completion Report

**Date:** 2026-02-03
**Status:** ✅ DONE
**Commit:** `d7f14cf`
**Branch:** `feature/hero-background-redesign`

---

## Summary

Removed dark/light mode logic from VignetteOverlay, making it theme-agnostic. The component now renders identically in both dark and light modes with a unified ~20% opacity vignette. Brightness adaptation is delegated to TintOverlay.

## Files Modified

| File | Change |
|------|--------|
| `src/components/marketing/PageBackground/VignetteOverlay.tsx` | Remove dark/light conditional styling |

## Code Changes

### Docstring Update (lines 10-17)

**Before:**
```tsx
/**
 * VignetteOverlay - Edge darkening effect
 *
 * Creates radial gradient that darkens edges.
 * Lighter in light mode, stronger in dark mode.
 *
 * Layer order: z-index -1 (above aurora, below content)
 */
```

**After:**
```tsx
/**
 * VignetteOverlay - Edge darkening effect
 *
 * Creates radial gradient that darkens edges.
 * Theme-agnostic: renders identically in dark/light mode.
 * Use TintOverlay as sibling for brightness adaptation.
 *
 * Layer order: z-index -1 (above aurora, below TintOverlay)
 */
```

### className Update (vignette gradient)

**Before:**
```tsx
className={cn(
  "absolute inset-0 pointer-events-none",
  "[z-index:-1]",
  // Dark mode: stronger vignette
  "dark:[background:radial-gradient(circle_at_50%_40%,rgba(0,0,0,0.15)_20%,rgba(0,0,0,0.35)_55%,rgba(0,0,0,0.55)_100%)]",
  // Light mode: subtle vignette
  "[background:radial-gradient(circle_at_50%_40%,transparent_30%,rgba(0,0,0,0.05)_60%,rgba(0,0,0,0.12)_100%)]",
  className
)}
```

**After:**
```tsx
className={cn(
  "absolute inset-0 pointer-events-none",
  "[z-index:-1]",
  // Theme-agnostic vignette (~20% opacity middle ground)
  "[background:radial-gradient(circle_at_50%_40%,transparent_25%,rgba(0,0,0,0.12)_55%,rgba(0,0,0,0.25)_100%)]",
  className
)}
```

## Unified Vignette Values

The unified vignette gradient is a middle ground between light and dark mode values:

| Stop | Light Mode (before) | Dark Mode (before) | Unified (after) |
|------|--------------------|--------------------|-----------------|
| Center | transparent 30% | rgba(0,0,0,0.15) 20% | transparent 25% |
| Middle | rgba(0,0,0,0.05) 60% | rgba(0,0,0,0.35) 55% | rgba(0,0,0,0.12) 55% |
| Edge | rgba(0,0,0,0.12) 100% | rgba(0,0,0,0.55) 100% | rgba(0,0,0,0.25) 100% |

## Verification Results

| Check | Result | Notes |
|-------|--------|-------|
| `npm run build` | ✅ Pass | Build completed successfully |
| `npx tsc --noEmit` | ✅ Pass | No type errors |
| `npm run lint` | ✅ Pass | 0 errors (4 warnings in unrelated `.agent/` files) |

## Commit Details

```
d7f14cf refactor(VignetteOverlay): remove dark/light mode logic

Make VignetteOverlay theme-agnostic with unified ~20% opacity.
Brightness adaptation now handled by TintOverlay sibling layer.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## Architecture Impact

Both background layers are now theme-agnostic:

```
┌─────────────────────────────────────┐
│  Content                            │  z-index: auto
├─────────────────────────────────────┤
│  TintOverlay (brightness control)   │  z-index: 0  ← handles dark/light
├─────────────────────────────────────┤
│  VignetteOverlay ✅                 │  z-index: -1 ← NOW THEME-AGNOSTIC
├─────────────────────────────────────┤
│  AuroraBackground ✅                │  z-index: -2 ← THEME-AGNOSTIC
└─────────────────────────────────────┘
```

## Next Steps

Task 4: Add TintOverlay to Marketing Page - awaiting user validation to proceed.
