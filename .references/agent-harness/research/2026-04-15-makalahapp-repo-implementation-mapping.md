# Makalahapp Repo Implementation Mapping

## Purpose

This document maps the target v1 harness design onto the actual codebase in the active worktree:

`/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-naskah-pages-enforcement`

The goal is to answer:
- which target harness components already exist in this branch
- which ones exist only partially
- which ones are missing
- where implementation pressure is currently concentrated
- which files would likely become the implementation anchors in a future refactor

This is a repository-specific mapping document. It is intentionally grounded in the current branch state, not in the repository root outside this worktree.

## Audit Status

This document was audited against the active worktree codebase:

`/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-naskah-pages-enforcement`

Audit result:
- The document remains directionally correct.
- The main corrections are about implementation-status precision:
  - `Durable Run Orchestrator` is better classified as `Partial`, not `Missing`
  - `Event Model` is better classified as `Partial`, not `Missing`
- Additional correction from the new references and updated harness docs:
  - instruction hierarchy and runtime policy posture are already partially implemented in the repo, but they are distributed and not modeled as explicit harness layers
  - `Approval and Execution Boundary Policy` must now be mapped explicitly instead of being hidden inside tool, route, and verification discussions
- Reason:
  - the repo already has substantial inline orchestration and harness helpers
  - the repo already emits many structured, event-like facts
  - what is still missing is the clean, explicit, durable harness boundary, canonical event envelope, and explicit runtime policy layer

## Executive Summary

Makalahapp is not starting from zero.

This branch already contains a substantial partial harness with:
- chat entry and inline orchestration in `src/app/api/chat/route.ts`
- stage-based paper workflow persisted in Convex
- artifact lifecycle persisted in Convex
- stage-specific prompt/skill resolution
- route-level and helper-level policy enforcement for artifact/source safety
- verification and enforcement logic embedded in tools and route-level controls
- naskah compilation and export pipeline

However, the harness is currently distributed in a way that creates architectural pressure:
- too much orchestration logic is concentrated in `src/app/api/chat/route.ts`
- workflow state exists, but is coupled to a stage-writing product model rather than a generalized harness state machine
- there is no durable external orchestrator equivalent to the one recommended by the harness research
- instruction precedence and runtime policy are real, but spread across prompt builders, route logic, and guardrail helpers instead of explicit harness modules
- event model and execution state are mostly implicit in logs, Convex mutations, and route-level control branches

In short:
- the branch already has a strong domain workflow backbone
- it does not yet have a clean, explicit, durable harness architecture

## Mapping Scale

This document uses four implementation states:

- `Present`
- `Partial`
- `Missing`
- `Present but Overloaded`

## Target-to-Repo Mapping

## 1. Chat Entry and Run Ownership

Target status in repo:
- `Partial`

Current implementation anchors:
- `src/app/api/chat/route.ts`
- `convex/conversations.ts`
- `convex/messages.ts`
- `src/lib/chat/*`

What already exists:
- authenticated entry into the chat route
- conversation resolution and creation
- message parsing
- file/attachment context resolution
- choice interaction event parsing
- request-level observability logs

Evidence:
- `src/app/api/chat/route.ts` performs auth, request parsing, conversation creation, quota checking, attachment context resolution, and observability logging at request entry

What is missing or weak:
- explicit active run ownership abstraction
- atomic run claim/release contract equivalent to a dedicated `run ownership` layer
- explicit resume-vs-start run decision as a first-class harness concept

Current architectural issue:
- request entry and orchestration setup are fused into one large route

Future mapping direction:
- keep `src/app/api/chat/route.ts` as the HTTP entry boundary
- extract run ownership and run resolution into dedicated harness modules

## 2. Durable Run Orchestrator

Target status in repo:
- `Partial`

Current implementation anchors:
- `src/app/api/chat/route.ts`
- `src/lib/ai/streaming.ts`
- `src/lib/ai/reasoning-live-stream.ts`
- `src/lib/ai/harness/pipe-plan-capture.ts`
- `src/lib/ai/harness/plan-spec.ts`

