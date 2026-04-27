│ (harness-scoped)          │           │                  │            │
  └───────────────────────────┴───────────┴──────────────────┴────────────┘

  ---
  Per-Phase Summary

  Phase: 1
  Goal: Extract entry boundary
  Output: entry/ namespace (7 files): accept, resolveConversation,
    resolveAttachments, persistUserMessage, validateChoiceInteraction,
    resolveRunLane
  route.ts After: 4611
  ────────────────────────────────────────
  Phase: 2
  Goal: Extract executor
  Output: executor/ (5 files): tool registry, onFinish handler, step stream
    builder, save assistant message
  route.ts After: 2309
  ────────────────────────────────────────
  Phase: 3
  Goal: Extract context assembler
  Output: context/ (12 files): step context orchestrator, file context,
    instruction stack, budget compaction, search decision, exact-source routing,

    etc.
  route.ts After: 731
  ────────────────────────────────────────
  Phase: 4
  Goal: Extract runtime policy
  Output: policy/ (6 files): enforcers, composition, boundary classifier,
  runtime
    policy evaluator
  route.ts After: 610
  ────────────────────────────────────────
  Phase: 5
  Goal: Extract verification
  Output: verification/ (3 files): step outcome verification, run readiness
  route.ts After: 610
  ────────────────────────────────────────
  Phase: 6
  Goal: Add persistence layer
  Output: persistence/ (5 files) + 3 Convex tables + 12 event types: runStore,
    eventStore, harnessRuns, harnessRunSteps, harnessEvents
  route.ts After: 610→645 (+wiring)
  ────────────────────────────────────────
  Phase: 7
  Goal: Thin route.ts
  Output: runtime/ (4 files): HTTP adapter + 13-step orchestrator + fallback
  route.ts After: 28
  ────────────────────────────────────────
  Phase: 8
  Goal: Pause/resume infrastructure
  Output: harnessDecisions Convex table + pauseRun/resumeRun mutations +
    orchestrator resume path + UI wiring
  route.ts After: 28

  ---
  route.ts Journey

  Pre-refactor:         4889 lines  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  After Phase 1:        4611 lines  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  After Phase 2:        2309 lines  ▓▓▓▓▓▓▓▓▓▓▓▓
  After Phase 3:         731 lines  ▓▓▓▓
  After Phase 4:         610 lines  ▓▓▓
  After Phase 5:         610 lines  ▓▓▓  (refactor within executor)
  After Phase 6:         645 lines  ▓▓▓  (+35 for persistence wiring)
  After Phase 7:          28 lines  ▏    (thin HTTP adapter)
  After Phase 8:          28 lines  ▏    (Phase 8 adds behind adapter)

  Final route.ts (28 lines):
  import * as Sentry from "@sentry/nextjs"
  import { runChatHarness } from "@/lib/chat-harness/runtime"

  export async function POST(req: Request): Promise<Response> {
      try {
          return await runChatHarness(req)
      } catch (error) {
          Sentry.captureException(error, { tags: { "api.route": "chat" } })
          console.error("Chat API Error:", error)
          return new Response("Internal Server Error", { status: 500 })
      }
  }

  ---
  Final Architecture

  src/lib/chat-harness/
  ├── types/runtime.ts              — AcceptedChatRequest, RunLane, ConvexFetch*
  │
  ├── entry/                        [Phase 1] — 7 files
  │   ├── accept-chat-request.ts    — auth, parsing, billing pre-flight
  │   ├── resolve-conversation.ts   — create/title generation
  │   ├── resolve-attachments.ts    — file context mutations
  │   ├── persist-user-message.ts   — message save + event emit
  │   ├── validate-choice-interaction.ts  — 409 + workflow resolution
  │   ├── resolve-run-lane.ts       — RunLane construction + run_started emit
  │   └── index.ts (barrel)
  │
  ├── executor/                     [Phase 2+4+5+6] — 5 files
  │   ├── build-step-stream.ts      — unified primary+fallback stream pipeline
  │   ├── build-on-finish-handler.ts — onFinish + step completion + verification
  │   ├── build-tool-registry.ts    — artifact+paper tools
  │   ├── save-assistant-message.ts — message persistence
  │   └── types.ts                  — StepExecutionConfig, OnFinishConfig
  │
  ├── context/                      [Phase 3] — 12 files
  │   ├── assemble-step-context.ts  — 9-submodule orchestrator
  │   ├── convert-messages.ts
  │   ├── assemble-file-context.ts
  │   ├── fetch-and-assemble-sources.ts
  │   ├── resolve-exact-source-followup.ts
  │   ├── resolve-search-decision.ts
  │   ├── build-exact-source-routing.ts
  │   ├── resolve-instruction-stack.ts
  │   ├── apply-context-budget.ts
  │   ├── execute-web-search-path.ts
  │   ├── search-evidence-helpers.ts
  │   └── response-factories.ts
  │
  ├── policy/                       [Phase 4+6] — 6 files
  │   ├── evaluate-runtime-policy.ts — async async orchestrator (Phase 6)
  │   ├── enforcers.ts              — revision-chain, choice-artifact, reactive
  │   ├── compose-prepare-step.ts   — priority chain
  │   ├── build-tool-boundary-policy.ts
  │   ├── map-policy-boundary.ts    — executionBoundary → PolicyBoundary mapping
  │   └── types.ts                  — RuntimePolicyDecision
  │
  ├── verification/                 [Phase 5+6] — 3 files
  │   ├── verify-step-outcome.ts    — async with emitEvents gate (Phase 6 audit
  fix)
  │   ├── verify-run-readiness.ts   — dormant (no callers yet)
  │   └── types.ts
  │
  ├── persistence/                  [Phase 6+8] — 6 files
  │   ├── run-store.ts              — RunStore adapter (incl. startStep atomic,
  pauseRun, resumeRun)
  │   ├── event-store.ts            — EventStore with eventType validation
  │   ├── event-types.ts            — 29 canonical event names constant
  │   ├── types.ts                  — full type contracts
  │   └── index.ts (barrel)
  │
  ├── runtime/                      [Phase 7+8] — 4 files
  │   ├── run-chat-harness.ts       — HTTP adapter (49 lines)
  │   ├── orchestrate-sync-run.ts   — 13-step engine + resume + fallback (~900
  lines)
  │   ├── types.ts                  — SyncRunResult, SyncRunContext,
  PaperContextResolution
  │   └── index.ts (barrel)
  │
  └── shared/                       — Cross-namespace utilities (reasoning
  sanitization, auto-rescue)

  convex/
  ├── harnessRuns.ts                — 11 mutations/queries (incl.
  startStepAtomic, pauseRun, resumeRun, getRunById)
  ├── harnessRunSteps.ts            — 4 operations
  ├── harnessEvents.ts              — 4 operations (12-field envelope)
  ├── harnessDecisions.ts           — 6 operations (Phase 8)
  └── schema.ts                     — 4 new tables (harnessRuns,
  harnessRunSteps, harnessEvents, harnessDecisions)

  src/app/api/chat/route.ts         — 28 lines (HTTP boundary only)

  ---
  Design Wins (Across All Phases)

  1. Strict Separation of Domain vs Runtime

  Domain authoritative: paperSessions, artifacts, conversations, messages
  Runtime facts: harnessRuns, harnessRunSteps, harnessEvents, harnessDecisions

  Zero schema changes to domain tables across all 8 phases. Runtime facts mirror
   execution state as reconstructible event stream.

  2. Canonical Event Taxonomy

  29 event types from research doc (lines 73-121) defined in
  persistence/event-types.ts. Adapter-layer validation via isHarnessEventType()
  prevents typos. 12 currently emitted across phases, 17 reserved for future
  expansion without schema changes.

  3. Type-Safe Contracts Throughout

  - SyncRunResult discriminated union — exhaustiveness assertion at compile time
  - PolicyBoundary 3-value vs ExecutionBoundary 5-value — separate contracts,
  mapper helper
  - RunStore + EventStore interfaces — adapter layer is interchangeable
  - RuntimePolicyDecision.requiresApproval: boolean — latent trigger, fully
  wired

  4. Observability by Design

  30+ log patterns fire at predictable points:
  - [HARNESS][persistence] * — 9 patterns (runStore operations)
  - [HARNESS][event] * — emitted per canonical event
  - [PAPER][*], [FREE-TEXT-CONTEXT], [STEP-TIMING], [CHOICE-CARD][*],
  [AI-TELEMETRY] — preserved from pre-refactor

  5. Phase 8 Pause/Resume Ready for Durability

  - Pause: runs create harnessDecisions row + flip harnessRuns.status="paused"
  atomically (within Convex per-table transactions)
  - Resume: client POSTs with x-harness-resume header; orchestrator skips step 2
   only
  - No background worker needed — state lives in Convex, client drives
  resumption

  6. Zero Behavior Change Through Refactor

  Baseline 99 tests (pre-refactor) all pass through every phase. 120 new tests
  added for extracted modules. Production build clean at every phase close.

  ---
  Test Coverage Growth

  Phase 1-5 close: 99 baseline tests (pre-Session 3)
  Phase 6 close:  189 tests (+90)
  Phase 7 close:  189 tests (+0 — Phase 7 is pure refactor, existing tests
  cover)
  Phase 8 close:  219 tests (+30)

  17 test files across:
  - Domain: convex/paperSessions.test.ts, paper-tools.*.test.ts,
  chat-exact-source-guardrails.test.ts, etc.
  - Context: context-budget.test.ts, context-compaction.test.ts
  - Harness persistence: convex/harnessRuns.test.ts, harnessRunSteps.test.ts,
  harnessEvents.test.ts, harnessDecisions.test.ts
  - Adapters: persistence/run-store.test.ts, event-store.test.ts
  - Smoke: __tests__/chat/attachment-baseline-formats-smoke.test.ts,
  conversation-attachment-baseline-smoke.test.ts

  ---
  Major Commit Milestones

  722faed9 feat(harness): wire approval UI to resumeRun path (Task 8.4) ← HEAD
  ed74b4f6 feat(harness): orchestrator pause/resume wiring (Task 8.3)
  d78036fb feat(harness): add RunStore pause/resume adapter methods (Task 8.2)
  1d22c89c feat(harness): add pause/resume schema + Convex mutations (Task 8.1)
  688f6b8a docs(harness): patch Phase 8 design decisions (pre-verify)
  ── Phase 8 boundary ──
  07eacc96 chore(harness): clarify saveAssistantMessageLocal reference (Phase 7
  audit cleanup)
  3a95decd feat(harness): thin route.ts to HTTP adapter (Task 7.2)
  66f17ce4 feat(harness): create runtime orchestrator modules (Task 7.1)
  80deb3f5 feat(harness): define Phase 7 runtime types (Task 7.1 prep)
  be493c67 docs(harness): patch Phase 7 design decisions (pre-verify)
  ── Phase 7 boundary ──
  60633f37 chore(harness): finalize Phase 6 audit cleanup (LOW 2 + MEDIUM doc)
  d3180ddb test(harness): add harnessRunSteps mutation tests (audit fix LOW 1)
  c03afe88 feat(harness): collapse RunStore.startStep to single atomic call
  6c4e8658 feat(harness): add startStepAtomic mutation (audit fix HIGH 1)
  de83dbe8 fix(harness): skip step_completed emit when completeStep fails (audit
   fix HIGH 2)
  9efaac96 fix(harness): gate verification events to onFinish call site (audit
  fix HIGH 3)
  ── Phase 6 audit remediation + history rewrite ──
  912db2cf test(harness): add Phase 6 persistence tests (Task 6.4 followup)
  1a60cf8a feat(harness): wire verification events (Task 6.4d)
  98a05887 feat(harness): wire policy PolicyState snapshot + boundary event
  (Task 6.4c)
  41e67118 feat(harness): wire executor step lifecycle + tool events (Task 6.4b)
  0d5c9ef1 feat(harness): wire entry persistence + choice events (Tasks 6.4a,
  6.4e)
  76fcfc8a feat(harness): add persistence barrel export (Task 6.3 finalize)
  ... (Phase 6 tasks 6.1-6.3)
  5919fbf6 feat(harness): define Phase 6 Convex schema (Task 6.1)
  947acabc docs(harness): patch Phase 6 expanded scope
  ── Phase 6 boundary (start of Session 3) ──
  4e9b23ad feat(harness): wire verification into executor modules (Task 5.4)
  ... (Phases 1-5 pre-Session 3)

  ---
  Lessons Learned (Top 10)

  1. Pre-verify is mandatory. Every phase plan had gaps after earlier phases
  executed. Pre-verify caught 5 BLOCKERS in Phase 8 alone. Patch tasks.md before
   execute.
  2. Parallel agents collide when files touch. Phase 6 taught us git stash
  during parallel work produces mislabeled commits. Phase 7+8 switched to
  single-agent or sequential — clean result.
  3. Commit message = contract. Mislabeled commit a10df0c6 in Phase 6 needed
  history rewrite. Title must match content. Worth the cost.
  4. Design decisions FIRST, execution SECOND. Always present user Q1-Q6 style
  decisions with my recommendation + rationale. User approval upfront prevents
  mid-execution ambiguity.
  5. Types before implementation. Phase 7 success — I wrote types.ts first,
  agents worked against stable contract. Phase 8 same pattern. No signature
  mismatch.
  6. Mechanical tasks for self, novel logic for agents. CRUD mutation pattern
  replication = me. Orchestrator resume detection = agent with judgment. Phase 8
   followed this strictly.
  7. Reviewer catches agent overreach. Phase 6 reviewer found 3 HIGH issues
  agents missed. Phase 7 reviewer caught as any undercount. Always audit.
  8. Convex per-document atomicity is powerful. startStepAtomic collapse (Phase
  6 audit fix HIGH 1) showed how one mutation handler can do multiple writes
  atomically. Pause/resume different tables needed explicit ordering — but
  composed adapter was OK.
  9. User-approved deviations are allowed. When agents deviate (e.g., Phase 8
  agent chose 403 over 404), as long as rationale defensible + documented, it's
  often an improvement.
  10. Research doc contracts pay off. Research doc from session 1 defined 29
  events, DecisionState, RunState, etc. Following those contracts gave us clean
  schemas 8 phases later. Invest in upfront design.

  ---
  What This Unlocks

  Immediate (available now):

  - Clean HTTP adapter (route.ts) — no more 5000-line orchestration in route
  file
  - Durable run history — every request produces traceable harnessRuns +
  harnessRunSteps + harnessEvents
  - Event-replay possible — harness events are reconstructible
  - Type-safe policy + verification layers

  Short-term (Phase 9+ candidate):

  - Real pause triggers (destructive tool approvals, custom stage gates)
  - Decision panel UI (beyond existing validation panel)
  - verifyRunReadiness caller (currently dormant)
  - Policy enforcer expansions (new requiresApproval conditions)

  Long-term:

  - Durable workflow engine (when worker farm becomes viable)
  - Multi-step runs with true resumability
  - Event-driven UI updates (subscribe to harnessEvents stream)

  ---
  Outstanding Items

  Manual UI Smoke (BELUM — butuh lo)

  End-to-end verification Phase 6+7+8 integration:
  1. Chat request biasa → stream output identik dengan pre-refactor
  2. Paper flow: paper.start → choice → next-stage produces artifacts + workflow
   transitions + harnessEvents
  3. Fallback path trigger (force primary failure) → run_failed event fires
  4. Phase 8: temporarily enable requiresApproval=true in an enforcer → test 202
   response + UI pause + approve → revert trigger
  5. Validation panel behavior unchanged

  Merge Prep (BELUM — kalau lo siap)

  - PR body draft (describe 8-phase scope, 99.4% reduction, 219 tests)
  - Squash strategy — probably NOT squash (80 atomic commits tell the story)
  - Base branch verify up-to-date
  - Conflicts check vs main
