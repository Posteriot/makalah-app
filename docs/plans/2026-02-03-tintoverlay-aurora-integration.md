# TintOverlay Unified Theme Adaptation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement TintOverlay as the single source of truth for dark/light mode brightness control across all page background layers.

**Architecture:** TintOverlay sits at the top of the background stack (z-index: 0), above VignetteOverlay (z-index: -1) and AuroraBackground (z-index: -2). All other background components become theme-agnostic; TintOverlay alone handles brightness adaptation via white overlay (light mode) or black overlay (dark mode).

**Tech Stack:** React, Tailwind CSS 4, next-themes

---

## Layer Stack (Bottom to Top)

```
┌─────────────────────────────────────┐
│  Content (hero-flex, text, etc)     │  z-index: auto (DOM order)
├─────────────────────────────────────┤
│  TintOverlay (brightness control)   │  z-index: 0
├─────────────────────────────────────┤
│  VignetteOverlay (edge darkening)   │  z-index: -1 (theme-agnostic)
├─────────────────────────────────────┤
│  AuroraBackground (gradients)       │  z-index: -2 (theme-agnostic)
└─────────────────────────────────────┘
```

---

## Task 1: Fix TintOverlay Tailwind Pattern ✅ DONE

**Status:** ✅ Completed | **Commit:** `fabe9ed`

**Files:**
- Modify: `src/components/marketing/BackgroundOverlay/TintOverlay.tsx:22-26`

**Problem:** `light:` is not a valid Tailwind prefix. Current code:
```tsx
"bg-black dark:bg-black",
"light:bg-white",  // ❌ Invalid Tailwind
```

**Step 1: Update className to use standard Tailwind pattern**

Replace lines 22-26 in `TintOverlay.tsx`:

```tsx
// BEFORE (lines 22-26)
className={cn(
  "absolute inset-0 pointer-events-none",
  "bg-black dark:bg-black",
  "light:bg-white",
  className
)}

// AFTER
className={cn(
  "absolute inset-0 pointer-events-none",
  "bg-white dark:bg-black",
  className
)}
```

**Step 2: Verify change**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/components/marketing/BackgroundOverlay/TintOverlay.tsx
git commit -m "$(cat <<'EOF'
fix(TintOverlay): use standard Tailwind dark: pattern

Replace invalid light: prefix with proper bg-white dark:bg-black pattern.
Light mode = white overlay (lighten), dark mode = black overlay (darken).
EOF
)"
```

---

## Task 2: Simplify AuroraBackground (Remove Dark/Light Logic) ✅ DONE

**Status:** ✅ Completed | **Commit:** `75d9005`

**Files:**
- Modify: `src/components/marketing/PageBackground/AuroraBackground.tsx:10-16, 36-48`

**Problem:** AuroraBackground has internal dark/light handling. The inner div (lines 37-48) applies different blur/saturation/brightness per theme:
```tsx
"dark:opacity-100 dark:[filter:blur(60px)_saturate(2.0)_brightness(1.4)]",
"opacity-50 [filter:blur(80px)_saturate(1.2)_brightness(1.1)]"
```

**Step 1: Update component docstring (lines 10-16)**

```tsx
// BEFORE
/**
 * AuroraBackground - Multi-color radial gradient background
 *
 * Creates 4 layered radial gradients with blur effect.
 * Adapts intensity for dark/light mode.
 *
 * Layer order: z-index -2 (behind everything)
 */

// AFTER
/**
 * AuroraBackground - Multi-color radial gradient background
 *
 * Creates 4 layered radial gradients with blur effect.
 * Theme-agnostic: renders identically in dark/light mode.
 * Use TintOverlay as sibling for brightness adaptation.
 *
 * Layer order: z-index -2 (behind everything)
 */
```

**Step 2: Replace inner div with unified blur settings (lines 36-48)**

```tsx
// BEFORE (lines 36-48)
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

// AFTER
>
  {/* Blur layer - theme-agnostic, TintOverlay handles brightness */}
  <div
    className="absolute inset-0 [filter:blur(60px)_saturate(1.8)_brightness(1.3)]"
    style={{
      background: 'inherit',
      backgroundAttachment: 'inherit'
    }}
  />
</div>
```

**Step 3: Verify change**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/components/marketing/PageBackground/AuroraBackground.tsx
git commit -m "$(cat <<'EOF'
refactor(AuroraBackground): remove dark/light mode logic

Make AuroraBackground theme-agnostic with unified blur settings.
Brightness adaptation now handled by TintOverlay sibling layer.
EOF
)"
```

---

## Task 3: Simplify VignetteOverlay (Remove Dark/Light Logic) ✅ DONE

