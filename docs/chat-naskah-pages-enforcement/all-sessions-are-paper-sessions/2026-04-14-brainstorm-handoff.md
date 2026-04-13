# Brainstorm Handoff: All Sessions Are Paper Sessions

## Directive

In the next session, brainstorm and design the following architecture change:

**Every conversation in Makalah AI is a paper session. There is no "chat biasa" mode.**

All discussion — academic dialog, brainstorming, concept questions, draft review — happens WITHIN the 14-stage paper workflow. The product is exclusively for writing papers.

## Why This Change

### Problems observed during E2E testing (2026-04-14, stages 1-14)

1. **Session state confusion after `completed`**: When stage 14 (judul) was approved with wrong content (artifact titled "Lampiran" created in judul stage due to model confusion), session became `completed`. User could not rewind or fix. `completed-prestream` short-circuited all responses. `updateStageData` crashed with `Unknown stage: completed`.

2. **Model escapes paper session context**: After lampiran stage failed multiple times (emitChoiceCard pseudo-tool failure), model carried context pollution into judul stage — created wrong artifact, enforcer auto-submitted, session completed prematurely.

3. **Dual-mode complexity**: The codebase maintains two paths — paper mode and free chat. This creates edge cases at boundaries (entering/exiting paper mode, `completed` state, conversation-level vs session-level lifecycle). Every guard, enforcer, and validator needs to handle both paths.

4. **User expectation mismatch**: When a paper session gets stuck or completed prematurely, user expects to continue working but the system locks them out. There is no graceful degradation from paper mode to chat mode.

### Why "all sessions = paper sessions" solves this

- **No mode switching**: Eliminates the paper/chat boundary entirely
- **Stage is always known**: Every conversation has a `currentStage` — simplifies all routing, prompt building, tool gating
- **`completed` becomes navigable**: After all 14 stages, user can still rewind to any stage, revise, or continue discussing within stage context
- **Discussion lives in stages**: Academic dialog happens in gagasan (stage 1) — the brainstorming hub. Concept questions during methodology go in methodology stage. No need for a separate "chat" path.

## Design Questions to Brainstorm

### 1. What happens on first message?

Current: User starts free chat, then says "buatkan paper" → `startPaperSession` creates session.

Proposed options:
- **A**: Every new conversation auto-creates paper session with stage = `gagasan`. First message is treated as initial idea.
- **B**: First message triggers `startPaperSession` automatically (like current, but mandatory instead of optional).
- **C**: Conversation starts in a "pre-gagasan" state where user can describe what they want, then auto-transitions to gagasan.

### 2. What about conversations that are NOT about writing a paper?

User asks "apa itu metodologi kualitatif?" without intent to write a paper.

Options:
- **A**: Still a paper session. Gagasan stage handles general academic discussion. If user never moves past gagasan, that's fine — gagasan is the discussion hub.
- **B**: Detect non-paper intent and handle within gagasan stage as "exploratory discussion" without progressing to topik.
- **C**: Not supported in this product version. Makalah AI v1 is exclusively for paper writing. General academic Q&A is out of scope — communicate this clearly in onboarding/UI.

### 3. What happens after `completed`?

Current: `completed-prestream` short-circuits. User stuck.

Proposed:
- After all 14 stages approved, session stays active but in `completed` state
- User can rewind to ANY stage via UI or chat ("revisi bagian pendahuluan")
- User can export (Word/PDF)
- User can start discussing improvements — routed to the relevant stage
- No short-circuit — model responds normally but with awareness that session is complete

### 4. How does `rewindToStage` work from `completed`?

Current: `rewindToStage` exists but is not exposed in UI after completion.

Proposed:
- PaperValidationPanel or a dedicated "Stage Navigator" UI allows rewind from any state including `completed`
- When rewinding, downstream stages are marked `invalidated` (existing behavior)
- Model re-enters the rewound stage with full context of what was previously approved

### 5. How does this affect the enforcer and tool chain?

Current enforcer assumes: choice card → tool chain → submit → approve → next stage.

With all-paper-sessions:
- Enforcer logic stays the same per stage
- `completed` state needs to allow re-entry via rewind
- `updateStageData` must handle `completed` stage gracefully (currently crashes)

### 6. What about file uploads and general questions mid-stage?

User uploads a PDF during metodologi stage and asks "apa pendapat kamu tentang paper ini?"

This is already handled — attachment awareness works across all stages. The question would be answered within the context of the current stage.

### 7. UI implications

- Remove or hide "free chat" entry point (if any separate from paper workflow)
- Conversation list always shows paper session progress
- Stage timeline/progress is always visible
- Onboarding makes it clear: "Makalah AI is a paper writing assistant. Start by describing your research idea."

## Evidence Files

Terminal logs, screenshots, and convex logs from E2E testing:
- Stage 8 (hasil): tool call text leak, model confusion
- Stage 13 (lampiran): emitChoiceCard failure, choice card not rendering, infinite createArtifact loop
- Stage 14 (judul): wrong artifact created, premature completion, user stuck in completed state

Located in:
```
screenshots/test-stages/stage-8/
screenshots/test-stages/stage-13/
screenshots/test-stages/stage-14/
```

## Bugs to Fix Regardless of This Design Decision

These are pre-requisites or must-fix items from E2E testing:

1. **`updateStageData` crashes on `completed` stage** — `convex/paperSessions.ts:658` throws `Unknown stage: completed`. Must handle gracefully.

2. **`emitChoiceCard` pseudo-tool removed** — already fixed in commit `b1917560`. Needs re-test on stages 13-14 to verify YAML choice cards render correctly now.

3. **Enforcer infinite loop** — fixed in commit `4d17d05f` (use `steps` array instead of `paperToolTracker`). Needs re-test.

4. **Artifact relevance validation** — no guard prevents model from creating artifact with wrong stage content. Enforcer auto-submits regardless. Consider: should `submitStageForValidation` validate artifact title/type against current stage?

5. **`completed-prestream` short-circuit too aggressive** — blocks all interaction after completion. Should allow rewind, revision requests, and general discussion.

## Priority

High — this is an architectural simplification that eliminates an entire class of bugs (mode boundary issues) and improves user experience (no dead-end states).

## Session Context

- Branch: `chat-naskah-pages-enforcement`
- E2E testing: 2026-04-14, stages 1-14
- Key commits this session: `cbc5da07` (artifact reveal timing), `11244d2c` (multi-step persistence), `84afc00d` (schema softening), `4d17d05f` (enforcer steps fix), `b1917560` (emitChoiceCard removal)
