# Unified Process Card — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace TaskProgress + ChainOfThought + inline indicators with a single data-driven `UnifiedProcessCard` component.

**Architecture:** Full merge — one new component absorbs all process visibility UI. Data-driven rendering (sections appear based on available data, not mode checks). MessageBubble data extraction unchanged.

**Tech Stack:** React, shadcn/ui Collapsible, existing ToolStateIndicator + SearchStatusIndicator, CSS custom properties (`--chat-*`).

**Design doc:** `docs/unified-process-ui/design.md`

---

### Task 1: Create UnifiedProcessCard component

**Files:**
- Create: `src/components/chat/UnifiedProcessCard.tsx`

**Context:**
- Replaces `TaskProgress.tsx` (128 lines) and `ChainOfThought.tsx` (50 lines)
- Uses same shadcn/ui Collapsible, same CSS variables, same `cn()` utility
- Reuses `ToolStateIndicator` and `SearchStatusIndicator` inside PROSES section
- Port `STAGE_DESCRIPTIONS` and `STATUS_ICON` maps from `TaskProgress.tsx`

**Step 0: Export `getToolLabel` from ToolStateIndicator**

In `src/components/chat/ToolStateIndicator.tsx`, line 48, change:
```diff
- const getToolLabel = (toolName: string) => TOOL_LABEL_MAP[toolName] ?? toFallbackLabel(toolName)
+ export const getToolLabel = (toolName: string) => TOOL_LABEL_MAP[toolName] ?? toFallbackLabel(toolName)
```

This avoids duplicating label strings. UnifiedProcessCard imports this for the collapsed header label.

**Step 1: Create the component file**

