# Implementation Priority: Plan, Task, Queue & Chain of Thought

> Execution order designed for zero breakage, no race conditions, no over-engineering.
> Each phase produces a testable deliverable before the next phase begins.
>
> Reference: `context.md` sections 3-9

---

## Guiding Principles

1. **New files before modified files** — create components in isolation, integrate last
2. **Pure logic before UI** — derivation functions first, rendering second
3. **Additive before replacement** — add new blocks alongside existing ones, swap later
4. **Paper mode guard everything** — all new UI gated by `isPaperMode && isAssistant`
5. **One file touched at a time** — no phase modifies more than 2 existing files
6. **Each phase independently revertable** — `git revert` of any phase does not break others

---

## Phase 1: Task Derivation Logic

> Pure functions. No UI. No imports from React. No side effects.

**Risk:** Zero — new file, tested in isolation

**Create:**
```
src/lib/paper/task-derivation.ts
src/lib/paper/__tests__/task-derivation.test.ts
```

**What it does:**
- Export `deriveTaskList(stageId, stageData)` → returns `TaskItem[]`
- Export `PHASE_GROUPS` constant (4 phases with stage ID arrays)
- Export `getPhaseForStage(stageId)` → returns phase label + index

**TaskItem type:**
```typescript
type TaskStatus = "complete" | "active" | "pending"

type TaskItem = {
  id: string          // e.g. "gagasan.ideKasar"
  label: string       // e.g. "Eksplorasi ide"
  field: string       // e.g. "ideKasar"
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

**Completion logic (from context.md section 4):**
- String fields: `complete` when `typeof value === "string" && value.trim().length > 0`
- Array fields: `complete` when `Array.isArray(value) && value.length > 0`
- Boolean fields (lampiran): `complete` when `value === true`
- Enum fields: `complete` when `typeof value === "string"` (any valid enum value)
- Status for last incomplete task = `"active"`, rest = `"pending"`

**Test cases (14 stages):**
- Empty stageData → all tasks pending, completed = 0
- Partially filled → correct split between complete/active/pending
- Fully filled → all complete
- Lampiran edge case: `tidakAdaLampiran = true` → complete even without `items`

**Verify before proceeding:**
```bash
npm test -- src/lib/paper/__tests__/task-derivation.test.ts
```

**Done when:** All 14 stage mappings pass, `PHASE_GROUPS` covers all stages, zero imports from React/Convex.

---

## Phase 2: TaskProgress Component

> New file. No integration into existing components yet.

**Risk:** Zero — standalone component, not rendered anywhere

**Create:**
```
src/components/chat/TaskProgress.tsx
```

**Props:**
```typescript
interface TaskProgressProps {
  stageId: string
  stageLabel: string
  tasks: TaskItem[]
  completed: number
  total: number
  defaultOpen?: boolean  // default: false (collapsed)
}
```

**Renders:**
- Uses `Collapsible` from `src/components/ui/collapsible.tsx`
- Collapsed: single line — stage label + "▾" + "N/M tasks"
- Expanded: task list with status indicators (✅ complete, 🔄 active, ○ pending)
- Styling: `--chat-*` CSS variables (match existing chat theme)

**NOT included:**
- No data fetching — receives `TaskItem[]` as props
- No Convex hooks — pure presentational
- No interaction (no click handlers beyond expand/collapse)

**Verify:** Manual render in browser dev tools or temporary test page.

**Done when:** Component renders collapsed/expanded states correctly with mock data.

---

## Phase 3: ChainOfThought Component

> New file. No integration into existing components yet.
> Can be built in parallel with Phase 2 (no dependency).

**Risk:** Zero — standalone component, not rendered anywhere

**Create:**
```
src/components/chat/ChainOfThought.tsx
```

**Props:**
```typescript
interface ChainOfThoughtProps {
  searchStatus: {
    status: "searching" | "fetching-content" | "composing" | "done" | "error" | "off"
    message?: string
    sourceCount?: number
  } | null
  internalThought: string | null
  defaultOpen?: boolean  // default: false (collapsed)
}
```

**Sub-elements (internal, not exported):**
- Step row: icon + label + status badge
- Search result badges: domain names extracted from search status
- Reasoning text: from `internalThought`

**Renders:**
- Uses `Collapsible` + `Badge` from existing shadcn/ui
- Collapsed: "Chain of Thought ▾" (one line)
- Expanded: steps showing search activity and reasoning
- When `searchStatus` is `null` AND `internalThought` is `null` → render nothing (return null)
- Styling: `--chat-*` CSS variables

**NOT included:**
- No data extraction — receives pre-extracted data as props
- No replacement of existing indicators (that's Phase 5)

**Done when:** Component renders all search status states correctly with mock data.

---

## Phase 4: Chat Integration (MessageBubble)

> First modification to an existing file. Additive only — no deletions.

**Risk:** Low — adds one render block, does not touch existing blocks

**Modify:**
```
src/components/chat/MessageBubble.tsx
```

**Change:**
Insert a new block BEFORE the existing "Process Indicators" section (line 922).
The new block is guarded and renders TaskProgress + ChainOfThought.

**Exact insertion point:** Before line 922 (`{/* Process Indicators */}`):

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

**Data wiring (inside MessageBubble function body):**
```typescript
// Derive task summary from stageData (already available as prop)
const taskSummary = useMemo(() => {
  if (!isPaperMode || !stageData) return null
  // stageData prop doesn't carry currentStage — need to derive or receive it
  // Option: add currentStage prop from ChatWindow (minimal change)
  return null // placeholder until prop is wired
}, [isPaperMode, stageData])
```

**Additional prop needed from ChatWindow:**
```typescript
currentStage?: string  // Add to MessageBubbleProps
```

**Files modified:**
1. `MessageBubble.tsx` — add render block + import TaskProgress/ChainOfThought
2. `ChatWindow.tsx` — pass `currentStage` prop to MessageBubble (one line addition)

**What stays the same:**
- Process Indicators block — untouched
- Message Content block — untouched
- Follow-up Blocks — untouched
- Non-paper-mode messages — untouched (guard ensures this)

**Verify:**
1. Paper mode chat: TaskProgress + CoT appear above message content
2. Non-paper chat: no visual change at all
3. Existing process indicators still work
4. No console errors

**Done when:** Both components render in paper mode with real Convex data, non-paper mode unaffected.

---

## Phase 5: ChainOfThought Replaces Existing Indicators (Paper Mode Only)

> First replacement. Existing indicators become fallback for non-paper-mode.

**Risk:** Medium — changes render behavior for paper mode messages

**Modify:**
```
src/components/chat/MessageBubble.tsx
```

**Change:** Wrap the existing Process Indicators block (lines 922-958) in a condition:

```tsx
{/* Process Indicators — paper mode uses ChainOfThought instead */}
{shouldShowProcessIndicators && !isPaperMode && (
  <div className="mb-3 space-y-2">
    {/* ... existing indicators unchanged ... */}
  </div>
)}
```

**What this means:**
- Paper mode: `SearchStatusIndicator` and `ToolStateIndicator` no longer render
  (ChainOfThought from Phase 4 takes their place)
- Non-paper mode: everything unchanged — existing indicators render as before
- Error states: ChainOfThought must handle `status: "error"` (verify in Phase 3)

**Safety net:** If ChainOfThought has a bug, remove the `!isPaperMode` guard to restore
original behavior instantly. One-line revert.

**Verify:**
1. Paper mode: no duplicate indicators (only CoT, no old SearchStatusIndicator)
2. Non-paper mode: indicators work exactly as before
3. Search error state renders correctly in both modes
4. Reasoning trace still accessible in paper mode via CoT

**Done when:** Paper mode shows unified CoT, non-paper shows original indicators, no regressions.

---

## Phase 6: Sidebar Queue Upgrade

> Independent from Phases 4-5. Can be started after Phase 1.
> Replaces SidebarProgress — keep old file as fallback.

**Risk:** Medium — replaces sidebar component, must preserve rewind

**Create:**
```
src/components/chat/sidebar/SidebarQueueProgress.tsx
```

**Modify:**
```
src/components/chat/ChatSidebar.tsx  (swap component import)
```

**DO NOT delete:**
```
src/components/chat/sidebar/SidebarProgress.tsx  (keep as fallback)
```

**New component structure:**
```
SidebarQueueProgress
├── Header (same as current: title, progress bar, percentage)
├── Phase sections (4 collapsible groups)
│   ├── QueueSection: "Phase 1: Foundation" (stages 1-3)
│   ├── QueueSection: "Phase 2: Core Sections" (stages 4-7)
│   ├── QueueSection: "Phase 3: Results & Analysis" (stages 8-10)
│   └── QueueSection: "Phase 4: Finalization" (stages 11-14)
├── Each stage item
│   ├── Status indicator (completed/current/pending)
│   ├── Stage label
│   ├── Rewind click handler (completed stages, max 2 back)
│   └── Sub-tasks (expanded for active stage only)
│       └── TaskItem list from deriveTaskList()
└── RewindConfirmationDialog (ported from existing)
```

**Features to port from SidebarProgress.tsx (all required):**
- [ ] Progress bar with percentage
- [ ] Paper title via `resolvePaperDisplayTitle()`
- [ ] Milestone states: completed / current / pending
- [ ] Rewind via `handleStageClick()` → `RewindConfirmationDialog`
- [ ] Rewind limit: max 2 stages back (`MAX_REWIND_STAGES`)
- [ ] Rewind tooltip on non-rewindable completed stages
- [ ] Loading skeleton
- [ ] Empty state (no paper session)
- [ ] No conversation selected state

**New features:**
- [ ] Phase grouping with collapsible sections
- [ ] Active phase auto-expanded, future phases collapsed
- [ ] Sub-task list under active stage (from `deriveTaskList()`)

**Data source:** Same as current — `usePaperSession(conversationId)`.
Plus `deriveTaskList()` from Phase 1 for sub-tasks.

**Swap in ChatSidebar.tsx:**
```diff
- import { SidebarProgress } from "./sidebar/SidebarProgress"
+ import { SidebarQueueProgress } from "./sidebar/SidebarQueueProgress"

  case "progress":
