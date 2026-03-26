# Handoff: Json Renderer V2 Implementation

## What To Build

An interactive choice card that serves as the model's **visual language** — its way of saying "I need you to choose" instead of writing option lists in prose. The model calls a tool (`emitChoiceCard`), backend compiles it into a UI card, user clicks instead of typing.

## Key Paradigm

This is NOT a "recommendation system." It is a **general-purpose visual output channel** for any structured decision: recommendations (with preference), neutral options (no preference), confirmations (yes/no), and future interaction types. The naming reflects this — everything uses "choice," not "recommendation."

## Current State

- Branch: `pr/chat-page-ux-status-sync-20260316`
- Worktree: `.worktrees/chat-page-ux-design-enforcement`
- Rollback tag: `safe-rollback-pre-jsonrenderer-v2` (commit `be20116c`)
- V1 was implemented and rolled back due to workflow interference (extra LLM call, skip logic, duplicate content). V2 uses tool-based emission — zero extra LLM calls, zero skip logic.
- 14-stage paper workflow is verified healthy at current HEAD.
- Backup of v1 code: branch `backup/json-renderer-v1-before-rollback` (reusable components)

## Documents To Read

Execute these in order. All verified and audited.

### 1. Context Doc (paradigm + constraints)
```
docs/chat-page-ux-design-enforcement/stage-recommendation-ui/json-renderer-ui/2026-03-18-json-renderer-as-model-visual-language.md
```

### 2. Design Doc (architecture + all 6 components)
```
docs/chat-page-ux-design-enforcement/stage-recommendation-ui/json-renderer-ui/2026-03-18-json-renderer-v2-design.md
```

### 3. Implementation Plan (4 layers, 12 tasks, verification)
```
docs/chat-page-ux-design-enforcement/stage-recommendation-ui/json-renderer-ui/2026-03-18-json-renderer-v2-impl-plan.md
```

## Architecture In One Diagram

```
Model streams text → calls emitChoiceCard tool → tool compiles spec (deterministic)
→ stream loop intercepts tool output → emits data-json-renderer-choice part
→ frontend renders card → user clicks → interactionEvent sent back → model continues
```

## Implementation Layers

| Layer | What | Gate |
|-------|------|------|
| 1. Foundation | Schema + payload + catalog + submit contracts | typecheck + convex + unit tests |
| 2. Tool | `emitChoiceCard` tool + `compileChoiceSpec` | typecheck + unit tests |
| 3. Stream | Route.ts interception + persist + system prompt + event handling | typecheck + eslint + dev server |
| 4. Frontend | Components + MessageBubble + ChatWindow rehydration + submit | typecheck + browser tests |

## Critical Rules

1. **Zero workflow interference** — tool only registered during phase-one drafting stages. Model can't call what doesn't exist.
2. **Zero extra LLM calls** — spec compiled deterministically in tool execute.
3. **Zero skip logic** — no `[JSONR-DIAG]` system. Model decides when to use the tool.
4. **`recommendedId` is optional** — supports neutral options where all choices are equal.
5. **Anti-duplication** — system prompt explicitly forbids listing options in prose when card is emitted.
6. **User always has text fallback** — if card doesn't appear, user types manually.

## V1 Reference (backup branch)

Reusable components in `backup/json-renderer-v1-before-rollback`:
- `RecommendationCardShell.tsx` → rename to `ChoiceCardShell`
- `RecommendationOptionButton.tsx` → rename to `ChoiceOptionButton`
- `RecommendationTextarea.tsx` → rename to `ChoiceTextarea`
- `RecommendationSubmitButton.tsx` → rename to `ChoiceSubmitButton`
- `recommendation-payload.ts` → extract spec validator into `choice-payload.ts`
- `catalog.ts` → extract prop schemas, rewrite with new names
