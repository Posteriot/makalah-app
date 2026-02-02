# Task 1: Add Neo Design Tokens to @theme inline

## Summary
**Status:** ✅ Completed
**Commit:** `f0b1b69`
**Branch:** `refactor/hero-section`

## Changes

### File Modified
`src/app/globals.css`

### Color Tokens Added (line ~75-81)
```css
/* Neo-Brutalist Design System */
--color-neo-card: var(--neo-card-bg);
--color-neo-border: var(--neo-border);
--color-neo-shadow: var(--neo-shadow);
--color-neo-muted: var(--neo-muted);
--color-neo-text: var(--neo-text);
--color-neo-text-muted: var(--neo-text-muted);
--color-neo-input: var(--neo-input-bg);
```

### Spacing Tokens Added (line ~141-144)
```css
/* Neo-Brutalist Spacing */
--spacing-neo-border: 4px;
--spacing-neo-border-sm: 3px;
--spacing-neo-shadow-x: -8px;
--spacing-neo-shadow-y: 8px;
```

## Tailwind Utilities Enabled

These tokens now enable the following Tailwind utility classes:

| Token | Tailwind Class Examples |
|-------|------------------------|
| `--color-neo-card` | `bg-neo-card`, `text-neo-card` |
| `--color-neo-border` | `border-neo-border`, `bg-neo-border` |
| `--color-neo-shadow` | `text-neo-shadow`, `bg-neo-shadow` |
| `--color-neo-muted` | `bg-neo-muted` |
| `--color-neo-text` | `text-neo-text` |
| `--color-neo-text-muted` | `text-neo-text-muted` |
| `--color-neo-input` | `bg-neo-input` |
| `--spacing-neo-border` | Used via `var()` in arbitrary values |
| `--spacing-neo-shadow-x/y` | Used via `var()` in box-shadow |

## Verification Results

| Check | Result |
|-------|--------|
| Build | ✅ Compiled successfully |
| TypeScript | ✅ No type errors |
| Lint | ⚠️ Pre-existing error in HeroHeadingSvg.tsx (not related) |

## Pre-existing Issue

There's a lint error in `HeroHeadingSvg.tsx` regarding `setMounted(true)` in useEffect. This is a **pre-existing issue** not introduced by this task. The file was only moved, not modified.

## Next Task
Task 2: Migrate HeroSubheading to use Tailwind utilities
