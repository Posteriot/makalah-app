# Makalahapp Harness Priority Matrix

## Purpose

This document converts the research discussion into a concrete priority matrix for makalahapp's target harness. The purpose is to prevent over-engineering by deciding what must exist in v1 and what should be delayed to v2.

Design basis:
- baseline anatomy of a production harness
- deep dive of `open-agents`
- contrast checks from `openai/codex` and `anthropics/claude-code`
- repository constraints defined in `AGENTS.md`

## Audit Status

This document was audited against:
- `.references/agent-harness/anatomy/anatomy-agent-harness.md`
- `open-agents` runtime shape, especially the durable workflow and single-step execution split
- `Codex` docs and config surfaces for instruction layering, approvals, sandboxing, MCP/tool governance, and subagents
- `Claude Code` docs for `CLAUDE.md` and memory loading, permissions, hooks, and subagent/team orchestration

Audit result:
- The prioritization remains directionally correct.
- The main correction is conceptual, not structural:
  - `output parsing` and `basic error handling` are not deferred to v2
  - they are mandatory v1 capabilities living inside the `One-Step Agent Executor` and `Durable Run Orchestrator`
- Additional correction from the new references:
  - v1 cannot treat instruction precedence and basic permission posture as optional implementation details
  - the heavy policy graph can stay in v2, but a minimal operator-visible approval and sandbox model must already exist in v1
- This matrix is therefore an implementation-priority view, not a claim that only the named top-level entries matter in v1.

## Core Position

Makalahapp should not start with a full, thick harness. The correct first move is to establish a stable, auditable v1 with the smallest set of components required for:
- resumable execution
- structured workflow control
- artifact correctness
- human checkpoints
- observability

## V1 Required Components

### 1. Chat Entry and Run Ownership

Why it is v1:
- prevents duplicate runs
- prevents stream collisions
- makes resume behavior reliable

Minimum expectations:
- validate session and chat ownership
- persist user message before execution
- atomically claim active run ownership
- resume instead of duplicating when a valid run already exists

### 2. Durable Run Orchestrator

Why it is v1:
- request lifecycles are not reliable execution containers
- the system needs pause, resume, retry, and termination control

Minimum expectations:
- step loop
- max step control
- pause/resume behavior
- final completion and failure states
- basic error classification and recovery behavior sufficient to preserve coherent state

### 3. One-Step Agent Executor

Why it is v1:
- separates orchestration from reasoning
- keeps the runtime thin and replaceable

Minimum expectations:
- one model call per step
- structured output handling
- no direct state mutation from the model executor
- basic output parsing for tool calls, finish signals, and malformed responses

### 4. Prompt and Context Assembler

Why it is v1:
- context quality directly determines output quality
- makalahapp needs disciplined context selection, not transcript dumping

Minimum expectations:
- inject workflow state
- inject artifact summary
- inject session summary
- include current user event and relevant verification findings
- apply deterministic instruction precedence across system, project, workflow, and turn-specific inputs
- make policy-bearing instructions explicit instead of relying on implicit prompt concatenation

### 5. Thin Tool Registry

Why it is v1:
- the agent needs execution primitives
- tool logic must remain simple and inspectable

Minimum expectations:
- read tools
- artifact mutation tools
- workflow/state tools
- retrieval/search tools
- user-question/approval tools

### 6. Structured Workflow State

Why it is v1:
- makalahapp is workflow-driven
- uncontrolled stage transitions would break correctness

Minimum expectations:
- explicit workflow stage and status
- transition guards
- pending decision tracking
- state updates based on semantic data rather than keyword parsing

### 7. Human Input and Approval Interface

Why it is v1:
- the system must pause for ambiguity or high-impact decisions
- user answers must become part of the execution state

Minimum expectations:
- structured question payload
- structured approval payload
- persistence of user answers before resuming execution

### 8. Verification Engine

Why it is v1:
- model output is not equivalent to valid completion
- artifact and workflow correctness must be checked before completion

Minimum expectations:
- deterministic checks
- artifact contract checks
- workflow completion checks
- verification results persisted as state

### 9. Persistence Layer

Why it is v1:
- resumability and auditability require real persistence