What already exists:
- streaming model execution
- route-level tool sequencing and enforcement logic
- reactive chain enforcement for artifact and validation operations
- harness-specific stream transforms and structured plan capture

Evidence:
- `src/app/api/chat/route.ts` contains orchestration decisions such as:
  - forcing artifact creation and validation chains
  - revision chain enforcement
  - plan persistence
  - stage-aware tool choice overrides
- `src/lib/ai/harness/plan-spec.ts` and `pipe-plan-capture.ts` show that harness-specific execution structure already exists, even though it is not yet a durable external runtime

What is missing:
- durable multi-step run outside request lifecycle
- persisted run object as the primary executor
- explicit step loop with persisted resume point
- stable pause/resume/abort framework independent from HTTP request lifetime

Current architectural issue:
- the route currently acts as both request handler and orchestration engine
- this is the single biggest gap between current implementation and target harness architecture

Future mapping direction:
- `src/app/api/chat/route.ts` should become an entry adapter
- durable orchestration should move into a dedicated harness runtime layer

## 3. One-Step Agent Executor

Target status in repo:
- `Partial`

Current implementation anchors:
- `src/app/api/chat/route.ts`
- `src/lib/ai/chat-config.ts`
- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/ai/streaming.ts`

What already exists:
- model invocation through AI SDK
- prompt composition
- tool registration
- stream interception and reasoning support

Evidence:
- the chat route imports and uses `streamText`, `generateText`, `tool`, `stepCountIs`
- stage prompt and system prompt pieces are assembled before model execution

What is missing:
- a clean one-step executor module with a narrow input/output contract
- separation between:
  - prompt assembly
  - model execution
  - orchestration interpretation

Current architectural issue:
- model execution is embedded into the route-centric flow rather than isolated as a reusable unit

Future mapping direction:
- extract a single-step executor from route logic
- let the orchestrator call that executor rather than embedding the entire control logic inline

## 4. Prompt and Context Assembler

Target status in repo:
- `Present but Overloaded`

Current implementation anchors:
- `src/lib/ai/chat-config.ts`
- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/ai/paper-stages/*`
- `src/lib/ai/stage-skill-resolver.ts`
- `src/lib/ai/context-budget.ts`
- `src/lib/ai/context-compaction.ts`
- `src/lib/ai/search-results-context.ts`
- `src/app/api/chat/route.ts`

What already exists:
- database-backed primary system prompt
- fallback prompt logic
- paper-mode prompt builder
- stage instruction resolution
- context budget checks
- compaction logic
- attachment/source context assembly
- search context assembly

Evidence:
- `src/lib/ai/paper-mode-prompt.ts` builds a stage-aware prompt with:
  - stage status
  - memory digest
  - invalidated artifact context
  - skill-resolved instructions
- `src/lib/ai/stage-skill-resolver.ts` selects active stage skills and falls back safely

What is weak:
- context assembly is spread across too many route and AI helper branches
- there is no single explicit `context assembler` boundary
- some context and policy decisions are still mixed directly into the route
- instruction precedence is real in practice, but not yet represented as an explicit resolved instruction stack

Future mapping direction:
- consolidate prompt/context composition behind a dedicated assembly layer
- keep the existing stage prompt assets and compaction logic, but reorganize their ownership
- make resolved instruction precedence explicit and inspectable instead of leaving it implicit across helper chains

## 5. Thin Tool Registry

Target status in repo:
- `Present`

Current implementation anchors:
- `src/lib/ai/paper-tools.ts`
- inline tools in `src/app/api/chat/route.ts`
- `src/lib/ai/web-search/*`

What already exists:
- stage workflow tools
- artifact-related tools
- exact source inspection/search tools
- web search orchestration tools

