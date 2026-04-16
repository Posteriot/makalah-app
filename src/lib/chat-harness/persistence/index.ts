/**
 * Harness persistence adapters.
 *
 * Thin wrappers around Convex mutations for the Phase 6 tables:
 *   - harnessRuns, harnessRunSteps, harnessEvents
 *
 * Call sites should import from this barrel rather than reaching into
 * submodules directly.
 */
export { createRunStore } from "./run-store"
export type { RunStoreDeps } from "./run-store"

export { createEventStore } from "./event-store"
export type { EventStoreDeps } from "./event-store"

export { HARNESS_EVENT_TYPES, isHarnessEventType } from "./event-types"
export type { HarnessEventType } from "./event-types"

export type {
  // Enums
  RunStatus,
  WorkflowStatus,
  StepStatus,
  FailureClass,
  ApprovalMode,
  PolicyBoundary,
  DecisionType,
  DecisionResolution,
  // Sub-object shapes
  PolicyStateSnapshot,
  ExecutorResultSummary,
  StepVerificationSummary,
  ToolCallRecord,
  DecisionPrompt,
  DecisionPromptOption,
  // Envelope
  HarnessEventEnvelope,
  // Store interfaces
  RunStore,
  EventStore,
  CreateRunParams,
  UpdateRunStatusOptions,
  CompleteStepParams,
  PauseRunParams,
  ResumeRunParams,
} from "./types"
