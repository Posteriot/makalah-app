# Makalahapp Harness V1 Blueprint

## Purpose

This document defines the target v1 harness architecture for makalahapp. It converts prior discussion into a concrete system blueprint that is stable, resumable, verification-aware, and artifact-centric.

The intended harness is not a coding-agent harness. It is an artifact and workflow harness.

Its center of gravity should be:
- chat session state
- workflow state
- artifact state
- verification state
- structured user decision points

## Audit Status

This document was audited against:
- `.references/agent-harness/anatomy/anatomy-agent-harness.md`
- the already-audited `v1 priority matrix`
- `Codex` documentation/config patterns for instruction layering, approvals, sandboxing, and subagents
- `Claude Code` documentation for `CLAUDE.md`, permissions, hooks, memory loading, and subagent/team execution

Audit result:
- The blueprint remains directionally correct and consistent with the intended v1 shape.
- The main correction is that the blueprint must be explicit about two mandatory v1 capabilities:
  - `output parsing`
  - `basic error handling`
- In this blueprint, those capabilities are embedded rather than modeled as separate top-level boxes:
  - `output parsing` belongs inside the `One-Step Agent Executor`
  - `basic error handling` belongs inside the `Durable Orchestrator`
- Additional correction from the new references:
  - instruction hierarchy must be explicit in the v1 architecture, not left as an implicit prompt-building detail
  - approval posture and execution boundaries must exist as visible runtime architecture in v1 even if the full policy graph is deferred

## Core Principle

The v1 blueprint should be built around:

`Entry -> Durable Orchestrator -> One-Step Agent -> Thin Tools -> Verification -> Persistence -> Stream/UI`

Shared state should sit underneath this flow:
- workflow state
- artifact state
- session summary
- pending decision state
- run log

## Component Layout

### 1. Chat Entry Layer

Responsibilities:
- receive user input
- validate user, session, and chat ownership
- persist the incoming user message before execution starts
- decide whether to resume an active run or start a new run

Why it exists:
- request handling must not contain the full execution loop
- resumability begins here

### 2. Run Ownership Layer

Responsibilities:
- ensure only one active run owns a chat/workflow execution lane
- provide atomic claim and release semantics

Recommended ownership shape:
- minimum: `chatId + activeRunId`
- if needed later: `chatId + workflowStage + activeRunId`

Why it exists:
- prevents duplicate runs
- prevents race conditions in streaming and state mutation

### 3. Durable Orchestrator

Responsibilities:
- own the multi-step execution loop
- assemble each step
- execute model step, tool step, verification step
- decide continuation, pause, or completion
- handle basic error classification and recovery so state does not become incoherent

Recommended step sequence:
1. load latest persisted state
2. assemble step context
3. call one-step agent executor
4. execute requested tools
5. update workflow and artifact state
6. run verification
7. decide continue, pause, stop, or fail

Why it exists:
- long-lived agent behavior needs durable control outside HTTP request lifetime

### 4. One-Step Agent Executor

Responsibilities:
- perform one bounded reasoning/action step
- return model intent to the orchestrator
- parse bounded model outputs into actionable runtime signals

Desired outputs:
- assistant text
- tool calls
- state intent
- needs user input signal
- completion signal
- malformed or incomplete output signal when parsing fails

Why it exists:
- preserves a thin runtime core
- avoids hiding lifecycle logic inside the model wrapper

### 5. Prompt and Context Assembler

Responsibilities:
- construct the smallest sufficient context for a step
- assemble the prompt passed to the one-step executor
- apply deterministic instruction precedence before each step

Recommended context inputs:
- system instructions
- project or repository instructions
- workflow-specific instructions
- workflow state
- artifact summary
- session summary
- recent relevant turns
- verification findings
- available tools
- latest user event

Why it exists:
- quality depends on context discipline
- makalahapp should avoid transcript dumping
- v1 must not rely on implicit instruction concatenation because policy-bearing instructions need predictable precedence

### 6. Structured Workflow State

Responsibilities:
- represent where the workflow currently is
- control legal stage transitions

Recommended minimum fields:
- `workflowStage`
- `workflowStatus`
- `pendingUserDecision`
- `currentArtifactId`
- `lastVerificationStatus`
- `lastMeaningfulAction`

Recommended v1 stages:
- `intake`
- `clarification`
- `planning`
- `drafting`
- `revision`
- `verification`
- `ready_for_user`

