# Task 10: Cleanup Unused CSS

## Summary
**Status:** ✅ Completed
**Commit:** `098b5ac`
**Branch:** `refactor/hero-section`
**Complexity:** Low

## Changes

### File Modified
`src/app/globals.css`

### Added DEPRECATED Comments

Two deprecation blocks were added to mark CSS classes that have been migrated to Tailwind:

**1. Hero Heading Section (line ~1290)**
```css
/* ==========================================================================
 * DEPRECATED: Hero Heading Classes (migrated to Tailwind)
 * These classes are kept for backwards compatibility.
 * TODO: Remove after verifying all components use Tailwind utilities.
 * Commits: 0351601, b5445ec, 35b23b5
 * ========================================================================== */
```

**2. Neo-Brutalist Section (line ~1540)**
```css
/* ==========================================================================
 * DEPRECATED: Neo-Brutalist Classes (migrated to Tailwind)
 * These classes are kept for backwards compatibility.
 * TODO: Remove after verifying all components use Tailwind utilities.
 * Commits: 48ea903, d7659ce
 * ========================================================================== */
```

### Added KEEP Comments for Keyframes

Keyframes that are still used by Tailwind's `animate-[]` arbitrary value syntax:

| Keyframe | Usage in Components |
|----------|---------------------|
| `@keyframes neo-shimmer` | `animate-[neo-shimmer_2s_ease-in-out_infinite]` in ChatInputHeroMock |
| `@keyframes neo-dot-pulse` | `animate-[neo-dot-pulse_1.4s_ease-in-out_infinite_0.Xs]` in ChatInputHeroMock |
| `@keyframes hero-caret-blink` | `animate-[hero-caret-blink_0.4s_step-end_infinite]` in ChatInputHeroMock |
| `@keyframes badge-dot-blink` | `animate-[badge-dot-blink_1.5s_ease-in-out_infinite]` in PawangBadge |

## Classes Categorization

### DEPRECATED (Migrated to Tailwind)

| Category | Classes | Migration Commits |
|----------|---------|-------------------|
| Hero Heading | `.hero-heading`, `.hero-heading--svg`, `.hero-heading-svg`, `.hero-heading-svg__img` | 0351601, b5445ec |
| Hero Subheading | `.hero-subheading` | 35b23b5 |
| Neo Card Base | `.neo-card` | 48ea903, d7659ce |
| Neo Header | `.neo-header`, `.neo-dots`, `.neo-url` | 48ea903, d7659ce |
| Neo Content | `.neo-content` | 48ea903, d7659ce |
| Neo Progress | `.neo-progress-bar`, `.neo-progress-fill` | 48ea903 |
| Neo Timeline | `.neo-timeline`, `.neo-timeline-item`, `.neo-dot`, `.neo-line`, `.neo-label-col`, `.neo-label`, `.neo-status`, `.neo-more-stages` | 48ea903 |
| Neo Chat | `.neo-chat-content`, `.neo-chat-placeholder`, `.neo-shimmer-text`, `.neo-animated-dots`, `.neo-chat-typewriter`, `.neo-chat-caret`, `.neo-chat-send`, `.neo-chat-cursor` | d7659ce |
| Layer Positioning | `.layer-back`, `.layer-front`, `.layer-back.neo-card`, `.layer-front.neo-card` | 48ea903, d7659ce |

### KEPT (Still in Use by page.tsx)

| Category | Classes | Reason |
|----------|---------|--------|
| Layout | `.hero-section`, `.hero-flex`, `.hero-left`, `.hero-right` | Used in page.tsx JSX |
| Background | `.hero-vivid`, `.hero-vignette`, `.hero-grid-thin` | Background effects in page.tsx |
| Decorative | `.hero-diagonal-stripes`, `.hero-ide-line-y`, `.hero-fade-bottom` | Visual elements in page.tsx |
| Components | `.hero-actions`, `.mockup-layered-container` | Layout containers in page.tsx |
| Base Mockup | `.hero-mockup` | Provides base shadow styling |

## Future Cleanup Plan

When ready to remove deprecated CSS:

1. **Verify no usage** - Search codebase for each class
2. **Remove in order:**
   - Hero heading classes (lines ~1290-1340)
   - Hero subheading classes (lines ~1342-1367)
   - Neo-brutalist card classes (lines ~1534-1942)
3. **Keep keyframes** - They're still used by Tailwind animate-[]

## Verification Results

| Check | Result |
|-------|--------|
| Build | ✅ Compiled successfully in 16.8s |
| TypeScript | ✅ No type errors |
| Lint | ✅ 0 errors |

## Next Task
Task 11: Final Verification (comprehensive testing)
