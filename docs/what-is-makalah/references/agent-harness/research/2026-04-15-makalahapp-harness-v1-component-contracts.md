# Makalahapp Harness V1 Component Contracts

## Purpose

This document defines explicit contracts for the v1 makalahapp harness components. The intent is to make implementation boundaries clear before any code is written.

Each component below specifies:
- responsibility
- inputs
- outputs
- state read/write scope
- key guards

## Audit Status

This document was audited against:
- the already-audited `v1 blueprint`
- the already-audited `v1 priority matrix`
- `Codex` references for instruction layering, runtime approvals, sandbox posture, and subagent inheritance
- `Claude Code` references for `CLAUDE.md` loading, permissions, hooks, and runtime-visible policy controls

Audit result:
- The document remains directionally correct.
- Two material corrections were required:
  - `Chat Entry` and `Run Ownership` should not remain collapsed into one contract because the blueprint treats them as distinct components
  - `One-Step Agent Executor` must explicitly expose parse-failure style output because v1 already includes embedded output parsing
- Additional correction from the new references:
  - the component contracts must make instruction precedence explicit rather than leaving it implicit inside prompt assembly prose
  - the v1 contracts must make approval posture and execution boundaries explicit runtime concerns rather than hidden conventions
- One structural clarification was also required:
  - the `Event Model for V1` and `Minimum Shared State Objects` sections are summary-level references only, not the canonical source for those topics

## 1. Chat Entry Layer

### Responsibility

- accept user input
- validate user/session/chat
- persist the user message before orchestration
- forward a valid execution event for run resolution

### Inputs

- `userId`
- `sessionId`
- `chatId`
- `message`
- optional `toolResult`
- optional `userDecision`

### Outputs

- `acceptedMessage`
- `acceptedEvent`

### Reads

- session record
- chat record

### Writes

- user message log
- entry event metadata

### Guards

- must reject invalid ownership
- must validate tool results and user decisions against an active execution context

## 2. Run Ownership Layer

### Responsibility

- resolve whether execution should start or resume
- ensure only one active run owns an execution lane
- manage atomic claim and release behavior

### Inputs

- `chatId`
- `acceptedEvent`
- optional workflow lane metadata

### Outputs

- `runResolution`
- `activeRunId`

### Reads

- active run ownership
- run metadata

### Writes

- active run ownership metadata
- run lifecycle metadata

### Guards

- must not start a new run if a valid active run already exists
- must prevent concurrent ownership collisions

## 3. Durable Run Orchestrator

### Responsibility

- own multi-step execution
- control progression, pause, stop, and failure behavior
- call the one-step executor, tools, and verification in sequence

### Inputs

- `activeRunId`
- latest persisted state
- latest accepted user event

### Outputs

- step execution result
- pause signal
- completion signal
- failure signal

### Reads

- workflow state
- artifact state
- session summary
- pending decision state
- latest verification state

### Writes

- run status
- step status
- orchestration event log
- lifecycle timestamps

### Guards

- must enforce max step limit
- must not continue when state is invalid
- must not complete when completion guard fails
- must preserve coherent state across basic recoverable failure paths

## 4. One-Step Agent Executor

### Responsibility

- perform one bounded reasoning/action step
- return structured execution intent

### Inputs

- `assembledPrompt`
- `assembledContext`
- tool schema
- model selection

### Outputs

- `assistantText`
- `toolCalls`
- `stateIntent`
- `needsUserInput`
- `completionSignal`
- `parseFailureSignal`

### Reads

- only the prepared execution context

### Writes

- no direct persistent writes

### Guards

- must not mutate persistent state directly
- output must be parseable enough for orchestrator handling

## 5. Prompt and Context Assembler

### Responsibility

- build the smallest sufficient context for one agent step
- produce the final prompt package
- enforce deterministic instruction precedence for the step

### Inputs

- system instruction set
- project or repository instruction set
- workflow-specific instruction set
- workflow state
- artifact summary
- session summary
- latest user event
- verification findings
- tool registry metadata

### Outputs

- `assembledPrompt`
- `assembledContext`
- `resolvedInstructionStack`
- optional `contextManifest`

### Reads

- instruction sources selected for the current lane
- workflow snapshot
- artifact snapshot
- selected recent conversation
- unresolved findings

### Writes

- optional manifest/log only

### Guards

- must avoid full transcript dumping by default
- must avoid injecting irrelevant raw artifact payloads
- must preserve deterministic precedence across instruction layers
- should keep context explainable and reproducible

## 6. Structured Workflow State Manager

### Responsibility

- maintain workflow stage and status
- accept or reject requested transitions

### Inputs

- transition request
- verification result
- user decision result
- tool mutation result

### Outputs

- updated workflow state
- transition accepted/rejected signal

### Reads

- current workflow state

### Writes

- `workflowStage`
- `workflowStatus`
- `pendingUserDecision`
- `lastAction`
- `lastTransitionReason`

### Guards

- must enforce legal transitions only
- must block transitions when pending decision rules require it
- must not infer transitions from keyword heuristics

## 7. Artifact State Manager

### Responsibility

- maintain the active artifact as a first-class state object
- manage artifact versioning and summaries

### Inputs

- artifact read requests
- artifact update requests
- tool mutation results
- verification annotations

### Outputs

- updated artifact snapshot
- artifact version metadata

### Reads

- current artifact state
- artifact content reference

### Writes

- `artifactId`
- `artifactVersion`
- `artifactSummary`
- `artifactContentRef`
- `artifactChecks`
- update timestamps

### Guards

