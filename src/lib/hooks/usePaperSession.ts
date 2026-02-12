import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useCallback } from "react";
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

export const usePaperSession = (conversationId?: Id<"conversations">) => {
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

    const isPaperMode = !!session;

    const approveStage = async (userId: Id<"users">) => {
        if (!session) return;
        return await approveStageMutation({
            sessionId: session._id,
            userId,
        });
    };

    const requestRevision = async (userId: Id<"users">, feedback: string) => {
        if (!session) return;
        return await requestRevisionMutation({
            sessionId: session._id,
            userId,
            feedback,
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
    };
};
