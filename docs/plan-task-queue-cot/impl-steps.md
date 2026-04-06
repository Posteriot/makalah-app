# Implementation Steps: Plan, Task, Queue & Chain of Thought

> Step-by-step implementation guide. Each phase is a self-contained unit with
> exact file paths, code to write, and verification commands.
>
> **Source of truth:** [`design-doc.md`](./design-doc.md) (architecture & specs),
> [`implementation-priority.md`](./implementation-priority.md) (execution order & risk),
> [`context.md`](./context.md) (codebase references & field mappings)
>
> **Branch:** `feature/plan-task-queue-components`
> **Working directory:** `.worktrees/plan-task-queue-components/`

---

## Phase 1: Task Derivation Logic

> **Risk:** Zero | **Touches existing files:** No | **Revert:** Delete files

### Step 1.1: Create types and constants

**File:** `src/lib/paper/task-derivation.ts`

```typescript
import {
  STAGE_ORDER,
  getStageLabel,
  type PaperStageId,
} from "../../../convex/paperSessions/constants"

// ============================================================================
// TYPES
// ============================================================================

export type TaskStatus = "complete" | "active" | "pending"

export type TaskItem = {
  id: string       // e.g. "gagasan.ideKasar"
  label: string    // e.g. "Eksplorasi ide"
  field: string    // e.g. "ideKasar"
  status: TaskStatus
}

export type TaskSummary = {
  stageId: string
  stageLabel: string
  tasks: TaskItem[]
  completed: number
  total: number
}

export type PhaseGroup = {
  label: string
  stages: readonly PaperStageId[]
}

// ============================================================================
// PHASE GROUPS
// ============================================================================

export const PHASE_GROUPS: readonly PhaseGroup[] = [
  { label: "Foundation", stages: ["gagasan", "topik", "outline"] },
  { label: "Core Sections", stages: ["abstrak", "pendahuluan", "tinjauan_literatur", "metodologi"] },
  { label: "Results & Analysis", stages: ["hasil", "diskusi", "kesimpulan"] },
  { label: "Finalization", stages: ["pembaruan_abstrak", "daftar_pustaka", "lampiran", "judul"] },
] as const
```

### Step 1.2: Define per-stage task mappings

Append to the same file:

