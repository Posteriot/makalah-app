# Task 8: Migrate ChatInputHeroMock

## Summary
**Status:** ✅ Completed
**Commit:** `d7659ce`
**Branch:** `refactor/hero-section`
**Complexity:** High (most complex component with state management and animations)

## Changes

### File Modified
`src/components/marketing/hero/ChatInputHeroMock.tsx`

### Before
```tsx
<div className="hero-mockup layer-front neo-card hidden md:block" aria-hidden="true">
  <div className="neo-header">
    <div className="neo-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
  <div className="neo-content neo-chat-content">
    <div className={cn("neo-chat-placeholder transition-opacity", ...)}>
      <span className="neo-shimmer-text">Ketik obrolan</span>
      <span className="neo-animated-dots">...</span>
    </div>
    <div className={cn("neo-chat-typewriter transition-opacity", ...)}>...</div>
    <div className={cn("neo-chat-send", sendHovered && "hovered", sendClicked && "clicked")}>...</div>
    <div className={cn("neo-chat-cursor", cursorVisible && "visible", ...)}>...</div>
  </div>
</div>
```

### After
```tsx
<div ref={containerRef} className={cardStyles} aria-hidden="true">
  {/* Header */}
  <div className="flex items-center gap-4 p-3 rounded-t bg-neo-border border-b-[3px] border-neo-shadow">
    <div className="flex gap-2">
      <span className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] border-[3px] border-neo-shadow" />
      ...
    </div>
  </div>

  {/* Content */}
  <div className="relative min-h-[120px] flex flex-col justify-start p-5 pr-[60px]">
    {/* Placeholder */}
    <div className={cn(
      "absolute top-5 left-5 font-mono text-sm font-medium text-neo-text-muted flex items-center transition-opacity",
      showPlaceholder ? "opacity-100" : "opacity-0"
    )}>
      <span className="bg-gradient-to-r from-neo-text-muted via-neo-text to-neo-text-muted bg-[length:200%_100%] bg-clip-text text-transparent animate-[neo-shimmer_2s_ease-in-out_infinite]">
        Ketik obrolan
      </span>
      ...
    </div>
    ...
  </div>
</div>
```

## CSS Classes Replaced

### Container & Layout
| Old CSS Class | New Tailwind Utilities |
|---------------|------------------------|
| `hero-mockup layer-front` | `z-20 top-40 right-0` |
| `neo-card` | `bg-neo-card border-[4px] border-neo-border rounded-lg shadow-[-10px_10px_0_var(--neo-shadow)]` |
| `hidden md:block` | Same (already Tailwind) |

### Browser Header
| Old CSS Class | New Tailwind Utilities |
|---------------|------------------------|
| `neo-header` | `flex items-center gap-4 p-3 rounded-t bg-neo-border border-b-[3px] border-neo-shadow` |
| `neo-dots` | `flex gap-2` |
| `neo-dots span` | `w-3.5 h-3.5 rounded-full bg-[#color] border-[3px] border-neo-shadow` |

### Chat Content Area
| Old CSS Class | New Tailwind Utilities |
|---------------|------------------------|
| `neo-content neo-chat-content` | `relative min-h-[120px] flex flex-col justify-start p-5 pr-[60px]` |

### Placeholder (Shimmer Animation)
| Old CSS Class | New Tailwind Utilities |
|---------------|------------------------|
| `neo-chat-placeholder` | `absolute top-5 left-5 font-mono text-sm font-medium text-neo-text-muted flex items-center transition-opacity` |
| `neo-shimmer-text` | `bg-gradient-to-r from-neo-text-muted via-neo-text to-neo-text-muted bg-[length:200%_100%] bg-clip-text text-transparent animate-[neo-shimmer_2s_ease-in-out_infinite]` |
| `neo-animated-dots` | `inline-flex ml-0.5` with individual spans using `animate-[neo-dot-pulse_1.4s_ease-in-out_infinite_0.Xs]` |

