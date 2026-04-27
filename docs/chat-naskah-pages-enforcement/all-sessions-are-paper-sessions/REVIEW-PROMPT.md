# Codex Review + Audit Prompt

## Your Role

You are reviewing a design document and implementation plan for a significant architectural change in Makalah AI before it gets executed. Your job is to find flaws, missing edge cases, incorrect assumptions, and risks — not to rubber-stamp.

## Context

**Makalah AI** is a paper-writing assistant with a 14-stage workflow (gagasan → topik → outline → abstrak → pendahuluan → tinjauan_literatur → metodologi → hasil → diskusi → kesimpulan → pembaruan_abstrak → daftar_pustaka → lampiran → judul → completed). The app uses Convex (backend), Next.js App Router (frontend), and the Vercel AI SDK for LLM orchestration.

**Branch:** `chat-naskah-pages-enforcement`

## The Problem Being Solved

The app currently maintains **two conversation modes** — free chat and paper session. This dual-mode architecture was found to be the root cause of multiple bugs during end-to-end testing (2026-04-14, all 14 stages):

1. **Session state dead-end after `completed`**: When all 14 stages are approved, `completed-prestream` short-circuits all responses. `updateStageData` crashes with `Unknown stage: completed`. User is locked out with no way to revise.

2. **Model escapes paper context**: After stage failures (e.g. lampiran emitChoiceCard failure), model carries context pollution into the next stage — created wrong artifact in judul stage, enforcer auto-submitted, session completed prematurely with wrong content.

3. **Dual-mode complexity**: Every guard, enforcer, and prompt builder handles both paper and chat paths. This creates edge cases at mode boundaries (entering/exiting paper mode, completed state, conversation-level vs session-level lifecycle). ~250 lines of branching logic in route.ts alone.

4. **User expectation mismatch**: Paper session gets stuck or completes prematurely → user expects to continue working but system locks them out. No graceful degradation.

## The Proposed Solution

**Every conversation is a paper session. There is no "chat biasa" mode.**

- Paper session auto-created when conversation is created (no intent detection)
- `completed` becomes a navigable state (model fully active, rewind available, no short-circuit)
- Rewind unlocked to all stages via UI timeline (no limit), model suggests but doesn't trigger rewind
- Five files deleted: paper-intent-detector, paper-workflow-reminder, completed-session classifier (+ test), completed-session handler
- ~250 lines of dual-mode routing removed from route.ts
- Lazy migration for existing conversations without paper sessions

## Documents to Review

All documents are in this directory:

1. **`2026-04-14-brainstorm-handoff.md`** — The original handoff document from E2E testing. Contains observed problems, evidence, and initial design questions. This is the "why" behind the change.

2. **`design.md`** — The validated design document. Contains all architectural decisions, section-by-section design, and rationale. This was brainstormed interactively with the user and approved section by section.

3. **`implementation-plan.md`** — The 9-task implementation plan with exact file paths, code snippets, test patterns, and dependency graph. This is what will be executed.

## What to Audit

### A. Design Soundness

- Does the "all sessions = paper sessions" decision actually solve the stated problems?
- Are there user scenarios where this creates NEW problems? (e.g., user opens app just to ask a quick question, user wants to discuss without writing a paper)
- Is the design decision at `design.md > Design Decisions` table internally consistent? Does any decision contradict another?
- Is "lazy migration" the right strategy? What happens to conversations that are mid-paper-session (e.g., at stage 7) — do they break?

### B. Implementation Completeness

- Does the implementation plan cover ALL code paths that reference the deleted files/concepts? Search the codebase for:
  - `hasPaperWritingIntent` / `detectPaperIntent`
  - `PAPER_WORKFLOW_REMINDER` / `paperWorkflowReminder`
  - `resolveCompletedSessionHandling` / `getCompletedSessionClosingMessage`
  - `startPaperSession`
  - `forcePaperToolsMode`
  - `first_message_chat_mode`
  - `completed-prestream`
  - `MAX_REWIND_STAGES`