```typescript
// ============================================================================
// STAGE TASK DEFINITIONS
// ============================================================================

type CompletionType = "string" | "array" | "boolean" | "enum" | "number"

type TaskDefinition = {
  field: string
  label: string
  type: CompletionType
}

const STAGE_TASKS: Record<PaperStageId, TaskDefinition[]> = {
  gagasan: [
    { field: "ideKasar", label: "Eksplorasi ide", type: "string" },
    { field: "analisis", label: "Analisis feasibility", type: "string" },
    { field: "angle", label: "Tentukan angle", type: "string" },
    { field: "referensiAwal", label: "Cari referensi awal", type: "array" },
  ],
  topik: [
    { field: "definitif", label: "Definisikan judul", type: "string" },
    { field: "angleSpesifik", label: "Spesifikasi angle", type: "string" },
    { field: "argumentasiKebaruan", label: "Argumentasi kebaruan", type: "string" },
    { field: "researchGap", label: "Identifikasi research gap", type: "string" },
  ],
  outline: [
    { field: "sections", label: "Susun sections", type: "array" },
    { field: "totalWordCount", label: "Estimasi word count", type: "number" },
  ],
  abstrak: [
    { field: "ringkasanPenelitian", label: "Draft ringkasan penelitian", type: "string" },
    { field: "keywords", label: "Tentukan keywords", type: "array" },
    { field: "wordCount", label: "Cek word count", type: "number" },
  ],
  pendahuluan: [
    { field: "latarBelakang", label: "Latar belakang", type: "string" },
    { field: "rumusanMasalah", label: "Rumusan masalah", type: "string" },
    { field: "researchGapAnalysis", label: "Analisis research gap", type: "string" },
    { field: "tujuanPenelitian", label: "Tujuan penelitian", type: "string" },
    { field: "sitasiAPA", label: "Sitasi APA", type: "array" },
  ],
  tinjauan_literatur: [
    { field: "kerangkaTeoretis", label: "Kerangka teoretis", type: "string" },
    { field: "reviewLiteratur", label: "Review literatur", type: "string" },
    { field: "gapAnalysis", label: "Gap analysis", type: "string" },
    { field: "referensi", label: "Kumpulkan referensi", type: "array" },
  ],
  metodologi: [
    { field: "desainPenelitian", label: "Desain penelitian", type: "string" },
    { field: "metodePerolehanData", label: "Metode perolehan data", type: "string" },
    { field: "teknikAnalisis", label: "Teknik analisis", type: "string" },
    { field: "pendekatanPenelitian", label: "Tentukan pendekatan", type: "enum" },
  ],
  hasil: [
    { field: "temuanUtama", label: "Identifikasi temuan utama", type: "array" },
    { field: "metodePenyajian", label: "Tentukan metode penyajian", type: "enum" },
  ],
  diskusi: [
    { field: "interpretasiTemuan", label: "Interpretasi temuan", type: "string" },
    { field: "perbandinganLiteratur", label: "Perbandingan literatur", type: "string" },
    { field: "implikasiTeoretis", label: "Implikasi teoretis", type: "string" },
    { field: "keterbatasanPenelitian", label: "Keterbatasan penelitian", type: "string" },
  ],
  kesimpulan: [
    { field: "ringkasanHasil", label: "Ringkasan hasil", type: "string" },
    { field: "jawabanRumusanMasalah", label: "Jawaban rumusan masalah", type: "array" },
    { field: "saranPeneliti", label: "Saran peneliti", type: "string" },
  ],
  pembaruan_abstrak: [
    { field: "ringkasanPenelitianBaru", label: "Ringkasan penelitian baru", type: "string" },
    { field: "perubahanUtama", label: "Identifikasi perubahan utama", type: "array" },
    { field: "keywordsBaru", label: "Keywords baru", type: "array" },
  ],
  daftar_pustaka: [
    { field: "entries", label: "Kompilasi entri", type: "array" },
  ],
  lampiran: [
    { field: "items", label: "Kompilasi item lampiran", type: "array" },
    { field: "tidakAdaLampiran", label: "Konfirmasi tidak ada lampiran", type: "boolean" },
  ],
  judul: [
    { field: "opsiJudul", label: "Opsi judul", type: "array" },
    { field: "judulTerpilih", label: "Judul terpilih", type: "string" },
  ],
}
```

### Step 1.3: Implement completion check and deriveTaskList

Append to the same file:

```typescript
// ============================================================================
// COMPLETION LOGIC
// ============================================================================

function isFieldComplete(value: unknown, type: CompletionType): boolean {
  switch (type) {
    case "string":
      return typeof value === "string" && value.trim().length > 0
    case "array":
      return Array.isArray(value) && value.length > 0
    case "boolean":
      return value === true
    case "number":
      return typeof value === "number" && value > 0
    case "enum":
      return typeof value === "string" && value.length > 0
    default:
      return false
  }
}

// ============================================================================
// MAIN DERIVATION FUNCTION
// ============================================================================

export function deriveTaskList(
  stageId: PaperStageId,
  stageData: Record<string, unknown>
): TaskSummary {
  const definitions = STAGE_TASKS[stageId]
  if (!definitions) {
    return {
      stageId,
      stageLabel: getStageLabel(stageId),
      tasks: [],
      completed: 0,
      total: 0,
    }
  }

  const currentStageData = (stageData[stageId] ?? {}) as Record<string, unknown>

  // Special case: lampiran — if tidakAdaLampiran is true,
  // both tasks are considered complete (no items needed)
  const lampiranOverride =
    stageId === "lampiran" && currentStageData.tidakAdaLampiran === true

  let foundFirstIncomplete = false
  const tasks: TaskItem[] = definitions.map((def) => {
    const complete = lampiranOverride || isFieldComplete(currentStageData[def.field], def.type)

    let status: TaskStatus
    if (complete) {
      status = "complete"
    } else if (!foundFirstIncomplete) {
      foundFirstIncomplete = true
      status = "active"
    } else {
      status = "pending"
    }

    return {
      id: `${stageId}.${def.field}`,
      label: def.label,
      field: def.field,
      status,
    }
  })

  const completed = tasks.filter((t) => t.status === "complete").length

  return {
    stageId,
    stageLabel: getStageLabel(stageId),
    tasks,
    completed,
    total: tasks.length,
  }
}

// ============================================================================
// HELPERS
// ============================================================================

export function getPhaseForStage(
  stageId: PaperStageId
): { label: string; index: number } | null {
  for (let i = 0; i < PHASE_GROUPS.length; i++) {
    if ((PHASE_GROUPS[i].stages as readonly string[]).includes(stageId)) {
      return { label: PHASE_GROUPS[i].label, index: i }
    }
  }
  return null
}
```

