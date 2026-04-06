# Design Doc: Plan, Task, Queue & Chain of Thought

> **Status:** Draft
> **Author:** AI-assisted
> **Date:** 2026-03-27
> **Branch:** `feature/plan-task-queue-components`
> **References:** [`context.md`](./context.md), [`implementation-priority.md`](./implementation-priority.md)

---

## 1. Objective

Add task-level progress visibility to the Makalah AI paper writing app so that
users can see **what the model is doing, has done, and will do** within each of
the 14 writing stages — without changing any backend code or model behavior.

### Success criteria

- User sees a compact, collapsible task checklist on every assistant message in paper mode
- User sees the model's active reasoning/search steps in a chain-of-thought panel
- Sidebar progress timeline shows phase-grouped stages with sub-task expansion
- Model receives plan context in its system prompt for awareness (invisible to user)
- All existing functionality (rewind, search indicators, reasoning traces, choice cards) preserved
- Non-paper-mode conversations are completely unaffected

---

## 2. Guiding Principles

1. **New files before modified files** — create components in isolation, integrate last
2. **Pure logic before UI** — derivation functions first, rendering second
3. **Additive before replacement** — add new blocks alongside existing ones, swap later
4. **Paper mode guard everything** — all new UI gated by `isPaperMode && isAssistant`
5. **One file touched at a time** — no phase modifies more than 2 existing files
6. **Each phase independently revertable** — `git revert` of any phase does not break others

---

## 3. Scope

### In scope

| Deliverable | Location | Description |
|-------------|----------|-------------|
| Task derivation logic | `src/lib/paper/task-derivation.ts` | Pure function: stageData fields → task list |
| TaskProgress component | `src/components/chat/TaskProgress.tsx` | Collapsible task checklist per message |
| ChainOfThought component | `src/components/chat/ChainOfThought.tsx` | Collapsible reasoning/search steps |
| Sidebar Queue upgrade | `src/components/chat/sidebar/SidebarQueueProgress.tsx` | Phase-grouped timeline with sub-tasks |
| System prompt injection | `src/lib/ai/paper-mode-prompt.ts` | Plan context block in model prompt |
| Chat integration | `src/components/chat/MessageBubble.tsx` | Wire components into render pipeline |

### Out of scope

