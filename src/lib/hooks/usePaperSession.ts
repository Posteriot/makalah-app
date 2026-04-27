import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useCallback, useEffect, useRef } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { PaperStageId, STAGE_ORDER, getStageLabel, getStageNumber } from "../../../convex/paperSessions/constants";

// ============================================================================
// TYPES
// ============================================================================

interface StageDataEntry {
    validatedAt?: number;
    [key: string]: unknown;
}

interface Message {
    createdAt: number;
    role?: string;
    [key: string]: unknown;
}

// ============================================================================
// HELPER FUNCTIONS (exported for use in other modules)
// ============================================================================

/**
 * Check if a message belongs to the current stage based on validatedAt timestamps.
 * A message is in current stage if it was created AFTER the previous stage was validated.
 *
 * Algorithm:
 * - Find the stage just before currentStage
 * - Get that stage's validatedAt timestamp
 * - Message is in current stage if createdAt > that timestamp
 */
export function isMessageInCurrentStage(
    messageCreatedAt: number,
    stageData: Record<string, StageDataEntry> | undefined,
    currentStage: PaperStageId | "completed"
): boolean {
    if (!stageData || currentStage === "completed") return true;

    const currentStageIndex = STAGE_ORDER.indexOf(currentStage as PaperStageId);
    if (currentStageIndex <= 0) {
        // First stage (gagasan) - all messages are in current stage
        return true;
    }

    // Get the previous stage's validatedAt
    const previousStage = STAGE_ORDER[currentStageIndex - 1];
    const previousStageData = stageData[previousStage];
    const previousValidatedAt = previousStageData?.validatedAt;

    if (!previousValidatedAt) {
        // Previous stage not validated yet - all messages in current stage
        return true;
    }

    // Message is in current stage if created after previous stage was validated
    return messageCreatedAt > previousValidatedAt;
}

/**
 * Calculate the index of the first message in the current stage.
 * Returns 0 if no messages or all messages are in current stage.
 */
export function calculateCurrentStageStartIndex(
    messages: Message[],
    stageData: Record<string, StageDataEntry> | undefined,
    currentStage: PaperStageId | "completed"
): number {
    if (!messages || messages.length === 0) return 0;
    if (!stageData || currentStage === "completed") return 0;

    const currentStageIndex = STAGE_ORDER.indexOf(currentStage as PaperStageId);
    if (currentStageIndex <= 0) return 0;

    // Get the previous stage's validatedAt
    const previousStage = STAGE_ORDER[currentStageIndex - 1];
    const previousStageData = stageData[previousStage];
    const previousValidatedAt = previousStageData?.validatedAt;

    if (!previousValidatedAt) return 0;

    // Find first message created after previous stage was validated
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].createdAt > previousValidatedAt) {
            return i;
        }
    }

    // All messages are before current stage started
    return messages.length;
}

