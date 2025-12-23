import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { PaperStageId, getStageLabel, getStageNumber } from "../../../convex/paperSessions/constants";

export const usePaperSession = (conversationId?: Id<"conversations">) => {
    const session = useQuery(
        api.paperSessions.getByConversation,
        conversationId ? { conversationId } : "skip"
    );

    const approveStageMutation = useMutation(api.paperSessions.approveStage);
    const requestRevisionMutation = useMutation(api.paperSessions.requestRevision);
    const updateStageDataMutation = useMutation(api.paperSessions.updateStageData);

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

    return {
        session,
        isPaperMode,
        currentStage: session?.currentStage as PaperStageId | "completed",
        stageStatus: session?.stageStatus,
        stageLabel: session ? getStageLabel(session.currentStage as PaperStageId) : "",
        stageNumber: session ? getStageNumber(session.currentStage as PaperStageId) : 0,
        approveStage,
        requestRevision,
        updateStageData,
        isLoading: session === undefined,
    };
};
