# Context: Plan, Task, Queue & Chain of Thought Components

> Design context document for adding planning visibility, task progress tracking,
> and chain-of-thought reasoning display to the Makalah AI paper writing app.

---

## 1. Problem Statement

The AI model follows a multi-step process within each of the 14 paper writing stages,
but this process is **invisible to the user**. The user cannot see:

- What tasks the model plans to do within the current stage
- Which task is currently active and which are done
- What the model is doing right now (searching, analyzing, drafting)
- Real-time progress within a stage (only the macro stage timeline is visible)

This creates uncertainty, especially during complex stages like Tinjauan Literatur
(5-7 sub-tasks) where the model works across many turns.

---

## 2. Solution Overview

Add four visual layers — **without changing any backend code**:

| Layer | Component | Location | Purpose |
|-------|-----------|----------|---------|
| **TaskProgress** | Collapsible task checklist | Every assistant message (paper mode) | "Which task within this stage?" |
| **ChainOfThought** | Collapsible reasoning steps | Every assistant message (paper mode) | "What is the model doing right now?" |
| **Queue sidebar** | Phase-grouped stage timeline | Sidebar progress panel | "Where am I in the 14-stage journey?" |
| **System prompt injection** | Plan context block | `paper-mode-prompt.ts` | Model context anchor (invisible to user) |

### Key architectural constraint

**All components are frontend-rendered from existing Convex data.**
The model does not output plan/task text. Zero token cost. Zero backend changes.

---

## 3. Component Specifications

### 3.1 TaskProgress (Chat — Every Assistant Message)

A compact, collapsible component showing task completion within the active stage.

**Collapsed (default):**
```
┌─────────────────────────────────────────────┐
│ 📋 Tinjauan Literatur  ▾         3/6 tasks  │
└─────────────────────────────────────────────┘
```

**Expanded:**
```
┌─────────────────────────────────────────────┐
│ 📋 Tinjauan Literatur  ▴         3/6 tasks  │
│                                              │
│  ✅ Identifikasi tema utama                  │
│  ✅ Riset referensi tema 1                   │
│  🔄 Riset referensi tema 2                   │
│  ○  Analisis & sintesis                      │
│  ○  Draft tinjauan                           │
│  ○  Review & finalisasi                      │
└─────────────────────────────────────────────┘
```

**Data source:** `usePaperSession()` → `stageData` fields (Convex real-time subscription).
Task completion is **derived** from whether stage-specific fields are populated.

**Rendering location:** Inside `MessageBubble.tsx`, above message content,
guarded by `isPaperMode && isAssistant`.

**UI primitives needed:** `Collapsible` (available), CSS variables (available).

---

### 3.2 ChainOfThought (Chat — Every Assistant Message)

A collapsible component showing the model's active reasoning and search steps.
Bridges TaskProgress (macro: "which task") with the actual work (micro: "searching, analyzing").

**Visual (expanded):**
```
┌─────────────────────────────────────────────┐
│ ⓘ Chain of Thought                       ▴  │
│                                              │
│ 🔍 Mencari referensi "adaptive learning"     │
│    ┌────────┐ ┌──────────┐ ┌───────────┐    │
│    │ jstor  │ │ springer │ │ ieee.org  │    │
│    └────────┘ └──────────┘ └───────────┘    │
│                                              │
│ ✅ Ditemukan 5 paper relevan                 │
│    • Ryan & Deci (2000) - SDT framework      │
│                                              │
│ 🔍 Mencari referensi "higher education       │
│    in Indonesia"...                           │
│    ┌────────────┐ ┌──────────────┐           │
│    │ scholar    │ │ garuda.id    │           │
│    └────────────┘ └──────────────┘           │
└─────────────────────────────────────────────┘
```

**Sub-components:**
- `ChainOfThoughtStep` — icon, label, status (complete/active/pending), optional description
- `ChainOfThoughtSearchResults` — container for source domain badges
- `ChainOfThoughtContent` — collapsible detail area

