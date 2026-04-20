/**
 * Canonical harness event type registry.
 *
 * Source: `.references/agent-harness/research/2026-04-15-makalahapp-harness-v1-event-model-and-data-contracts.md`
 * lines 73-121 (six categories, 29 event types total).
 *
 * These names are the authoritative string identifiers for the Convex
 * `harnessEvents.eventType` field. Adapter-layer validation ensures only
 * these values reach the database; the Convex mutation itself accepts
 * arbitrary strings so future event types can be added without a schema
 * migration.
 */
export const HARNESS_EVENT_TYPES = {
  // Entry events (3)
  USER_MESSAGE_RECEIVED: "user_message_received",
  USER_TOOL_RESULT_RECEIVED: "user_tool_result_received",
  USER_DECISION_RECEIVED: "user_decision_received",

  // Run lifecycle events (6)
  RUN_STARTED: "run_started",
  RUN_RESUMED: "run_resumed",
  RUN_PAUSED: "run_paused",
  RUN_COMPLETED: "run_completed",
  RUN_FAILED: "run_failed",
  RUN_ABORTED: "run_aborted",

  // Step execution events (4)
  STEP_STARTED: "step_started",
  INSTRUCTION_STACK_RESOLVED: "instruction_stack_resolved",
  AGENT_OUTPUT_RECEIVED: "agent_output_received",
  STEP_COMPLETED: "step_completed",

  // Tool and mutation events (8)
  TOOL_CALLED: "tool_called",
  APPROVAL_REQUESTED: "approval_requested",
  APPROVAL_RESOLVED: "approval_resolved",
  EXECUTION_BOUNDARY_EVALUATED: "execution_boundary_evaluated",
  TOOL_RESULT_RECEIVED: "tool_result_received",
  ARTIFACT_MUTATION_REQUESTED: "artifact_mutation_requested",
  ARTIFACT_MUTATION_APPLIED: "artifact_mutation_applied",
  ARTIFACT_MUTATION_REJECTED: "artifact_mutation_rejected",

  // Workflow and verification events (5)
  WORKFLOW_TRANSITION_REQUESTED: "workflow_transition_requested",
  WORKFLOW_TRANSITION_APPLIED: "workflow_transition_applied",
  WORKFLOW_TRANSITION_REJECTED: "workflow_transition_rejected",
  VERIFICATION_STARTED: "verification_started",
  VERIFICATION_COMPLETED: "verification_completed",

  // User decision events (3)
  USER_DECISION_REQUESTED: "user_decision_requested",
  USER_DECISION_RESOLVED: "user_decision_resolved",
  USER_DECISION_DECLINED: "user_decision_declined",
} as const

export type HarnessEventType =
  (typeof HARNESS_EVENT_TYPES)[keyof typeof HARNESS_EVENT_TYPES]

const CANONICAL_SET: ReadonlySet<string> = new Set(
  Object.values(HARNESS_EVENT_TYPES),
)

/**
 * Adapter-layer validator. Use before calling the Convex `emitEvent` mutation.
 * Returns true if `candidate` is one of the 29 canonical event type strings.
 */
export function isHarnessEventType(candidate: string): candidate is HarnessEventType {
  return CANONICAL_SET.has(candidate)
}
