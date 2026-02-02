# Hero Tailwind Migration - Work Log

## Task 1: Add Neo Design Tokens to @theme inline
**Status:** ✅ Done
**Date:** 2026-02-02
**Commit:** `f0b1b69`

### Changes Made
- Added neo-* color tokens to `@theme inline` in `globals.css`
- Added neo-* spacing tokens to `@theme inline` in `globals.css`

### Verification
- [x] Build: Compiled successfully
- [x] Commit: Created with proper message

### Notes
- Pre-existing lint error in `HeroHeadingSvg.tsx` (setMounted pattern) - fixed separately
- File moves from earlier session were also included in commit

---

## Lint Fix: HeroHeadingSvg.tsx
**Status:** ✅ Done
**Date:** 2026-02-02
**Commit:** `97d4a4e`

### Problem
ESLint error: "Avoid calling setState() directly within an effect" (`react-hooks/set-state-in-effect`)

### Solution
Replaced JavaScript-based theme detection with CSS-based approach:
- Removed `useEffect`, `useState`, `useTheme` hooks
- Used Tailwind `fill-foreground` class for theme-aware text color
- Used `fill-[#ee4036]` for accent color

### Verification
- [x] Lint: 0 errors (only 4 warnings in `.agent/` folder)
- [x] Build: Compiled successfully

---

## Task 2: Migrate HeroSubheading
**Status:** ✅ Done
**Date:** 2026-02-02
**Commit:** `35b23b5`

### Changes Made
- Replaced `.hero-subheading` CSS class with Tailwind utilities
- Classes: `font-mono text-base md:text-lg font-medium text-zinc-600 dark:text-zinc-200 max-w-[520px] leading-relaxed`

### Verification
- [x] Build: Compiled successfully
- [x] Lint: 0 errors
- [x] Commit: Created with proper message

---

## Task 3: Migrate HeroHeading
**Status:** ✅ Done
**Date:** 2026-02-02
**Commit:** `0351601`

### Changes Made
- Replaced `.hero-heading .hero-heading--svg` CSS classes with Tailwind utilities
- Classes: `text-[0px] leading-[0]` (hide text for SVG display)
- Removed `"use client"` directive (no longer needed)

### Verification
- [x] Build: Compiled successfully
- [x] Lint: 0 errors
- [x] Commit: Created with proper message

---

## Task 4: Migrate HeroHeadingSvg
**Status:** ✅ Done
**Date:** 2026-02-02
**Commit:** `b5445ec`