**Data sources — all existing:**

| CoT element | Existing data source | Extraction |
|-------------|---------------------|------------|
| Search steps + source badges | `data-search` stream parts | `extractSearchStatus()` in MessageBubble.tsx:327-352 |
| "Found N papers" | `referensi[]` / `referensiAwal[]` in stageData | Derived from stageData field arrays |
| Reasoning text | `data-internal-thought` stream parts | `extractInternalThoughtData()` in MessageBubble.tsx:466-478 |
| Search progress states | `data-search` status field | Values: searching, fetching-content, composing, done, error, off |

**Rendering location:** Inside `MessageBubble.tsx`, below TaskProgress and above message content.

**UI primitives needed:** `Collapsible` (available), `Badge` (available).

**Replaces (in paper mode):** `SearchStatusIndicator` and `ReasoningTracePanel`.
Non-paper-mode retains existing indicators as fallback.

---

### 3.3 Queue Sidebar (Upgraded SidebarProgress)

Replaces the existing flat 14-item stage timeline with a phase-grouped, expandable
progress view that includes sub-task visibility for the active stage.

**Current SidebarProgress:**
```
PROGRESS — Paper Tanpa Judul — 7% Stage 1/14
1. ● Gagasan Paper — Selesai
2. ● Penentuan Topik — Sedang berjalan
3. ○ Menyusun Outline
4. ○ Penyusunan Abstrak
... (14 items, flat list, no grouping)
```

**Upgraded Queue sidebar:**
```
PROGRESS — Paper Tanpa Judul — 7% Stage 1/14

▼ Phase 1: Foundation (1/3)
  ├── ✅ 1. Gagasan Paper
  ├── 🔄 2. Penentuan Topik
  │   ├── ✅ Analisis feasibility
  │   ├── 🔄 Cari referensi pendukung
  │   ├── ○  Tentukan angle spesifik
  │   └── ○  Finalisasi judul definitif
  └── ○  3. Menyusun Outline

▼ Phase 2: Core Sections (0/4)
  ├── ○  4. Penyusunan Abstrak
  ├── ○  5. Pendahuluan
  ├── ○  6. Tinjauan Literatur
  └── ○  7. Metodologi

▸ Phase 3: Results & Analysis (0/3)        ← collapsed
▸ Phase 4: Finalization (0/4)              ← collapsed
```

**Existing SidebarProgress features that MUST be preserved:**

| Feature | Current implementation | File:Line |
|---------|----------------------|-----------|
| Progress bar (percentage + stage count) | `progressPercent`, `stageNumber/totalStages` | SidebarProgress.tsx:407-417 |
| Paper title display | `resolvePaperDisplayTitle()` | SidebarProgress.tsx:363-367 |
| Milestone states (completed/current/pending) | `getMilestoneState()` | SidebarProgress.tsx:370-381 |
| Rewind to previous stages | `handleStageClick()` → `RewindConfirmationDialog` | SidebarProgress.tsx:274-303 |
| Rewind limit (max 2 stages back) | `MAX_REWIND_STAGES = 2`, `isValidRewindTarget()` | SidebarProgress.tsx:31, 68-100 |
| Rewind tooltip on non-rewindable stages | Tooltip with `rewindReason` | SidebarProgress.tsx:157-179 |
| Loading skeleton | Skeleton placeholders | SidebarProgress.tsx:326-344 |
| Empty state (no paper session) | GitBranch icon + message | SidebarProgress.tsx:347-356 |
| No conversation selected state | GitBranch icon + different message | SidebarProgress.tsx:314-322 |

**Data source:** `usePaperSession()` (same as current) + task derivation from Phase 1.

**Layout context:**
- Sidebar is toggled via `ActivityBar` (48px vertical nav, left side)
- Two panels: `"chat-history"` and `"progress"` (type: `PanelType`)
- `ChatSidebar.tsx` renders `<SidebarProgress conversationId={...} />` when `activePanel === "progress"`
- Sidebar auto-expands when collapsed and user clicks a panel button

