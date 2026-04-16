/**
 * Run Lane Resolution (Task 6.4a)
 *
 * Creates a durable `harnessRuns` row for this chat request, mints an owner
 * token, derives the initial workflow stage/status from the paper session
 * (if any), and emits the `run_started` event. The returned `RunLane`
 * carries the new persistence identifiers for all downstream phases
 * (executor, policy, verification).
 *
 * Workflow status mapping (paperSession.stageStatus → WorkflowStatus):
 *   drafting            → running
 *   pending_validation  → running
 *   approved            → completed   (stage-level acceptance)
 *   revision            → running
 *   completed           → completed
 *   (unknown / absent)  → running
 */
import type { Id } from "../../../../convex/_generated/dataModel"
import { api } from "../../../../convex/_generated/api"
import type { ConvexFetchQuery, RunLane } from "../types"
import type {
    EventStore,
    RunStore,
    WorkflowStatus,
} from "../persistence"
import { HARNESS_EVENT_TYPES } from "../persistence"

function mintSessionId(): string {
    const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID()
    return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function mapStageStatusToWorkflowStatus(stageStatus: string | undefined): WorkflowStatus {
    switch (stageStatus) {
        case "drafting":
        case "pending_validation":
        case "revision":
            return "running"
        case "approved":
        case "completed":
            return "completed"
        default:
            return "running"
    }
}

export async function resolveRunLane(params: {
    requestId: string
    conversationId: Id<"conversations">
    userId: Id<"users">
    isNewConversation: boolean
    runStore: RunStore
    eventStore: EventStore
    fetchQuery: ConvexFetchQuery
}): Promise<RunLane> {
    const {
        requestId,
        conversationId,
        userId,
        isNewConversation,
        runStore,
        eventStore,
        fetchQuery,
    } = params

    const sessionId = mintSessionId()

    // Derive workflow stage/status from paper session (if one exists).
    const paperSession = (await fetchQuery(api.paperSessions.getByConversation, {
        conversationId,
    })) as
        | {
              _id: Id<"paperSessions">
              currentStage: string
              stageStatus?: string
          }
        | null

    const workflowStage = paperSession?.currentStage ?? "intake"
    const workflowStatus = paperSession
        ? mapStageStatusToWorkflowStatus(paperSession.stageStatus)
        : "running"
    const paperSessionId = paperSession?._id

    const { runId, ownerToken } = await runStore.createRun({
        conversationId,
        userId,
        ...(paperSessionId !== undefined ? { paperSessionId } : {}),
        workflowStage,
        workflowStatus,
    })

    await eventStore.emit({
        eventType: HARNESS_EVENT_TYPES.RUN_STARTED,
        userId,
        sessionId,
        chatId: conversationId,
        runId,
        correlationId: requestId,
        payload: {
            runId,
            ownerToken,
            startReason: "new_user_message",
            initialWorkflowStage: workflowStage,
        },
    })

    return {
        requestId,
        conversationId,
        mode: isNewConversation ? "start" : "resume_candidate",
        runId,
        ownerToken,
        sessionId,
    }
}