**Status:** ✅ Completed | **Commit:** `d7f14cf`

**Files:**
- Modify: `src/components/marketing/PageBackground/VignetteOverlay.tsx:10-16, 21-28`

**Problem:** VignetteOverlay has internal dark/light handling:
```tsx
// Dark mode: stronger vignette (15-55% opacity)
"dark:[background:radial-gradient(circle_at_50%_40%,rgba(0,0,0,0.15)_20%,rgba(0,0,0,0.35)_55%,rgba(0,0,0,0.55)_100%)]",
// Light mode: subtle vignette (5-12% opacity)
"[background:radial-gradient(circle_at_50%_40%,transparent_30%,rgba(0,0,0,0.05)_60%,rgba(0,0,0,0.12)_100%)]",
```

**Step 1: Update component docstring (lines 10-16)**

```tsx
// BEFORE
/**
 * VignetteOverlay - Edge darkening effect
 *
 * Creates radial gradient that darkens edges.
 * Lighter in light mode, stronger in dark mode.
 *
 * Layer order: z-index -1 (above aurora, below content)
 */

// AFTER
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

**Step 2: Replace className with unified vignette (lines 21-28)**

Use ~20% opacity as middle ground between 5% (light) and 35% (dark):

```tsx
// BEFORE (lines 21-28)
className={cn(
  "absolute inset-0 pointer-events-none",
  "[z-index:-1]",
  // Dark mode: stronger vignette
  "dark:[background:radial-gradient(circle_at_50%_40%,rgba(0,0,0,0.15)_20%,rgba(0,0,0,0.35)_55%,rgba(0,0,0,0.55)_100%)]",
  // Light mode: subtle vignette
  "[background:radial-gradient(circle_at_50%_40%,transparent_30%,rgba(0,0,0,0.05)_60%,rgba(0,0,0,0.12)_100%)]",
  className
)}

// AFTER
className={cn(
  "absolute inset-0 pointer-events-none",
  "[z-index:-1]",
  // Theme-agnostic vignette (~20% opacity middle ground)
  "[background:radial-gradient(circle_at_50%_40%,transparent_25%,rgba(0,0,0,0.12)_55%,rgba(0,0,0,0.25)_100%)]",
  className
)}
```

**Step 3: Verify change**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/components/marketing/PageBackground/VignetteOverlay.tsx
git commit -m "$(cat <<'EOF'
refactor(VignetteOverlay): remove dark/light mode logic

Make VignetteOverlay theme-agnostic with unified ~20% opacity.
Brightness adaptation now handled by TintOverlay sibling layer.
EOF
)"
```

---

## Task 4: Add TintOverlay to Marketing Page ✅ DONE

**Status:** ✅ Completed | **Commit:** `e81496f`

**Files:**
- Modify: `src/app/(marketing)/page.tsx:15-16, 29-32`

**Step 1: Add TintOverlay import (after line 15)**

```tsx
// BEFORE (lines 14-16)
// New background components
import { AuroraBackground, VignetteOverlay } from "@/components/marketing/PageBackground"
import { GridPattern, DiagonalStripes, FadeBottom } from "@/components/marketing/SectionBackground"

// AFTER
// New background components
import { AuroraBackground, VignetteOverlay } from "@/components/marketing/PageBackground"
import { TintOverlay } from "@/components/marketing/BackgroundOverlay"
import { GridPattern, DiagonalStripes, FadeBottom } from "@/components/marketing/SectionBackground"
```

**Step 2: Add TintOverlay after VignetteOverlay (lines 28-32)**

TintOverlay must be AFTER VignetteOverlay in DOM and use z-index: 0 to sit above it:

```tsx
// BEFORE (lines 28-32)
{/* Background Layers (bottom to top) */}
<AuroraBackground />
<VignetteOverlay />
<GridPattern />
<DiagonalStripes />

// AFTER
{/* Background Layers (bottom to top) */}
<AuroraBackground />
<VignetteOverlay />
<TintOverlay intensity={15} className="z-0" />
<GridPattern />
<DiagonalStripes />
```

**Note:** `intensity={15}` is a starting value (15% opacity). Adjust in Task 7 if needed.

**Step 3: Verify change**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/app/\(marketing\)/page.tsx
git commit -m "$(cat <<'EOF'
feat(marketing): add TintOverlay for unified theme adaptation