**Phase grouping (proposed):**

| Phase | Stages | Stage IDs |
|-------|--------|-----------|
| Phase 1: Foundation | 1-3 | gagasan, topik, outline |
| Phase 2: Core Sections | 4-7 | abstrak, pendahuluan, tinjauan_literatur, metodologi |
| Phase 3: Results & Analysis | 8-10 | hasil, diskusi, kesimpulan |
| Phase 4: Finalization | 11-14 | pembaruan_abstrak, daftar_pustaka, lampiran, judul |

---

### 3.4 System Prompt Injection

Add a `CURRENT PLAN CONTEXT` section to `paper-mode-prompt.ts` so the model has
awareness of where it is in the current stage's task list — without outputting it.

**Injection point:** `getPaperModeSystemPrompt()` in `src/lib/ai/paper-mode-prompt.ts:277-299`,
within the `[PAPER WRITING MODE]` block alongside existing context (memory digest, dirty context, etc.).

**Example injected context:**
```
CURRENT PLAN CONTEXT:
Stage: Tinjauan Literatur (6/14)
Tasks: 3/6 complete
  ✓ Identifikasi tema utama
  ✓ Riset referensi tema 1
  → Riset referensi tema 2 (active)
  · Analisis & sintesis
  · Draft tinjauan
  · Review & finalisasi
```

---

## 4. Task Derivation Logic (Foundation)

All three visual surfaces (chat TaskProgress, sidebar Queue, system prompt) depend on
the same pure function: deriving a task list from stageData fields.

### Per-stage field → task mapping

Each stage has typed fields in `convex/paperSessions/types.ts`. Task completion
is determined by whether fields are populated (non-null, non-empty).

**Gagasan** (4 tasks):
| Task | Field | Complete when |
|------|-------|---------------|
| Eksplorasi ide | `ideKasar` | string, non-empty |
| Analisis feasibility | `analisis` | string, non-empty |
| Tentukan angle | `angle` | string, non-empty |
| Cari referensi awal | `referensiAwal` | array, length > 0 |

**Topik** (4 tasks):
| Task | Field | Complete when |
|------|-------|---------------|
| Definisikan judul | `definitif` | string, non-empty |
| Spesifikasi angle | `angleSpesifik` | string, non-empty |
| Argumentasi kebaruan | `argumentasiKebaruan` | string, non-empty |
| Identifikasi research gap | `researchGap` | string, non-empty |

**Outline** (2 tasks):
| Task | Field | Complete when |
|------|-------|---------------|
| Susun sections | `sections` | array, length > 0 |
| Estimasi word count | `totalWordCount` | number > 0 |

**Abstrak** (3 tasks):
| Task | Field | Complete when |
|------|-------|---------------|
| Draft ringkasan penelitian | `ringkasanPenelitian` | string, non-empty |
| Tentukan keywords | `keywords` | array, length > 0 |
| Cek word count | `wordCount` | number > 0 |

**Pendahuluan** (5 tasks):
| Task | Field | Complete when |
|------|-------|---------------|
| Latar belakang | `latarBelakang` | string, non-empty |
| Rumusan masalah | `rumusanMasalah` | string, non-empty |
| Analisis research gap | `researchGapAnalysis` | string, non-empty |
| Tujuan penelitian | `tujuanPenelitian` | string, non-empty |
| Sitasi APA | `sitasiAPA` | array, length > 0 |

**Tinjauan Literatur** (4 tasks):
| Task | Field | Complete when |
|------|-------|---------------|
| Kerangka teoretis | `kerangkaTeoretis` | string, non-empty |
| Review literatur | `reviewLiteratur` | string, non-empty |
| Gap analysis | `gapAnalysis` | string, non-empty |
| Kumpulkan referensi | `referensi` | array, length > 0 |

