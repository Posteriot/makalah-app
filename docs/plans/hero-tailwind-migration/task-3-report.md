# Task 3: Migrate HeroHeading

## Summary
**Status:** ✅ Completed
**Commit:** `0351601`
**Branch:** `refactor/hero-section`

## Changes

### File Modified
`src/components/marketing/hero/HeroHeading.tsx`

### Before
```tsx
"use client"

import { HeroHeadingSvg } from "@/components/marketing/hero/HeroHeadingSvg"

export function HeroHeading() {
  return (
    <h1 className="hero-heading hero-heading--svg">
      <span className="sr-only">...</span>
      <HeroHeadingSvg />
    </h1>
  )
}
```

### After
```tsx
import { HeroHeadingSvg } from "@/components/marketing/hero/HeroHeadingSvg"

export function HeroHeading() {
  return (
    <h1 className="text-[0px] leading-[0]">
      <span className="sr-only">...</span>
      <HeroHeadingSvg />
    </h1>
  )
}
```

## Key Changes

| Change | Reason |
|--------|--------|
| Remove `"use client"` | HeroHeadingSvg no longer uses hooks (fixed earlier) |
| `text-[0px] leading-[0]` | Hide text element, SVG handles visual display |
| Keep `sr-only` span | Accessibility - screen readers still read the heading |

## Tailwind Classes Breakdown

| Class | Purpose |
|-------|---------|
| `text-[0px]` | Zero font size (hides text for SVG-only display) |
| `leading-[0]` | Zero line height (removes vertical space) |

## Verification Results

| Check | Result |
|-------|--------|
| Build | ✅ Compiled successfully in 17.2s |
| TypeScript | ✅ No type errors |
| Lint | ✅ 0 errors |

## CSS Classes to Deprecate
- `.hero-heading` (lines 1275-1283 in globals.css)
- `.hero-heading--svg` (lines 1285-1288 in globals.css)

## Next Task
Task 4: Migrate HeroHeadingSvg (already partially done during lint fix)