### Step 1.4: Write unit tests

**File:** `src/lib/paper/__tests__/task-derivation.test.ts`

Test 42+ cases covering:
- Empty stageData for all 14 stages → first task active, rest pending
- Fully filled stageData for all 14 stages → all complete
- Partially filled → correct complete/active/pending split
- Lampiran edge case: `tidakAdaLampiran = true` → both tasks complete
- Lampiran normal: `items` populated → first task complete
- `PHASE_GROUPS` covers all 14 stages exactly once
- `getPhaseForStage()` returns correct phase for each stage

### Step 1.5: Verify

```bash
npm test -- src/lib/paper/__tests__/task-derivation.test.ts
```

**Done when:** All tests pass. Zero imports from React or Convex runtime (only constants).

---

## Phase 2: TaskProgress Component

> **Risk:** Zero | **Touches existing files:** No | **Revert:** Delete file

### Step 2.1: Create component

**File:** `src/components/chat/TaskProgress.tsx`

```tsx
"use client"

import { useState } from "react"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { TaskItem } from "@/lib/paper/task-derivation"

interface TaskProgressProps {
  stageId: string
  stageLabel: string
  tasks: TaskItem[]
  completed: number
  total: number
  defaultOpen?: boolean
}

const STATUS_ICON: Record<string, string> = {
  complete: "✅",
  active: "🔄",
  pending: "○",
}

export function TaskProgress({
  stageLabel,
  tasks,
  completed,
  total,
  defaultOpen = false,
}: TaskProgressProps) {
  const [open, setOpen] = useState(defaultOpen)

  if (tasks.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center justify-between rounded-action px-3 py-1.5",
            "text-xs font-mono transition-colors",
            "bg-[var(--chat-muted)] hover:bg-[var(--chat-accent)]",
            "text-[var(--chat-muted-foreground)]",
            "border border-[color:var(--chat-border)]"
          )}
        >
          <span className="flex items-center gap-1.5">
            <span>📋</span>
            <span className="font-medium text-[var(--chat-foreground)]">
              {stageLabel}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span>{completed}/{total} tasks</span>
            <span className="text-[10px]">{open ? "▴" : "▾"}</span>
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 space-y-0.5 pl-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-2 py-0.5 text-xs font-mono",
                task.status === "complete" && "text-[var(--chat-muted-foreground)]",
                task.status === "active" && "text-[var(--chat-foreground)]",
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
      </CollapsibleContent>
    </Collapsible>
  )
}
```

**No data fetching. No Convex hooks. Pure presentational.**

### Step 2.2: Verify

- [ ] Collapsed: single line with stage label + count
- [ ] Expanded: task list with correct status icons
- [ ] Styling uses `--chat-*` CSS variables
- [ ] Click toggles open/closed

---

## Phase 3: ChainOfThought Component

> **Risk:** Zero | **Touches existing files:** No | **Revert:** Delete file
> Can be built in parallel with Phase 2.

### Step 3.1: Create component

**File:** `src/components/chat/ChainOfThought.tsx`

