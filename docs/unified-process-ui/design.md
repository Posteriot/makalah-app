# Design: Unified Process Card

> Merge TaskProgress (plan card), ChainOfThought (process wrapper), and inline
> process indicators into a single collapsible card component.

---

## Problem

Three separate visual blocks stack vertically above every assistant message:

1. **TaskProgress** — collapsible plan card (paper mode only)
2. **ChainOfThought** — collapsible wrapper around tool/search indicators
3. **Inline tool indicators** — individual stacked items without grouping

Three borders, three collapse controls, excessive vertical space. Tool call
indicators render as individual lines (4+ during active tool calling).

## Solution

One component — `UnifiedProcessCard` — that replaces all three. Data-driven
rendering: sections appear/hide based on available data, not mode checks.

---

## Component Interface

```typescript
interface UnifiedProcessCardProps {
  taskSummary: {
    stageId: string
    stageLabel: string
    tasks: TaskItem[]
    completed: number
    total: number
  } | null

  processTools: VisibleProcessTool[]
  searchStatus: SearchStatus | null

  persistProcessIndicators: boolean
  defaultOpen?: boolean
}
```

- `taskSummary` nullable — null in non-paper mode or before stageData ready.
- `processTools` combined list (non-search + search tools).
- Component does not derive data — MessageBubble owns extraction.

### Render guard in MessageBubble

```typescript
const showUnifiedCard = isAssistant && (
  taskSummary !== null || shouldShowProcessIndicators
)
```

One guard, no mode branching. `taskSummary` is naturally null in non-paper mode.

---

## Visual States

### State 1: Tasks + Process (paper mode, stage active, tools running)

```
Collapsed:
┌─────────────────────────────────────────────┐
│ 📋 Gagasan Paper  1/4  ⟳ Menyimpan...   ▾  │
└─────────────────────────────────────────────┘

Expanded:
┌─────────────────────────────────────────────┐
│ 📋 Gagasan Paper  1/4                    ▴  │
│ Eksplorasi ide awal, analisis kelayakan...  │
│                                              │
│ LANGKAH                                      │
│ ✅ Cari referensi awal                       │
│ ○  Eksplorasi ide                           │
│ ○  Analisis feasibility                     │
│ ○  Tentukan angle                           │
│                                              │
│ PROSES                                       │
│ ✅ Pencarian selesai (20 sumber)             │
│ ⟳ Menyimpan progres tahapan                 │
│ ⚠ Galat pada membuat artifak                │
│ ⟳ Membuat artifak (retry)                   │
└─────────────────────────────────────────────┘
```

### State 2: Tasks only (paper mode, tools done)

```
Collapsed:
┌─────────────────────────────────────────────┐
│ 📋 Gagasan Paper  4/4                    ▾  │
└─────────────────────────────────────────────┘

Expanded:
┌─────────────────────────────────────────────┐
│ 📋 Gagasan Paper  4/4                    ▴  │
│ Eksplorasi ide awal, analisis kelayakan...  │
│                                              │
│ LANGKAH                                      │
│ ✅ Eksplorasi ide                            │
│ ✅ Analisis feasibility                      │
│ ✅ Tentukan angle                            │
│ ✅ Cari referensi awal                       │
└─────────────────────────────────────────────┘
```

### State 3: Process only — paper mode (before stageData ready)

```
Collapsed:
┌─────────────────────────────────────────────┐
│ ⟳ Memulai sesi paper...                  ▾  │
└─────────────────────────────────────────────┘

Expanded:
┌─────────────────────────────────────────────┐
│ ⟳ Memulai sesi paper...                  ▴  │
│                                              │
│ ⟳ Memulai sesi paper                        │
│ ⟳ Menyinkronkan status                      │
└─────────────────────────────────────────────┘
```

### State 4: Process only — non-paper mode (chat with tools/search)

```
Collapsed:
┌─────────────────────────────────────────────┐
│ ⟳ Mencari referensi...                   ▾  │
└─────────────────────────────────────────────┘

Expanded:
┌─────────────────────────────────────────────┐
│ ⟳ Mencari referensi...                   ▴  │
│                                              │
│ 🔍 Pencarian web (12 sumber)                │
│ ⟳ Mengambil konten halaman                  │
└─────────────────────────────────────────────┘
```

