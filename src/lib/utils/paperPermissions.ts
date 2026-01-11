/**
 * Paper Permissions Utility
 *
 * Utility functions for determining edit permissions on messages
 * in paper writing mode. Implements the 2-turn limit rule and
 * approved stage protection.
 */

import { PaperStageId, STAGE_ORDER } from "@convex/paperSessions/constants";

// ============================================================================
// TYPES
// ============================================================================

interface Message {
    createdAt: number;
    role?: string;
    [key: string]: unknown;
}

interface StageDataEntry {
    validatedAt?: number;
    [key: string]: unknown;
}

interface IsEditAllowedParams {
    messages: Message[];
    messageIndex: number;
    isPaperMode: boolean;
    currentStageStartIndex: number;
    stageData?: Record<string, StageDataEntry>;
}

interface IsEditAllowedResult {
    allowed: boolean;
    reason?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate the turn distance from a target message to the most recent user message.
 * Counts only user messages AFTER the targetMessageIndex.
 *
 * Example:
 * - messages: [user, assistant, user, assistant, user]
 * - targetIndex: 0 (first user message)
 * - Result: 2 (two user messages after index 0)
 */
export function calculateTurnDistance(
    messages: Message[],
    targetMessageIndex: number
): number {
    if (targetMessageIndex < 0 || targetMessageIndex >= messages.length) {
        return 0;
    }

    let userMessageCount = 0;

    // Count user messages AFTER the target index
    for (let i = targetMessageIndex + 1; i < messages.length; i++) {
        if (messages[i].role === "user") {
            userMessageCount++;
        }
    }

    return userMessageCount;
}

/**
 * Determine which stage a message belongs to based on validatedAt timestamps.
 *
 * Algorithm:
 * - Find the last stage where message.createdAt > stage.validatedAt
 * - That means the message was created AFTER that stage was validated
 * - So it belongs to the NEXT stage in order
 *
 * Example:
 * - stageData: { gagasan: { validatedAt: 1000 }, topik: { validatedAt: 2000 } }
 * - messageCreatedAt: 1500
 * - Result: "topik" (created after gagasan validated, before topik validated)
 */
export function getMessageStage(
    messageCreatedAt: number,
    stageData: Record<string, StageDataEntry> | undefined
): PaperStageId {
    if (!stageData || Object.keys(stageData).length === 0) {
        return "gagasan"; // First stage if no data
    }

    // Find the latest validated stage that was validated BEFORE this message was created
    let latestValidatedStageIndex = -1;

    for (let i = 0; i < STAGE_ORDER.length; i++) {
        const stage = STAGE_ORDER[i];
        const stageEntry = stageData[stage];

        if (stageEntry?.validatedAt && messageCreatedAt > stageEntry.validatedAt) {
            // Message was created after this stage was validated
            latestValidatedStageIndex = i;
        }
    }

    if (latestValidatedStageIndex === -1) {
        // Message was created before any stage was validated -> first stage
        return "gagasan";
    }

    // Message belongs to the stage AFTER the latest validated stage
    const nextStageIndex = latestValidatedStageIndex + 1;
    if (nextStageIndex >= STAGE_ORDER.length) {
        // Beyond last stage, return last stage
        return STAGE_ORDER[STAGE_ORDER.length - 1];
    }

    return STAGE_ORDER[nextStageIndex];
}

/**
 * Check if a message is in an approved (validated) stage.
 * A message is in an approved stage if:
 * - Its stage has a validatedAt timestamp
 * - AND it's before the current stage start index
 */
function isMessageInApprovedStage(
    messageIndex: number,
    currentStageStartIndex: number
): boolean {
    // Messages before currentStageStartIndex are in previous (approved) stages
    return messageIndex < currentStageStartIndex;
}

// ============================================================================
// MAIN PERMISSION FUNCTION
// ============================================================================

/**
 * Determine if a message can be edited based on paper mode rules.
 *
 * Rules (in priority order):
 * 1. Non-paper mode: Always allow edit
 * 2. Approved stage: Disable edit (must use Rewind to revise)
 * 3. Current stage, > 2 turns back: Disable edit
 * 4. Current stage, <= 2 turns back: Allow edit
 *
 * @returns Object with `allowed` boolean and optional `reason` string
 */
export function isEditAllowed(params: IsEditAllowedParams): IsEditAllowedResult {
    const {
        messages,
        messageIndex,
        isPaperMode,
        currentStageStartIndex,
    } = params;

    // Rule 1: Non-paper mode always allows edit
    if (!isPaperMode) {
        return { allowed: true };
    }

    // Validate messageIndex
    if (messageIndex < 0 || messageIndex >= messages.length) {
        return { allowed: false, reason: "Invalid message index" };
    }

    // Only user messages can be edited
    const message = messages[messageIndex];
    if (message.role !== "user") {
        return { allowed: false, reason: "Hanya pesan user yang bisa diedit" };
    }

    // Rule 2: Message in approved stage - disabled
    if (isMessageInApprovedStage(messageIndex, currentStageStartIndex)) {
        return {
            allowed: false,
            reason: "Tahap ini sudah disetujui. Gunakan Rewind untuk merevisi.",
        };
    }

    // Calculate turn distance for current stage messages
    const turnDistance = calculateTurnDistance(messages, messageIndex);

    // Rule 3: > 2 turns back in current stage - disabled
    if (turnDistance > 2) {
        return {
            allowed: false,
            reason: "Hanya bisa edit 2 pesan terakhir di tahap ini.",
        };
    }

    // Rule 4: <= 2 turns back in current stage - allowed
    return { allowed: true };
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Quick check if editing is allowed (boolean only, no reason).
 */
export function canEditMessage(params: IsEditAllowedParams): boolean {
    return isEditAllowed(params).allowed;
}
