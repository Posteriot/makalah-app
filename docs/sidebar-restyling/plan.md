# Sidebar Max-Width Constraint — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent sidebar and artifact panel from exceeding a smart max width that guarantees minimum usable chat area.

**Architecture:** Replace the single `getMaxWidth()` in `ChatLayout.tsx` with two context-aware functions (`getSidebarMaxWidth` and `getPanelMaxWidth`) that calculate max width dynamically based on other elements' current sizes. Add `MIN_MAIN_CONTENT_WIDTH` constant as the floor guarantee.

**Tech Stack:** React (useState/useCallback hooks), TypeScript, CSS Grid layout

---

### Task 1: Add Constants and Context-Aware Max Width Functions

**Files:**
- Modify: `src/components/chat/layout/ChatLayout.tsx:55-72` (constants block)
- Modify: `src/components/chat/layout/ChatLayout.tsx:119-123` (getMaxWidth function)

**Step 1: Write the failing test**

Create test file that verifies max width calculation logic:

```tsx
// __tests__/sidebar-max-width.test.ts
import { describe, it, expect } from "vitest"

/**
 * Pure function extracted for testability.
 * Mirrors the logic that will live inside ChatLayout.
 */
function calcSidebarMaxWidth(
  viewportWidth: number,
  panelWidth: number,
  isPanelOpen: boolean
): number {
  const ACTIVITY_BAR = 48
  const RESIZER_LEFT = 2
  const RESIZER_RIGHT = isPanelOpen ? 2 : 0
  const panel = isPanelOpen ? panelWidth : 0
  const MIN_MAIN = 480
  const MIN_SIDEBAR = 180

  const max = viewportWidth - ACTIVITY_BAR - RESIZER_LEFT - RESIZER_RIGHT - panel - MIN_MAIN
  return Math.max(MIN_SIDEBAR, max)
}

function calcPanelMaxWidth(
  viewportWidth: number,
  sidebarWidth: number,
  isSidebarCollapsed: boolean
): number {
  const ACTIVITY_BAR = 48
  const RESIZER_LEFT = isSidebarCollapsed ? 0 : 2
  const RESIZER_RIGHT = 2
  const sidebar = isSidebarCollapsed ? 0 : sidebarWidth
  const MIN_MAIN = 480
  const MIN_PANEL = 280

  const max = viewportWidth - ACTIVITY_BAR - RESIZER_LEFT - RESIZER_RIGHT - sidebar - MIN_MAIN
  return Math.max(MIN_PANEL, max)
}

describe("Sidebar max width calculation", () => {
  it("limits sidebar when artifact panel is open (1440px viewport)", () => {
    // 1440 - 48 - 2 - 2 - 480 - 480 = 428
    const max = calcSidebarMaxWidth(1440, 480, true)
    expect(max).toBe(428)
  })

  it("allows wider sidebar when panel is closed (1440px viewport)", () => {
    // 1440 - 48 - 2 - 0 - 0 - 480 = 910
    const max = calcSidebarMaxWidth(1440, 480, false)
    expect(max).toBe(910)
  })

  it("never goes below MIN_SIDEBAR_WIDTH even on tiny viewport", () => {
    const max = calcSidebarMaxWidth(600, 480, true)
    expect(max).toBe(180) // MIN_SIDEBAR_WIDTH floor
  })

  it("adjusts to actual panel width, not default", () => {
    // 1440 - 48 - 2 - 2 - 600 - 480 = 308
    const max = calcSidebarMaxWidth(1440, 600, true)
    expect(max).toBe(308)
  })
})

describe("Panel max width calculation", () => {
  it("limits panel when sidebar is expanded (1440px viewport)", () => {
    // 1440 - 48 - 2 - 2 - 280 - 480 = 628
    const max = calcPanelMaxWidth(1440, 280, false)
    expect(max).toBe(628)
  })

  it("allows wider panel when sidebar is collapsed", () => {
    // 1440 - 48 - 0 - 2 - 0 - 480 = 910
    const max = calcPanelMaxWidth(1440, 280, true)
    expect(max).toBe(910)
  })

  it("never goes below MIN_PANEL_WIDTH", () => {
    const max = calcPanelMaxWidth(600, 280, false)
    expect(max).toBe(280) // MIN_PANEL_WIDTH floor
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/sidebar-max-width.test.ts`
Expected: PASS (these are pure function tests, logic defined in test file)

> Note: Tests define the pure functions inline. Once verified, we implement the same logic in ChatLayout.