**Metodologi** (4 tasks):
| Task | Field | Complete when |
|------|-------|---------------|
| Desain penelitian | `desainPenelitian` | string, non-empty |
| Metode perolehan data | `metodePerolehanData` | string, non-empty |
| Teknik analisis | `teknikAnalisis` | string, non-empty |
| Tentukan pendekatan | `pendekatanPenelitian` | string (enum value) |

**Hasil** (2 tasks):
| Task | Field | Complete when |
|------|-------|---------------|
| Identifikasi temuan utama | `temuanUtama` | array, length > 0 |
| Tentukan metode penyajian | `metodePenyajian` | string (enum value) |

**Diskusi** (4 tasks):
| Task | Field | Complete when |
|------|-------|---------------|
| Interpretasi temuan | `interpretasiTemuan` | string, non-empty |
| Perbandingan literatur | `perbandinganLiteratur` | string, non-empty |
| Implikasi teoretis | `implikasiTeoretis` | string, non-empty |
| Keterbatasan penelitian | `keterbatasanPenelitian` | string, non-empty |

**Kesimpulan** (3 tasks):
| Task | Field | Complete when |
|------|-------|---------------|
| Ringkasan hasil | `ringkasanHasil` | string, non-empty |
| Jawaban rumusan masalah | `jawabanRumusanMasalah` | array, length > 0 |
| Saran peneliti | `saranPeneliti` | string, non-empty |

**Pembaruan Abstrak** (3 tasks):
| Task | Field | Complete when |
|------|-------|---------------|
| Ringkasan penelitian baru | `ringkasanPenelitianBaru` | string, non-empty |
| Identifikasi perubahan utama | `perubahanUtama` | array, length > 0 |
| Keywords baru | `keywordsBaru` | array, length > 0 |

**Daftar Pustaka** (1 task):
| Task | Field | Complete when |
|------|-------|---------------|
| Kompilasi entri | `entries` | array, length > 0 |

**Lampiran** (2 tasks):
| Task | Field | Complete when |
|------|-------|---------------|
| Kompilasi item lampiran | `items` | array, length > 0 |
| Atau: konfirmasi tidak ada lampiran | `tidakAdaLampiran` | boolean, true |

> Note: `LampiranData` also has `alasanTidakAda` (reason for no appendices).
> Items have: `label` (A/B/C), `judul`, `tipe` (table/figure/instrument/rawData/other),
> `konten`, `referencedInSections[]`.

**Judul** (2 tasks):
| Task | Field | Complete when |
|------|-------|---------------|
| Opsi judul | `opsiJudul` | array, length > 0 |
| Judul terpilih | `judulTerpilih` | string, non-empty |

### Universal tasks (all stages)

Every stage also has these implicit completion markers:
- **Artifact created:** `artifactId` is set
- **Stage validated:** `validatedAt` is set
- **Summary saved:** `ringkasan` is set

### Fields intentionally NOT mapped to tasks

Some stageData fields exist but are excluded from task derivation because they are
secondary/optional details within a parent task, not separate user-visible milestones:

| Stage | Unmapped field | Reason |
|-------|---------------|--------|
| Pendahuluan | `signifikansiPenelitian`, `hipotesis` | Optional sub-fields of the introduction narrative |
| Tinjauan Literatur | `justifikasiPenelitian` | Part of the gap analysis task |
| Metodologi | `etikaPenelitian`, `alatInstrumen` | Optional methodology details |
| Hasil | `dataPoints` | Optional structured data within findings |
| Diskusi | `implikasiPraktis`, `saranPenelitianMendatang`, `sitasiTambahan` | Secondary analysis outputs |
| Kesimpulan | `implikasiPraktis`, `saranPraktisi`, `saranKebijakan` | Optional recommendation sub-types |
| Pembaruan Abstrak | `wordCount` | Derived metric, not a discrete task |
| Daftar Pustaka | `totalCount`, `incompleteCount`, `duplicatesMerged` | Computed stats from `entries` |

These fields are still present in stageData and tracked by Convex, but showing them
as separate task items would create too many fine-grained items (noise). The task
derivation prioritizes user-meaningful milestones over data completeness.

---

