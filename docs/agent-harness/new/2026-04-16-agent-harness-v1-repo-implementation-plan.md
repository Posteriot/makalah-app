# Makalahapp Agent Harness V1 Repo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the current paper/chat runtime into an explicit v1 harness boundary without rewriting the existing workflow domain backbone.

**Architecture:** Keep `paperSessions`, `artifacts`, prompt assets, source guardrails, and stage logic as the domain source of truth. Extract the overloaded runtime logic out of `src/app/api/chat/route.ts` into a new `src/lib/chat-harness/*` boundary in phases, then add explicit run/step/event persistence only after the synchronous path is stable.

**Tech Stack:** Next.js App Router, TypeScript, Vercel AI SDK, Convex, Sentry, existing paper-mode prompt/tool/runtime helpers.

---

## Why This Plan Lives Here

This plan is stored in `docs/agent-harness/new/` because it is still a development handoff artifact for this harness workstream.

It should **not** be merged into `.references/agent-harness/research/*` because those files are now acting as audited architecture references. Mixing repo-execution sequencing into those research documents would blur:

- stable architecture decisions
- codebase verification
- migration order and change-set planning

Runtime code for the new harness should **not** be created under `docs/`.

Best recommendation:
- runtime/system code root: `src/lib/chat-harness/*`

Why this is best for this repo:
- it scopes the runtime to the actual chat entrypoint instead of sounding like a generic agent framework
- it creates a new explicit boundary instead of burying more orchestration into `src/lib/ai/*`
- it avoids pretending every harness concern is "just another AI helper"
- it lets existing `src/lib/ai/*` modules stay usable as wrapped dependencies during migration

Important naming note:
- the architecture term remains `harness` in the research documents
- the code namespace recommendation is `chat-harness` only to make the implementation scope explicit inside this repo

---

## Final V1 Architecture Synthesis

After cross-checking the audited research docs against the current worktree, the stable v1 shape is:

1. `Chat Entry and Run Ownership` must become explicit first. The current route still fuses HTTP entry, auth, conversation resolution, message acceptance, and execution start into one path.
2. `One-Step Agent Executor` is the right early extraction target because the current model execution path, step forcing, tool-choice forcing, and stream handling are embedded inside `route.ts`.
3. `Prompt and Context Assembler` already exists materially, but only as a distributed set of helpers plus route-level note injection. It should be consolidated, not redesigned.
4. `Approval and Execution Boundary Policy` is already real in the repo, but scattered across tool guards, prepareStep enforcers, stream guards, and exact-source routing. It needs a runtime law layer, not new product logic.
5. `Verification` is already embedded, not absent. The problem is that it is expressed as many local guards instead of a visible harness verification boundary.
6. `Durable orchestration` should not be the first heavy refactor. The repo does not yet have explicit harness persistence for run/step/event/policy decision, so a durable executor before extraction would create a large and risky blast radius.
7. `Subagents` remain out of scope for v1.

In short:
- keep domain workflow law where it already works
- extract harness runtime boundaries around it
- add durable persistence only after the synchronous adapter path is explicit

---

## Codebase Findings That Matter For Planning

### Strong domain anchors to preserve