Minimum expectations:
- message persistence
- run persistence
- tool-result persistence
- workflow-state persistence
- artifact-state persistence
- verification persistence

### 10. Observability Layer

Why it is v1:
- a production harness without traceability is not maintainable
- debugging and audit depend on event visibility

Minimum expectations:
- run log
- step log
- tool call log
- workflow transition log
- verification log

## V2 Deferred Components

### 1. Rich Session and Artifact Memory

Why it is deferred:
- v1 can rely on structured state plus lightweight summaries
- advanced memory too early creates complexity without guaranteed value

Promote to v2 only when:
- cross-session recall becomes a real requirement
- context pressure becomes recurrent
- explicit user preference continuity needs to outlive current state objects

### 2. Subagents

Why it is deferred:
- single-agent discipline is usually sufficient for v1
- multi-agent designs add cost, coordination overhead, and debugging complexity

Promote to v2 only when:
- there is proven context overload
- there are clearly bounded tasks worth parallelizing

### 3. Granular Permission Graph

Why it is deferred:
- v1 still needs guardrails, but not a heavy per-capability policy system
- the first priority is correctness and state discipline

Promote to v2 only when:
- action surface area grows
- sensitive operations become more varied
- audit or compliance needs deeper policy granularity

### 4. Advanced Context Compaction

Why it is deferred:
- v1 can use strict context selection and explicit summaries
- sophisticated compaction too early risks hidden information loss

Promote to v2 only when:
- token pressure is proven in real usage
- context degradation becomes a measurable failure mode

### 5. LLM-as-Judge Evaluator Layer

Why it is deferred:
- deterministic verification should come first
- secondary model judges are expensive and easy to misuse

Promote to v2 only when:
- deterministic checks cannot cover important semantic quality requirements

### 6. Advanced Retry and Recovery Taxonomy

Why it is deferred:
- v1 needs basic failure handling, not a complete recovery framework
- richer taxonomy should follow observability evidence

Promote to v2 only when:
- repeated failure patterns show clear classes worth formalizing

## Important Clarification About Guardrails

Guardrails are not absent from v1.

The correct split is:
- v1 includes minimum mandatory guardrails
- v2 may add a more granular permission graph

Required v1 guardrails:
- workflow-state mutation guard
- artifact overwrite guard
- pending decision guard
- completion guard
- minimum approval posture for high-impact actions
- explicit sandbox or execution-boundary defaults for mutation-capable tools

This is the important split:
- v1 must already expose a simple, auditable approval and execution-boundary model
- v2 may add the richer per-capability graph, inherited policy trees, and more advanced automation around it

Why this matters:
- `Codex` and `Claude Code` both treat approvals and execution boundaries as first-class operating controls, not as hidden prompt behavior
- so for makalahapp, deferring the heavy graph is valid, but deferring the existence of a visible runtime posture would be too weak

## Important Clarification About Anatomy Coverage

This matrix is an implementation-priority view, not a rejection of the anatomy baseline's full component set.

For v1:
- `memory` is represented in a thinner form through structured state and lightweight summaries
- `guardrails` are present in minimum mandatory form
- `output parsing` is part of the agent executor contract
- `error handling` is part of the orchestrator contract
- instruction hierarchy is embedded inside the prompt/context assembler rather than split into a separate top-level component

So the correct reading is:
- some anatomy components appear here as standalone v1 entries
- some anatomy components are intentionally embedded inside other v1 components
- some richer forms are deferred to v2 to avoid over-engineering

## Final Recommendation

The correct v1 for makalahapp is:

- Chat Entry and Run Ownership
- Durable Run Orchestrator
- One-Step Agent Executor
- Prompt and Context Assembler
- Thin Tool Registry
- Structured Workflow State
- Human Input and Approval Interface
- Verification Engine
- Persistence Layer
- Observability Layer

This gives makalahapp a real harness without prematurely inheriting the complexity of a fully expanded multi-agent or long-memory system.

The practical reading after comparing `open-agents`, `Codex`, and `Claude Code` is:
- v1 stays intentionally thin on memory richness, subagents, and advanced policy graphs
- but v1 is not allowed to be vague about instruction precedence, approval posture, or execution boundaries