## 5. Existing Code Integration Points

### MessageBubble.tsx — Render Pipeline (assistant messages)

Current render order (lines 922-1120):

```
1. Process Indicators (lines 922-958)
   ├── ToolStateIndicator (non-search tools)
   ├── SearchStatusIndicator (search status)
   ├── ToolStateIndicator (search tools)
   └── Fallback indicator

2. Message Content (lines 960-1067)
   ├── Text (MarkdownRenderer)
   └── Internal thought (collapsible)

3. Follow-up Blocks (lines 1069-1120)
   ├── Artifact signals
   ├── Sources/references
   ├── Choice card (JsonRendererChoiceBlock)
   └── Quick actions
```

**Proposed new render order (paper mode):**

```
1. TaskProgress (NEW — collapsible)         ← injected
2. ChainOfThought (NEW — collapsible)       ← injected
3. Process Indicators (existing)            ← Phase 5: replaced by CoT in paper mode
4. Message Content (existing, unchanged)
5. Follow-up Blocks (existing, unchanged)
```

### MessageBubble props already available

```typescript
interface MessageBubbleProps {
  isPaperMode?: boolean        // ✅ Guard for new components
  stageData?: Record<string, StageDataEntry>  // ✅ Data for TaskProgress
  message: UIMessage           // ✅ Parts for ChainOfThought extraction
  persistProcessIndicators?: boolean  // ✅ Controls indicator visibility
}
```

### SidebarProgress.tsx — Current Architecture

| Aspect | Detail |
|--------|--------|
| File | `src/components/chat/sidebar/SidebarProgress.tsx` (453 lines) |
| Props | `{ conversationId: string \| null }` |
| Data hook | `usePaperSession(conversationId)` |
| Supplementary query | `useQuery(api.conversations.getConversation)` for title |
| State management | `useState` for rewind dialog (open, targetStage, isPending) |
| Milestone states | `"completed" \| "current" \| "pending"` |
| Sub-components | `MilestoneItem` (internal, lines 106-223) |
| External deps | `RewindConfirmationDialog`, `resolvePaperDisplayTitle` |
| Layout | Flex column: header (progress bar) → scrollable timeline → rewind dialog |

### usePaperSession Hook — Full Return Shape

The hook returns more fields than initially documented. All are relevant for
TaskProgress, sidebar Queue, and system prompt injection:

```typescript
const {
  // Core state
  session,              // Full Convex paper session document
  isPaperMode,          // boolean — has active paper session
  currentStage,         // PaperStageId | "completed"
  stageStatus,          // "drafting" | "pending_validation" | "approved" | "revision"
  stageData,            // Record<string, StageDataEntry> — all 14 stages' data
  isLoading,            // boolean — Convex query loading

  // Display helpers
  stageLabel,           // string — e.g. "Tinjauan Literatur"
  stageNumber,          // number — e.g. 6

  // Mutations
  approveStage,         // (userId) => Promise
  requestRevision,      // (userId, feedback) => Promise
  updateStageData,      // (stage, data) => Promise
  updateWorkingTitle,   // (title) => Promise
  markStageAsDirty,     // () => Promise<{success, error}>
  rewindToStage,        // (userId, targetStage) => Promise<{success, error}>

  // Message helpers
  getStageStartIndex,       // (messages) => number
  checkMessageInCurrentStage, // (messageCreatedAt) => boolean
} = usePaperSession(conversationId)
```

**Key for new components:**
- TaskProgress needs: `currentStage`, `stageLabel`, `stageData`
- Sidebar Queue needs: all of the above + `rewindToStage`, `stageStatus`, `stageNumber`
- System prompt injection uses server-side equivalent (not this hook)

### Also exists: PaperStageProgress.tsx (horizontal variant)

File: `src/components/paper/PaperStageProgress.tsx` (245 lines).
Horizontal badge-based progress bar with same rewind logic.
**Currently NOT used in chat UI** — only exported from `src/components/paper/index.ts`.
May be used elsewhere or is legacy. Not part of this upgrade scope.