**Step 3: Update constants in ChatLayout.tsx**

In `src/components/chat/layout/ChatLayout.tsx`, replace the constants block (lines 55-60):

```ts
// Default dimensions
const DEFAULT_SIDEBAR_WIDTH = 280
const DEFAULT_PANEL_WIDTH = 480
const MIN_SIDEBAR_WIDTH = 180
const MIN_PANEL_WIDTH = 280
const COLLAPSE_THRESHOLD = 100
const MIN_MAIN_CONTENT_WIDTH = 480  // NEW: guarantees usable chat area
const ACTIVITY_BAR_WIDTH = 48       // NEW: matches --activity-bar-width
const RESIZER_WIDTH = 2             // NEW: matches grid resizer column
```

**Step 4: Replace `getMaxWidth` with two context-aware functions**

Remove the old `getMaxWidth` (lines 119-123) and replace with:

```ts
// Sidebar max width — considers panel width and guarantees min main content
const getSidebarMaxWidth = useCallback(() => {
  if (typeof window === "undefined") return 600
  const resizerLeft = RESIZER_WIDTH
  const resizerRight = isArtifactPanelOpen ? RESIZER_WIDTH : 0
  const currentPanel = isArtifactPanelOpen ? panelWidth : 0
  const available =
    window.innerWidth - ACTIVITY_BAR_WIDTH - resizerLeft - resizerRight - currentPanel - MIN_MAIN_CONTENT_WIDTH
  return Math.max(MIN_SIDEBAR_WIDTH, available)
}, [isArtifactPanelOpen, panelWidth])

// Panel max width — considers sidebar width and guarantees min main content
const getPanelMaxWidth = useCallback(() => {
  if (typeof window === "undefined") return 600
  const resizerLeft = isSidebarCollapsed ? 0 : RESIZER_WIDTH
  const resizerRight = RESIZER_WIDTH
  const currentSidebar = isSidebarCollapsed ? 0 : sidebarWidth
  const available =
    window.innerWidth - ACTIVITY_BAR_WIDTH - resizerLeft - resizerRight - currentSidebar - MIN_MAIN_CONTENT_WIDTH
  return Math.max(MIN_PANEL_WIDTH, available)
}, [isSidebarCollapsed, sidebarWidth])
```

**Step 5: Update `handleSidebarResize` to use `getSidebarMaxWidth`**

In `handleSidebarResize` (line 144), change:

```ts
// Before:
const maxWidth = getMaxWidth()

// After:
const maxWidth = getSidebarMaxWidth()
```

**Step 6: Update `handlePanelResize` to use `getPanelMaxWidth`**

In `handlePanelResize` (line 155), change:

```ts
// Before:
const maxWidth = getMaxWidth()

// After:
const maxWidth = getPanelMaxWidth()
```

**Step 7: Update CSS_VARS comment (optional clarity)**

The `--sidebar-max-width: "50%"` CSS var is cosmetic only (not used in JS logic). Can leave as-is or update comment to note JS handles actual clamping.

**Step 8: Run test to verify logic correctness**

Run: `npx vitest run __tests__/sidebar-max-width.test.ts`
Expected: PASS (all 7 tests)

**Step 9: Run full build to verify no regressions**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 10: Manual verification**

1. `npm run dev` + `npm run convex:dev`
2. Open `/chat` with a conversation active
3. Open artifact panel (so all 6 grid columns visible)
4. Drag sidebar resizer to the right — should stop before chat area gets too narrow
5. Verify approval panel buttons ("Revisi", "Setujui & Lanjutkan") remain fully visible
6. Drag artifact panel resizer to the left — same constraint from the other side
7. Close artifact panel → drag sidebar again → max width should increase (more room available)

**Step 11: Commit**

```bash
git add __tests__/sidebar-max-width.test.ts src/components/chat/layout/ChatLayout.tsx
git commit -m "fix(chat): enforce smart max-width on sidebar and panel resizers

Sidebar and artifact panel resize handlers now calculate max width
dynamically based on other elements' current sizes, guaranteeing a
minimum 480px main content area. Prevents sidebar from overrunning
chat messages and approval panels."
```

---

## Summary

| Item | Detail |
|------|--------|
| **Files modified** | 1 (`src/components/chat/layout/ChatLayout.tsx`) |
| **Files created** | 1 (`__tests__/sidebar-max-width.test.ts`) |
| **Risk** | Low — only touches resize clamping logic, no UI structure changes |
| **Rollback** | Revert single commit |
| **Testing** | Unit tests for pure math + manual drag verification |