```tsx
"use client"

import { useState } from "react"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface SearchStatus {
  status: "searching" | "fetching-content" | "composing" | "done" | "error" | "off"
  message?: string
  sourceCount?: number
}

interface ChainOfThoughtProps {
  searchStatus: SearchStatus | null
  internalThought: string | null
  defaultOpen?: boolean
}

type StepStatus = "complete" | "active" | "pending" | "error"

function mapSearchStatusToStep(status: SearchStatus["status"]): StepStatus {
  switch (status) {
    case "searching":
    case "fetching-content":
      return "active"
    case "composing":
    case "done":
      return "complete"
    case "error":
      return "error"
    case "off":
      return "pending"
  }
}

const STEP_ICON: Record<StepStatus, string> = {
  complete: "✅",
  active: "🔍",
  pending: "○",
  error: "⚠️",
}

function extractDomains(message?: string): string[] {
  if (!message) return []
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g
  const domains: string[] = []
  let match
  while ((match = urlPattern.exec(message)) !== null) {
    domains.push(match[1])
  }
  return [...new Set(domains)]
}

export function ChainOfThought({
  searchStatus,
  internalThought,
  defaultOpen = false,
}: ChainOfThoughtProps) {
  const [open, setOpen] = useState(defaultOpen)

  // Render nothing if no data
  if (!searchStatus && !internalThought) return null
  // Don't render for "off" status with no thought
  if (searchStatus?.status === "off" && !internalThought) return null

  const stepStatus = searchStatus ? mapSearchStatusToStep(searchStatus.status) : null
  const domains = searchStatus ? extractDomains(searchStatus.message) : []

  const stepLabel = searchStatus
    ? searchStatus.status === "error"
      ? searchStatus.message || "Galat pada pencarian"
      : searchStatus.status === "done"
        ? `Pencarian selesai${searchStatus.sourceCount ? ` (${searchStatus.sourceCount} sumber)` : ""}`
        : searchStatus.message || "Pencarian internet..."
    : null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center justify-between rounded-action px-3 py-1.5",
            "text-xs font-mono transition-colors",
            "bg-[var(--chat-muted)] hover:bg-[var(--chat-accent)]",
            "text-[var(--chat-muted-foreground)]",
            "border border-[color:var(--chat-border)]"
          )}
        >
          <span className="flex items-center gap-1.5">
            <span>ⓘ</span>
            <span className="font-medium text-[var(--chat-foreground)]">
              Chain of Thought
            </span>
          </span>
          <span className="text-[10px]">{open ? "▴" : "▾"}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 space-y-1.5 pl-3">
          {/* Search step */}
          {stepStatus && stepLabel && (
            <div className="space-y-1">
              <div
                className={cn(
                  "flex items-center gap-2 text-xs font-mono",
                  stepStatus === "error" && "text-[var(--chat-destructive)]",
                  stepStatus === "active" && "text-[var(--chat-foreground)]",
                  stepStatus === "complete" && "text-[var(--chat-muted-foreground)]",
                )}
              >
                <span className="w-4 text-center shrink-0">
                  {STEP_ICON[stepStatus]}
                </span>
                <span>{stepLabel}</span>
              </div>
              {/* Source domain badges */}
              {domains.length > 0 && (
                <div className="flex flex-wrap gap-1 pl-6">
                  {domains.map((domain) => (
                    <Badge
                      key={domain}
                      variant="secondary"
                      className="text-[10px] font-mono px-1.5 py-0"
                    >
                      {domain}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Internal thought */}
          {internalThought && (
            <div className="text-xs font-sans text-[var(--chat-muted-foreground)] pl-6 leading-relaxed">
              {internalThought}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
```

Sub-elements (step row, domain badges, reasoning text) are internal — not exported.

### Step 3.2: Verify

- [ ] All 6 search status states render correctly
- [ ] Domain badges appear when message contains URLs
- [ ] Internal thought text renders
- [ ] Returns null when no data
- [ ] Styling uses `--chat-*` CSS variables

---

## Phase 4: Chat Integration (MessageBubble)

> **Risk:** Low | **Touches existing files:** 2 | **Revert:** Remove guarded block

### Step 4.1: Add `currentStage` prop to MessageBubbleProps

**File:** `src/components/chat/MessageBubble.tsx` (~line 111, after `stageData`)

```typescript
currentStage?: string
```

### Step 4.2: Add imports to MessageBubble

