# Makalahapp Harness V1 Event Model and Data Contracts

## Purpose

This document defines the shared event model and data contracts for the makalahapp harness v1.

It follows and depends on:
- `2026-04-15-makalahapp-harness-v1-component-contracts.md`
- `2026-04-15-makalahapp-harness-v1-state-machine.md`

This document exists to ensure that:
- components communicate with a shared vocabulary
- state changes are explicit and traceable
- persistence and observability do not depend on parsing free text
- implementation can follow stable interfaces instead of informal assumptions

## Position in the Reference Stack

The design order should now be read as:

1. harness research and baseline
2. v1/v2 priority matrix
3. v1 architecture blueprint
4. v1 component contracts
5. v1 state machine
6. v1 event model and data contracts

This document is the bridge between architecture and implementation.

## Audit Status

This document was audited against:
- the already-audited `v1 state machine`
- the already-audited `v1 component contracts`
- `Codex` references for instruction layering, approvals, sandbox posture, and runtime-visible policy
- `Claude Code` references for permissions, hooks, and execution-boundary controls

Audit result:
- The document remains directionally correct.
- Two material corrections were required:
  - event payloads must not treat `completed` as a workflow domain stage
  - the durable `WorkflowStage` type must not include `paused_for_user`, `failed`, or `completed`
- One additional contract correction was required:
  - `agent_output_received` must be able to carry parse-failure information because the executor contract already exposes that signal
- Additional correction from the new references:
  - the canonical event list must cover instruction-stack resolution, approval requests/resolution, and execution-boundary evaluation
  - the durable contract set must include a minimal `PolicyState` because runtime approval and execution posture are now explicit v1 concerns
- The corrected model keeps workflow domain progression separate from run/workflow status.

## Design Principles

The event model and data contracts must follow these rules:

1. Events should describe facts that happened, not vague narratives.
2. Event names must be stable and machine-friendly.
3. Payloads must be structured and versionable.
4. Data contracts should separate durable state from transient execution details.
5. Free-text fields may exist, but they must not be the only source of control logic.
6. Workflow transitions and artifact mutations must be explainable from structured data alone.
7. Instruction precedence and runtime policy decisions must also be explainable from structured data alone.

## Event Categories

The v1 harness should use six event categories:

1. entry events
2. run lifecycle events
3. step execution events
4. tool and mutation events
5. workflow and verification events
6. user decision events

## Canonical Event List

### Entry Events

- `user_message_received`
- `user_tool_result_received`
- `user_decision_received`

### Run Lifecycle Events

- `run_started`
- `run_resumed`
- `run_paused`
- `run_completed`
- `run_failed`
- `run_aborted`

### Step Execution Events

- `step_started`
- `instruction_stack_resolved`
- `agent_output_received`
- `step_completed`

### Tool and Mutation Events

- `tool_called`
- `approval_requested`
- `approval_resolved`
- `execution_boundary_evaluated`
- `tool_result_received`
- `artifact_mutation_requested`
- `artifact_mutation_applied`
- `artifact_mutation_rejected`

### Workflow and Verification Events

- `workflow_transition_requested`
- `workflow_transition_applied`
- `workflow_transition_rejected`
- `verification_started`
- `verification_completed`

### User Decision Events

- `user_decision_requested`
- `user_decision_resolved`
- `user_decision_declined`

## Event Envelope

Every event should be wrapped in a common envelope.

Recommended event envelope:

```ts
type HarnessEventEnvelope = {
  eventId: string;
  eventType: string;
  schemaVersion: number;
  occurredAt: string;
  userId: string;
  sessionId: string;
  chatId: string;
  runId?: string;
  stepId?: string;
  correlationId?: string;
  causationEventId?: string;
  payload: Record<string, unknown>;
};
```

### Envelope Field Notes

- `eventId`: unique event identifier
- `eventType`: canonical event name from this document
- `schemaVersion`: allows future payload evolution
- `occurredAt`: ISO timestamp
- `correlationId`: groups related events across one user action or step
- `causationEventId`: points to the event that directly caused this event

## Event Payload Contracts

Below are the recommended minimum payloads.

### 1. `user_message_received`

Purpose:
- record the arrival of a user message before execution begins

Payload:

```ts
type UserMessageReceivedPayload = {
  messageId: string;
  messageRole: "user";
  messageText: string;
  messageParts?: unknown[];
  requestSource?: "chat" | "resume" | "retry" | "other";
};
```

