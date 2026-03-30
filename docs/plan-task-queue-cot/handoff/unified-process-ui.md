# Context: Unified Process UI — Merge Plan, Chain of Thought, and Indicators into One Card

> Handoff document for a separate branch. Factual conditions and observed problems only.
> No solutions proposed.

---

## Problem

The current UI has **three separate visual blocks** for process visibility, stacked
vertically and each taking their own space:

1. **Loader** (●●●) — three-dot skeleton indicator
2. **Plan card** (TaskProgress) — collapsible card with stage name, description, task list
3. **Chain of Thought** — collapsible wrapper around ToolStateIndicator + SearchStatusIndicator

Additionally, tool call indicators inside Chain of Thought render as **individual
stacked items** without grouping — each tool call is a separate line with its own
spinner, consuming vertical space:

```
⟳ Menyimpan progres tahapan
⚠ Galat pada membuat artifak
⟳ Membuat artifak
⟳ Mengirim validasi tahapan
```

These elements work independently, are visually disconnected, and take up
excessive vertical space above the message content.

---

## Current State (after `feature/plan-task-queue-components`)

```
┌── Loader (●●●) ──────────────────────────────┐  ← separate element
└───────────────────────────────────────────────┘

┌── Plan Card ──────────────────────────────────┐  ← separate collapsible
│ 📋 Gagasan Paper  0/4                      ▾  │
│ Eksplorasi ide awal, analisis kelayakan...    │
└───────────────────────────────────────────────┘

┌── Chain of Thought ───────────────────────────┐  ← separate collapsible
│ ⓘ Chain of Thought                         ▴  │
│ ⟳ Memulai sesi paper                         │
└───────────────────────────────────────────────┘

[Message text starts here]
```

Three blocks, three borders, three expand/collapse controls. During active tool
calling (screenshot evidence), Chain of Thought can show 4+ lines of individual
tool indicators stacking vertically.

---

## Desired State

One unified card that contains everything — plan overview, active process
indicators (search + tool calls), and task progress — in a single compact,
collapsible container:

```
┌─────────────────────────────────────────────────┐
│ 📋 Gagasan Paper  0/4                        ▾  │
│ Eksplorasi ide awal, analisis kelayakan...      │
│                                                  │
│ ⟳ Memulai sesi paper                            │
│ ✅ Pencarian selesai (20 sumber)                 │
│ ⟳ Menyimpan progres tahapan                     │
│ ⚠ Galat pada membuat artifak                    │
│ ⟳ Membuat artifak (retry)                       │
│ ⟳ Mengirim validasi tahapan                     │
└─────────────────────────────────────────────────┘

[Message text starts here]
```

One card. One border. One collapse control. Plan + search + tool calls + errors
all inside. Active indicators appear and disappear as processes run. Task
checklist (Langkah) available on expand.

---

## Components Involved

| Current component | File | What it shows |
|-------------------|------|---------------|
| Three-dot loader | Built into MessageBubble streaming state | Skeleton while waiting |
| TaskProgress (Plan card) | `src/components/chat/TaskProgress.tsx` | Stage name, description, task checklist |
| ChainOfThought | `src/components/chat/ChainOfThought.tsx` | Collapsible wrapper around indicators |
| ToolStateIndicator | `src/components/chat/ToolStateIndicator.tsx` | Individual tool call status (spinner + label) |
| SearchStatusIndicator | `src/components/chat/SearchStatusIndicator.tsx` | Search progress (globe + label) |

### How they're rendered in MessageBubble.tsx

```
1. TaskProgress — guarded by isPaperMode && isAssistant && taskSummary
2. ChainOfThought — guarded by shouldShowProcessIndicators
   └── children: ToolStateIndicator(s) + SearchStatusIndicator + fallback
3. Message Content
4. Follow-up Blocks (artifacts, sources, choice card)
```

TaskProgress and ChainOfThought are **siblings** in the render tree — no parent
container groups them.

---

## Screenshots (evidence)

| Screenshot | Shows |
|------------|-------|
| `Screen Shot 2026-03-30 at 14.35.17.png` | Three separate blocks: loader + Plan card + Chain of Thought |
| `Screen Shot 2026-03-30 at 15.30.54.png` | Tool calls stacking vertically as individual items (4 lines) |

---

## Relationship to Model Compliance Problem

This UI problem is **independent from** the model compliance problem (documented in
`model-compliance-save-after-search.md`). Even if model compliance is fixed (model
saves incrementally), the three-block layout remains visually fragmented.

However, if both problems are solved together:
- Unified card shows plan + process in one place
- Model saves incrementally → task checklist updates in real-time inside the same card
- Search + tool calls visible as sequential steps in one timeline

The two problems are complementary — solving both produces the best result.