Why it exists:
- makalahapp is workflow-driven and should not rely on implied stage inference

### 7. Artifact State

Responsibilities:
- track the active artifact as a first-class object
- separate artifact truth from chat history

Recommended minimum fields:
- `artifactId`
- `artifactType`
- `artifactVersion`
- `artifactSummary`
- `artifactContentRef`
- `artifactChecks`

Why it exists:
- the artifact must have a stateful lifecycle independent from the chat transcript

### 8. Thin Tool Registry

Responsibilities:
- expose deterministic execution primitives
- keep tools simple and schema-driven

Recommended v1 tool categories:
- workflow-state read
- artifact read
- artifact update
- reference retrieval
- search/navigation
- ask user question
- approval/confirmation

Why it exists:
- tools are execution surfaces, not intelligence containers

### 9. Human Input and Approval Interface

Responsibilities:
- handle ambiguity and approval checkpoints
- turn user answers into structured execution events
- expose the operator-visible approval posture for high-impact actions

Recommended v1 use cases:
- resolve ambiguity
- choose direction
- confirm important artifact mutations
- approve high-impact transitions

Why it exists:
- some decisions should not be guessed by the model

### 10. Verification Engine

Responsibilities:
- determine whether recent output and state are valid
- block completion when correctness requirements are not met

Recommended v1 verification layers:
1. state consistency verification
2. artifact contract verification
3. workflow completion verification

Why it exists:
- completion must be earned, not inferred from the model stopping

### 11. Persistence Layer

Responsibilities:
- persist messages, steps, state, verification, and decisions
- support resumability and auditability

Why it exists:
- a harness is not durable if key execution data is ephemeral

### 12. Observability Layer

Responsibilities:
- record enough information to reconstruct what happened
- support debugging, review, and audit

Recommended logs:
- run record
- step record
- tool invocation record
- workflow transition record
- verification record
- user decision record

Why it exists:
- the harness must be inspectable after the fact

## Data Flow

Recommended v1 execution flow:

1. user sends a message
2. entry layer validates and persists the message
3. ownership layer resolves active run
4. orchestrator loads latest state
5. context assembler constructs step context
6. one-step agent runs
7. if tool calls exist, tools execute and persist results
8. workflow and artifact state update
9. verification runs
10. orchestrator decides continue, pause, complete, or fail
11. stream updates reach UI
12. all important events are logged

## Mandatory V1 Guardrails

The following guardrails should exist in v1:
- state mutation guard
- artifact overwrite guard
- pending decision guard
- completion guard
- approval guard for high-impact mutations or transitions
- execution-boundary defaults for mutation-capable tools

Examples:
- completion cannot pass if verification fails
- sensitive artifact overwrite cannot proceed without confirmation
- invalid workflow stage transitions must be rejected
- mutation-capable tools must run under explicit default boundaries rather than ad hoc free execution

This is the intended v1 posture:
- simple and auditable approval behavior
- simple and auditable execution boundaries
- no heavy per-capability policy graph yet

This blueprint should therefore be read in contrast with `Codex` and `Claude Code` as follows:
- makalahapp v1 does not need their full permission surface area
- makalahapp v1 does need the same architectural principle that policy is runtime-visible and not just implied by prompts

## Important Clarification About Blueprint Scope

This blueprint is an architecture view, not a claim that every anatomy component must appear as an isolated box.

In this v1 blueprint:
- `memory` appears in a thinner form through session summaries and structured state
- `output parsing` is embedded in the one-step executor
- `error handling` is embedded in the orchestrator
- `guardrails` appear as minimum mandatory controls rather than a full permission graph
- instruction hierarchy is embedded inside the prompt/context assembler rather than drawn as its own top-level box

That is an intentional v1 simplification, not an omission.

## What Must Stay Out of V1

The blueprint intentionally excludes:
- default multi-agent orchestration
- complex long-term memory systems
- second-model evaluator layers
- advanced context compaction engines
- heavy permission graphs

These can be revisited only after the v1 harness proves stable in real usage.

## Final Recommendation

Makalahapp's v1 harness should be built around:
- durable workflow orchestration
- structured workflow state
- artifact-first state modeling
- explicit human checkpoints
- verification-backed completion
- deterministic instruction precedence
- visible approval and execution-boundary posture

That is the smallest architecture that can still behave like a real production harness.
