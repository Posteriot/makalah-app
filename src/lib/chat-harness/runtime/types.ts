/**
 * Runtime orchestration type contracts (Phase 7).
 *
 * These types define the boundary between the HTTP adapter
 * (`run-chat-harness.ts`) and the synchronous execution engine
 * (`orchestrate-sync-run.ts`). The adapter maps `SyncRunResult` to a
 * `Response`; the orchestrator produces `SyncRunResult` via the 13-step
 * sequence (see tasks.md Phase 7.1b).
 */
import type { Id } from "../../../../convex/_generated/dataModel"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import type { PaperToolTracker } from "@/lib/ai/paper-tools"
import type {
  PaperSessionForExecutor,
  PaperTurnObservability,
} from "../executor/types"
import type { AcceptedChatRequest } from "../types/runtime"
import type { EventStore, RunStore } from "../persistence"

// ===================================================================
// Orchestrator result (discriminated union)
// ===================================================================

/**
 * Possible outcomes of a synchronous harness run.
 *
 * - `stream`: normal completion, HTTP response ready to return.
 * - `paused`: policy required approval. Phase 7 returns early here with
 *   a pendingDecisionId placeholder. Phase 8 extends this path with
 *   durable pause state (runStore.updateStatus("paused", ...)).
 *
 * Fatal errors are NOT encoded in this union — they propagate as
 * thrown exceptions and are caught by the outer HTTP boundary.
 */
export type SyncRunResult =
  | { kind: "stream"; response: Response }
  | {
      kind: "paused"
      runId: Id<"harnessRuns">
      pendingDecisionId: string | null
    }

// ===================================================================
// Orchestrator input context
// ===================================================================

/**
 * Input to `orchestrateSyncRun`. The HTTP adapter constructs all three
 * fields after `acceptChatRequest` resolves.
 *
 * `lane` (RunLane with runId/ownerToken/sessionId) is NOT an input —
 * it is created by step 1 of the orchestrator (`resolveRunLane`).
 */
export interface SyncRunContext {
  accepted: AcceptedChatRequest
  runStore: RunStore
  eventStore: EventStore
}

// ===================================================================
// Step 4 output — paper-mode context resolution
// ===================================================================

/**
 * Aggregated output of step 4 (paper context resolution). Replaces the
 * 99 lines of inline paper-mode setup that previously lived in route.ts.
 *
 * All downstream consumers receive this as an explicit parameter (Q4
 * decision: no closure capture). Mutable members (`paperToolTracker`,
 * `paperTurnObservability`) are expected to be shared by reference with
 * the executor — same instance threaded through.
 */
export interface PaperContextResolution {
  /** Paper session row, or null when not in paper mode. */
  paperSession: PaperSessionForExecutor | null
  /** System prompt for paper mode; null when not applicable. */
  paperModePrompt: string | null
  /** Stage scope for downstream routing (undefined when no scoped stage). */
  paperStageScope: PaperStageId | undefined
  /** True when current stage status === "drafting". */
  isDraftingStage: boolean
  /**
   * Post-edit-resend-reset condition: drafting status but stageData is
   * empty (only revisionCount). Signals the user re-sent after an edit
   * that cleared downstream state.
   */
  isPostEditResendReset: boolean
  /** True when a choice-interaction event targets the `hasil` stage. */
  isHasilPostChoice: boolean
  /** Paper tool call tracker — MUTABLE, shared with executor. */
  paperToolTracker: PaperToolTracker
  /** Per-turn observability mutable state — shared with executor. */
  paperTurnObservability: PaperTurnObservability
  /** Free-text turn context note (set only for non-choice messages in drafting). */
  freeTextContextNote: string | undefined
  /** Skill resolver fallback flag from paperModeContext (telemetry downstream). */
  skillResolverFallback: boolean
  /** Stage instruction source label for observability logging. */
  stageInstructionSource: string | undefined
  /** Skill identifier resolved for the current stage (telemetry). */
  activeSkillId: string | undefined
  /** Version of the resolved skill (telemetry). */
  activeSkillVersion: number | undefined
  /** Reason the skill resolver fell back to a default, if any (telemetry). */
  fallbackReason: string | undefined
}