Evidence:
- `src/lib/ai/paper-tools.ts` provides:
  - `getCurrentPaperState`
  - `updateStageData`
  - `compileDaftarPustaka`
  - `submitStageForValidation`
  - `requestRevision`
  - `inspectSourceDocument`
  - `quoteFromSource`
  - `searchAcrossSources`
- `src/app/api/chat/route.ts` additionally defines `createArtifact` and `updateArtifact`

Strength:
- tools are still mostly executor-oriented
- many business rules are encoded as explicit result payloads rather than hidden side effects

Weakness:
- artifact tools live partly in the route instead of a stable registry boundary
- tool policy and orchestration are intertwined in several places

Future mapping direction:
- preserve the existing tool inventory
- relocate route-defined tools into a consistent harness tool registry

## 6. Approval and Execution Boundary Policy

Target status in repo:
- `Partial`

Current implementation anchors:
- `src/app/api/chat/route.ts`
- `src/lib/ai/exact-source-guardrails.ts`
- `src/lib/ai/artifact-sources-policy.ts`
- route-level chain and artifact enforcement logic

What already exists:
- route-level blocking of unsafe or invalid next actions
- source and artifact policy helpers
- approval-like product gates through validation and choice flows
- mutation and ordering enforcement before certain operations continue

Evidence:
- `src/app/api/chat/route.ts` already enforces revision chains, artifact sequencing, and other runtime control rules
- `src/lib/ai/exact-source-guardrails.ts` and `src/lib/ai/artifact-sources-policy.ts` encode structured policy checks around source correctness and artifact behavior

Strength:
- the repo already has meaningful policy behavior rather than relying on the model alone

Weakness:
- policy is scattered across route branches and helper guards
- no explicit harness-level approval posture or execution-boundary state
- no canonical policy event trail for why an action was blocked, paused, or allowed

Future mapping direction:
- extract a dedicated runtime policy layer
- preserve existing guardrail helpers as policy primitives rather than reimplementing them

## 7. Structured Workflow State

Target status in repo:
- `Partial`

Current implementation anchors:
- `convex/paperSessions.ts`
- `convex/paperSessions/constants.ts`
- `convex/paperSessions/types.ts`
- `convex/paperSessions/stage_required_fields.ts`
- `convex/paperSessions/stageDataWhitelist.ts`
- `src/lib/paper/*`

What already exists:
- stage order
- stage status
- stage-specific data schemas
- required-field gating
- revision count
- validation timestamps
- dirty-state tracking
- memory digest persistence

Evidence:
- `convex/paperSessions/constants.ts` defines `STAGE_ORDER`
- `convex/paperSessions/types.ts` defines stage data validators and `StageStatus`
- `convex/paperSessions.ts` manages:
  - validation submission
  - approval
  - revision transitions
  - dirty state
  - rewind invalidation
  - `_plan` persistence

Strength:
- domain workflow state already exists and is meaningful

Weakness:
- state is shaped around product stage writing, not a generalized harness workflow state
- no explicit top-level workflow state contract like the target harness design
- pause state, decision state, and policy state are not modeled as first-class generic harness objects

Future mapping direction:
- do not discard this layer
- wrap and extend it into a more explicit harness workflow state model

## 8. Artifact State

Target status in repo:
- `Present`

Current implementation anchors:
- `convex/artifacts.ts`
- `convex/schema.ts`
- `src/app/api/chat/route.ts`
- `src/lib/naskah/compiler.ts`
- `convex/naskahRebuild.ts`

What already exists:
- artifact storage
- artifact lookup by conversation and user
- invalidation tracking
- version history semantics
- stage-to-artifact linkage
- naskah compilation from artifact-backed stage state

Evidence:
- `convex/artifacts.ts` exposes artifact queries and lifecycle helpers
- stage data in `convex/paperSessions/types.ts` stores `artifactId`
- `src/lib/naskah/compiler.ts` prefers validated, non-invalidated artifact content

Strength:
- artifact state is already one of the strongest reusable primitives in the repo