- `convex/paperSessions.ts`
- `convex/paperSessions/constants.ts`
- `convex/paperSessions/types.ts`
- `convex/artifacts.ts`
- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/ai/stage-skill-resolver.ts`
- `src/lib/ai/paper-tools.ts`
- `src/lib/naskah/compiler.ts`
- `src/lib/json-render/*`
- `src/lib/ai/context-budget.ts`
- `src/lib/ai/context-compaction.ts`
- `src/lib/ai/exact-source-guardrails.ts`

### Verified overload points

- [`src/app/api/chat/route.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/src/app/api/chat/route.ts:1) is `4889` lines and currently contains:
  - request acceptance and auth
  - conversation/message persistence
  - prompt/context assembly
  - tool registry assembly
  - step forcing and chain enforcement
  - stream execution and stream transforms
  - verification-like guards
  - plan capture persistence
  - telemetry, billing, fallback orchestration
- The primary and fallback stream pipelines are largely duplicated in the same file.
- Artifact mutation tools are still defined inline in the route, while paper workflow tools live in [`src/lib/ai/paper-tools.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/src/lib/ai/paper-tools.ts:1).
- Prompt assembly is split between [`src/lib/ai/paper-mode-prompt.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/src/lib/ai/paper-mode-prompt.ts:1), route-level system notes, exact-source helpers, compaction, and search/router notes.

### Important repo-specific mismatches vs idealized harness shape

1. There is no explicit run entity yet.
   Current proxies are:
   - request-local `requestId`
   - persisted `messages`
   - `paperSessions.stageData._plan`
   - generic `aiTelemetry`

2. There is no canonical step/event envelope yet.
   What exists today is a mix of:
   - message persistence
   - plan snapshots
   - logs
   - telemetry records
   - Convex mutations

3. `artifact-sources-policy.ts` is deprecated.
   Current enforcement is distributed through runtime skill/guard usage instead of that file being the true policy center.

4. `paperSessions` already carries workflow domain truth, but it is not a harness runtime state store.
   It should stay the workflow source of truth, not be overloaded into a generic run ledger.

---

## Recommended Runtime Layout

Create a new runtime boundary under:

- `src/lib/chat-harness/`

Recommended substructure:

- `src/lib/chat-harness/entry/*`
- `src/lib/chat-harness/context/*`
- `src/lib/chat-harness/executor/*`
- `src/lib/chat-harness/policy/*`
- `src/lib/chat-harness/verification/*`
- `src/lib/chat-harness/persistence/*`
- `src/lib/chat-harness/types/*`

Best recommendation:
- keep existing domain/tool/prompt helpers where they are
- make `src/lib/chat-harness/*` the orchestration shell around them

Do **not** move everything at once into the new directory. First wrap and extract, then relocate only if the new boundary proves stable.

---

## Extract vs Wrap vs Add New

### Extract first

- request acceptance and run lane resolution from `route.ts`
- one-step model execution and stream wiring from `route.ts`
- prompt/context assembly decision logic from `route.ts`
- policy and prepareStep enforcement from `route.ts`
- completion and outcome verification from `route.ts`

### Wrap, do not redesign

- `convex/paperSessions.ts`
- `convex/artifacts.ts`
- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/ai/stage-skill-resolver.ts`
- `src/lib/ai/paper-tools.ts`
- `src/lib/ai/context-budget.ts`
- `src/lib/ai/context-compaction.ts`
- `src/lib/ai/exact-source-guardrails.ts`
- `src/lib/json-render/*`
- `src/lib/naskah/compiler.ts`
- `convex/messages.ts`
- `convex/conversations.ts`
- `convex/aiTelemetry.ts`

### Add new only when the seam is clear

- explicit harness runtime types
- run ownership contract
- run/step/event persistence
- policy-decision persistence shape
- verification result contract
- orchestrator adapter that is thin enough to become durable later

---

## Phase Order

This sequence is the best fit for the current repo.

It preserves working domain logic, reduces `route.ts` pressure early, and delays new durable storage until the boundary has been proven in the synchronous request path.

### Phase 1: Extract Chat Entry and Run Ownership Boundary

**Objective**
- Separate request acceptance from orchestration setup.

**Primary files**
- Modify: [`src/app/api/chat/route.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/src/app/api/chat/route.ts:1)
- Create: `src/lib/chat-harness/entry/accept-chat-request.ts`
- Create: `src/lib/chat-harness/entry/resolve-run-lane.ts`
- Create: `src/lib/chat-harness/types/runtime.ts`
- Possibly create: `src/lib/chat-harness/persistence/chat-entry-store.ts`

**What gets extracted**
- auth and token preparation handoff result
- request payload normalization
- conversation resolution / creation
- user message acceptance contract
- lane identity for the execution attempt
- choice interaction payload validation (`route.ts:460-522` — validate choice card interaction shape, detect stale state at entry level; workflow resolution of the validated choice moves to Phase 4)

**What stays wrapped**
- `convex/conversations.ts`
- `convex/messages.ts`
- existing BetterAuth and Convex token flow

**New contract to introduce**
- `AcceptedChatRequest`
- `RunLane`
- `RunStartMode` (`start` vs `resume_candidate`)

**Important implementation constraint**
- do not introduce durable run tables yet
- lane ownership can remain request-scoped in this phase, but the interface must be written as if it will later be backed by persisted run rows

**Dependency**
- none; this is the first refactor seam

**Verification checkpoint**
- no behavior change in message acceptance
- conversation creation still works
- `route.ts` loses entry/setup branches without changing tool behavior

### Phase 2: Extract One-Step Agent Executor Boundary

**Objective**
- Isolate one bounded execution step from route orchestration.

**Primary files**
- Modify: [`src/app/api/chat/route.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/src/app/api/chat/route.ts:2286)
- Create: `src/lib/chat-harness/executor/execute-one-step.ts`
- Create: `src/lib/chat-harness/executor/build-step-stream.ts`
- Create: `src/lib/chat-harness/executor/build-fallback-step-stream.ts`
- Create: `src/lib/chat-harness/executor/types.ts`

**What gets extracted**
- `streamText` invocation setup
- `prepareStep` composition handoff
- `stopWhen` / max step orchestration
- primary vs fallback execution entry
- reasoning trace curation (`route.ts:3741-3748`, `4627-4637` — curated reasoning trace controllers for transparent mode; these are stream-level concerns that belong with the executor, not verification)
- parseable result shape for:
  - assistant text
  - tool calls
  - finish reason
  - captured plan/spec payloads
  - parse-failure / malformed result classification

**What stays wrapped**
- AI SDK usage
- `pipePlanCapture`
- `pipeYamlRender`

**Why Phase 2 comes before context extraction**
- the current route has two large execution paths with near-duplicate streaming logic
- until execution itself becomes a callable unit, context assembly cannot be cleanly tested against a stable boundary

**Dependency**
- Phase 1 lane and accepted-request types

**Verification checkpoint**
- primary and fallback still produce the same UI stream parts
- no regression in choice-card capture or plan capture
- outcome guard behavior still matches current runtime

### Phase 3: Extract Prompt and Context Assembler Boundary

**Objective**
- Make instruction precedence and step context explicit and inspectable.

**Primary files**
- Modify: [`src/app/api/chat/route.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/src/app/api/chat/route.ts:1)
- Modify: [`src/lib/ai/paper-mode-prompt.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/src/lib/ai/paper-mode-prompt.ts:1)
- Create: `src/lib/chat-harness/context/assemble-step-context.ts`
- Create: `src/lib/chat-harness/context/resolve-instruction-stack.ts`
- Create: `src/lib/chat-harness/context/build-runtime-notes.ts`
- Create: `src/lib/chat-harness/context/types.ts`

**What gets extracted**
- system instruction stacking
- paper-mode prompt composition handoff
- exact-source/router note injection
- missing-artifact note injection
- stage/search policy note injection
- context budget and compaction invocation
- explicit `ResolvedInstructionStack`
- attachment and file context resolution (`route.ts:241-280`, `587-765` — attachment mode resolution, file context fetch, size limiting, truncation markers; these are input-context concerns that feed into the instruction stack)
- search skill resolution and mode detection (`route.ts:2730-2938` — unified search skill instantiation, exact-source routing mode selection; this decides which search capability is available for the step, which is a context/tool assembly decision)

**What stays wrapped**
- `getSystemPrompt`
- `getPaperModeSystemPrompt`
- `stage-skill-resolver`
- `context-budget`
- `context-compaction`
- `exact-source-guardrails`

**Important rule**
- do not rewrite prompt assets
- do not move stage skill logic
- centralize ownership of assembly, not the content sources themselves

**Dependency**
- Phase 2 executor input contract

**Verification checkpoint**
- rendered instruction stack is deterministic
- paper mode still resolves the same stage-specific prompt content
- compaction still triggers from the same threshold conditions

### Phase 4: Extract Runtime Policy Layer

**Objective**
- Turn scattered execution law into one runtime-visible policy layer.

**Primary files**
- Modify: [`src/app/api/chat/route.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/src/app/api/chat/route.ts:2371)
- Modify: [`src/lib/ai/paper-tools.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/src/lib/ai/paper-tools.ts:1)
- Create: `src/lib/chat-harness/policy/evaluate-runtime-policy.ts`
- Create: `src/lib/chat-harness/policy/build-prepare-step-policy.ts`
- Create: `src/lib/chat-harness/policy/build-tool-boundary-policy.ts`
- Create: `src/lib/chat-harness/policy/types.ts`

**What gets extracted**
- revision chain enforcer
- drafting artifact-chain enforcer
- universal reactive enforcer (`route.ts:2484-2523` — activates when model voluntarily calls `updateStageData` in drafting; closes the gap where `continue_discussion` + `updateStageData` left chain incomplete)
- deterministic sync / exact-source forced routing
- forced submit / forced tool choice resolution
- approval posture result
- execution-boundary classification for mutation-capable actions
- choice interaction workflow resolution (the semantic half of `route.ts:460-522` — resolving choice card action type into workflow intent and detecting stale workflow state; payload shape validation stays in Phase 1)
- paper session auto-rescue policy (`route.ts:1737-1759`, `1922-1945` — auto-transitions `stageStatus` when artifacts are created/updated in an unexpected state; this is a state-transition policy, not a verification gate)

**What stays wrapped**
- `createPaperTools`
- exact-source helpers
- existing artifact/source validation helpers
- existing workflow stage semantics from `paperSessions`

**Policy output that must become explicit**
- `requiresApproval`
- `pauseReason`
- `allowedToolNames`
- `forcedToolChoice`
- `executionBoundary`
- `policyDecisionSummary`

**Dependency**
- Phase 3 explicit instruction/context resolution

**Verification checkpoint**
- prepareStep outcomes match current behavior on:
  - revision path
  - drafting finalize path
  - exact-source follow-up path
  - sync path
- no policy branch remains owned directly by `route.ts`

### Phase 5: Extract Verification Layer

**Objective**
- Make "can continue / must pause / can complete" a visible harness boundary.

**Primary files**
- Modify: [`src/app/api/chat/route.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/src/app/api/chat/route.ts:3893)
- Create: `src/lib/chat-harness/verification/verify-step-outcome.ts`
- Create: `src/lib/chat-harness/verification/verify-run-readiness.ts`
- Create: `src/lib/chat-harness/verification/types.ts`

**What gets extracted**
- outcome guard evaluation
- artifact-chain completeness checks
- plan completion gate
- source/body parity gate result normalization
- completion-readiness decision
- stream guard and outcome gating (`route.ts:3943-3957`, `4770-4826` — full-stream content accumulation for outcome validation; detects leakage patterns and guards against false draft handoff; this is verification over streamed output, not a policy decision)

**What stays wrapped**
- `sanitizeChoiceOutcome`
- `checkSourceBodyParity`
- paper tool tracker signals
- `paperSessions` stage truth

**Why this phase precedes durable persistence**
- the repo already verifies many things, but with no canonical verification result shape
- run/step persistence added before verification extraction would store unstable semantics

**Dependency**
- Phase 4 policy outputs

**Verification checkpoint**
- completion can be explained from a structured verification result
- route no longer hardcodes completion and leakage guard logic inline

### Phase 6: Add Explicit Run, Step, Decision, Policy, and Event Persistence

**Objective**
- Persist harness runtime facts without corrupting the existing domain model.

**Primary files**
- Modify: [`convex/schema.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/convex/schema.ts:1)
- Create: `convex/harnessRuns.ts`
- Create: `convex/harnessRunSteps.ts`
- Create: `convex/harnessEvents.ts`
- Create: `src/lib/chat-harness/persistence/run-store.ts`
- Create: `src/lib/chat-harness/persistence/event-store.ts`

**Best recommendation for new persistence shape**
- `harnessRuns`
- `harnessRunSteps`
- `harnessEvents`

Why this is best:
- it keeps workflow domain state in `paperSessions`
- it avoids forcing `messages` or `aiTelemetry` to become the run ledger
- it lets decision/policy facts live in structured step/event payloads

**Recommended durable fields**

`harnessRuns`
- `conversationId`
- `paperSessionId?`
- `status`
- `activeLaneKey`
- `workflowStage`
- `workflowStatus`
- `pendingDecision`
- `policyState`
- `startedAt`
- `updatedAt`
- `completedAt?`

`harnessRunSteps`
- `runId`
- `stepIndex`
- `status`
- `executorResultSummary`
- `verificationSummary`
- `toolCalls`
- `startedAt`
- `completedAt?`

`harnessEvents`
- canonical event envelope matching the audited research doc

**What does not get added**
- no separate durable workflow table
- no replacement for `paperSessions`
- no subagent persistence

**Dependency**
- Phases 1 through 5, because the contracts must be stable first

**Verification checkpoint**
- one synchronous request can now be replayed from run + step + event records
- `paperSessions` and `artifacts` remain authoritative for domain truth

### Phase 7: Thin `route.ts` into a Chat Harness Adapter

**Objective**
- Make the route an entry adapter, not the orchestration engine.

**Primary files**
- Modify: [`src/app/api/chat/route.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/src/app/api/chat/route.ts:1)
- Create: `src/lib/chat-harness/runtime/run-chat-harness.ts`
- Create: `src/lib/chat-harness/runtime/orchestrate-sync-run.ts`

**Target route responsibility after this phase**
- auth/token acquisition
- request body load
- call harness adapter
- return stream response
- top-level fatal error handling

**What moves behind the adapter**
- lane resolution
- step execution
- context assembly
- runtime policy
- verification
- run/event persistence

**Dependency**
- all earlier phases

**Verification checkpoint**
- `route.ts` becomes structurally small enough to inspect
- runtime law is visible through harness modules rather than route-local branches

### Phase 8: Prepare Durable Continuation Path

**Objective**
- Create a safe bridge toward true durable orchestration without forcing it into the first migration wave.

**Primary files**
- Likely modify later:
  - `src/lib/chat-harness/runtime/orchestrate-sync-run.ts`
  - `convex/harnessRuns.ts`
  - internal scheduling or worker entrypoints if needed

**What this phase should do**
- add pause/resume semantics backed by persisted run status
- support approval/user-decision resume off persisted pending state
- prepare background-safe orchestration entry if the repo later needs it

**What this phase should not do yet**
- no v1 subagents
- no multi-lane durable worker farm
- no redesign of paper workflow semantics

**Dependency**
- Phases 1 through 7 complete and stable

---

## Safe Migration Rules

1. Keep `paperSessions` as workflow truth.
2. Keep `artifacts` as artifact truth.
3. Do not encode new workflow meaning into `messages`.
4. Do not add durable run tables before executor, policy, and verification contracts are extracted.
5. Prefer wrappers around current helpers before any relocation or cleanup.
6. Do not attempt background durability before the synchronous harness adapter works cleanly.

---

## Verification Strategy Per Phase

Use existing tests where they already cover domain behavior:

- [`convex/paperSessions.test.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/convex/paperSessions.test.ts:1)
- [`src/lib/ai/paper-tools.compileDaftarPustaka.test.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/src/lib/ai/paper-tools.compileDaftarPustaka.test.ts:1)
- [`src/lib/ai/paper-tools.inspect-source.test.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/src/lib/ai/paper-tools.inspect-source.test.ts:1)
- [`src/lib/ai/chat-exact-source-guardrails.test.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/src/lib/ai/chat-exact-source-guardrails.test.ts:1)
- [`src/lib/ai/artifact-sources-policy.test.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/src/lib/ai/artifact-sources-policy.test.ts:1)
- [`__tests__/context-budget.test.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/__tests__/context-budget.test.ts:1)
- [`__tests__/context-compaction.test.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/__tests__/context-compaction.test.ts:1)

Add new tests only where the new harness seam appears:

- entry acceptance and lane resolution tests
- one-step executor contract tests
- policy decision tests
- verification result tests
- Convex tests for `harnessRuns`, `harnessRunSteps`, and `harnessEvents`

Best recommendation:
- treat early phases as extraction-with-parity
- treat persistence phase as the first intentional data-model expansion

---

## Recommended First Execution Slice

The best first implementation slice is:

1. Phase 1
2. Phase 2
3. a narrow Phase 3 cut that only centralizes instruction-stack assembly

Why this is the best starting slice:
- it reduces `route.ts` pressure immediately
- it does not require schema migration yet
- it gives the repo a visible harness shell before durable persistence work begins

Do **not** start with Phase 6.

That would force persistence design before the executor and policy seams are stable, which is the fastest path to writing the wrong run/event schema.

---

## Completion Criteria For This Plan

This plan is ready for execution when the team agrees with these three repo-specific calls:

1. runtime code root is `src/lib/chat-harness/*`
2. `paperSessions` remains workflow truth and is not repurposed as a generic run store
3. durable run persistence is added only after extraction of executor, context, policy, and verification boundaries

If those three calls stand, the migration path is coherent and low-chaos.