### Available shadcn/ui Primitives

| Component | File | Status |
|-----------|------|--------|
| Collapsible | `src/components/ui/collapsible.tsx` | ✅ Available |
| Badge | `src/components/ui/badge.tsx` | ✅ Available (CVA variants) |
| Card | `src/components/ui/card.tsx` | ✅ Available (7 sub-components) |
| Tooltip | `src/components/ui/tooltip.tsx` | ✅ Available |
| Accordion | package.json (Radix) | ✅ Available |
| ScrollArea | — | ❌ Not installed |

---

## 6. Architectural Decisions

### Plan/Task/Queue is a visibility layer, NOT an execution engine

Tools (search orchestrator, updateStageData, createArtifact, etc.) are NOT called
by the plan system. The model calls tools naturally as part of conversation.
Plan/task/queue only makes the model's work **visible and predictable** for the user.

```
PLAN (visibility)              TOOLS (execution)
─────────────────              ──────────────────
Task 1: Identify themes   →   Model discusses (no tool call)
Task 2: Research refs      →   Search orchestrator (1x-3x, natural)
Task 3: Structure review   →   Model discusses + choice card
Task 4: Draft              →   updateStageData + createArtifact
Task 5: Finalize           →   submitStageForValidation
```

### Backend does NOT change

- `chat/route.ts` — unchanged
- `paper-tools.ts` — unchanged
- `paper-mode-prompt.ts` — only Phase 7 adds context injection (additive)
- `web-search/orchestrator.ts` — unchanged
- Convex schema — no new tables

### Components are frontend-rendered from existing DB data

```
┌─ Backend (UNCHANGED) ────────────────────────┐
│  streamText → chunks → writer.write()         │
│  stageData in Convex (existing subscription)  │
└───────────────────────────────────────────────┘
                    │
                    ▼
┌─ Frontend (CHANGED) ─────────────────────────┐
│  MessageBubble.tsx                             │
│  ├── usePaperSession() → stageData (existing) │
│  ├── deriveTaskList(stageId, stageData) (NEW)  │
│  ├── <TaskProgress /> (NEW)                    │
│  ├── <ChainOfThought /> (NEW)                  │
│  └── existing render pipeline (unchanged)      │
│                                                │
│  SidebarProgress.tsx → SidebarQueueProgress    │
│  ├── usePaperSession() (existing)              │
│  ├── deriveTaskList() (shared with chat)       │
│  ├── Phase grouping (NEW)                      │
│  └── Rewind (ported from existing)             │
└────────────────────────────────────────────────┘
```

### Why NOT use AI Elements library directly

AI Elements (`npx ai-elements`) is not installed. The app uses custom chat components
throughout. Installing AI Elements would introduce a parallel component system.
Instead, we build equivalent components using the same shadcn/ui primitives,
matching the visual style shown in the AI Elements documentation screenshots.

---

## 7. Reference Screenshots

Screenshots from AI Elements documentation showing target visual style:

| Screenshot | Shows | Relevance |
|------------|-------|-----------|
| `screenshots/Screen Shot 2026-03-27 at 18.02.31.png` | Queue component — collapsible sections, compact checklist | Target style for sidebar + TaskProgress |
| `screenshots/Screen Shot 2026-03-27 at 18.02.57.png` | Plan component — card with overview, key steps, action button | Target style for plan overview |
| `screenshots/Screen Shot 2026-03-27 at 18.03.37.png` | Task component — progress steps with file badges | Target style for active task indication |
| `screenshots/Screen Shot 2026-03-27 at 18.06.54.png` | Chain of Thought — search steps, source badges, images | Target style for ChainOfThought component |
| `screenshots/Screen Shot 2026-03-27 at 17.35.23.png` | Current SidebarProgress — flat 14-item timeline | Current state to upgrade |

---

## 8. AI Elements Reference (Primary Documentation)

We are NOT installing the AI Elements library, but building equivalent components
using our existing shadcn/ui primitives. These docs serve as the **design spec**
for our implementations.