Weakness:
- artifact lifecycle rules are spread between Convex mutations and route-level tool control
- artifact contract is still biased toward current stage-writing flows

Future mapping direction:
- treat existing artifact state as a primary anchor for the future harness
- formalize mutation and verification around it rather than reinventing it

## 9. Human Input and Approval Interface

Target status in repo:
- `Partial`

Current implementation anchors:
- validation flow in `convex/paperSessions.ts`
- choice interaction flow in:
  - `src/lib/chat/choice-request.ts`
  - `src/lib/chat/choice-submit.ts`
  - `src/lib/json-render/*`
- UI references in `src/components/chat/json-renderer/*` and `src/components/paper/*`

What already exists:
- stage approval/revision flow via validation panel
- structured choice submission payloads
- workflowAction contract in JSON render path

Evidence:
- `src/lib/json-render/choice-payload.ts` and related tests enforce structured workflow choice payloads
- `convex/paperSessions.ts` supports approval and revision pathways

Weakness:
- no generic harness-level pending decision abstraction
- human checkpoints are implemented through product-specific mechanisms rather than a unified decision interface
- approval resolution is not yet unified with a distinct harness policy layer

Future mapping direction:
- preserve current approval and choice flows
- unify them under a common `decision` and `pause` harness model

## 10. Verification Engine

Target status in repo:
- `Partial`

Current implementation anchors:
- `convex/paperSessions/stage_required_fields.ts`
- validation gates in `convex/paperSessions.ts`
- source/reference checks in:
  - `src/lib/ai/exact-source-guardrails.ts`
  - `src/lib/ai/artifact-sources-policy.ts`
  - `src/lib/ai/skills/web-search-quality/*`
- route-level post-tool and chain checks in `src/app/api/chat/route.ts`
- export/naskah compilation guards in `src/lib/naskah/compiler.ts`

What already exists:
- required field checks before validation submission
- artifact/source policy checks
- exact-source inspection and parity guards
- chain completion checks
- compile guards for naskah output

Evidence:
- `submitStageForValidation` in `src/lib/ai/paper-tools.ts` blocks when required fields or artifact are missing
- `src/app/api/chat/route.ts` logs and enforces ordering bugs, partial-save stalls, and missing submit behavior

Strength:
- this repo already takes verification more seriously than a basic chatbot implementation

Weakness:
- verification is distributed and partly reactive
- no dedicated explicit verification engine boundary
- verification result is not yet represented as a unified first-class harness record

Future mapping direction:
- gather current checks into a defined verification layer instead of route-level scatter

## 11. Persistence Layer

Target status in repo:
- `Present`

Current implementation anchors:
- `convex/messages.ts`
- `convex/conversations.ts`
- `convex/paperSessions.ts`
- `convex/artifacts.ts`
- `convex/sourceDocuments.ts`
- `convex/sourceChunks.ts`

What already exists:
- durable conversation persistence
- message persistence
- paper session persistence
- artifact persistence
- source document and chunk persistence
- system prompts and stage skill persistence

Strength:
- Convex provides a strong persistence substrate already

Weakness:
- no dedicated durable run/step/event/policy persistence for the harness
- current persistence is strong for product state, weaker for orchestration state

Future mapping direction:
- reuse Convex as the core persistence layer
- add explicit run, step, decision, policy, verification, and event persistence models

## 12. Observability Layer

Target status in repo:
- `Partial`

Current implementation anchors:
- `src/lib/ai/telemetry.ts`
- `convex/aiTelemetry.ts`
- `src/lib/ai/curated-trace.ts`
- `src/lib/technical-report/*`
- extensive console tracing in `src/app/api/chat/route.ts`

What already exists:
- AI telemetry
- curated trace support
- technical reporting
- many targeted console warnings and flow markers

Evidence:
- route logs include many structured signals:
  - revision chain enforcement
  - artifact enforcement
  - ordering failures
  - source parity failures
  - paper prompt latency

Strength:
- observability culture already exists in the codebase