```tsx
"use client"

import { useState, useMemo } from "react"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { ToolStateIndicator, getToolLabel } from "./ToolStateIndicator"
import { SearchStatusIndicator } from "./SearchStatusIndicator"
import type { TaskItem } from "@/lib/paper/task-derivation"

// --- Types ---

interface TaskSummaryData {
  stageId: string
  stageLabel: string
  tasks: TaskItem[]
  completed: number
  total: number
}

interface ProcessTool {
  toolName: string
  state: string
  errorText?: string
}

interface SearchStatus {
  status: string
  message?: string
  sourceCount?: number
}

interface UnifiedProcessCardProps {
  taskSummary: TaskSummaryData | null
  processTools: ProcessTool[]
  searchStatus: SearchStatus | null
  persistProcessIndicators: boolean
  defaultOpen?: boolean
}

// --- Constants (ported from TaskProgress.tsx) ---

const STATUS_ICON: Record<string, string> = {
  complete: "✅",
  pending: "○",
}

const STAGE_DESCRIPTIONS: Record<string, string> = {
  gagasan: "Eksplorasi ide awal, analisis kelayakan, dan tentukan angle penelitian yang unik.",
  topik: "Definisikan judul, spesifikasi angle, dan identifikasi research gap.",
  outline: "Susun struktur paper lengkap dengan estimasi panjang tiap bagian.",
  abstrak: "Sintesis gagasan dan topik menjadi ringkasan penelitian dengan keywords.",
  pendahuluan: "Bangun latar belakang, rumusan masalah, dan tujuan penelitian.",
  tinjauan_literatur: "Susun kerangka teoretis, review literatur, dan analisis gap.",
  metodologi: "Tentukan desain penelitian, metode pengumpulan data, dan teknik analisis.",
  hasil: "Identifikasi temuan utama dan tentukan format penyajian data.",
  diskusi: "Interpretasi temuan, bandingkan dengan literatur, dan analisis implikasi.",
  kesimpulan: "Ringkas hasil, jawab rumusan masalah, dan susun saran.",
  pembaruan_abstrak: "Perbarui abstrak berdasarkan seluruh konten paper yang sudah ditulis.",
  daftar_pustaka: "Kompilasi seluruh referensi dari semua tahap dalam format APA.",
  lampiran: "Susun material pendukung (tabel, instrumen, data mentah).",
  judul: "Evaluasi opsi judul berdasarkan cakupan keyword dan pilih yang terbaik.",
}

// --- Component ---

export function UnifiedProcessCard({
  taskSummary,
  processTools,
  searchStatus,
  persistProcessIndicators,
  defaultOpen = false,
}: UnifiedProcessCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  const hasTaskData = taskSummary !== null && taskSummary.tasks.length > 0
  const hasProcessData = processTools.length > 0 || searchStatus !== null

  // Nothing to show
  if (!hasTaskData && !hasProcessData) return null

  // --- Header label logic ---
  const activeProcessLabel = useMemo(() => {
    // Priority 1: active search
    if (searchStatus && searchStatus.status !== "done" && searchStatus.status !== "off") {
      return searchStatus.message ?? "Mencari..."
    }
    // Priority 2: first active tool (stable — doesn't flicker)
    const activeTool = processTools.find(
      (t) => t.state !== "result" && t.state !== "output-available"
    )
    if (activeTool) {
      return getToolLabel(activeTool.toolName)
    }
    // Priority 3: search done with source count
    if (searchStatus?.status === "done" && searchStatus.sourceCount) {
      return `Pencarian selesai (${searchStatus.sourceCount} sumber)`
    }
    // Priority 4: last completed tool (when persisting indicators)
    if (persistProcessIndicators && processTools.length > 0) {
      const lastTool = processTools[processTools.length - 1]
      return getToolLabel(lastTool.toolName)
    }
    return null
  }, [processTools, searchStatus, persistProcessIndicators])

  const description = hasTaskData ? (STAGE_DESCRIPTIONS[taskSummary.stageId] ?? "") : ""

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "rounded-action border border-[color:var(--chat-border)]",
          "bg-[var(--chat-muted)]",
          "overflow-hidden"
        )}
      >
        {/* Header — always visible */}
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center justify-between gap-2 px-3 py-2",
              "text-left transition-colors",
              "hover:bg-[var(--chat-accent)]"
            )}
          >
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              {hasTaskData ? (
                <>
                  <span className="text-xs shrink-0">📋</span>
                  <span className="text-xs font-mono font-semibold text-[var(--chat-foreground)] truncate">
                    {taskSummary.stageLabel}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--chat-muted-foreground)] shrink-0">
                    {taskSummary.completed}/{taskSummary.total}
                  </span>
                  {activeProcessLabel && (
                    <span className="text-[10px] font-mono text-[var(--chat-muted-foreground)] truncate ml-auto mr-1">
                      {activeProcessLabel}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs font-mono text-[var(--chat-foreground)] truncate">
                  {activeProcessLabel ?? "Memproses..."}
                </span>
              )}
            </div>
            <span className="text-[10px] text-[var(--chat-muted-foreground)] shrink-0">
              {open ? "▴" : "▾"}
            </span>
          </button>
        </CollapsibleTrigger>

        {/* Content — collapsible detail */}
        <CollapsibleContent>
          <div className="px-3 pb-2 pt-1 border-t border-[color:var(--chat-border)]">
            {/* Description */}
            {description && (
              <p className="text-[11px] font-sans text-[var(--chat-muted-foreground)] leading-relaxed mb-2">
                {description}
              </p>
            )}

            {/* LANGKAH section */}
            {hasTaskData && (
              <div className="mb-2">
                <div className="text-[10px] font-mono font-semibold text-[var(--chat-muted-foreground)] uppercase tracking-wider mb-1.5">
                  Langkah
                </div>
                <div className="space-y-0.5">
                  {taskSummary.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center gap-2 py-0.5 text-xs font-mono",
                        task.status === "complete" && "text-[var(--chat-muted-foreground)]",
                        task.status === "pending" && "text-[var(--chat-muted-foreground)] opacity-50"
                      )}
                    >
                      <span className="w-4 text-center shrink-0">
                        {STATUS_ICON[task.status]}
                      </span>
                      <span>{task.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PROSES section */}
            {hasProcessData && (
              <div>
                {hasTaskData && (
                  <div className="text-[10px] font-mono font-semibold text-[var(--chat-muted-foreground)] uppercase tracking-wider mb-1.5">
                    Proses
                  </div>
                )}
                <div className="space-y-0.5">
                  {(persistProcessIndicators || searchStatus?.status === "error") && searchStatus && (
                    <SearchStatusIndicator
                      status={searchStatus.status}
                      message={searchStatus.message}
                      sourceCount={searchStatus.sourceCount}
                    />
                  )}
                  {processTools.map((tool, index) => (
                    <ToolStateIndicator
                      key={`tool-${tool.toolName}-${index}`}
                      toolName={tool.toolName}
                      state={tool.state}
                      errorText={tool.errorText}
                      persistUntilDone={persistProcessIndicators}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// NOTE: getToolLabel is imported from ToolStateIndicator.tsx (single source of truth).
// It uses TOOL_LABEL_MAP which maps toolName → Indonesian labels.
// Do NOT duplicate label strings here.
```

**Step 2: Verify it builds**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to `UnifiedProcessCard.tsx`.
If type errors appear for `SearchStatusIndicator` props, check the actual `SearchStatus` type import and adjust the interface.

**Step 3: Commit**

```bash
git add src/components/chat/UnifiedProcessCard.tsx
git commit -m "feat: add UnifiedProcessCard component"
```

---