-   return <SidebarProgress conversationId={currentConversationId} />
+   return <SidebarQueueProgress conversationId={currentConversationId} />
```

**Verify:**
1. All 9 ported features work (checklist above)
2. Rewind still works (click completed stage → dialog → rewind)
3. Phase grouping renders correctly
4. Sub-tasks show under active stage
5. Mobile: sidebar still works
6. Fallback: swap import back to `SidebarProgress` → old behavior restored

**Done when:** All ported features pass, phase grouping works, sub-tasks visible.

---

## Phase 7: System Prompt Injection

> Last phase. Only proceeds when Phases 1-6 are stable.
> This is the only change that affects model behavior.

**Risk:** Low code change, high behavioral impact

**Modify:**
```
src/lib/ai/paper-mode-prompt.ts
```

**Change:** Inside `getPaperModeSystemPrompt()`, after the existing context blocks
(memory digest, dirty context, revision note), add:

```typescript
// Build plan context from stageData
const planContext = buildPlanContext(stage, session.stageData);
```

**New helper function** (in same file or `task-derivation.ts`):
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

**Injection into prompt template (line ~282):**
```diff
  ${revisionNote}${pendingNote}${dirtyContextNote}${dirtySyncContractNote}${invalidatedArtifactsContext}
+ ${planContext}
  GENERAL RULES:
```

**What this does NOT do:**
- Does NOT change model instructions or stage skills
- Does NOT tell the model to output plan cards
- Does NOT change tool behavior
- Only provides awareness — model can reference progress naturally

**Verify:**
1. Console log the generated prompt — plan context appears correctly
2. Model response quality: no regressions in paper mode conversations
3. Token budget: plan context adds ~100-150 tokens (acceptable)
4. `completed` stage: plan context is empty string (no noise)

**Done when:** Plan context injected, model aware of task progress, no regressions.

---

## Dependency Graph

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

## Execution Order (Sequential, Safest)

| Order | Phase | Touches existing files? | Revertable? |
|-------|-------|------------------------|-------------|
| 1st | Phase 1: Task Derivation | No | Yes — delete file |
| 2nd | Phase 2: TaskProgress | No | Yes — delete file |
| 3rd | Phase 3: ChainOfThought | No | Yes — delete file |
| 4th | Phase 4: Chat Integration | Yes — MessageBubble, ChatWindow | Yes — remove guarded block |
| 5th | Phase 6: Sidebar Queue | Yes — ChatSidebar (1 import swap) | Yes — swap import back |
| 6th | Phase 5: CoT Replaces Indicators | Yes — MessageBubble | Yes — remove `!isPaperMode` guard |
| 7th | Phase 7: System Prompt | Yes — paper-mode-prompt | Yes — remove planContext line |

> Note: Phase 6 is executed before Phase 5 because the sidebar is
> independent from chat and can be verified separately. Phase 5 is
> the riskiest chat change (replacement, not addition) so it goes
> after the sidebar is stable — giving us confidence that the
> `deriveTaskList()` data is correct before we depend on CoT replacing
> existing indicators.

---

## Files Created (new, zero-risk)

| Phase | File | Type |
|-------|------|------|
| 1 | `src/lib/paper/task-derivation.ts` | Pure logic |
| 1 | `src/lib/paper/__tests__/task-derivation.test.ts` | Tests |
| 2 | `src/components/chat/TaskProgress.tsx` | React component |
| 3 | `src/components/chat/ChainOfThought.tsx` | React component |
| 6 | `src/components/chat/sidebar/SidebarQueueProgress.tsx` | React component |

## Files Modified (existing, requires care)

| Phase | File | Change type | Scope |
|-------|------|-------------|-------|
| 4 | `MessageBubble.tsx` | Add guarded render block | ~15 lines added |
| 4 | `ChatWindow.tsx` | Pass `currentStage` prop | ~3 lines added |
| 5 | `MessageBubble.tsx` | Add `!isPaperMode` guard to existing block | ~1 line changed |
| 6 | `ChatSidebar.tsx` | Swap import + component reference | ~2 lines changed |
| 7 | `paper-mode-prompt.ts` | Add planContext to template | ~5 lines added |

## Files NOT Modified (preserved as-is)

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