```typescript
import { TaskProgress } from "./TaskProgress"
import { ChainOfThought } from "./ChainOfThought"
import { deriveTaskList } from "@/lib/paper/task-derivation"
import type { PaperStageId } from "../../../convex/paperSessions/constants"
```

### Step 4.3: Add task derivation memo (inside function body)

```typescript
const taskSummary = useMemo(() => {
  if (!isPaperMode || !stageData || !currentStage || currentStage === "completed") return null
  return deriveTaskList(currentStage as PaperStageId, stageData)
}, [isPaperMode, stageData, currentStage])
```

### Step 4.4: Add render block (before line 922, Process Indicators)

```tsx
{/* Plan/Task Progress + Chain of Thought — paper mode only */}
{isPaperMode && isAssistant && taskSummary && (
  <div className="mb-3 space-y-1.5">
    <TaskProgress
      stageId={taskSummary.stageId}
      stageLabel={taskSummary.stageLabel}
      tasks={taskSummary.tasks}
      completed={taskSummary.completed}
      total={taskSummary.total}
    />
    {(searchStatus || internalThought) && (
      <ChainOfThought
        searchStatus={searchStatus}
        internalThought={internalThought}
      />
    )}
  </div>
)}
```

### Step 4.5: Pass `currentStage` from ChatWindow

**File:** `src/components/chat/ChatWindow.tsx`

Add prop where `<MessageBubble>` is rendered:

```typescript
currentStage={session?.currentStage}
```

### Step 4.6: Verify

- [ ] Paper mode: TaskProgress + CoT appear above message content
- [ ] Non-paper mode: zero visual change
- [ ] Existing process indicators still work
- [ ] No console errors

---

## Phase 6 (Execution order: 5th): Sidebar Queue Upgrade

> **Risk:** Medium | **Touches existing files:** 1 | **Revert:** Swap import back

### Step 6.1: Create SidebarQueueProgress

**File:** `src/components/chat/sidebar/SidebarQueueProgress.tsx`

Port ALL features from SidebarProgress.tsx. Add phase grouping + sub-tasks.

**Port checklist:**
- [ ] `MAX_REWIND_STAGES = 2`
- [ ] `isValidRewindTarget()` function
- [ ] `getMilestoneState()` → completed/current/pending
- [ ] `resolvePaperDisplayTitle()` for paper title
- [ ] Progress bar with percentage
- [ ] Rewind dialog state + handlers
- [ ] Tooltip on non-rewindable completed stages
- [ ] Loading skeleton
- [ ] Empty state (no paper session)
- [ ] No conversation selected state

**New features:**
- [ ] Phase grouping with `Collapsible` per group
- [ ] Auto-expand: active phase + completed phases expanded, future collapsed
- [ ] Sub-task list under active stage via `deriveTaskList()`

### Step 6.2: Swap in ChatSidebar.tsx

```diff
- import { SidebarProgress } from "./sidebar/SidebarProgress"
+ import { SidebarQueueProgress } from "./sidebar/SidebarQueueProgress"

  case "progress":
-   return <SidebarProgress conversationId={currentConversationId} />
+   return <SidebarQueueProgress conversationId={currentConversationId} />
```

**DO NOT delete SidebarProgress.tsx** — keep as fallback.

### Step 6.3: Verify

- [ ] All 10 ported features work
- [ ] Phase grouping: 4 sections, correct stage counts
- [ ] Active phase expanded, future collapsed
- [ ] Sub-tasks visible under active stage
- [ ] Rewind works end-to-end
- [ ] Mobile sidebar works
- [ ] Fallback: swap import back → old behavior

---

## Phase 5 (Execution order: 6th): CoT Replaces Existing Indicators

> **Risk:** Medium | **Touches existing files:** 1 | **Revert:** Remove guard

### Step 5.1: Add paper mode guard to Process Indicators

**File:** `src/components/chat/MessageBubble.tsx` (~line 922)

Change:
```tsx
{shouldShowProcessIndicators && (
```

To:
```tsx
{shouldShowProcessIndicators && !isPaperMode && (
```

### Step 5.2: Verify

