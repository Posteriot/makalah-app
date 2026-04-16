# Session 3 Handoff — Agent Harness V1 Execution (Phases 6-8)

## Worktree

`/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness`

Branch: `agent-harness`

## Status: Phases 1-5 COMPLETE, Phases 6-8 REMAINING

| Phase | What | route.ts Lines | Status |
|-------|------|---------------|--------|
| Original | Pre-extraction baseline | 4889 | — |
| Phase 1 | Entry boundary + RunLane | 4611 | ✅ |
| Phase 2 | Executor (tool registry, onFinish, stream pipeline) | 2309 | ✅ |
| Phase 3 | Context assembler | 731 | ✅ |
| Phase 4 | Runtime policy layer | 610 | ✅ |
| Phase 5 | Verification layer | 610 | ✅ |
| **Phase 6** | **Persistence (NEW Convex tables)** | **TBD** | **NEXT** |
| Phase 7 | Thin route.ts to ~50 lines | ~50 | Pending |
| Phase 8 | Pause/resume semantics | ~50 | Pending |

**Cumulative reduction:** 4889 → 610 lines (**−87.5%**) across 5 phases.

---

## CRITICAL: General Rule for Each Phase Going Forward

**Apply this pattern to Phases 6, 7, 8 — no exceptions:**

> Sebelum eksekusi phase berikutnya, dispatch agent reviewer untuk melakukan verifikasi task terkait di dokumen tasks.md vs actual code target. Lakukan patch/es jika kau menemukan gap/s. Minta validasi saya sebelum kamu eksekusi. Eksekusi nanti harus dilakukan dengan subagent driven, dengan multiagents supaya efisien, melalui dispatch agents relevan. Jadikan ini pola untuk phase-phase berikutnya, sebelum memulai eksekusi. Dan di selama eksekusi serta akhir review pasca implementasi, pastikan kau memberikan log observability terminal nextjs, convex, maupun browser console, tergantung mana yang relevan, untuk memudahkan saat pengujian via UI nanti. Jadikan ini semua pola berulang di seluruh phases ke depan.

### Concrete Per-Phase Workflow

```
1. PRE-VERIFY
   - Dispatch agent reviewer
   - Compare tasks.md (target phase) vs actual code state
   - Identify line number drift, file relocations, behavioral gaps
   - Output: gaps list

2. PATCH
   - Update tasks.md with corrected line refs / file locations
   - Document any phase deviations explicitly
   - Commit: docs(harness): patch Phase N references

3. VALIDATE
   - Show user the patches
   - WAIT for user approval before any extraction work

4. EXECUTE (subagent-driven, multi-agent parallel)
   - Batch 1: Types only (do it yourself, fast)
   - Batch 2: Independent extractions (parallel agents, each creates separate file)
   - Batch 3: Wiring task (single agent, modifies route.ts/executor)
   - Batch 4: Review + observability log

5. OBSERVABILITY
   - At end of phase, document log patterns for UI testing
   - Cover: Next.js terminal, Convex logs (if applicable), browser console
   - Show what each scenario should produce

6. REPORT
   - Show user: what changed, what was reviewed, what passed
   - WAIT for user approval before next phase
```

---

## File Structure (Current State)