### 2. `user_tool_result_received`

Purpose:
- record a client-provided tool result, such as approval response or user answer

Payload:

```ts
type UserToolResultReceivedPayload = {
  messageId: string;
  toolName: string;
  toolCallId: string;
  resultType: "tool_result";
  result: Record<string, unknown>;
};
```

### 3. `user_decision_received`

Purpose:
- record the user answer tied to an active pending decision

Payload:

```ts
type UserDecisionReceivedPayload = {
  decisionId: string;
  decisionType: "clarification" | "approval" | "selection";
  responseType: "answered" | "declined";
  response: Record<string, unknown>;
};
```

### 4. `run_started`

Purpose:
- record a newly created run after ownership is claimed

Payload:

```ts
type RunStartedPayload = {
  runId: string;
  ownerToken: string;
  startReason: "new_user_message" | "manual_retry" | "reopen_after_completion";
  initialWorkflowStage: string;
};
```

### 5. `run_resumed`

Purpose:
- record that an existing run was resumed instead of recreated

Payload:

```ts
type RunResumedPayload = {
  runId: string;
  ownerToken: string;
  previousRunStatus: "running" | "paused";
  resumeReason: "client_reconnect" | "user_followup" | "tool_result" | "user_decision";
};
```

### 6. `run_paused`

Purpose:
- record that execution paused for a legal reason

Payload:

```ts
type RunPausedPayload = {
  runId: string;
  pauseReason:
    | "awaiting_user_decision"
    | "awaiting_tool_result"
    | "manual_pause"
    | "safety_block";
  workflowStage: string;
  pendingDecisionId?: string;
};
```

### 7. `run_completed`

Purpose:
- record successful run completion

Payload:

```ts
type RunCompletedPayload = {
  runId: string;
  finalWorkflowStage: "ready_for_user";
  finalArtifactId?: string;
  finalArtifactVersion?: number;
  verificationStatus: "pass";
};
```

### 8. `run_failed`

Purpose:
- record failure that prevents legal continuation

Payload:

```ts
type RunFailedPayload = {
  runId: string;
  failureClass:
    | "entry_failure"
    | "state_failure"
    | "tool_failure"
    | "verification_failure"
    | "guard_failure"
    | "unexpected_failure";
  failureReason: string;
  workflowStage: string;
  recoverable: boolean;
};
```

### 9. `run_aborted`

Purpose:
- record explicit stop/cancel behavior

Payload:

```ts
type RunAbortedPayload = {
  runId: string;
  abortReason: "user_cancelled" | "system_cancelled" | "ownership_lost";
  workflowStage: string;
};
```

### 10. `step_started`

Purpose:
- mark the beginning of a step inside a run

Payload:

```ts
type StepStartedPayload = {
  stepId: string;
  stepNumber: number;
  workflowStage: string;
  trigger:
    | "run_start"
    | "continue"
    | "tool_result"
    | "user_decision"
    | "repair_after_verification";
};
```

### 11. `instruction_stack_resolved`

Purpose:
- record the resolved instruction layers used for the step before model execution

Payload:

```ts
type InstructionStackResolvedPayload = {
  stepId: string;
  workflowStage: string;
  layers: Array<{
    layer:
      | "system"
      | "project"
      | "workflow"
      | "turn_context"
      | "tooling";
    sourceId?: string;
    applied: boolean;
  }>;
};
```

### 12. `agent_output_received`

Purpose:
- record the structured output of the one-step executor

Payload:

```ts
type AgentOutputReceivedPayload = {
  stepId: string;
  outputKind: "text" | "tool_calls" | "mixed";
  toolCallCount: number;
  needsUserInput: boolean;
  completionSignal: boolean;
  parseFailureSignal?: {
    kind: "malformed_output" | "incomplete_output";
    reason?: string;
  };
  stateIntent?: {
    proposedNextStage?: string;
    wantsArtifactMutation?: boolean;
    wantsVerification?: boolean;
  };
};
```

### 13. `step_completed`

Purpose:
- mark the end of a step regardless of whether the run continues

Payload:

```ts
type StepCompletedPayload = {
  stepId: string;
  stepNumber: number;
  workflowStage: string;
  outcome:
    | "continued"
    | "paused"
    | "ready_for_user"
    | "failed"
    | "aborted";
  durationMs?: number;
};
```