### 8.1 Plan — https://elements.ai-sdk.dev/components/plan

Displays AI-generated execution plans with collapsible content, streaming support,
and shimmer loading states.

**Components:**

| Component | Props | Spreads to |
|-----------|-------|------------|
| `Plan` | `isStreaming` (boolean, default: false), `defaultOpen` (boolean) | Collapsible |
| `PlanHeader` | — | CardHeader |
| `PlanTitle` | `children` (string) — shimmer when streaming | CardTitle |
| `PlanDescription` | `children` (string) — shimmer when streaming | CardDescription |
| `PlanTrigger` | — (renders Button with chevron icon) | CollapsibleTrigger |
| `PlanContent` | — | CardContent |
| `PlanFooter` | — | div |
| `PlanAction` | — | CardAction |

**Built on:** shadcn/ui Card + Radix Collapsible.

**Our usage:** Inspires the TaskProgress header style (collapsible card with title + count).

---

### 8.2 Task — https://elements.ai-sdk.dev/components/task

Displays task lists with expandable details, status tracking, and progress indicators.
Designed for `useObject` + `streamObject` integration with Zod schemas.

**Components:**

| Component | Props | Spreads to |
|-----------|-------|------------|
| `Task` | `defaultOpen` (boolean, default: true) | Collapsible |
| `TaskTrigger` | `title` (string, required) | CollapsibleTrigger |
| `TaskContent` | — | CollapsibleContent |
| `TaskItem` | — | div |
| `TaskItemFile` | — | div |

**Zod schemas:**

```typescript
taskItemSchema = z.object({
  type: z.enum(["text", "file"]),
  text: z.string(),
  file: z.object({
    name: z.string(),
    icon: z.string(),
    color: z.string().optional(),
  }).optional(),
})

taskSchema = z.object({
  title: z.string(),
  items: z.array(taskItemSchema),
  status: z.enum(["pending", "in_progress", "completed"]),
})

tasksSchema = z.object({
  tasks: z.array(taskSchema),
})
```

**Status indicators:** pending, in_progress, completed (+ error state in UI).
Supports file type icons: react, typescript, javascript, css, html, json, markdown.

**Our usage:** Inspires the sub-task items within TaskProgress (status enum, completion indicators).

---

### 8.3 Queue — https://elements.ai-sdk.dev/components/queue

Flexible list system for displaying messages, todos, attachments, and collapsible sections.

**Components:**

| Component | Props | Spreads to |
|-----------|-------|------------|
| `Queue` | — | div |
| `QueueSection` | `defaultOpen` (boolean, default: true) | Collapsible |
| `QueueSectionTrigger` | — | button |
| `QueueSectionLabel` | `label` (string), `count` (number), `icon` (ReactNode) | span |
| `QueueSectionContent` | — | CollapsibleContent |
| `QueueList` | — | ScrollArea |
| `QueueItem` | — | li |
| `QueueItemIndicator` | `completed` (boolean, default: false) | span |
| `QueueItemContent` | `completed` (boolean, default: false) — strikethrough + opacity | span |
| `QueueItemDescription` | `completed` (boolean, default: false) | div |
| `QueueItemActions` | — | div |
| `QueueItemAction` | — (excludes variant/size from spread) | Button |
| `QueueItemAttachment` | — | div |
| `QueueItemImage` | — | img |
| `QueueItemFile` | — | span |

**TypeScript interfaces:**

```typescript
interface QueueMessagePart {
  type: string
  text?: string
  url?: string
  filename?: string
  mediaType?: string
}

interface QueueMessage {
  id: string
  parts: QueueMessagePart[]
}

interface QueueTodo {
  id: string
  title: string
  description?: string
  status?: "pending" | "completed"
}
```

**Built on:** Radix Collapsible + ScrollArea.

**Our usage:** Primary inspiration for sidebar Queue upgrade — `QueueSection` per phase,
`QueueItem` per stage, `QueueItemIndicator` for completion state, nested sub-tasks
for active stage.