```
src/lib/chat-harness/
  types/                          # Phase 1 — Runtime types
    index.ts
    runtime.ts                    # AcceptedChatRequest, RunLane, ConvexFetch*
  
  entry/                          # Phase 1 — HTTP entry boundary
    index.ts
    accept-chat-request.ts        # Auth, parsing, billing pre-flight
    resolve-conversation.ts       # Create/title generation + closure
    resolve-attachments.ts        # File IDs, context mutations, awareness
    persist-user-message.ts       # User message save with empty-guard
    validate-choice-interaction.ts # Stale-state 409, workflow resolution
    resolve-run-lane.ts           # Provisional run identity for Phase 6
  
  executor/                       # Phase 2 — Step execution
    index.ts
    types.ts                      # StepExecutionConfig, OnFinishConfig, etc.
    save-assistant-message.ts     # Message persistence (uses shared/reasoning-sanitization)
    build-tool-registry.ts        # All artifact tools + paper tools (uses shared/auto-rescue-policy)
    build-on-finish-handler.ts    # Unified onFinish (5 feature flags) — uses verifyStepOutcome
    build-step-stream.ts          # Unified stream pipeline — uses verifyStepOutcome
  
  context/                        # Phase 3 — Context assembly
    index.ts
    types.ts                      # ResolvedStepContext, BudgetStatus, SearchDecision, etc.
    assemble-step-context.ts      # ORCHESTRATOR (calls all 9 sub-modules)
    convert-messages.ts           # UIMessage → ModelMessage + sanitization
    assemble-file-context.ts      # File fetch + truncation + telemetry
    fetch-and-assemble-sources.ts # Recent sources + exact sources DB fetch
    resolve-exact-source-followup.ts # Exact source classifier
    resolve-search-decision.ts    # LLM router + guardrails (LARGE: 30K)
    build-exact-source-routing.ts # Deterministic prepareStep
    resolve-instruction-stack.ts  # 13+ system notes with source labels
    apply-context-budget.ts       # Estimation + compaction + brute prune
    execute-web-search-path.ts    # Full web search execution
    search-evidence-helpers.ts    # 4 stage-aware helpers
    response-factories.ts         # Search-unavailable + reference-inventory
  
  policy/                         # Phase 4 — Runtime policy
    index.ts
    types.ts                      # RuntimePolicyDecision, EnforcerContext
    enforcers.ts                  # 3 enforcer creators + computeEnforcerDerivedValues
    compose-prepare-step.ts       # Unified composition (priority chain)
    build-tool-boundary-policy.ts # Execution boundary classifier
    evaluate-runtime-policy.ts    # ORCHESTRATOR (called by route.ts)
  
  verification/                   # Phase 5 — Verification
    index.ts
    types.ts                      # StepVerificationResult, RunReadinessResult
    verify-step-outcome.ts        # Artifact chain + outcome guard + leakage summary
    verify-run-readiness.ts       # Aggregates step → ready/blockers
  
  shared/                         # Cross-namespace utilities
    reasoning-sanitization.ts     # Used by executor (Phase 3 extraction from save-assistant-message)
    auto-rescue-policy.ts         # Used by build-tool-registry (Phase 4 extraction)
```

**Convention:** `types/` is the global runtime types (RunLane, AcceptedChatRequest). Each domain (`entry/`, `executor/`, `context/`, `policy/`, `verification/`) has its own `types.ts` co-located. `shared/` is for cross-domain utilities to avoid circular imports.

---

## Key Decisions Made (Phases 1-5)

### Architecture
1. **Runtime namespace:** `src/lib/chat-harness/*` (NOT `agent-harness`)
2. **paperSessions remains workflow truth** — never repurposed as generic run store
3. **shared/ folder** holds code used by multiple namespaces to avoid circular imports
4. **Mutable refs (`{ current: T }`)** for shared closure scope (streamContentOverride, capturedSpec, capturedPlanSpec, stepTimingRef)

### Type Design
1. **`ParsedChoiceInteractionEvent`** (Zod-inferred) used everywhere — NOT `ChoiceInteractionEvent` (manual interface from choice-submit.ts)
2. **`RunLane`** is plain serializable data — no closures, no functions
3. **`ConvexFetchQuery/Mutation`** typed as `(ref: any, args: any) => Promise<any>` matching existing eslint-disable pattern
4. **Narrow per-domain types** for paperSession (e.g., `PaperSessionForExecutor`, `PaperSessionForPolicy`, `PaperSessionForVerification`) — avoids full schema coupling

