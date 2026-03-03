# Sidebar Max-Width Constraint — Design Document

## Problem Statement

Sidebar resizer di chat layout tidak memiliki batas lebar maksimum yang cerdas. User bisa drag sidebar ke kanan sampai menerjang chat area, menyebabkan:

1. **Chat messages terpotong** — konten percakapan tidak readable
2. **Approval panel rusak** — button "Revisi" dan "Setujui & Lanjutkan" tumpang tindih atau terpotong
3. **UX degradasi** — layout chat jadi unusable tanpa user sadar kenapa

### Screenshot Evidence

- `screenshots/Screen Shot 2026-03-03 at 20.10.08.png` — sidebar terlalu lebar, chat area tersisa sangat sempit
- `screenshots/Screen Shot 2026-03-03 at 20.09.39.png` — approval panel terpotong dan tidak fungsional

## Root Cause Analysis

### Current Implementation (`ChatLayout.tsx`)

```
Grid: [ActivityBar 48px] [Sidebar Npx] [Resizer 2px] [Main 1fr] [Resizer 2px] [Panel Mpx]
```

**`getMaxWidth()` (line 120-123):**
```ts
const getMaxWidth = useCallback(() => {
  if (typeof window === "undefined") return 600
  return window.innerWidth * 0.5
}, [])
```

**Problem:** Max width = 50% viewport **TANPA memperhitungkan** elemen lain:
- Activity Bar: 48px (always present)
- Left Resizer: 2px
- Right Resizer: 2px (saat artifact panel open)
- Artifact Panel: 480px default (saat open)

### Worst-Case Calculation (viewport 1440px)

| Element | Width |
|---------|-------|
| Activity Bar | 48px |
| Sidebar (max) | **720px** (50% of 1440) |
| Left Resizer | 2px |
| **Main Content** | **188px** |
| Right Resizer | 2px |
| Artifact Panel | 480px |
| **Total** | 1440px |

Main content 188px = **terlalu sempit** untuk approval panel (~350px minimum).

### Same Issue on Panel Side

`handlePanelResize` juga pakai `getMaxWidth()` yang sama. Artifact panel bisa membesar tanpa mempertimbangkan sidebar width.

## Solution Design

### Principle: Minimum Main Content Guarantee

Main content area harus **selalu** punya lebar minimum yang cukup untuk:
- Chat message bubbles (readable)
- Approval panel buttons side-by-side
- Input area functional

**Minimum main content width: 480px**

### Approach: Context-Aware Max Width Functions

Ganti single `getMaxWidth()` dengan dua fungsi terpisah yang saling aware:

#### `getSidebarMaxWidth()`

```
maxSidebar = viewport - activityBar - resizers - panelWidth(if open) - MIN_MAIN_CONTENT
```

#### `getPanelMaxWidth()`

```
maxPanel = viewport - activityBar - resizers - sidebarWidth(if expanded) - MIN_MAIN_CONTENT
```

### Calculation Example (viewport 1440px, panel open 480px)

```
maxSidebar = 1440 - 48 - 4 - 480 - 480 = 428px
```

Sidebar max ~428px, main content guaranteed 480px minimum.

### Calculation Example (viewport 1440px, panel closed)

```
maxSidebar = 1440 - 48 - 2 - 0 - 480 = 910px
```

Tanpa artifact panel, sidebar bisa lebih lebar — tapi main content tetap dijamin.

## Constants

```ts
const MIN_MAIN_CONTENT_WIDTH = 480   // NEW: minimum chat area width
const DEFAULT_SIDEBAR_WIDTH = 280    // unchanged
const DEFAULT_PANEL_WIDTH = 480      // unchanged
const MIN_SIDEBAR_WIDTH = 180        // unchanged
const MIN_PANEL_WIDTH = 280          // unchanged
const COLLAPSE_THRESHOLD = 100       // unchanged
const ACTIVITY_BAR_WIDTH = 48        // NEW: explicit constant
const RESIZER_WIDTH = 2              // NEW: explicit constant
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/chat/layout/ChatLayout.tsx` | Replace `getMaxWidth` with context-aware functions |

**Only 1 file modified.** No new files needed.

## Edge Cases

1. **Very narrow viewport (< 800px)**: Desktop grid hidden, mobile layout used (Sheet drawer). No impact.
2. **Artifact panel opens while sidebar wide**: Sidebar should auto-shrink if it would violate min main content. Handled by clamping in resize handler.
3. **Both sidebar and panel at max**: Each function respects the other's current width, preventing overlap.
4. **Window resize**: `getMaxWidth` recalculated on each drag event (uses live `window.innerWidth`). No stale cache.

## Non-Goals

- Tidak mengubah default widths
- Tidak mengubah collapse behavior
- Tidak mengubah mobile layout
- Tidak menambah UI elements baru