Insert TintOverlay above VignetteOverlay with z-index: 0.
TintOverlay handles dark/light brightness for all background layers.
Aurora and Vignette are now theme-agnostic.
EOF
)"
```

---

## Task 5: Update PageBackground Documentation ✅ DONE

**Status:** ✅ Completed | **Commit:** `6ff21b5`

**Files:**
- Modify: `src/components/marketing/PageBackground/index.ts:1-14`

**Step 1: Update layer documentation**

```tsx
// BEFORE
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

// AFTER
/**
 * PageBackground Components
 *
 * Page-level background effects untuk marketing pages.
 * Gunakan bersama untuk layered background effect.
 *
 * Layer order (bottom to top):
 * 1. AuroraBackground (z-index: -2) - theme-agnostic gradients
 * 2. VignetteOverlay (z-index: -1) - theme-agnostic edge darkening
 * 3. TintOverlay from BackgroundOverlay/ (z-index: 0) - brightness control
 *
 * IMPORTANT: Aurora and Vignette are theme-agnostic.
 * Always pair with TintOverlay for proper dark/light adaptation.
 * TintOverlay is the SINGLE SOURCE OF TRUTH for theme brightness.
 */

export { AuroraBackground } from "./AuroraBackground"
export { VignetteOverlay } from "./VignetteOverlay"
```

**Step 2: Commit**

```bash
git add src/components/marketing/PageBackground/index.ts
git commit -m "$(cat <<'EOF'
docs(PageBackground): update layer order and theme documentation

Reflect new architecture:
- Aurora and Vignette are theme-agnostic
- TintOverlay is single source of truth for brightness
EOF
)"
```

---

## Task 6: Update BackgroundOverlay README ✅ DONE

**Status:** ✅ Completed | **Commit:** `d642665`

**Files:**
- Modify: `src/components/marketing/BackgroundOverlay/README.md:48-57`

**Step 1: Fix the styling documentation**

```markdown
## Styling

Class utama yang selalu dipakai:
- `absolute inset-0 pointer-events-none`
- `bg-white dark:bg-black` (light mode = white overlay, dark mode = black overlay)

## Penggunaan dengan PageBackground

TintOverlay adalah **single source of truth** untuk adaptasi dark/light mode.
Selalu gunakan bersama dengan AuroraBackground dan VignetteOverlay:

```tsx
<AuroraBackground />      {/* z-index: -2, theme-agnostic */}
<VignetteOverlay />       {/* z-index: -1, theme-agnostic */}
<TintOverlay intensity={15} className="z-0" />  {/* brightness control */}
```
```

**Step 2: Commit**

```bash
git add src/components/marketing/BackgroundOverlay/README.md
git commit -m "$(cat <<'EOF'
docs(BackgroundOverlay): update TintOverlay usage documentation

- Fix Tailwind pattern: bg-white dark:bg-black
- Add usage example with PageBackground components
- Document TintOverlay as single source of truth
EOF
)"
```

---

## Task 7: Visual Verification & Intensity Tuning

**Files:** None (manual testing only)

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test dark mode (default)**

1. Open http://localhost:3000
2. Dark mode is default for logged-out users
3. Verify:
   - Aurora gradients visible and vibrant
   - Vignette edge darkening visible
   - Overall brightness feels balanced

**Step 3: Test light mode**

1. Login to enable theme toggle (or use devtools: remove `dark` class from `<html>`)
2. Switch to light mode
3. Verify:
   - Aurora gradients still visible but lightened by white overlay
   - Vignette edges still visible
   - Not too washed out

**Step 4: Adjust intensity if needed**

If light mode too washed out → reduce intensity:
```tsx
<TintOverlay intensity={10} className="z-0" />
```

If dark mode needs more depth → increase intensity:
```tsx
<TintOverlay intensity={20} className="z-0" />
```

**Step 5: Commit if intensity changed**

```bash
git add src/app/\(marketing\)/page.tsx
git commit -m "fix(marketing): tune TintOverlay intensity to N%"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Fix TintOverlay Tailwind pattern | `BackgroundOverlay/TintOverlay.tsx` |
| 2 | Remove dark/light from AuroraBackground | `PageBackground/AuroraBackground.tsx` |
| 3 | Remove dark/light from VignetteOverlay | `PageBackground/VignetteOverlay.tsx` |
| 4 | Add TintOverlay to marketing page | `(marketing)/page.tsx` |
| 5 | Update PageBackground docs | `PageBackground/index.ts` |
| 6 | Update BackgroundOverlay README | `BackgroundOverlay/README.md` |
| 7 | Visual verification & tuning | Manual testing |

**Total commits:** 6-7 (one per task)

**Branch:** `feature/hero-background-redesign`

**Key Principle:** TintOverlay is the **single source of truth** for dark/light brightness. All other background components (Aurora, Vignette) are theme-agnostic.