### 14. `tool_called`

Purpose:
- record a tool execution request

Payload:

```ts
type ToolCalledPayload = {
  stepId: string;
  toolCallId: string;
  toolName: string;
  toolKind: "read" | "mutation" | "retrieval" | "user_input" | "other";
  input: Record<string, unknown>;
};
```

### 15. `approval_requested`

Purpose:
- record that a runtime policy evaluation emitted an approval requirement

Payload:

```ts
type ApprovalRequestedPayload = {
  stepId: string;
  decisionId: string;
  workflowStage: string;
  targetKind: "tool_call" | "artifact_mutation" | "workflow_transition";
  targetId: string;
  reasonClass:
    | "high_impact_mutation"
    | "unsafe_transition"
    | "policy_override_required"
    | "other";
};
```

### 16. `approval_resolved`

Purpose:
- record the resolution of an approval requirement

Payload:

```ts
type ApprovalResolvedPayload = {
  stepId: string;
  decisionId: string;
  resolution: "approved" | "declined" | "invalidated";
  resolvedBy: "user" | "system";
};
```

### 17. `execution_boundary_evaluated`

Purpose:
- record the runtime execution posture applied to a mutation-capable action

Payload:

```ts
type ExecutionBoundaryEvaluatedPayload = {
  stepId: string;
  targetKind: "tool_call" | "artifact_mutation";
  targetId: string;
  boundaryKind: "read_only" | "bounded_mutation" | "blocked";
  policyReason: string;
};
```

### 18. `tool_result_received`

Purpose:
- record the structured tool result

Payload:

```ts
type ToolResultReceivedPayload = {
  stepId: string;
  toolCallId: string;
  toolName: string;
  success: boolean;
  result: Record<string, unknown>;
  error?: {
    code?: string;
    message: string;
  };
};
```

### 19. `artifact_mutation_requested`

Purpose:
- record intent to change artifact state or content

Payload:

```ts
type ArtifactMutationRequestedPayload = {
  stepId: string;
  artifactId: string;
  currentVersion: number;
  mutationType:
    | "create"
    | "append"
    | "replace_section"
    | "rewrite"
    | "metadata_update";
  mutationScope: string;
};
```

### 20. `artifact_mutation_applied`

Purpose:
- record successful artifact mutation

Payload:

```ts
type ArtifactMutationAppliedPayload = {
  stepId: string;
  artifactId: string;
  previousVersion: number;
  nextVersion: number;
  mutationType:
    | "create"
    | "append"
    | "replace_section"
    | "rewrite"
    | "metadata_update";
  summary: string;
};
```

### 21. `artifact_mutation_rejected`

Purpose:
- record failed or blocked artifact mutation

Payload:

```ts
type ArtifactMutationRejectedPayload = {
  stepId: string;
  artifactId: string;
  currentVersion: number;
  rejectionClass:
    | "guard_blocked"
    | "version_conflict"
    | "invalid_scope"
    | "unexpected_error";
  reason: string;
};
```

### 22. `workflow_transition_requested`

Purpose:
- record proposed workflow movement before guard evaluation

Payload:

```ts
type WorkflowTransitionRequestedPayload = {
  stepId: string;
  fromStage: string;
  toStage: string;
  reasonClass:
    | "planning_result"
    | "clarification_needed"
    | "verification_result"
    | "user_decision"
    | "failure_path";
  reason: string;
};
```

### 23. `workflow_transition_applied`

Purpose:
- record accepted stage transition

Payload:

```ts
type WorkflowTransitionAppliedPayload = {
  stepId: string;
  fromStage: string;
  toStage: string;
  appliedBy: "orchestrator";
};
```

### 24. `workflow_transition_rejected`

Purpose:
- record rejected stage transition

Payload:

```ts
type WorkflowTransitionRejectedPayload = {
  stepId: string;
  fromStage: string;
  toStage: string;
  rejectionClass:
    | "illegal_transition"
    | "guard_failed"
    | "pending_decision_block"
    | "verification_missing";
  reason: string;
};
```

### 25. `verification_started`

Purpose:
- record verification entry

Payload:

```ts
type VerificationStartedPayload = {
  stepId: string;
  artifactId?: string;
  artifactVersion?: number;
  verificationTarget: "workflow" | "artifact" | "completion" | "combined";
};
```