Weakness:
- observability is not yet unified under a stable event model
- some execution reasoning still depends on logs instead of durable event records
- policy and instruction-resolution decisions are not yet captured in a canonical harness trace

Future mapping direction:
- preserve current observability signals
- convert them into a canonical harness event model with durable storage where needed

## 13. Memory

Target status in repo:
- `Partial`

Current implementation anchors:
- `paperMemoryDigest` usage in `convex/paperSessions.ts`
- `formatMemoryDigest()` in `src/lib/ai/paper-mode-prompt.ts`
- conversation history and artifact state

What already exists:
- a stage decision digest persisted in paper sessions
- artifact-backed reconstruction for naskah
- normal chat history

Strength:
- there is already a useful domain-specific memory anchor

Weakness:
- no generalized harness memory abstraction
- memory exists as a product-specific digest, not as a formal session/artifact memory layer

Future mapping direction:
- evolve `paperMemoryDigest` into one branch of a broader structured memory layer
- do not replace it blindly

## 14. Subagents

Target status in repo:
- `Missing`

Current implementation anchors:
- none as first-class runtime feature

What already exists:
- no explicit subagent orchestration layer in the active code path

Assessment:
- this is acceptable for now
- the repo should not add subagents before cleaning the primary harness architecture

## 15. Event Model

Target status in repo:
- `Partial`

Current implementation anchors:
- implicit through:
  - Convex mutations
  - message persistence
  - telemetry
  - console logs
- structured payload contracts in:
  - `src/lib/json-render/choice-payload.ts`
  - `src/lib/ai/harness/plan-spec.ts`
  - `src/lib/ai/telemetry.ts`
  - `convex/aiTelemetry.ts`

What already exists:
- many event-like facts are already produced
- several structured payloads and telemetry records already exist
- they are not normalized into a canonical event envelope

Assessment:
- the repo has event material
- it does not yet have a proper unified harness event model

Future mapping direction:
- introduce a shared harness event vocabulary without discarding current telemetry immediately
- ensure the future event layer covers instruction resolution, approval requests/resolution, and execution-boundary evaluation

## 16. Data Contracts

Target status in repo:
- `Partial`

Current implementation anchors:
- `convex/paperSessions/types.ts`
- `src/lib/json-render/choice-payload.ts`
- `src/lib/ai/harness/plan-spec.ts`
- artifact and paper session schema

What already exists:
- strong domain contracts for stage data
- strong structured payload contracts for choice cards
- partial harness contract for `_plan`
- policy-shaped contracts embedded in guardrail helpers

Evidence:
- `src/lib/ai/harness/plan-spec.ts` defines a model-emitted plan schema
- `pipe-plan-capture.ts` extracts structured plan data from the stream

Strength:
- the repo already uses structured contracts in multiple critical places

Weakness:
- harness-level run/step/decision/policy/verification contracts are not unified yet

Future mapping direction:
- extend the existing contract culture upward into the harness

## Existing Building Blocks Worth Preserving

The following current assets should be treated as reusable foundations, not throwaway code:

1. `convex/paperSessions.ts`
2. `convex/paperSessions/constants.ts`
3. `convex/paperSessions/types.ts`
4. `convex/artifacts.ts`
5. `src/lib/ai/paper-mode-prompt.ts`
6. `src/lib/ai/stage-skill-resolver.ts`
7. `src/lib/ai/paper-tools.ts`
8. `src/lib/naskah/compiler.ts`
9. `src/lib/json-render/*`
10. `src/lib/ai/context-budget.ts` and `src/lib/ai/context-compaction.ts`
11. `src/lib/ai/exact-source-guardrails.ts`
12. `src/lib/ai/artifact-sources-policy.ts`

These are not the problem. The main problem is how orchestration is currently concentrated and coupled.

## Main Architectural Pressure Points

### 1. `src/app/api/chat/route.ts` is overloaded

