# Task 4: Migrate HeroHeadingSvg

## Summary
**Status:** ✅ Completed
**Commit:** `b5445ec`
**Branch:** `refactor/hero-section`

## Changes

### File Modified
`src/components/marketing/hero/HeroHeadingSvg.tsx`

### Before
```tsx
<span className={cn("hero-heading-svg", className)} aria-hidden="true">
  <svg
    ...
    className="hero-heading-svg__img"
```

### After
```tsx
<span
  className={cn("block w-full max-w-[720px] h-auto", className)}
  aria-hidden="true"
>
  <svg
    ...
    className="w-full h-auto max-h-[35vh] object-contain lg:max-h-none"
```

## Tailwind Classes Breakdown

### Wrapper Span
| Class | Purpose |
|-------|---------|
| `block` | Display block |
| `w-full` | Full width |
| `max-w-[720px]` | Max width 720px |
| `h-auto` | Auto height |

### SVG Element
| Class | Purpose |
|-------|---------|
| `w-full` | Full width |
| `h-auto` | Auto height |
| `max-h-[35vh]` | Max height 35vh on mobile |
| `object-contain` | Maintain aspect ratio |
| `lg:max-h-none` | No max height on desktop |

## Prior Work (Lint Fix)
Theme-aware colors were already migrated during the lint fix:
- `fill-foreground` for main text (auto theme-aware)
- `fill-[#ee4036]` for accent symbols (+, =, _)

## Verification Results

| Check | Result |
|-------|--------|
| Build | ✅ Compiled successfully in 17.9s |
| TypeScript | ✅ No type errors |
| Lint | ✅ 0 errors |

## CSS Classes to Deprecate
- `.hero-heading-svg` (lines 1290-1294 in globals.css)
- `.hero-heading-svg__img` (lines 1296-1299, 1232-1238 in globals.css)

## Next Task
Task 5: HeroCTA (Skip - already using design system correctly)
Task 6: Cleanup PawangBadge