### 26. `verification_completed`

Purpose:
- record verification result

Payload:

```ts
type VerificationCompletedPayload = {
  stepId: string;
  artifactId?: string;
  artifactVersion?: number;
  verificationStatus: "pass" | "fail";
  verificationOutcome:
    | "pass"
    | "fail_repairable"
    | "fail_missing_content"
    | "fail_user_blocked"
    | "fail_irrecoverable";
  findings: Array<{
    code: string;
    severity: "info" | "warn" | "error";
    message: string;
  }>;
  completionEligible: boolean;
};
```

### 27. `user_decision_requested`

Purpose:
- record creation of a blocking user decision

Payload:

```ts
type UserDecisionRequestedPayload = {
  decisionId: string;
  decisionType: "clarification" | "approval" | "selection";
  workflowStage: string;
  blocking: true;
  prompt: {
    title?: string;
    question: string;
    options?: Array<{
      label: string;
      description?: string;
      recommended?: boolean;
    }>;
    allowsFreeform?: boolean;
  };
};
```

### 28. `user_decision_resolved`

Purpose:
- record accepted user answer for a pending decision

Payload:

```ts
type UserDecisionResolvedPayload = {
  decisionId: string;
  decisionType: "clarification" | "approval" | "selection";
  response: Record<string, unknown>;
  resolution: "answered" | "approved" | "selected";
};
```

### 29. `user_decision_declined`

Purpose:
- record that the user declined to answer or approve

Payload:

```ts
type UserDecisionDeclinedPayload = {
  decisionId: string;
  decisionType: "clarification" | "approval" | "selection";
  resolution: "declined";
  reason?: string;
};
```

## Durable State Contracts

The harness should distinguish durable state objects from event payloads.

## 1. Workflow State Contract

```ts
type WorkflowStage =
  | "intake"
  | "clarification"
  | "planning"
  | "drafting"
  | "revision"
  | "verification"
  | "ready_for_user";

type WorkflowStatus =
  | "running"
  | "paused"
  | "failed"
  | "completed"
  | "aborted";

type WorkflowState = {
  workflowId: string;
  stage: WorkflowStage;
  status: WorkflowStatus;
  currentArtifactId?: string;
  pendingDecisionId?: string;
  lastVerificationStatus?: "pass" | "fail";
  lastVerificationOutcome?:
    | "pass"
    | "fail_repairable"
    | "fail_missing_content"
    | "fail_user_blocked"
    | "fail_irrecoverable";
  lastTransitionReason?: string;
  lastTransitionAt: string;
  iterationCount: number;
  reopenCount?: number;
};
```

### Notes

- `stage` and `status` must remain separate
- `stage` is for workflow domain progression only and must not absorb pause or terminal run states
- `pendingDecisionId` is the authoritative block marker for user pause logic
- `lastVerificationOutcome` is more useful than a simple boolean because it maps directly to repair paths

## 2. Artifact State Contract

```ts
type ArtifactState = {
  artifactId: string;
  artifactType: string;
  version: number;
  summary: string;
  contentRef: {
    storageKind: "db" | "blob" | "other";
    ref: string;
  };
  checks: Array<{
    code: string;
    status: "pass" | "fail" | "warn";
    message: string;
    checkedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  updatedBy: "agent" | "user" | "system";
};
```

### Notes

- `contentRef` avoids forcing the whole artifact into every state snapshot
- `checks` lets verification findings become durable artifact annotations

## 3. Run State Contract

```ts
type RunState = {
  runId: string;
  chatId: string;
  sessionId: string;
  ownerToken: string;
  status: "running" | "paused" | "completed" | "failed" | "aborted";
  stepNumber: number;
  currentStepId?: string;
  startedAt: string;
  updatedAt: string;
  pausedAt?: string;
  finishedAt?: string;
  failureClass?:
    | "entry_failure"
    | "state_failure"
    | "tool_failure"
    | "verification_failure"
    | "guard_failure"
    | "unexpected_failure";
  failureReason?: string;
};
```

### Notes

- `ownerToken` is the atomic ownership anchor for resume and duplication control
- `currentStepId` gives observability and persistence a stable reference point

## 4. Decision State Contract