export const usePaperSession = (conversationId?: Id<"conversations">, userId?: Id<"users">) => {
    const { isAuthenticated } = useConvexAuth();

    const session = useQuery(
        api.paperSessions.getByConversation,
        conversationId && isAuthenticated ? { conversationId } : "skip"
    );

    const approveStageMutation = useMutation(api.paperSessions.approveStage);
    const requestRevisionMutation = useMutation(api.paperSessions.requestRevision);
    const updateStageDataMutation = useMutation(api.paperSessions.updateStageData);
    const updateWorkingTitleMutation = useMutation(api.paperSessions.updateWorkingTitle);
    const markStageAsDirtyMutation = useMutation(api.paperSessions.markStageAsDirty);
    const rewindToStageMutation = useMutation(api.paperSessions.rewindToStage);
    const createMessageMutation = useMutation(api.messages.createMessage);
    const ensurePaperSessionMutation = useMutation(api.paperSessions.ensurePaperSessionExists);

    // Phase 8 — harness pause/resume mutations.
    // These run ADDITIVELY (not as a replacement) before approveStage/requestRevision
    // when a paused harness run exists for the current conversation. The paper-domain
    // mutations remain authoritative for stage progression; the harness layer only
    // needs to learn that the decision was resolved so the paused run can continue.
    const resolveDecisionMutation = useMutation(api.harnessDecisions.resolveDecision);
    const resumeRunMutation = useMutation(api.harnessRuns.resumeRun);

    // Subscribe to the latest paused harness run bound to this conversation.
    // Returns null when no paused run exists (common case) or when auth/ownership
    // fails. UI consumers (ChatWindow) read `_id` for the `x-harness-resume` header.
    const pausedHarnessRun = useQuery(
        api.harnessRuns.getRunByConversation,
        conversationId && isAuthenticated
            ? { conversationId, statusFilter: "paused" as const }
            : "skip"
    );

    // 3-state model:
    // - "loading": Convex query hasn't resolved yet (session === undefined)
    // - "ready": session exists and is loaded
    // - "absent": query resolved but no session found (legacy conversation pre-migration)
    const sessionState: "loading" | "ready" | "absent" =
        session === undefined ? "loading" :
        session === null ? "absent" :
        "ready";
    // isPaperMode: true only when session actually exists and is loaded
    const isPaperMode = sessionState === "ready";

    // Lazy migration: auto-create paper session for legacy conversations on UI read path.
    // When session is "absent" and we have both conversationId and userId,
    // call ensurePaperSessionExists. Convex reactivity will auto-update the query.
    // TODO(2026-05-15): Remove after all active conversations have been migrated.
    const migrationAttempted = useRef(false);
    useEffect(() => {
        if (sessionState === "absent" && conversationId && userId && !migrationAttempted.current) {
            migrationAttempted.current = true;
            console.info(`[PAPER][lazy-migration-ui] Creating paper session for legacy conversation ${conversationId}`);
            ensurePaperSessionMutation({ userId, conversationId }).catch((err) => {
                console.error(`[PAPER][lazy-migration-ui] Failed:`, err);
            });
        }
    }, [sessionState, conversationId, userId, ensurePaperSessionMutation]);

    const approveStage = async (userId: Id<"users">) => {
        if (!session) return;
        return await approveStageMutation({
            sessionId: session._id,
            userId,
        });
    };

    /**
     * Phase 8 — resolve the pending decision + resume the paused harness run.
     *
     * Call this BEFORE approveStage / requestRevision when a paused run exists.
     * ADDITION pattern (Q4 decision): the paper-domain mutation still runs after
     * this helper returns — resume only tells the harness layer "the decision
     * was answered", it does not replace the paper workflow transition.
     *
     * Returns `null` when there is no paused run or no pending decision, so
     * callers can invoke it unconditionally (cheap no-op in the common path).
     *
     * `resolution` mirrors the harnessDecisions.resolveDecision contract:
     *   - "resolved"  → user answered (approve or revise → both map here;
     *                   the answer is carried in `response.decision`).
     *   - "declined"  → user actively cancelled / dismissed the decision
     *                   (not used by the approve/revise flow in this task).
     */
    const resolveAndResume = async (
        resolution: "resolved" | "declined",
        response?: Record<string, unknown>,
    ): Promise<{ resumedRunId: Id<"harnessRuns"> } | null> => {
        if (!pausedHarnessRun || !pausedHarnessRun.pendingDecisionId) return null;

        const runId = pausedHarnessRun._id;
        const ownerToken = pausedHarnessRun.ownerToken;
        const decisionId = pausedHarnessRun.pendingDecisionId;

        await resolveDecisionMutation({
            decisionId,
            resolution,
            ...(response !== undefined ? { response } : {}),
        });
        await resumeRunMutation({ runId, ownerToken });
        return { resumedRunId: runId };
    };

    const requestRevision = async (userId: Id<"users">, feedback: string, trigger?: "panel" | "model") => {
        if (!session) return;
        return await requestRevisionMutation({
            sessionId: session._id,
            userId,
            feedback,
            trigger: trigger ?? "panel",
        });
    };

    const updateStageData = async (stage: string, data: Record<string, unknown>) => {
        if (!session) return;
        return await updateStageDataMutation({
            sessionId: session._id,
            stage,
            data,
        });
    };

    const updateWorkingTitle = async (userId: Id<"users">, title: string) => {
        if (!session) return;
        return await updateWorkingTitleMutation({
            sessionId: session._id,
            userId,
            title,
        });
    };

    // Phase 3 Task 3.1.3: Mark stage as dirty when edit/regenerate happens
    // Non-blocking - errors are logged but don't interrupt user flow
    const markStageAsDirty = async () => {
        if (!session) return;
        try {
            return await markStageAsDirtyMutation({
                sessionId: session._id,
            });
        } catch (error) {
            console.error("Failed to mark stage as dirty:", error);
            // Non-blocking, continue with edit/regenerate
            return { success: false, error: String(error) };
        }
    };

    // Rewind Feature: Rewind to a previous stage
    // After successful rewind, sends a system message to inform AI
    const rewindToStage = async (userId: Id<"users">, targetStage: PaperStageId) => {
        if (!session || !conversationId) return { success: false, error: "No session" };

        try {
            const result = await rewindToStageMutation({
                sessionId: session._id,
                userId,
                targetStage,
            });

            // On success, send system message to inform AI about the rewind
            if (result.success) {
                const targetLabel = getStageLabel(targetStage);
                try {
                    await createMessageMutation({
                        conversationId,
                        role: "system",
                        content: `[Rewind ke ${targetLabel}] User kembali ke tahap ${targetLabel} untuk revisi. Perhatikan artifact yang perlu di-update.`,
                    });
                } catch (msgError) {
                    // Don't fail the rewind if message creation fails
                    console.error("Failed to create rewind system message:", msgError);
                }
            }

            return result;
        } catch (error) {
            console.error("Failed to rewind stage:", error);
            return { success: false, error: String(error) };
        }
    };

    // Helper to calculate current stage start index from messages
    // Wrapped in useCallback for memoization
    const getStageStartIndex = useCallback(
        (messages: Message[]) => {
            if (!session) return 0;
            return calculateCurrentStageStartIndex(
                messages,
                session.stageData as Record<string, StageDataEntry> | undefined,
                session.currentStage as PaperStageId | "completed"
            );
        },
        [session]
    );

    // Helper to check if a message is in current stage
    const checkMessageInCurrentStage = useCallback(
        (messageCreatedAt: number) => {
            if (!session) return true;
            return isMessageInCurrentStage(
                messageCreatedAt,
                session.stageData as Record<string, StageDataEntry> | undefined,
                session.currentStage as PaperStageId | "completed"
            );
        },
        [session]
    );

    const currentStage = session?.currentStage as PaperStageId | "completed";

    return {
        session,
        sessionState,
        isPaperMode,
        currentStage,
        stageStatus: session?.stageStatus,
        stageLabel: session ? getStageLabel(currentStage) : "",
        stageNumber: session ? getStageNumber(currentStage) : 0,
        stageData: session?.stageData as Record<string, StageDataEntry> | undefined,
        approveStage,
        requestRevision,
        updateStageData,
        updateWorkingTitle,
        markStageAsDirty,
        // Rewind Feature
        rewindToStage,
        getStageStartIndex,
        checkMessageInCurrentStage,
        isLoading: session === undefined,
        // Phase 8 — harness pause/resume surface
        pausedHarnessRun,
        resolveAndResume,
    };
};