- must protect against silent overwrite
- should be version-aware for mutation safety
- must preserve workflow-to-artifact linkage

## 8. Thin Tool Registry

### Responsibility

- provide deterministic execution tools
- validate technical inputs and return structured outputs

### Inputs

- tool name
- structured arguments
- execution context
- runtime approval posture
- execution-boundary posture

### Outputs

- `toolResult`
- `toolError`
- `toolMetadata`
- optional `approvalRequiredSignal`

### Reads

- limited to each tool's domain

### Writes

- only domain-specific mutation results where allowed

### Guards

- must not perform business reasoning
- must not hide cross-domain side effects
- all mutating tools must have explicit state boundaries
- mutation-capable tools must not execute outside declared runtime boundaries

## 9. Approval and Execution Boundary Policy

### Responsibility

- define the active approval posture for the current run
- define the execution boundaries for mutation-capable operations
- provide runtime policy decisions that are visible to the orchestrator and tool layer

### Inputs

- active run context
- requested tool/action metadata
- workflow stage
- pending decision state

### Outputs

- `approvalDecision`
- `boundaryDecision`
- `policyReason`

### Reads

- current policy defaults
- run-level overrides if allowed
- active workflow and decision state

### Writes

- policy evaluation record
- optional policy override record

### Guards

- must not rely on prompt text alone to enforce policy
- must make high-impact mutation approval requirements explicit
- must define execution defaults before mutation-capable tools run

## 10. Human Input and Approval Interface

### Responsibility

- represent user questions and approval checkpoints
- turn user responses into structured execution events
- resolve approval prompts issued by runtime policy

### Inputs

- question payload
- approval payload
- user answer
- decline response

### Outputs

- `decisionResult`
- `approvalResult`
- `declinedResult`

### Reads

- pending decision state
- active run context
- active policy evaluation context

### Writes

- user decision record
- updated pending decision state

### Guards

- must only resolve active decisions
- must not allow multiple incompatible active decisions for the same execution lane
- user answers must be persisted before orchestration resumes

## 11. Verification Engine

### Responsibility

- verify whether the current result and state are valid
- determine whether completion is allowed

### Inputs

- workflow state
- artifact state
- latest mutation results
- completion claim

### Outputs

- `verificationStatus`
- `verificationFindings`
- `completionEligibility`

### Reads

- workflow snapshot
- artifact snapshot
- latest step output

### Writes

- verification record
- latest verification state

### Guards

- must block completion when verification fails
- critical findings must become state, not only logs

## 12. Persistence Layer

### Responsibility

- persist the entities required for resumability and auditability
- support idempotent retries and reconnects

### Inputs

- messages
- step events
- tool results
- workflow state snapshots
- artifact state snapshots
- verification results
- user decisions

### Outputs

- persisted records
- conflict or retry signals

### Reads

- prior records for dedupe and scoped upsert logic

### Writes

- message log
- run log
- state snapshots
- verification records
- decision records

### Guards

- important events must be persisted early
- writes should be idempotent where retries are possible
- upserts must be scoped to prevent cross-entity overwrite

## 13. Observability Layer

### Responsibility

- record enough execution data for debugging, review, and audit

### Inputs

- run events
- step events
- tool events
- transition events
- verification events
- decision events

### Outputs

- queryable execution trace

### Reads

- optional for aggregated inspection

### Writes

- run trace
- step trace
- tool trace
- transition trace
- verification trace
- decision trace

### Guards

- logs must be sufficient to explain why the system took a given step
- observability must not depend only on free-text summaries

## Event Model for V1

The components above should communicate through a shared event vocabulary.

This section is a summary-level bridge only. The canonical detail should live in the dedicated event-model document.

Recommended minimum event types:
- `user_message_received`
- `run_started`
- `run_resumed`
- `step_started`
- `instruction_stack_resolved`
- `agent_output_received`
- `tool_called`
- `approval_requested`
- `approval_resolved`
- `execution_boundary_evaluated`
- `tool_result_received`
- `workflow_transition_requested`
- `workflow_transition_applied`
- `artifact_updated`
- `verification_completed`
- `user_decision_requested`
- `user_decision_received`
- `run_paused`
- `run_completed`
- `run_failed`

## Minimum Shared State Objects

This section is a summary-level bridge only. The canonical detail should live in the dedicated event-model and state-machine documents.

### workflowState

- `stage`
- `status`
- `pendingDecisionId`
- `lastVerificationStatus`
- `currentArtifactId`
- `lastTransitionAt`

### artifactState

- `artifactId`
- `version`
- `summary`
- `contentRef`
- `checks`
- `updatedAt`

### runState

- `runId`
- `status`
- `stepNumber`
- `startedAt`
- `updatedAt`
- `ownerToken`

### decisionState

- `decisionId`
- `type`
- `status`
- `requestedAt`
- `resolvedAt`

## Boundary Rules

To keep the harness clean, the following boundaries should hold:

- Entry may persist messages and claim ownership, but it should not execute workflow logic
- Orchestrator may control progression, but should not contain tool implementation logic
- Agent executor may reason, but should not persist state directly
- Tool registry may execute, but should not define workflow policy
- Workflow state manager may accept or reject transitions, but should not generate reasoning
- Verification may judge validity, but should not silently mutate state
- Persistence should store data, not reinterpret it
- Observability should record actions, not control them

## Final Recommendation

These contracts should be treated as the implementation boundary reference for the first harness iteration.

The next design step after these contracts is:
- define the explicit v1 workflow state machine
- define legal transitions and their runtime guards

That state machine will be the central logic layer that connects all the contracts above.