It currently contains:
- auth and request entry
- context assembly
- tool definitions
- policy enforcement
- orchestration logic
- repair chain enforcement
- logging and observability logic
- partial plan handling

This file is the clearest evidence that the current repo has a harness in practice, but not yet a clean harness architecture.

### 2. Workflow control exists, but product-coupled

`paperSessions` already models:
- stage progression
- validation
- revision
- rewind invalidation
- memory digest

This is strong, but still bound tightly to the current paper-writing product workflow rather than a generalized harness layer.

### 3. Verification exists, but is scattered

Checks exist across:
- Convex mutations
- route tool wrappers
- source-quality guards
- compile guards

The issue is not lack of verification. The issue is lack of one clear verification boundary.

## Recommended Future Mapping Path

The safest migration path for this repo is not "rewrite the system".

It should be:

### Phase A: Extract explicit harness boundaries around existing behavior

Likely targets:
- extract a run ownership module
- extract a one-step executor wrapper
- extract a context assembler
- extract a runtime policy layer
- extract a verification layer
- extract a canonical tool registry

### Phase B: Introduce explicit harness state and event layers

Add:
- run state
- step state
- decision state
- policy state
- verification state
- event envelopes

Do this without replacing existing paper session and artifact persistence.

### Phase C: Replace route-centric orchestration with durable orchestration

This is the largest change:
- move orchestration responsibility out of `src/app/api/chat/route.ts`
- preserve current product logic and tool inventory
- keep Convex as the primary domain persistence layer

## Component-by-Component Summary Table

| Target Component | Repo Status | Current Anchors | Main Gap |
| --- | --- | --- | --- |
| Chat Entry and Run Ownership | Partial | `src/app/api/chat/route.ts` | no explicit run ownership layer |
| Durable Run Orchestrator | Partial | route-centric control + `src/lib/ai/harness/*` | no durable executor outside request lifecycle |
| One-Step Agent Executor | Partial | route + AI SDK calls | no isolated executor boundary |
| Prompt and Context Assembler | Present but Overloaded | `paper-mode-prompt`, route, AI helpers | too distributed, route-heavy |
| Thin Tool Registry | Present | `paper-tools`, route tools | split ownership, route-defined artifact tools |
| Approval and Execution Boundary Policy | Partial | route guards + `exact-source-guardrails` + `artifact-sources-policy` | no explicit policy layer or policy state |
| Structured Workflow State | Partial | `convex/paperSessions*` | not generalized as harness workflow/decision/policy state |
| Artifact State | Present | `convex/artifacts`, `naskah/compiler` | lifecycle policy still scattered |
| Human Input and Approval Interface | Partial | validation panel + choice system | no unified decision abstraction |
| Verification Engine | Partial | Convex gates + route guards | no dedicated verification boundary |
| Persistence Layer | Present | Convex entities | missing explicit run/step/decision/policy/event persistence |
| Observability Layer | Partial | telemetry + logs + traces | no canonical event model |
| Memory | Partial | `paperMemoryDigest` + history | no generalized harness memory abstraction |
| Subagents | Missing | none | intentionally absent |
| Event Model | Partial | implicit logs/mutations + structured choice/plan/telemetry payloads | no shared event envelope for steps, policy, and transitions |
| Data Contracts | Partial | stage/choice/plan contracts | harness-level run/step/decision/policy contracts not unified |

## Final Recommendation

This repo already contains the raw material for a strong harness, especially in:
- workflow persistence
- artifact state
- stage-aware prompt logic
- structured product contracts
- verification instincts

The primary implementation challenge is not missing product logic.

The primary implementation challenge is architectural reorganization:
- extract orchestration out of the chat route
- formalize execution state
- formalize event/state boundaries
- preserve current domain strengths while replacing the harness shape

The most important implementation mapping conclusion is:

`convex/paperSessions.ts` and `convex/artifacts.ts` should remain core domain anchors, while `src/app/api/chat/route.ts` should progressively stop being the harness itself.