---

### 8.4 Chain of Thought — https://elements.ai-sdk.dev/components/chain-of-thought

Visualizes AI reasoning through collapsible steps with search results, images, and
progress indicators.

**Components:**

| Component | Props | Spreads to |
|-----------|-------|------------|
| `ChainOfThought` | `open` (boolean), `defaultOpen` (boolean, default: false), `onOpenChange` (callback) | div |
| `ChainOfThoughtHeader` | `children` (ReactNode, default: "Chain of Thought") | CollapsibleTrigger |
| `ChainOfThoughtStep` | `icon` (LucideIcon, default: DotIcon), `label` (string), `description` (string?), `status` ("complete" \| "active" \| "pending", default: "complete") | div |
| `ChainOfThoughtSearchResults` | — | div |
| `ChainOfThoughtSearchResult` | — | Badge |
| `ChainOfThoughtContent` | — | CollapsibleContent |
| `ChainOfThoughtImage` | `caption` (string?) | div |

**Status enum:** `"complete"` | `"active"` | `"pending"`

**Built on:** Radix Collapsible + Badge. Uses Context API for internal communication.

**Our usage:** Direct inspiration for the ChainOfThought component — step status mapping
from existing `data-search` parts and `data-internal-thought` parts. Search result
badges from web search source domains.

---

## 9. Implementation Phases

### Phase 1: Task Derivation Logic
- **Risk:** Zero — pure functions, no UI, no existing code changes
- **Output:** `src/lib/paper/task-derivation.ts`
- **Depends on:** Nothing
- **Tests:** Unit tests for all 14 stage mappings

### Phase 2: TaskProgress Component
- **Risk:** Zero — new file, no integration yet
- **Output:** `src/components/chat/TaskProgress.tsx`
- **Depends on:** Phase 1

### Phase 3: ChainOfThought Component
- **Risk:** Zero — new file, no integration yet
- **Output:** `src/components/chat/ChainOfThought.tsx`
- **Depends on:** Nothing (uses message parts directly)

### Phase 4: Chat Integration (MessageBubble)
- **Risk:** Low — additive render block in one file
- **Output:** Modified `MessageBubble.tsx`
- **Depends on:** Phase 2 + Phase 3
- **Guard:** `isPaperMode && isAssistant`

### Phase 5: ChainOfThought Replaces Existing Indicators
- **Risk:** Medium — replaces `SearchStatusIndicator` and `ReasoningTracePanel` in paper mode
- **Output:** Modified `MessageBubble.tsx` render pipeline
- **Depends on:** Phase 4 stable
- **Safety net:** Non-paper-mode retains existing indicators

### Phase 6: Sidebar Queue Upgrade
- **Risk:** Medium — replaces `SidebarProgress` with `SidebarQueueProgress`
- **Output:** `src/components/chat/sidebar/SidebarQueueProgress.tsx`, modified `ChatSidebar.tsx`
- **Depends on:** Phase 1
- **Safety net:** Keep old `SidebarProgress.tsx` as fallback

### Phase 7: System Prompt + Stage Skill Updates
- **Risk:** Low but impactful — model behavior change
- **Output:** Modified `paper-mode-prompt.ts`, stage skill instruction updates
- **Depends on:** All previous phases (UI must be ready before model references it)

### Dependency Graph

```
Phase 1: Task Derivation Logic
    │
    ├──→ Phase 2: TaskProgress Component ──┐
    │                                       ├──→ Phase 4: Chat Integration
    ├──→ Phase 3: ChainOfThought Component ┘         │
    │                                                 ▼
    │                                        Phase 5: CoT Replaces Indicators
    │
    ├──→ Phase 6: Sidebar Queue Upgrade
    │
    └──→ Phase 7: System Prompt + Skills (LAST — depends on all)
```

Phases 2, 3, 6 can run in parallel (independent components).
Phase 4 requires 2 + 3. Phase 5 requires 4. Phase 7 requires all.