- Are there other files (beyond route.ts) that import from the deleted modules?
- Does the orchestrator (`src/lib/ai/orchestrator/` or similar) reference `paperWorkflowReminder`? The plan mentions line 3037 but doesn't trace where that parameter is consumed.

### C. Backend Correctness

- **`isValidRewindTarget` fix**: Does treating `completed` as index `STAGE_ORDER.length` (14) work correctly when `STAGE_ORDER` has indices 0-13? Verify no off-by-one.
- **`getStagesToInvalidate` fix**: When rewinding from `completed` to `gagasan` (index 0), does the loop `for (i = 0; i < 14)` correctly return all 14 stages? Is this the intended behavior — invalidating ALL stages?
- **`updateStageData` guard**: The plan returns `{ success: false, reason: ... }` but the current function throws errors for invalid states. Is returning a success:false object compatible with all callers? Or will callers expect a throw?
- **`completedAt` clearing**: Is `completedAt: undefined` valid in Convex? Or does it need to be `completedAt: null` or omitted differently?
- **Convex schema**: Does `stageData: {}` pass Convex validation for the paperSessions table? Check the schema definition — is stageData typed as `v.any()` or does it have a specific structure?

### D. Frontend Correctness

- **PaperStageProgress**: After removing `MAX_REWIND_STAGES`, are there any other guards or conditions in the component that implicitly depend on it?
- **RewindConfirmationDialog**: Does `getStageLabel("completed")` throw or return undefined? The guard handles this, but verify the fallback is correct.
- **usePaperSession hook**: The plan doesn't mention changes to `usePaperSession.ts`. Does `isPaperMode = !!session` still make sense when session always exists? Is there UI that conditionally renders based on `isPaperMode`?

### E. Prompt Engineering

- **Completed state prompt** (Task 7): The instruction says "tell user to click stage in timeline." But what if the user is on mobile and the timeline is less accessible? Is there a mobile UX concern?
- **Existing completed overrides** (lines 929-944 in paper-mode-prompt.ts): The plan says "review and potentially simplify." What specifically should happen to these? Are they redundant with the new prompt or do they serve a different purpose?
- **Choice card exception**: The plan preserves the existing exception (no choice card in completed state). But with no short-circuit, the model might try to output a choice card anyway. Is the instruction strong enough?

### F. Risk Assessment

- **Data loss risk**: Rewind from completed to gagasan invalidates all 14 stages and all artifacts. Is there a "point of no return" warning strong enough in the dialog?
- **Race condition**: Lazy migration does `create` then `re-fetch`. What if two concurrent requests hit the same conversation? The plan says `create` is idempotent, but verify this is true for the direct `db.insert` path in `createConversation` (Task 1) — NOT the `paperSessions.create` mutation.
- **Rollback plan**: If this change breaks production, what's the rollback? Can we revert the commits cleanly, or does the auto-creation of paper sessions for new conversations create state that's hard to undo?

### G. Missing Items

- **Test coverage**: Task 1 test is noted as "may need adjustment." Is the test actually testing anything useful? The mock structure seems uncertain.
- **E2E test plan** (Task 9): Manual checklist only. Should there be automated tests for the critical paths (rewind from completed, lazy migration)?
- **Monitoring/observability**: After removing ~250 lines of branching logic, are the remaining console.log/console.info statements still meaningful? Are there new log points needed?
- **Stage skills for completed**: The completed state has no stage skill in the `stageSkills` table. Is this handled gracefully by `resolveStageInstructions`?

## Output Format

Structure your review as:

```
## Critical Issues (must fix before execution)
[Issues that would cause bugs, data loss, or broken functionality]

## Design Concerns (should discuss before execution)
[Architectural questions or trade-offs that need explicit decision]

## Implementation Gaps (fix during execution)
[Missing steps, unchecked references, or incomplete code]

## Suggestions (nice to have)
[Improvements that aren't blockers]

## Verdict
[APPROVE / APPROVE WITH CONDITIONS / REJECT]
[One paragraph summary]
```

Be specific. Reference exact file paths and line numbers. Don't be polite — be thorough.
