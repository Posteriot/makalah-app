# Session 2 Handoff — Agent Harness V1 Execution

## Worktree

`/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness`

Branch: `agent-harness`

## What was done (Session 1)

1. **Fixed pre-existing test failure** in `convex/paperSessions.test.ts:77` — added required `stageData` fields (`ideKasar`, `analisis`, `angle`) to `submitForValidation` fixture. Root cause: `STAGE_REQUIRED_FIELDS` gate added after test was written.

2. **Verified implementation plan** (`docs/agent-harness/new/2026-04-16-agent-harness-v1-repo-implementation-plan.md`) against actual codebase. All file references, line counts, and architectural claims confirmed accurate. Found 6 undocumented route.ts responsibilities — patched into plan with explicit phase assignments.

3. **Created complete task breakdown** (`docs/agent-harness/new/tasks.md`) for all 8 phases:
   - Phase 1: Entry + Run Ownership (9 tasks)
   - Phase 2: One-Step Executor (7 tasks)
   - Phase 3: Context Assembler (12 tasks)
   - Phase 4: Runtime Policy (7 tasks)
   - Phase 5: Verification (5 tasks)
   - Phase 6: Persistence (5 tasks)
   - Phase 7: Thin route.ts (3 tasks)
   - Phase 8: Durable Continuation (3 tasks)

4. **Each phase was agent-reviewed** and patched. Total gaps found and fixed: 28 across all phases.

5. **Established clean baseline**: All 7 test files (85 tests) pass.

## What to do (Session 2)

Execute `tasks.md` phase by phase. The execution protocol is defined at the bottom of `tasks.md`:

1. **Execute** — write/modify code per task
2. **Test** — `npx tsc --noEmit` + relevant test files
3. **Commit** — scoped commit per task
4. **Review** — dispatch agent reviewer after final task of each phase
5. **Fix** — patch any gaps found by reviewer
6. **Report** — show user what changed, what was reviewed, what passed
7. **Validate** — wait for user approval before next phase

### Start here

1. Read `docs/agent-harness/new/tasks.md` — Phase 1 section
2. Execute Task 1.1: Define harness runtime types
3. Continue sequentially through Task 1.9

### Baseline test command

```bash
npx vitest run convex/paperSessions.test.ts src/lib/ai/paper-tools.compileDaftarPustaka.test.ts src/lib/ai/paper-tools.inspect-source.test.ts src/lib/ai/chat-exact-source-guardrails.test.ts src/lib/ai/artifact-sources-policy.test.ts __tests__/context-budget.test.ts __tests__/context-compaction.test.ts
```

Expected: 7 files, 85 tests, all pass.

## Key decisions already made

- **Runtime namespace:** `src/lib/chat-harness/*` (not `agent-harness`)
- **`paperSessions` remains workflow truth** — never repurposed as generic run store
- **Durable persistence (Phase 6) only after executor/policy/verification contracts are stable**
- **Primary + fallback stream pipelines unified** into single `buildStepStream` (plan deviation from separate files, documented in tasks.md Phase 2 header)
- **Shared module:** `src/lib/chat-harness/shared/` holds code used by both `executor/` and `policy/` (reasoning-sanitization.ts, auto-rescue-policy.ts) to avoid circular imports
- **`onFinish` built INSIDE `buildStepStream`** (not passed in) — because `streamContentOverride` needs shared closure scope between onFinish and stream writer
- **`verifyStepOutcome` called from inside `buildStepStream`** stream writer's finish handler (not from onFinish) — same shared-closure reason

## File structure after all phases

```
src/lib/chat-harness/
  types/
    runtime.ts          (Phase 1)
    index.ts
  entry/
    accept-chat-request.ts
    resolve-conversation.ts
    resolve-attachments.ts
    persist-user-message.ts
    validate-choice-interaction.ts
    resolve-run-lane.ts
    index.ts
  executor/
    types.ts            (Phase 2)
    save-assistant-message.ts
    build-on-finish-handler.ts
    build-step-stream.ts
    build-tool-registry.ts
    index.ts
  context/
    types.ts            (Phase 3)
    assemble-file-context.ts
    resolve-instruction-stack.ts
    apply-context-budget.ts
    resolve-exact-source-followup.ts
    resolve-search-decision.ts
    build-exact-source-routing.ts
    fetch-and-assemble-sources.ts
    convert-messages.ts
    search-evidence-helpers.ts
    response-factories.ts
    execute-web-search-path.ts
    assemble-step-context.ts
    index.ts
  policy/
    types.ts            (Phase 4)
    enforcers.ts
    compose-prepare-step.ts
    build-tool-boundary-policy.ts
    evaluate-runtime-policy.ts
    index.ts
  verification/
    types.ts            (Phase 5)
    verify-step-outcome.ts
    verify-run-readiness.ts
    index.ts
  persistence/
    run-store.ts        (Phase 6)
    event-store.ts
  shared/
    reasoning-sanitization.ts  (Phase 3)
    auto-rescue-policy.ts      (Phase 4)
  runtime/
    run-chat-harness.ts        (Phase 7)
    orchestrate-sync-run.ts    (Phase 7-8)
```

## Commits (rollback points)

- `cbe4a8e3` — All 8 phases task breakdown complete (current HEAD)
- `d6a164eb` — Phase 1-3 + test fix checkpoint
- `fd870eeb` — Pre-session baseline

## Gotchas from reviews

1. **`billingContext.operationType` mutation** — must happen AFTER `paperSession` fetch, not before. See Task 1.8 step 6.
2. **Primary onFinish has 5 behaviors absent from fallback** — Google grounding, source enrichment, revision classifier, isCompileThenFinalize log, unfenced plan-spec. All gated by config flags in `OnFinishConfig`. See Task 2.3.
3. **`enforcerStepStartTime`** is mutable shared state between universal reactive enforcer and onFinish — modeled as `stepTimingRef: { current: number }` in `EnforcerContext`. See Task 4.1.
4. **Task 3.5 and 3.6 execution order** — exact source resolution MUST run before search decision (not after). See Tasks 3.5 → 3.6 → 3.6b dependency chain.
5. **Task 3.7 is a fetcher** — it fetches from DB and returns `availableExactSources`, `recentSourcesList`, `hasRecentSourcesInDb`. Not a builder that receives those as inputs.