### Changes Made
- Replaced `.hero-heading-svg` with `block w-full max-w-[720px] h-auto`
- Replaced `.hero-heading-svg__img` with `w-full h-auto max-h-[35vh] object-contain lg:max-h-none`
- Theme colors already migrated during lint fix (fill-foreground, fill-[#ee4036])

### Verification
- [x] Build: Compiled successfully
- [x] Lint: 0 errors
- [x] Commit: Created with proper message

---

## Task 5: Cleanup HeroCTA
**Status:** ✅ Done (Verified - No changes needed)
**Date:** 2026-02-02
**Commit:** `f5e1ea5` (empty commit for documentation)

### Analysis
- `btn-brand`: Design system component class (defined in `@layer components`)
- Tailwind utilities for sizing: `font-sans text-[12px] font-medium px-3 py-1.5 inline-flex items-center`

### Conclusion
Already follows design system best practices - no migration needed.

---

## Task 6: Cleanup PawangBadge
**Status:** ✅ Done
**Date:** 2026-02-02
**Commit:** `377aab4`

### Changes Made
- Removed unused `badge-link` CSS class
- Replaced with `inline-block mb-[18px] lg:mb-0`
- All other styles already using Tailwind (no changes needed)

### Verification
- [x] Build: Compiled successfully
- [x] Lint: 0 errors
- [x] Commit: Created with proper message

---

## Task 7: Migrate HeroResearchMock
**Status:** ✅ Done
**Date:** 2026-02-02
**Commit:** `48ea903`

### Changes Made
- Replaced `hero-mockup layer-back neo-card` with Tailwind utilities
- Container: `bg-neo-card border-[4px] border-neo-border rounded-lg shadow-[...]`
- Browser header: flex layout with traffic light dots
- Progress bar: `h-3 bg-neo-muted border-[3px]` with `bg-success` fill
- Timeline: flexbox layout with conditional `cn()` state styling
- All `neo-*` CSS classes (neo-header, neo-dots, neo-content, neo-timeline, etc.) replaced
- Added `cn()` import for conditional class composition

### CSS Classes Replaced
| Old CSS Class | New Tailwind |
|---------------|--------------|
| `hero-mockup layer-back` | `z-10 -top-10 scale-[0.88] -translate-x-[60px]` |
| `neo-card` | `bg-neo-card border-[4px] border-neo-border rounded-lg shadow-[...]` |
| `neo-header` | `flex items-center gap-4 p-3 rounded-t bg-neo-border border-b-[3px]` |
| `neo-dots` | `flex gap-2` with colored dot spans |
| `neo-url` | `font-mono text-xs font-semibold text-neo-text ...` |
| `neo-content` | `p-5 font-mono text-neo-text` |
| `neo-progress-bar` | `h-3 bg-neo-muted border-[3px] border-neo-border overflow-hidden` |
| `neo-timeline` | `flex flex-col gap-0 font-mono` |
| `neo-dot` | `w-3.5 h-3.5 rounded-full border-[3px] border-neo-border` with state colors |
| `neo-line` | `w-[3px] flex-1 min-h-5` with conditional `bg-success` |
| `neo-label` | `font-mono text-xs font-semibold` with state colors |
| `neo-more-stages` | `font-mono text-[11px] font-semibold text-neo-text-muted ...` |

### Verification
- [x] Build: Compiled successfully in 17.8s
- [x] Lint: 0 errors
- [x] Commit: Created with proper message

### Additional Commit
**Commit:** `888084f` - Fixed import paths in `page.tsx` after directory restructure

---

## Task 8: Migrate ChatInputHeroMock
**Status:** ✅ Done
**Date:** 2026-02-02
**Commit:** `d7659ce`

### Changes Made
- Replaced `hero-mockup layer-front neo-card` with Tailwind utilities
- Container: `bg-neo-card border-[4px] border-neo-border rounded-lg shadow-[-10px_10px_0_var(--neo-shadow)]`
- Layer-front positioning: `z-20 top-40 right-0`
- Browser header: flex layout with traffic light dots
- Chat placeholder: shimmer animation via `animate-[neo-shimmer_2s_ease-in-out_infinite]`
- Animated dots: `animate-[neo-dot-pulse_1.4s_ease-in-out_infinite]` with delays
- Typewriter caret: `bg-neo-text` with conditional `animate-[hero-caret-blink_0.4s_step-end_infinite]`
- Send button: conditional hover/click states via `cn()`
- Cursor: `transition-all duration-800 ease-[cubic-bezier(0.4,0,0.2,1)]`
- Reduced motion fallback uses same Tailwind pattern

### CSS Classes Replaced
| Old CSS Class | New Tailwind |
|---------------|--------------|
| `hero-mockup layer-front` | `z-20 top-40 right-0` |
| `neo-card` | `bg-neo-card border-[4px] border-neo-border rounded-lg shadow-[...]` |
| `neo-header` | `flex items-center gap-4 p-3 rounded-t bg-neo-border border-b-[3px]` |
| `neo-dots` | `flex gap-2` with colored dot spans |
| `neo-content neo-chat-content` | `relative min-h-[120px] flex flex-col justify-start p-5 pr-[60px]` |
| `neo-chat-placeholder` | `absolute top-5 left-5 font-mono text-sm font-medium text-neo-text-muted flex items-center` |
| `neo-shimmer-text` | `bg-gradient-to-r from-neo-text-muted via-neo-text to-neo-text-muted bg-[length:200%_100%] bg-clip-text text-transparent animate-[neo-shimmer_...]` |
| `neo-animated-dots` | `inline-flex ml-0.5` with individual animated spans |
| `neo-chat-typewriter` | `absolute top-5 left-5 right-[60px] font-mono text-sm font-medium text-neo-text whitespace-pre-wrap` |
| `neo-chat-caret` | `inline-block w-0.5 h-[1.1em] bg-neo-text ml-0.5 align-text-bottom` |
| `neo-chat-send` | `absolute bottom-4 right-4 w-10 h-10 border-[3px] border-neo-border rounded-md bg-neo-card flex items-center justify-center` |
| `neo-chat-send.hovered` | `bg-[#006d5b] text-white shadow-[-3px_3px_0_var(--neo-shadow)]` |
| `neo-chat-send.clicked` | `translate-x-[-2px] translate-y-[2px] shadow-none` |
| `neo-chat-cursor` | `absolute w-6 h-6 text-zinc-500 dark:text-zinc-400 pointer-events-none z-50` |
| `neo-chat-cursor.visible` | `opacity-100` |
| `neo-chat-cursor.at-target` | `bottom-7 right-7` |
| `neo-chat-cursor.at-start` | `bottom-[70px] right-[100px]` |
| `neo-chat-cursor.clicking` | `scale-[0.85]` |

### Verification
- [x] Build: Compiled successfully in 16.2s
- [x] Lint: 0 errors
- [x] Commit: Created with proper message

---

## Task 9: Create Barrel Export
**Status:** ✅ Done
**Date:** 2026-02-02
**Commit:** `d6e3f19`

### Changes Made
- Created `src/components/marketing/hero/index.ts` with all hero component exports
- Updated `src/app/(marketing)/page.tsx` to use single barrel import

### Files Created
`src/components/marketing/hero/index.ts`:
```ts
export { ChatInputHeroMock } from "./ChatInputHeroMock"
export { HeroCTA } from "./HeroCTA"
export { HeroHeading } from "./HeroHeading"
export { HeroHeadingSvg } from "./HeroHeadingSvg"
export { HeroResearchMock } from "./HeroResearchMock"
export { HeroSubheading } from "./HeroSubheading"
export { PawangBadge } from "./PawangBadge"
```

### Import Change
Before (6 imports):
```tsx
import { PawangBadge } from "@/components/marketing/hero/PawangBadge"
import { ChatInputHeroMock } from "@/components/marketing/hero/ChatInputHeroMock"
import { HeroResearchMock } from "@/components/marketing/hero/HeroResearchMock"
import { HeroHeading } from "@/components/marketing/hero/HeroHeading"
import { HeroSubheading } from "@/components/marketing/hero/HeroSubheading"
import { HeroCTA } from "@/components/marketing/hero/HeroCTA"
```

After (1 barrel import):
```tsx
import {
  PawangBadge,
  ChatInputHeroMock,
  HeroResearchMock,
  HeroHeading,
  HeroSubheading,
  HeroCTA,
} from "@/components/marketing/hero"
```

### Verification
- [x] Build: Compiled successfully in 17.8s
- [x] Lint: 0 errors
- [x] Commit: Created with proper message

---

## Task 10: Cleanup Unused CSS
**Status:** ✅ Done
**Date:** 2026-02-02
**Commit:** `098b5ac`

### Changes Made
Added documentation comments to `src/app/globals.css`:

**DEPRECATED Comments (for classes migrated to Tailwind):**
- Before `.hero-heading` (line ~1290) - Hero heading classes
- Before `.neo-card` (line ~1540) - Neo-brutalist card classes

**KEEP Comments (for keyframes still used by Tailwind animate-[]):**
- `@keyframes neo-shimmer` - Used by `animate-[neo-shimmer_2s_ease-in-out_infinite]`
- `@keyframes neo-dot-pulse` - Used by `animate-[neo-dot-pulse_1.4s_...]`
- `@keyframes hero-caret-blink` - Used by `animate-[hero-caret-blink_0.4s_...]`
- `@keyframes badge-dot-blink` - Used by `animate-[badge-dot-blink_1.5s_...]`

### Classes Marked DEPRECATED
| Category | Classes |
|----------|---------|
| Hero Heading | `.hero-heading`, `.hero-heading--svg`, `.hero-heading-svg`, `.hero-heading-svg__img` |
| Hero Subheading | `.hero-subheading` |
| Neo Card | `.neo-card`, `.neo-header`, `.neo-dots`, `.neo-url`, `.neo-content` |
| Neo Progress | `.neo-progress-bar`, `.neo-progress-fill` |
| Neo Timeline | `.neo-timeline`, `.neo-timeline-item`, `.neo-dot`, `.neo-line`, `.neo-label`, `.neo-status` |
| Neo Chat | `.neo-chat-content`, `.neo-chat-placeholder`, `.neo-shimmer-text`, `.neo-animated-dots`, `.neo-chat-typewriter`, `.neo-chat-caret`, `.neo-chat-send`, `.neo-chat-cursor` |
| Layer Positioning | `.layer-back`, `.layer-front` |

### Classes KEPT (still in use)
- `.hero-section`, `.hero-flex`, `.hero-left`, `.hero-right` (layout in page.tsx)
- `.hero-vivid`, `.hero-vignette`, `.hero-grid-thin` (background effects)
- `.hero-diagonal-stripes`, `.hero-ide-line-y`, `.hero-fade-bottom` (decorative)
- `.hero-actions`, `.mockup-layered-container` (layout in page.tsx)
- `.hero-mockup` base styles (used for shadows)

### Verification
- [x] Build: Compiled successfully in 16.8s
- [x] Lint: 0 errors
- [x] Commit: Created with proper message