- Backend/API changes (route.ts, paper-tools.ts, orchestrator.ts — all unchanged)
- Convex schema changes (no new tables)
- AI Elements library installation (build equivalents with existing shadcn/ui)
- Stage skill instruction rewrites (model doesn't output plan text)
- Checkpoint/stage-transition markers (see `next-features.md`)

---

## 4. Architecture

### 4.1 System-level view

```
┌─ Backend (UNCHANGED) ─────────────────────────────────────┐
│  chat/route.ts → streamText → writer.write()               │
│  paper-tools.ts → updateStageData, createArtifact          │
│  paper-mode-prompt.ts → stage instructions (+ plan context)│
│  convex/paperSessions → stageData (Convex real-time)       │
└────────────────────────────────────────────────────────────┘
                         │
                  Convex subscription
                         │
                         ▼
┌─ Frontend (CHANGED) ──────────────────────────────────────┐
│                                                            │
│  ┌─ Chat Window ────────────────────────────────────────┐  │
│  │  MessageBubble.tsx (paper mode, assistant only)       │  │
│  │  ├── <TaskProgress />      ← deriveTaskList()        │  │
│  │  ├── <ChainOfThought />    ← extractSearchStatus()   │  │
│  │  ├── Process Indicators    ← hidden in paper mode     │  │
│  │  ├── Message Content       ← unchanged                │  │
│  │  └── Follow-up Blocks      ← unchanged                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ Sidebar ────────────────────────────────────────────┐  │
│  │  SidebarQueueProgress.tsx  ← replaces SidebarProgress│  │
│  │  ├── Header (progress bar, title)                     │  │
│  │  ├── Phase sections (4 collapsible groups)            │  │
│  │  ├── Stage items (14 stages with status)              │  │
│  │  ├── Sub-tasks (active stage, from deriveTaskList())  │  │
│  │  └── Rewind (ported from existing)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Shared: deriveTaskList() from task-derivation.ts          │
│  Shared: usePaperSession() hook (existing, unchanged)      │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Key architectural decision: Visibility, not execution

Plan/Task/Queue is a **read-only visibility layer**. It does NOT control tool execution.

The model calls tools (search, updateStageData, createArtifact) naturally during
conversation. Plan/Task/Queue observes the resulting stageData and renders progress.

```
PLAN (observes)                TOOLS (execute independently)
───────────────                ─────────────────────────────
Task 1: Identify themes    ←  Model discusses (no tool call)
Task 2: Research refs      ←  Search orchestrator (1x-3x)
Task 3: Structure review   ←  Model + choice card
Task 4: Draft              ←  updateStageData + createArtifact
Task 5: Finalize           ←  submitStageForValidation
```

### 4.3 Why NOT install AI Elements library

AI Elements (`npx ai-elements`) is not installed. The app uses custom chat components
(MessageBubble, ChatWindow, SearchStatusIndicator, etc.) throughout. Installing
AI Elements would introduce a parallel component system that conflicts with the
existing architecture. Instead, we build equivalent components using the same
shadcn/ui primitives (Collapsible, Badge, Card), matching the visual style from
the AI Elements documentation.

### 4.4 Data flow

All components render from the same data source — no new subscriptions, no new queries:

```
usePaperSession(conversationId)
  └── session.stageData[currentStage]
        └── deriveTaskList(currentStage, stageData)
              ├── TaskProgress (chat)
              ├── SidebarQueueProgress (sidebar)
              └── buildPlanContext() (system prompt, server-side)
```

---

## 5. Component Design

### 5.1 TaskProgress

**Purpose:** Show task completion within the active stage on every assistant message.

**Visual:**
```
Collapsed:  📋 Tinjauan Literatur  ▾  3/6 tasks
Expanded:   📋 Tinjauan Literatur  ▴  3/6 tasks
              ✅ Kerangka teoretis
              ✅ Review literatur
              🔄 Gap analysis
              ○  Kumpulkan referensi
```

**Interface:**
```typescript
interface TaskProgressProps {
  stageId: string
  stageLabel: string
  tasks: TaskItem[]
  completed: number
  total: number
  defaultOpen?: boolean  // default: false
}
```

**Behavior:**
- Collapsed by default (1 line)
- All data received as props — no hooks, no fetching
- Uses `Collapsible` from shadcn/ui
- Styled with `--chat-*` CSS variables
- Returns `null` if `tasks.length === 0`
- **Render guard:** Only rendered when `isPaperMode && isAssistant && taskSummary`

**Inspired by:** AI Elements [Plan](https://elements.ai-sdk.dev/components/plan)
(collapsible card with title) and [Task](https://elements.ai-sdk.dev/components/task)
(status indicators: pending/in_progress/completed).

---

### 5.2 ChainOfThought

**Purpose:** Show the model's active search and reasoning steps.

**Visual:**
```
Collapsed:  ⓘ Chain of Thought  ▾
Expanded:   ⓘ Chain of Thought  ▴
              🔍 Mencari referensi "adaptive learning"
                 [jstor] [springer] [ieee.org]
              ✅ Ditemukan 5 paper relevan
              🔍 Mencari referensi "higher education"...
                 [scholar] [garuda.id]
```

**Interface:**
```typescript
interface ChainOfThoughtProps {
  searchStatus: {
    status: "searching" | "fetching-content" | "composing" | "done" | "error" | "off"
    message?: string
    sourceCount?: number
  } | null
  internalThought: string | null
  defaultOpen?: boolean  // default: false
}
```

**Behavior:**
- Returns `null` when both `searchStatus` and `internalThought` are null
- Search domain badges extracted from search status data
- Status mapping: searching/fetching-content → active, composing/done → complete, error → error
- Uses `Collapsible` + `Badge` from shadcn/ui

**Data extraction:** Uses existing functions in MessageBubble.tsx:
- `extractSearchStatus()` (lines 327-352)
- `extractInternalThoughtData()` (lines 466-478)

**Sub-elements (internal, not exported):**
- Step row (`ChainOfThoughtStep`-equivalent): icon + label + status badge
- Search results (`ChainOfThoughtSearchResults`-equivalent): container for domain badges
- Content area: collapsible detail section

These are internal to the component, not separate exports. The AI Elements library
exports them separately, but our implementation keeps them internal to reduce API surface.

**Replaces (Phase 5, paper mode only):** `SearchStatusIndicator` and `ReasoningTracePanel`.
The replacement guard in MessageBubble.tsx is:
```tsx
{shouldShowProcessIndicators && !isPaperMode && (
  // ... existing indicators render only in non-paper mode
)}
```
Non-paper-mode retains existing indicators untouched.

**Inspired by:** AI Elements [Chain of Thought](https://elements.ai-sdk.dev/components/chain-of-thought)
(step status, search result badges, collapsible reasoning).

---

### 5.3 SidebarQueueProgress

**Purpose:** Replace the flat 14-item stage timeline with phase-grouped, expandable
progress showing sub-tasks for the active stage.

**Visual:**
```
PROGRESS — Paper Title — 14% Stage 2/14

▼ Phase 1: Foundation (1/3)
  ✅ 1. Gagasan Paper
  🔄 2. Penentuan Topik
     ├── ✅ Definisikan judul
     ├── 🔄 Spesifikasi angle
     ├── ○  Argumentasi kebaruan
     └── ○  Identifikasi research gap
  ○  3. Menyusun Outline

▼ Phase 2: Core Sections (0/4)
  ○  4. Penyusunan Abstrak
  ○  5. Pendahuluan
  ○  6. Tinjauan Literatur
  ○  7. Metodologi

▸ Phase 3: Results & Analysis (0/3)
▸ Phase 4: Finalization (0/4)
```

**Phase grouping:**

| Phase | Label | Stage IDs |
|-------|-------|-----------|
| 1 | Foundation | gagasan, topik, outline |
| 2 | Core Sections | abstrak, pendahuluan, tinjauan_literatur, metodologi |
| 3 | Results & Analysis | hasil, diskusi, kesimpulan |
| 4 | Finalization | pembaruan_abstrak, daftar_pustaka, lampiran, judul |

**Preserved features (from existing SidebarProgress.tsx):**

| # | Feature | Source reference |
|---|---------|----------------|
| 1 | Progress bar (percentage + stage count) | SidebarProgress.tsx:407-417 |
| 2 | Paper title display | `resolvePaperDisplayTitle()` at :363-367 |
| 3 | Milestone states (completed/current/pending) | `getMilestoneState()` at :370-381 |
| 4 | Rewind to previous stages | `handleStageClick()` → `RewindConfirmationDialog` at :274-303 |
| 5 | Rewind limit (max 2 stages back) | `MAX_REWIND_STAGES = 2` at :31, `isValidRewindTarget()` at :68-100 |
| 6 | Rewind tooltip on non-rewindable stages | Tooltip with `rewindReason` at :157-179 |
| 7 | Loading skeleton | Skeleton placeholders at :326-344 |
| 8 | Empty state (no paper session) | GitBranch icon + message at :347-356 |
| 9 | No conversation selected state | GitBranch icon + message at :314-322 |

**New features:**
- Phase grouping with collapsible sections (Radix Collapsible)
- Active phase auto-expanded, completed phases expanded, future phases collapsed
- Sub-task list under active stage from `deriveTaskList()`

**Data source:** `usePaperSession(conversationId)` (unchanged) + `deriveTaskList()`.

**Inspired by:** AI Elements [Queue](https://elements.ai-sdk.dev/components/queue)
(`QueueSection` per phase, `QueueItem` per stage, `QueueItemIndicator` for status).

---

### 5.4 System Prompt Injection

**Purpose:** Give the model awareness of current task progress without user-visible output.

**Injection point:** `getPaperModeSystemPrompt()` in `paper-mode-prompt.ts`,
within the `[PAPER WRITING MODE]` block after existing context (memory digest, dirty context).

**Format:**
```
CURRENT PLAN CONTEXT:
Stage: Tinjauan Literatur (6/14)
Tasks: 3/4 complete
  ✓ Kerangka teoretis
  ✓ Review literatur
  → Gap analysis (active)
  · Kumpulkan referensi
```

**Implementation:**
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

**Injection point in template (~line 282):**
```diff
  ${revisionNote}${pendingNote}${dirtyContextNote}${dirtySyncContractNote}${invalidatedArtifactsContext}
+ ${planContext}
  GENERAL RULES:
```

**Constraints:**
- Adds ~100-150 tokens per request (acceptable within token budget)
- Empty string when `currentStage === "completed"`
- Uses `deriveTaskList()` server-side (same logic as frontend, no React dependency)
- Does NOT instruct the model to output plan text
- Does NOT change stage skill instructions

---

## 6. Task Derivation Logic

### Core function

```typescript
function deriveTaskList(
  stageId: PaperStageId,
  stageData: Record<string, unknown>
): TaskSummary
```

### Types

```typescript
type TaskStatus = "complete" | "active" | "pending"

type TaskItem = {
  id: string       // "gagasan.ideKasar"
  label: string    // "Eksplorasi ide"
  field: string    // "ideKasar"
  status: TaskStatus
}

type TaskSummary = {
  stageId: string
  stageLabel: string
  tasks: TaskItem[]
  completed: number
  total: number
}
```

### Completion rules

| Field type | Complete when |
|-----------|---------------|
| String | `typeof value === "string" && value.trim().length > 0` |
| Number | `typeof value === "number" && value > 0` |
| Array | `Array.isArray(value) && value.length > 0` |
| Boolean | `value === true` |
| Enum | `typeof value === "string"` (any valid enum value) |

### Status assignment

Walk tasks top-to-bottom. All filled fields = `"complete"`. First unfilled field = `"active"`.
Remaining unfilled = `"pending"`.

### Per-stage task mappings

14 stages, 43 total tasks. Full mapping in `context.md` section 4.

Summary:

| Stage | Tasks | Key fields |
|-------|-------|-----------|
| gagasan | 4 | ideKasar, analisis, angle, referensiAwal |
| topik | 4 | definitif, angleSpesifik, argumentasiKebaruan, researchGap |
| outline | 2 | sections, totalWordCount |
| abstrak | 3 | ringkasanPenelitian, keywords, wordCount |
| pendahuluan | 5 | latarBelakang, rumusanMasalah, researchGapAnalysis, tujuanPenelitian, sitasiAPA |
| tinjauan_literatur | 4 | kerangkaTeoretis, reviewLiteratur, gapAnalysis, referensi |
| metodologi | 4 | desainPenelitian, metodePerolehanData, teknikAnalisis, pendekatanPenelitian |
| hasil | 2 | temuanUtama, metodePenyajian |
| diskusi | 4 | interpretasiTemuan, perbandinganLiteratur, implikasiTeoretis, keterbatasanPenelitian |
| kesimpulan | 3 | ringkasanHasil, jawabanRumusanMasalah, saranPeneliti |
| pembaruan_abstrak | 3 | ringkasanPenelitianBaru, perubahanUtama, keywordsBaru |
| daftar_pustaka | 1 | entries |
| lampiran | 2 | items OR tidakAdaLampiran |
| judul | 2 | opsiJudul, judulTerpilih |

### Universal completion markers (all stages)

- `ringkasan` is set → summary saved
- `artifactId` is set → artifact created
- `validatedAt` is set → stage validated

These are NOT shown as tasks (they're stage-level, not task-level) but inform overall
stage status in the sidebar.

### Intentionally unmapped fields

Some stageData fields are excluded from task derivation — they are secondary/optional
details within a parent task. Full table in `context.md` section 4, covering:
Pendahuluan (signifikansiPenelitian, hipotesis), Metodologi (etikaPenelitian, alatInstrumen),
Diskusi (implikasiPraktis, saranPenelitianMendatang, sitasiTambahan), and others.

### Phase grouping constant

```typescript
const PHASE_GROUPS = [
  { label: "Foundation", stages: ["gagasan", "topik", "outline"] },
  { label: "Core Sections", stages: ["abstrak", "pendahuluan", "tinjauan_literatur", "metodologi"] },
  { label: "Results & Analysis", stages: ["hasil", "diskusi", "kesimpulan"] },
  { label: "Finalization", stages: ["pembaruan_abstrak", "daftar_pustaka", "lampiran", "judul"] },
] as const
```

---

## 7. Integration Points

### 7.1 MessageBubble render pipeline

Current order (assistant messages):

```
1. Process Indicators     (lines 922-958)
2. Message Content        (lines 960-1067)
3. Follow-up Blocks       (lines 1069-1120)
```

New order (paper mode):

```
0. TaskProgress + ChainOfThought  (NEW, guarded)
1. Process Indicators             (hidden in paper mode after Phase 5)
2. Message Content                (unchanged)
3. Follow-up Blocks               (unchanged)
```

Guard: `isPaperMode && isAssistant && taskSummary`

### 7.2 Props flow

**ChatWindow → MessageBubble:**
- Existing: `isPaperMode`, `stageData`, `message`, `persistProcessIndicators`
- New: `currentStage` (one prop addition)

**MessageBubble → TaskProgress:**
- `deriveTaskList(currentStage, stageData)` computed via `useMemo`

**MessageBubble → ChainOfThought:**
- `extractSearchStatus(message)` (existing function)
- `extractInternalThoughtData(message)` (existing function)

### 7.3 Sidebar swap

```
ChatSidebar.tsx
  case "progress":
    OLD: <SidebarProgress conversationId={...} />
    NEW: <SidebarQueueProgress conversationId={...} />
```

SidebarProgress.tsx kept as fallback (not deleted).

### 7.4 usePaperSession hook (full return shape)

```typescript
const {
  session, isPaperMode, currentStage, stageStatus, stageData, isLoading,
  stageLabel, stageNumber,
  approveStage, requestRevision, updateStageData, updateWorkingTitle,
  markStageAsDirty, rewindToStage,
  getStageStartIndex, checkMessageInCurrentStage,
} = usePaperSession(conversationId)
```

Key consumers:
- TaskProgress: `currentStage`, `stageLabel`, `stageData`
- SidebarQueueProgress: all above + `rewindToStage`, `stageStatus`, `stageNumber`
- System prompt: server-side equivalent, not this hook

### 7.5 System prompt

```
paper-mode-prompt.ts → getPaperModeSystemPrompt()
  → buildPlanContext(stage, stageData) → string injected after existing context blocks
```

Uses `deriveTaskList()` from task-derivation.ts (server-side import, no React dependency).

---

## 8. Execution Plan

7 phases, ordered by risk (lowest first). Full details in `implementation-priority.md`.

| Order | Phase | Risk | New files | Modified files |
|-------|-------|------|-----------|----------------|
| 1st | Phase 1: Task Derivation | Zero | task-derivation.ts + test | None |
| 2nd | Phase 2: TaskProgress | Zero | TaskProgress.tsx | None |
| 3rd | Phase 3: ChainOfThought | Zero | ChainOfThought.tsx | None |
| 4th | Phase 4: Chat Integration | Low | None | MessageBubble.tsx, ChatWindow.tsx |
| 5th | Phase 6: Sidebar Queue | Medium | SidebarQueueProgress.tsx | ChatSidebar.tsx |
| 6th | Phase 5: CoT Replaces Indicators | Medium | None | MessageBubble.tsx |
| 7th | Phase 7: System Prompt | Low* | None | paper-mode-prompt.ts |

*Phase 7 is low code risk but high behavioral impact — model sees plan context.

> **Why Phase 6 before Phase 5:** Sidebar is independent from chat and validates
> `deriveTaskList()` in a separate surface. Phase 5 is the riskiest chat change
> (replacement, not addition) — doing it after sidebar confirms the data is correct.

### Dependency graph

```
Phase 1: Task Derivation Logic ─────────────────────────────────
    │
    ├──→ Phase 2: TaskProgress Component ──┐
    │    (can parallel with 3, 6)          │
    │                                       ├──→ Phase 4: Chat Integration
    ├──→ Phase 3: ChainOfThought Component ┘    (MessageBubble)
    │    (can parallel with 2, 6)                    │
    │                                                ▼
    │                                        Phase 5: CoT Replaces
    │                                        Existing Indicators
    │
    ├──→ Phase 6: Sidebar Queue Upgrade
    │    (can parallel with 2, 3)
    │
    └──→ Phase 7: System Prompt (LAST)
         (depends on ALL above being stable)
```

Phases 2, 3, 6 can run in parallel (independent components).
Phase 4 requires 2 + 3. Phase 5 requires 4. Phase 7 requires all.

### Revert strategy

Every phase is independently revertable:
- Phases 1-3: delete new files
- Phase 4: remove guarded render block from MessageBubble
- Phase 5: remove `!isPaperMode` guard on process indicators block
- Phase 6: swap import back to SidebarProgress in ChatSidebar
- Phase 7: remove planContext line from prompt template

---

## 9. What Does NOT Change

| System | Status |
|--------|--------|
| `src/app/api/chat/route.ts` | Unchanged — streaming, tool execution, search routing |
| `src/lib/ai/paper-tools.ts` | Unchanged — updateStageData, createArtifact, submitStageForValidation |
| `src/lib/ai/web-search/orchestrator.ts` | Unchanged — search pipeline |
| `convex/schema.ts` | Unchanged — no new tables |
| `convex/paperSessions/types.ts` | Unchanged — no schema changes |
| `src/components/chat/SearchStatusIndicator.tsx` | Preserved — non-paper fallback |
| `src/components/chat/ReasoningTracePanel.tsx` | Preserved — non-paper fallback |
| `src/components/chat/sidebar/SidebarProgress.tsx` | Preserved — sidebar fallback |
| Stage skill instructions | Unchanged — model behavior not modified |
| Tool execution order | Unchanged — plan observes, does not control |

---

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| TaskProgress shows stale data | User sees wrong progress | Data from Convex real-time subscription — updates automatically |
| ChainOfThought misses a search state | Missing step in CoT | All 6 states mapped (searching, fetching-content, composing, done, error, off); null → render nothing |
| Sidebar rewind breaks after upgrade | User cannot rewind stages | Port all rewind logic; keep SidebarProgress.tsx as instant fallback |
| System prompt plan context confuses model | Model outputs unexpected plan text | Plan context is informational only; no instructions to output plan; model instructions unchanged |
| Paper mode guard fails | Non-paper chats show TaskProgress | Guard: `isPaperMode && isAssistant && taskSummary`; taskSummary is null without stageData |
| deriveTaskList returns wrong counts | Incorrect progress numbers | Unit tests for all 14 stages with empty, partial, and full data |
| Lampiran edge case: tidakAdaLampiran | Task shows incomplete when no appendices | Explicit boolean check: `tidakAdaLampiran === true` → complete |
| Mobile sidebar regression | Sidebar breaks on small screens | SidebarQueueProgress uses same layout pattern (flex column + overflow scroll) |

---

## 11. Testing Strategy

### Unit tests (Phase 1)

```
src/lib/paper/__tests__/task-derivation.test.ts
```

- 14 stages × 3 states (empty, partial, full) = 42 test cases minimum
- Lampiran edge case: `tidakAdaLampiran` = true without `items`
- Phase grouping: all 14 stages covered, no gaps
- Universal markers: `ringkasan`, `artifactId`, `validatedAt`

### Manual verification (Phases 2-6)

| Check | Phase | How |
|-------|-------|-----|
| TaskProgress renders collapsed/expanded | 2 | Mock data in browser |
| ChainOfThought renders all search states | 3 | Mock data in browser |
| Paper mode: new components appear | 4 | Start paper session, send message |
| Non-paper mode: no visual change | 4 | Regular chat, verify no TaskProgress |
| Sidebar: phase grouping renders | 5 | Open progress panel with active session |
| Sidebar: rewind works | 5 | Click completed stage, confirm dialog |
| Sidebar: sub-tasks show for active stage | 5 | Check active stage expansion |
| CoT replaces indicators in paper mode | 6 | Verify no duplicate indicators |
| Non-paper indicators still work | 6 | Regular chat with search |
| System prompt contains plan context | 7 | Console log in dev |
| Model response quality unchanged | 7 | Paper mode conversation test |

---

## 12. File Inventory

### Files created (new, zero-risk)

| Phase | File | Type |
|-------|------|------|
| 1 | `src/lib/paper/task-derivation.ts` | Pure logic |
| 1 | `src/lib/paper/__tests__/task-derivation.test.ts` | Tests |
| 2 | `src/components/chat/TaskProgress.tsx` | React component |
| 3 | `src/components/chat/ChainOfThought.tsx` | React component |
| 6 | `src/components/chat/sidebar/SidebarQueueProgress.tsx` | React component |

### Files modified (existing, requires care)

| Phase | File | Change type | Scope |
|-------|------|-------------|-------|
| 4 | `MessageBubble.tsx` | Add guarded render block | ~15 lines added |
| 4 | `ChatWindow.tsx` | Pass `currentStage` prop | ~3 lines added |
| 5 | `MessageBubble.tsx` | Add `!isPaperMode` guard to existing block | ~1 line changed |
| 6 | `ChatSidebar.tsx` | Swap import + component reference | ~2 lines changed |
| 7 | `paper-mode-prompt.ts` | Add planContext to template | ~5 lines added |

### Files NOT modified (preserved as-is)

| File | Reason |
|------|--------|
| `src/app/api/chat/route.ts` | Backend unchanged |
| `src/lib/ai/paper-tools.ts` | Tools unchanged |
| `src/lib/ai/web-search/orchestrator.ts` | Search unchanged |
| `convex/schema.ts` | No new tables |
| `convex/paperSessions/types.ts` | No schema changes |
| `src/components/chat/SearchStatusIndicator.tsx` | Kept as non-paper fallback |
| `src/components/chat/ReasoningTracePanel.tsx` | Kept as non-paper fallback |
| `src/components/chat/sidebar/SidebarProgress.tsx` | Kept as fallback |
