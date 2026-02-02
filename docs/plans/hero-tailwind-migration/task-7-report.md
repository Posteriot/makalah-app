# Task 7: Migrate HeroResearchMock

## Summary
**Status:** ✅ Completed
**Commit:** `48ea903`
**Branch:** `refactor/hero-section`

## Changes

### File Modified
`src/components/marketing/hero/HeroResearchMock.tsx`

### Before
```tsx
<div className="hero-mockup layer-back hidden md:block neo-card">
  <div className="neo-header">
    <div className="neo-dots">
      <span></span>
      ...
```

### After
```tsx
<div
  className={cn(
    "hidden md:block absolute w-full font-mono",
    "bg-neo-card border-[4px] border-neo-border rounded-lg",
    "shadow-[var(--spacing-neo-shadow-x)_var(--spacing-neo-shadow-y)_0_var(--neo-shadow)]",
    "backdrop-blur-sm",
    "z-10 -top-10 scale-[0.88] -translate-x-[60px]"
  )}
>
  <div className="flex items-center gap-4 p-3 rounded-t bg-neo-border border-b-[3px] border-neo-shadow">
    <div className="flex gap-2">
      <span className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] border-[3px] border-neo-shadow" />
      ...
```

## CSS Classes Replaced

| Old CSS Class | New Tailwind Utilities |
|---------------|------------------------|
| `hero-mockup layer-back` | `z-10 -top-10 scale-[0.88] -translate-x-[60px]` |
| `neo-card` | `bg-neo-card border-[4px] border-neo-border rounded-lg shadow-[...]` |
| `neo-header` | `flex items-center gap-4 p-3 rounded-t bg-neo-border border-b-[3px]` |
| `neo-dots span` | `w-3.5 h-3.5 rounded-full bg-[#color] border-[3px] border-neo-shadow` |
| `neo-url` | `font-mono text-xs font-semibold text-neo-text bg-white/90 dark:bg-zinc-800 px-3.5 py-1.5 rounded border-[3px]` |
| `neo-content` | `p-5 font-mono text-neo-text` |
| `neo-progress-bar` | `h-3 bg-neo-muted border-[3px] border-neo-border overflow-hidden` |
| `neo-progress-fill` | `h-full bg-success transition-all duration-300` |
| `neo-timeline` | `flex flex-col gap-0 font-mono` |
| `neo-timeline-item` | `flex gap-3 relative` |
| `neo-dot-col` | `flex flex-col items-center` |
| `neo-dot.completed` | `bg-success` |
| `neo-dot.current` | `bg-primary ring-4 ring-primary/30` |
| `neo-dot.pending` | `bg-transparent` |
| `neo-line` | `w-[3px] flex-1 min-h-5` |
| `neo-line.completed` | `bg-success` |
| `neo-label-col` | `pb-4` (with `pb-0` for last item) |
| `neo-label` | `font-mono text-xs font-semibold` with state-based colors |
| `neo-status` | `font-mono text-[10px] font-medium mt-0.5 uppercase tracking-wide` |
| `neo-more-stages` | `font-mono text-[11px] font-semibold text-neo-text-muted text-center pt-2.5 pb-1 border-t-[3px] border-dashed border-neo-border mt-3` |

## Key Implementation Details

### Conditional Styling with cn()
Used `cn()` from `@/lib/utils` for conditional class composition:

```tsx
className={cn(
  "w-3.5 h-3.5 rounded-full border-[3px] border-neo-border flex-shrink-0 z-[1]",
  stage.state === "completed" && "bg-success",
  stage.state === "current" && "bg-primary ring-4 ring-primary/30",
  stage.state === "pending" && "bg-transparent"
)}
```

### Design Token Usage
Uses mapped neo-* tokens from `@theme inline`:
- `bg-neo-card` → `var(--neo-card-bg)`
- `border-neo-border` → `var(--neo-border)`
- `text-neo-text` → `var(--neo-text)`
- `text-neo-text-muted` → `var(--neo-text-muted)`
- `bg-neo-muted` → `var(--neo-muted)`

### Shadow with CSS Variables
```tsx
"shadow-[var(--spacing-neo-shadow-x)_var(--spacing-neo-shadow-y)_0_var(--neo-shadow)]"
```

## Verification Results

| Check | Result |
|-------|--------|
| Build | ✅ Compiled successfully in 17.8s |
| TypeScript | ✅ No type errors |
| Lint | ✅ 0 errors |

## Additional Commit
**Commit:** `888084f`
- Fixed import paths in `src/app/(marketing)/page.tsx` after directory restructure
- Changed from `@/components/marketing/*` to `@/components/marketing/hero/*`

## CSS Classes to Deprecate
These classes in `globals.css` can be marked for removal:
- `.neo-header` (line ~1550)
- `.neo-dots` (line ~1560)
- `.neo-url` (line ~1580)
- `.neo-content` (line ~1600)
- `.neo-progress-bar` (line ~1620)
- `.neo-progress-fill` (line ~1630)
- `.neo-timeline` (line ~1650)
- `.neo-timeline-item` (line ~1660)
- `.neo-dot-col` (line ~1680)
- `.neo-dot` variants (lines ~1690-1710)
- `.neo-line` variants (line ~1720)
- `.neo-label-col` (line ~1730)
- `.neo-label` variants (lines ~1740-1760)
- `.neo-status` variants (lines ~1770-1790)
- `.neo-more-stages` (line ~1800)

## Next Task
Task 8: Migrate ChatInputHeroMock (High complexity)