### Task 2: Wire into MessageBubble and remove old components

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`
  - Lines 15-16 (imports)
  - Lines 761-769 (search/nonSearch split + fallback — may simplify)
  - Lines 1012-1022 (TaskProgress render block)
  - Lines 1025-1060 (ChainOfThought render block)
- Delete: `src/components/chat/TaskProgress.tsx`
- Delete: `src/components/chat/ChainOfThought.tsx`

**Step 1: Update imports in MessageBubble.tsx**

Replace lines 15-16:
```diff
- import { TaskProgress } from "./TaskProgress"
- import { ChainOfThought } from "./ChainOfThought"
+ import { UnifiedProcessCard } from "./UnifiedProcessCard"
```

**Step 2: Add unified guard**

After line 764 (`shouldShowProcessIndicators`), add:
```typescript
const showUnifiedCard = isAssistant && (
  taskSummary !== null || shouldShowProcessIndicators
)
```

**Step 3: Replace render blocks**

Replace the TaskProgress block (lines 1012-1022) AND ChainOfThought block (lines 1025-1060) with:

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

The `nonSearchTools`, `searchTools`, and `showFallbackProcessIndicator` variables (lines 761-769) can stay — they're cheap to compute and removing them risks breaking other references. If no other references exist, delete them in a cleanup pass.

**Step 4: Verify build**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors. If `visibleProcessTools` type doesn't match `ProcessTool[]` in UnifiedProcessCard, adjust the interface to match the actual type.

**Step 5: Delete old components**

```bash
rm src/components/chat/TaskProgress.tsx
rm src/components/chat/ChainOfThought.tsx
```

**Step 6: Verify build after deletion**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors. No other files import TaskProgress or ChainOfThought (verified — only MessageBubble imports them).

**Step 7: Verify no dead variables in MessageBubble**

Check if `nonSearchTools`, `searchTools`, `showFallbackProcessIndicator` are still referenced after the render block replacement. If not, delete lines 761-769.

Run: `grep -n "nonSearchTools\|searchTools\|showFallbackProcessIndicator" src/components/chat/MessageBubble.tsx`
Expected: Only the declaration lines (761-769). If so, delete them.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: wire UnifiedProcessCard into MessageBubble, remove TaskProgress + ChainOfThought"
```

---

### Task 3: Visual verification

**Files:** None (testing only)

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test paper mode — tasks + process (State 1)**

1. Open a paper session conversation that has an active stage
2. Verify: single card with 📋 header, stage label, completion count
3. Click to expand: LANGKAH section with task items, PROSES section with indicators
4. Verify: only one border, one collapse control

**Step 3: Test paper mode — tasks only (State 2)**

1. Scroll to a completed message (tools done)
2. Verify: card shows task count, no PROSES section when expanded
3. Verify: collapsed state shows just stage label + count

**Step 4: Test paper mode — process only before stageData (State 3)**

1. Start a fresh paper session (or find the first message where tools run before stageData loads)
2. Verify: card shows process label only (no 📋, no LANGKAH)
3. Verify: no "PROSES" section label (redundant in process-only mode)
4. Verify: collapsible works

**Step 5: Test non-paper mode — process only (State 4)**

1. Open a non-paper conversation
2. Trigger a search or tool call
3. Verify: card shows process label, no LANGKAH section
4. Verify: no "PROSES" section label (same as State 3 — redundant when alone)
5. Verify: collapsible works

**Step 6: Test collapsed header label**

1. During active tool calling, verify header shows active process label
2. Verify label comes from first active tool (not flickering between tools)
3. After tools complete, verify label disappears or shows completed label

**Step 7: Commit verification notes (optional)**

If any visual adjustments needed, fix and commit:
```bash
git add -A
git commit -m "fix: adjust UnifiedProcessCard styling from visual review"
```

---

### Task 4: Type safety cleanup

**Files:**
- Modify: `src/components/chat/UnifiedProcessCard.tsx` (if needed)

**Step 1: Check actual types match**

The `ProcessTool` and `SearchStatus` interfaces in UnifiedProcessCard are locally defined. Verify they match the actual types from MessageBubble:

Run: `grep -A5 "interface.*ProcessTool\|type.*ProcessTool\|interface.*SearchStatus\|type.*SearchStatus" src/components/chat/MessageBubble.tsx src/components/chat/ToolStateIndicator.tsx src/components/chat/SearchStatusIndicator.tsx`

If there are existing exported types, import them instead of re-declaring.

**Step 2: Fix any type mismatches**

If `visibleProcessTools` has a different shape than `ProcessTool[]`, update the interface or use the actual type. Common mismatches:
- `state` might be a union type, not `string`
- `errorText` might have different optionality

**Step 3: Build check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: Clean build.

**Step 4: Commit if changes made**

```bash
git add -A
git commit -m "refactor: align UnifiedProcessCard types with existing interfaces"
```

---

### Task 5: Lint and test pass

**Files:** None

**Step 1: Run linter**

Run: `npm run lint 2>&1 | tail -20`
Expected: No new errors from UnifiedProcessCard or MessageBubble changes.

**Step 2: Run existing tests**

Run: `npm test 2>&1 | tail -30`
Expected: All existing tests pass. No tests reference TaskProgress or ChainOfThought directly (verified — no test files exist for either).

**Step 3: Fix any failures**

If tests reference TaskProgress/ChainOfThought text content in snapshots or assertions, update them.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: fix lint and test issues from UnifiedProcessCard migration"
```