```ts
type DecisionState = {
  decisionId: string;
  runId: string;
  type: "clarification" | "approval" | "selection";
  status: "pending" | "resolved" | "declined" | "invalidated";
  blocking: boolean;
  workflowStage: string;
  prompt: {
    title?: string;
    question: string;
    options?: Array<{
      label: string;
      description?: string;
      recommended?: boolean;
    }>;
    allowsFreeform?: boolean;
  };
  response?: Record<string, unknown>;
  requestedAt: string;
  resolvedAt?: string;
};
```

### Notes

- `blocking` is explicit so non-blocking decision patterns can exist later without changing the core shape

## 5. Policy State Contract

```ts
type PolicyState = {
  runId: string;
  approvalMode: "default" | "required_for_high_impact";
  currentBoundary: "read_only" | "bounded_mutation" | "blocked";
  pendingApprovalDecisionId?: string;
  lastPolicyReason?: string;
  updatedAt: string;
};
```

### Notes

- v1 policy state should stay minimal and runtime-oriented
- this object exists so pause/fail behavior caused by policy is not hidden inside prompts or tool-local conditionals

## 6. Verification State Contract

```ts
type VerificationState = {
  verificationId: string;
  runId: string;
  stepId: string;
  target: "workflow" | "artifact" | "completion" | "combined";
  status: "pass" | "fail";
  outcome:
    | "pass"
    | "fail_repairable"
    | "fail_missing_content"
    | "fail_user_blocked"
    | "fail_irrecoverable";
  findings: Array<{
    code: string;
    severity: "info" | "warn" | "error";
    message: string;
  }>;
  completionEligible: boolean;
  createdAt: string;
};
```

### Notes

- verification records should be append-only evidence, not only a mutable latest summary

## 7. Message Record Contract

```ts
type MessageRecord = {
  messageId: string;
  chatId: string;
  role: "user" | "assistant";
  parts: unknown;
  createdAt: string;
  source:
    | "user_input"
    | "assistant_output"
    | "tool_result_persist"
    | "system_recovery";
};
```

### Notes

- `parts` can remain polymorphic as long as the harness does not use it as the only control signal

## Suggested Persistence Collections or Tables

The exact database model can vary, but v1 should be able to represent:

- `workflow_states`
- `artifact_states`
- `run_states`
- `decision_states`
- `policy_states`
- `verification_records`
- `messages`
- `harness_events`

Optional but useful later:
- `artifact_versions`
- `run_step_snapshots`
- `tool_result_snapshots`

## Contract Relationships

The following relationships should hold:

- one `session` may have many `chats`
- one `chat` may have many `runs`
- one active `run` owns one execution lane at a time
- one `run` may emit many `steps`
- one `workflowState` belongs to the active logical workflow for the chat/session
- one `workflowState` may reference one current active `artifactState`
- one `run` may have zero or one active blocking `decisionState`
- one `run` may have one current `policyState`
- one `run` may produce many `verificationState` records
- one `run` may emit many `harness_events`

## Contract Invariants

The implementation should preserve these invariants:

1. There must not be more than one active run owner for the same execution lane.
2. There must not be more than one active blocking decision for the same execution lane.
3. `runState.status = paused` implies either `workflowState.pendingDecisionId` is present or `policyState.pendingApprovalDecisionId` is present.
4. `workflowState.stage = ready_for_user` does not itself imply completion until `runState.status = completed`.
5. `runState.status = completed` implies the terminal workflow stage was `ready_for_user`.
6. `ready_for_user` and `completed` must only be reachable after verification with `completionEligible = true`.
7. Artifact mutation must not be applied outside the stages allowed by the state machine.
8. Event payloads must be sufficient to reconstruct transitions without depending on free-text reasoning.
9. Mutation-capable actions must have a recorded execution-boundary evaluation before they run.
10. Required approval flows must be reconstructable from structured events and durable decision/policy state.

## Contract Evolution Rules

Because this harness will likely evolve, data contracts should follow these rules:

- add `schemaVersion` to the event envelope from the beginning
- allow additive payload evolution
- avoid renaming canonical fields once used in persistence
- prefer new optional fields over destructive schema mutation where possible

## Final Recommendation

The event model and data contracts should be treated as the structured communication layer for the v1 harness.

They should now be considered stable enough to support the next design step:
- mapping the reference documents into actual repository-specific implementation candidates
- or defining concrete tables/types/functions against this contract set

Without changing code yet, this is the last reference layer needed before implementation planning becomes concrete.