### Behavior Preservation
1. **Primary + fallback unified** into single `buildStepStream` and single `buildOnFinishHandler`. 5 primary-only behaviors gated by config flags (`enableGroundingExtraction`, `enableSourceTitleEnrichment`, `enableRevisionClassifier`, `enablePlanSpecFallbackExtraction`, `isCompileThenFinalize`)
2. **`fallbackStreamContentOverride`** is a separate variable from primary — but unified function creates its own ref internally
3. **billingContext.operationType** mutation MUST happen AFTER paperSession fetch (Phase 1 wiring critical detail)
4. **Exact source routing guard** restored in Phase 3 fix: `mode === "force-inspect" || (stageStatus !== "pending_validation" && stageStatus !== "revision")` — without this, clarify mode interferes with revision chain enforcer
5. **stepTimingRef** mutable pattern: enforcer writes `ctx.stepTimingRef.current = Date.now()`, onFinish reads it
6. **Incremental leakage detection** stays in build-step-stream.ts (per text-delta) — verification reads SUMMARY from `paperTurnObservability`, doesn't re-scan
7. **`checkSourceBodyParity`** stays in build-tool-registry.ts as tool-call-time gate — NOT moved to verification (it's pre-execution, not post-step)

### Wiring Patterns
1. **route.ts uses aliases** from extracted modules (e.g., `const messages = accepted.messages`) to avoid touching downstream code in single phase
2. **Each extraction phase preserved aliases**, removed in next phase as downstream code gets extracted
3. **Dynamic imports** moved INSIDE assemble-step-context.ts (Phase 3) — not in route.ts anymore
4. **Source-grepping tests** updated when patterns moved (e.g., `recovery-leakage-guard.test.ts`, `chat-websearch-observability-guards.test.ts`)

---

## Baseline Test Suite (must stay green)

```bash
npx vitest run \
  convex/paperSessions.test.ts \
  src/lib/ai/paper-tools.compileDaftarPustaka.test.ts \
  src/lib/ai/paper-tools.inspect-source.test.ts \
  src/lib/ai/chat-exact-source-guardrails.test.ts \
  src/lib/ai/artifact-sources-policy.test.ts \
  __tests__/context-budget.test.ts \
  __tests__/context-compaction.test.ts \
  src/lib/ai/recovery-leakage-guard.test.ts \
  src/lib/ai/chat-websearch-observability-guards.test.ts \
  __tests__/chat/attachment-baseline-formats-smoke.test.ts \
  __tests__/chat/conversation-attachment-baseline-smoke.test.ts
```

**Expected:** 11 files, 99 tests, all pass.

Always run `npx tsc --noEmit` before committing.

---

## Observability Patterns (Phase 1-5 — for context)

### Phase 1 (Entry)
- `[USER-INPUT] type=prompt text="..."` — every chat
- `[CHOICE-CARD][event-received] type=paper.choice.submit stage=...` — choice clicks
- `[stale-choice-rejected] stage=... → 409 Response` — stale choice
- `[Billing] Quota check failed:` — quota exceeded

### Phase 2 (Executor)
- `[TOOL-CHAIN-ORDER] expected=[...] actual=[...]`
- `[AI-TELEMETRY] { model, tokens, duration }`
- `[PAPER][outcome-gated]<logTag> emitted data-cited-text override`
- `[FALLBACK] Attempting fallback with OpenRouter`
- `[Billing] Usage recorded:`

### Phase 3 (Context)
- `[FILE-CONTEXT] Waiting for extraction... (attempt N/16)`
- `[SOURCES] recentCount=N exactSourceCount=N hasRecentInDb=true`
- `[EXACT-SOURCE-RESOLUTION] mode=force-inspect|clarify|none`
- `[SEARCH-DECISION] intent=... confidence=0.9`
- `[SEARCH-UNAVAILABLE] reasonCode=search_required_but_unavailable`
- `[CONTEXT-BUDGET] totalChars=N shouldCompact=true|false`
- `[CONTEXT-COMPACTION] priority=...`

### Phase 4 (Policy)
- `[REVISION][chain-enforcer] step=N status=revision → required`
- `[CHOICE][artifact-enforcer] step=N stage=... → updateStageData`
- `[REACTIVE-ENFORCER] step=N stage=... → createArtifact`
- `[STEP-TIMING] step=N stage=... tools=[...] elapsed=Nms`
- `[PLAN-GATE] enforcer downgraded: plan has incomplete tasks`
- `[AUTO-RESCUE] source=createArtifact status=pending_validation → rescued`

### Phase 5 (Verification)
- `[VERIFICATION] artifactChain=complete leakage=false planComplete=true blockers=[]`
- `[VERIFICATION][PAUSE] reason="..."` (if must-pause)

---

## Phase 6 Preview (READ tasks.md FIRST, but here's the gist)

**Goal:** Add Convex tables and persistence adapters. **First phase that adds new data models** — qualitatively different from Phase 1-5 refactors.

**New Convex tables:**
- `harnessRuns` — conversationId, paperSessionId?, status, activeLaneKey, workflowStage, workflowStatus, pendingDecision, policyState, startedAt, updatedAt, completedAt?
- `harnessRunSteps` — runId, stepIndex, status, executorResultSummary, verificationSummary, toolCalls, startedAt, completedAt?
- `harnessEvents` — runId, stepIndex?, eventType, payload, timestamp

**Reference:** `.references/agent-harness/research/2026-04-15-makalahapp-harness-v1-event-model-and-data-contracts.md`

**Critical constraints:**
- `paperSessions` stays authoritative for domain truth
- `artifacts` untouched
- Persistence adapters are THIN (no business logic)
- Event envelope matches research doc spec

**Tasks (5 total):**
- 6.1: Define Convex schema (modify `convex/schema.ts`)
- 6.2: Create harness mutations (`convex/harnessRuns.ts`, `harnessRunSteps.ts`, `harnessEvents.ts`)
- 6.3: Create persistence adapters (`src/lib/chat-harness/persistence/run-store.ts`, `event-store.ts`)
- 6.4: Wire persistence into harness modules (touches Phases 1, 2, 4, 5)
- 6.5: Post-phase review

---

## Where to Start (Session 3)

### Step 1: Read this handoff (you are here)

### Step 2: Read the project guidance
```
/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/CLAUDE.md
```

Critical rules from CLAUDE.md:
- All AI model instructions in English
- User communication in Jakarta-style Indonesian (gue–lo)
- Never claim success without evidence
- Don't act without validation
- Codex (OpenAI) handles audit/review — Claude Code is implementer

### Step 3: Apply the per-phase pattern (verbatim from above)

**Don't skip pre-verification.** Phases 1-5 patches found significant gaps in EVERY phase:
- Phase 2: 30+ line refs shifted by uniform −278
- Phase 3: 30+ refs with non-uniform shift (−291 and −1075), reasoning sanitization already extracted
- Phase 4: Auto-rescue already in build-tool-registry, deterministic routing already in context
- Phase 5: `checkSourceBodyParity` was wrong category (HIGH severity), incremental leakage placement (MEDIUM)

Phase 6 is the FIRST phase that adds new data models. Pre-verification will check:
- Do the planned table fields make sense given Phase 1-5 outputs?
- Does the event envelope match what verification + policy modules produce?
- Are there schema gotchas in convex/schema.ts that affect this?

### Step 4: Execute Phase 6 with subagent-driven multi-agent pattern

Suggested batches:
- Batch 1: 6.1 (schema modification — careful, small change)
- Batch 2: 6.2 (3 parallel agents — one per Convex file)
- Batch 3: 6.3 (2 parallel agents — run-store + event-store)
- Batch 4: 6.4 (single agent — wires into existing modules)
- Batch 5: 6.5 (review + observability)

### Step 5: Observability for Phase 6

Phase 6 is the FIRST phase where Convex logs become relevant. Document:
- Next.js terminal: persistence adapter logs
- Convex logs: mutation invocations on harnessRuns/Steps/Events
- Browser console: typically not affected (server-side persistence)

---

## Gotchas / Lessons from Sessions 1-2

### From Session 1 (Phase 1)
1. **Pre-existing test failure** in `convex/paperSessions.test.ts:77` — added required `stageData` fields. This was a baseline issue, not caused by extraction.

### From Session 2 (Phases 1-5)
1. **Don't trust subagent reports verbatim.** Phase 1 batch had 2 files with WRONG relative paths (`../../../../../convex/` instead of `../../../../convex/`). Always run `tsc --noEmit` after batch.
2. **Closure captures may exceed task spec.** Tool registry agent (Task 2.5) discovered 6 ADDITIONAL closure captures beyond the spec — these became required params.
3. **Source-grepping tests break on extraction.** Always check tests that read route.ts via `fs.readFileSync` after each phase. They need updated paths.
4. **Phase 2 unified primary+fallback** — not the "two separate files" the original plan suggested. Single function with config flags is more maintainable.
5. **Aliases in route.ts** are necessary scaffolding. Don't try to remove them all in one phase — let downstream phases reduce them naturally.
6. **Phase 3 had behavioral deviation** in `buildExactSourceRouting` — agent dropped the `stageStatus !== "pending_validation"` guard. Code review caught it. Fix: pass `stageStatus` and restore guard.
7. **Phase 4 was the smallest** — only ~150 lines extracted. Smaller phases need less batching.
8. **Phase 5 was a refactoring within executor**, not extraction from route.ts. Important to recognize phase intent shift.

---

## Active Memory References

User memory index: `/Users/eriksupit/.claude/projects/-Users-eriksupit-Desktop-makalahapp/memory/MEMORY.md`

Key entries:
- `project_harness_v1_execution.md` — overall execution state
- `feedback_codex_workflow.md` — two-agent pattern with Codex
- `feedback_dont_run_ahead.md` — deliver exactly what's asked, STOP
- `feedback_branch_scope.md` — never self-restrict scope based on branch name

Update memory after Phase 6:
- Mark progress in `project_harness_v1_execution.md`
- Add any new patterns/lessons to feedback memories

---

## Recent Commits (rollback points)

```
4e9b23ad feat(harness): wire verification into executor modules (Task 5.4)
b4be420f feat(harness): extract verification modules (Tasks 5.2, 5.3)
739cc7eb feat(harness): define Phase 5 verification types (Task 5.1)
95d005dc docs(harness): patch Phase 5 task descriptions for post-Phase-2 reality
034b7f6e feat(harness): wire policy layer into route.ts (Task 4.5)
fb0b62e8 feat(harness): extract policy modules (Tasks 4.2-4.4b)
d05bcaec feat(harness): define Phase 4 policy types (Task 4.1)
e83c1d28 docs(harness): patch Phase 4 line references post-Phase 1+2+3
310bef12 fix(harness): Phase 3 review fixes — routing guard, broken tests
473d8933 feat(harness): wire context assembler into route.ts (Task 3.10)
```

Full history: `git log --oneline | head -30`

---

## Final Notes

- **route.ts is currently 610 lines** — already very thin compared to original 4889
- **41 harness files** organized in 7 namespaces
- **Phase 6+ adds ~10-15 more files** (Convex mutations + persistence adapters)
- **Phase 7 should bring route.ts to ~50 lines** — final assembly
- **Phase 8 adds pause/resume** — unlocks durable execution

The harness pattern is already proven through Phases 1-5. Phases 6-8 complete the transition from "extraction refactor" to "real harness with persistence and durability."

**Don't skip the per-phase verification pattern.** It's caught real bugs in EVERY phase so far.