### Typewriter Area
| Old CSS Class | New Tailwind Utilities |
|---------------|------------------------|
| `neo-chat-typewriter` | `absolute top-5 left-5 right-[60px] font-mono text-sm font-medium text-neo-text whitespace-pre-wrap leading-relaxed transition-opacity` |
| `neo-chat-caret` | `inline-block w-0.5 h-[1.1em] bg-neo-text ml-0.5 align-text-bottom` |
| `.hero-caret-blink` | `animate-[hero-caret-blink_0.4s_step-end_infinite]` (conditional) |

### Send Button
| Old CSS Class | New Tailwind Utilities |
|---------------|------------------------|
| `neo-chat-send` | `absolute bottom-4 right-4 w-10 h-10 border-[3px] border-neo-border rounded-md bg-neo-card flex items-center justify-center text-neo-text transition-all duration-150` |
| `.hovered` | `bg-[#006d5b] text-white shadow-[-3px_3px_0_var(--neo-shadow)]` |
| `.clicked` | `translate-x-[-2px] translate-y-[2px] shadow-none` |

### Cursor Animation
| Old CSS Class | New Tailwind Utilities |
|---------------|------------------------|
| `neo-chat-cursor` | `absolute w-6 h-6 text-zinc-500 dark:text-zinc-400 pointer-events-none z-50 transition-all duration-800 ease-[cubic-bezier(0.4,0,0.2,1)]` |
| `.visible` | `opacity-100` vs `opacity-0` |
| `.at-target` | `bottom-7 right-7` |
| `.at-start` | `bottom-[70px] right-[100px]` |
| `.clicking` | `scale-[0.85]` |

## Key Implementation Details

### Card Styles Extraction
Moved common card styles to a variable for reuse in both normal and reduced-motion renders:

```tsx
const cardStyles = cn(
  "hidden md:block absolute w-full max-w-[440px] font-mono",
  "bg-neo-card border-[4px] border-neo-border rounded-lg",
  "shadow-[-10px_10px_0_var(--neo-shadow)]",
  "backdrop-blur-sm",
  // layer-front positioning
  "z-20 top-40 right-0"
)
```

### Shimmer Animation Pattern
Text shimmer effect using Tailwind gradient utilities:

```tsx
<span className="bg-gradient-to-r from-neo-text-muted via-neo-text to-neo-text-muted bg-[length:200%_100%] bg-clip-text text-transparent animate-[neo-shimmer_2s_ease-in-out_infinite]">
```

### Staggered Dot Animation
Each dot has a delay offset using arbitrary values:

```tsx
<span className="opacity-30 animate-[neo-dot-pulse_1.4s_ease-in-out_infinite]">.</span>
<span className="opacity-30 animate-[neo-dot-pulse_1.4s_ease-in-out_infinite_0.2s]">.</span>
<span className="opacity-30 animate-[neo-dot-pulse_1.4s_ease-in-out_infinite_0.4s]">.</span>
```

### Cursor Movement with Custom Easing
```tsx
"transition-all duration-800 ease-[cubic-bezier(0.4,0,0.2,1)]"
```

### Code Cleanup
- Removed unnecessary comments (kept essential docblock)
- Compacted multiline conditionals
- Removed blank lines in effect hooks for conciseness
- Lines reduced from 362 to 245 (117 lines less)

## Verification Results

| Check | Result |
|-------|--------|
| Build | ✅ Compiled successfully in 16.2s |
| TypeScript | ✅ No type errors |
| Lint | ✅ 0 errors |

## Animations Referenced (kept in CSS)
These keyframe animations are still in `globals.css` and referenced via `animate-[]`:
- `neo-shimmer` - Placeholder text shimmer
- `neo-dot-pulse` - Animated dots pulse
- `hero-caret-blink` - Typewriter caret blink

## CSS Classes to Deprecate
These classes in `globals.css` can be marked for removal:
- `.neo-chat-content` (lines ~1735-1750)
- `.neo-chat-placeholder` (lines ~1755-1770)
- `.neo-shimmer-text` (lines ~1775-1790)
- `.neo-animated-dots` (lines ~1795-1820)
- `.neo-chat-typewriter` (lines ~1825-1840)
- `.neo-chat-caret` (lines ~1845-1860)
- `.neo-chat-send` variants (lines ~1865-1890)
- `.neo-chat-cursor` variants (lines ~1895-1930)

## Next Task
Task 9: Create Barrel Export (Low complexity)