- [ ] Paper mode: only CoT visible, no old SearchStatusIndicator
- [ ] Non-paper mode: indicators work exactly as before
- [ ] Search error state correct in both modes

---

## Phase 7 (Execution order: 7th): System Prompt Injection

> **Risk:** Low code / High behavioral | **Revert:** Remove planContext

### Step 7.1: Add buildPlanContext helper

**File:** `src/lib/ai/paper-mode-prompt.ts`

Import:
```typescript
import { deriveTaskList } from "@/lib/paper/task-derivation"
```

Helper function:
```typescript
function buildPlanContext(
  currentStage: PaperStageId | "completed",
  stageData: Record<string, unknown>
): string {
  if (currentStage === "completed") return ""
  const tasks = deriveTaskList(currentStage, stageData)
  if (!tasks.tasks.length) return ""

  const lines = tasks.tasks.map(t => {
    const icon = t.status === "complete" ? "✓" : t.status === "active" ? "→" : "·"
    const suffix = t.status === "active" ? " (active)" : ""
    return `  ${icon} ${t.label}${suffix}`
  })

  return `\nCURRENT PLAN CONTEXT:\nStage: ${tasks.stageLabel} (${getStageNumber(currentStage)}/${STAGE_ORDER.length})\nTasks: ${tasks.completed}/${tasks.total} complete\n${lines.join("\n")}\n`
}
```

### Step 7.2: Inject into prompt template

Compute and inject after `invalidatedArtifactsContext`:

```typescript
const planContext = buildPlanContext(stage, session.stageData as Record<string, unknown>)
```

```diff
  ${revisionNote}${pendingNote}${dirtyContextNote}${dirtySyncContractNote}${invalidatedArtifactsContext}
+ ${planContext}
  GENERAL RULES:
```

### Step 7.3: Verify

- [ ] Console log prompt — plan context appears
- [ ] `completed` stage → empty string
- [ ] Token budget: ~100-150 tokens added
- [ ] Model response quality unchanged
- [ ] Model does NOT output plan cards

---

## Post-Implementation Checklist

After all 7 phases complete:

- [ ] Paper mode: TaskProgress + CoT on every assistant message
- [ ] Paper mode: sidebar shows phase-grouped queue with sub-tasks
- [ ] Paper mode: model has plan context in system prompt
- [ ] Non-paper mode: zero visual or behavioral changes
- [ ] Rewind: still works from sidebar
- [ ] Search: still works (error states handled)
- [ ] Choice cards: still render below message text
- [ ] Artifacts: still render in follow-up blocks
- [ ] Sources: still render in follow-up blocks
- [ ] Mobile: sidebar and chat both work
- [ ] Performance: no additional API calls or subscriptions

---

## File Inventory

### Created (5 new files)

| Phase | File |
|-------|------|
| 1 | `src/lib/paper/task-derivation.ts` |
| 1 | `src/lib/paper/__tests__/task-derivation.test.ts` |
| 2 | `src/components/chat/TaskProgress.tsx` |
| 3 | `src/components/chat/ChainOfThought.tsx` |
| 6 | `src/components/chat/sidebar/SidebarQueueProgress.tsx` |

### Modified (5 existing files)

| Phase | File | Scope |
|-------|------|-------|
| 4 | `MessageBubble.tsx` | +15 lines (guarded block) |
| 4 | `ChatWindow.tsx` | +3 lines (pass prop) |
| 5 | `MessageBubble.tsx` | +1 line (add `!isPaperMode`) |
| 6 | `ChatSidebar.tsx` | 2 lines (swap import) |
| 7 | `paper-mode-prompt.ts` | +5 lines (planContext) |

### NOT modified (8 preserved files)

| File | Reason |
|------|--------|
| `chat/route.ts` | Backend unchanged |
| `paper-tools.ts` | Tools unchanged |
| `web-search/orchestrator.ts` | Search unchanged |
| `convex/schema.ts` | No new tables |
| `convex/paperSessions/types.ts` | No schema changes |
| `SearchStatusIndicator.tsx` | Non-paper fallback |
| `ReasoningTracePanel.tsx` | Non-paper fallback |
| `SidebarProgress.tsx` | Sidebar fallback |