States 3 and 4 are visually identical — labels determined by active process
tools, not mode checks.

---

## Collapsed Header Logic

| Condition | Left side | Right side |
|-----------|-----------|------------|
| `taskSummary` exists | `📋 {stageLabel}  {completed}/{total}` | Active process label (truncated) + chevron |
| `taskSummary` null | Active process label (full width) | Chevron |

Active process label priority:
1. Search active → search label
2. No search, tools running → **first active** tool label (stable, no flicker)
3. Search done with source count → "Pencarian selesai (N sumber)"
4. Nothing active, `persistProcessIndicators` → last completed tool label
5. None of the above → null (no label shown in header)

---

## Data Flow & MessageBubble Integration

### Render pipeline change

Remove two separate blocks (TaskProgress + ChainOfThought), replace with one:

```tsx
{showUnifiedCard && (
  <div className="mb-3">
    <UnifiedProcessCard
      taskSummary={taskSummary}
      processTools={visibleProcessTools}
      searchStatus={searchStatus}
      persistProcessIndicators={persistProcessIndicators}
      defaultOpen={persistProcessIndicators}
    />
  </div>
)}
```

### Data extraction — zero changes

All data already derived in MessageBubble:

| Data | Source | Change |
|------|--------|--------|
| `taskSummary` | `useMemo` → `deriveTaskList()` | None |
| `visibleProcessTools` | Filtered from `dedupedInProgressTools` | None |
| `searchStatus` | `extractSearchStatus()` | None |
| `persistProcessIndicators` | Prop from parent | None |
| `shouldShowProcessIndicators` | Derived from tools + errors | None |

### Component lifecycle

| Component | Action |
|-----------|--------|
| `TaskProgress.tsx` | **Delete** — absorbed into UnifiedProcessCard |
| `ChainOfThought.tsx` | **Delete** — absorbed into UnifiedProcessCard |
| `ToolStateIndicator.tsx` | **Keep** — reused in PROSES section |
| `SearchStatusIndicator.tsx` | **Keep** — reused in PROSES section |
| `UnifiedProcessCard.tsx` | **New** — single replacement |

---

## Internal Structure

```
<Collapsible>
  └─ Container div (rounded, bordered, bg-muted)
     ├─ Header (always visible) ─── CollapsibleTrigger
     │  ├─ Left (flex-1): taskSummary ? (📋 + stageLabel + count + activeProcessLabel via ml-auto) : activeProcessLabel
     │  └─ Chevron (shrink-0): ▴/▾
     │
     └─ CollapsibleContent
        ├─ Description (taskSummary only): stage description text
        │
        ├─ LANGKAH section (taskSummary only)
        │  ├─ Section label "LANGKAH"
        │  └─ Task items
        │     └─ For each task: status icon (✅/○) + label
        │
        └─ PROSES section (processTools/searchStatus present)
           ├─ Section label "PROSES" (only when LANGKAH also present — avoids redundant label in process-only mode)
           ├─ SearchStatusIndicator (if searchStatus)
           └─ ToolStateIndicator per tool (if processTools)
```

Sections render conditionally — LANGKAH only when `taskSummary`, PROSES only
when process data exists. Both can coexist or appear alone.

---

## Design Decisions

### Full merge over wrapper approach

TaskProgress and ChainOfThought are thin components (header + list in
Collapsible). Wrapping them would create nested Collapsible state.
Full merge into one component with one collapse state is simpler.

### Data-driven over mode-driven

Card renders based on data availability, not `isPaperMode` flag. This makes
paper/non-paper behavior identical — non-paper simply has `taskSummary: null`,
producing process-only state automatically.

### Keep ToolStateIndicator and SearchStatusIndicator

These render individual process items with their own styling (spinner, labels,
error states). UnifiedProcessCard is a layout container, not a renderer for
individual process items.

### Reuse ToolStateIndicator's label map for header

`ToolStateIndicator.tsx` owns `TOOL_LABEL_MAP` and `getToolLabel()`. Export
these and import in UnifiedProcessCard for the collapsed header label. Do not
duplicate label strings — single source of truth.

### First-active tool label in header

When multiple tools run, header shows the first active tool's label instead of
the most recent. First-active is stable (doesn't change until that tool
completes), preventing header label flickering during rapid tool sequences.
