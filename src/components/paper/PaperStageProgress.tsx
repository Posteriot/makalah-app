"use client";

import React, { useState, useCallback } from "react";
import { STAGE_ORDER, getStageLabel, getStageNumber, type PaperStageId } from "../../../convex/paperSessions/constants";
import { cn } from "@/lib/utils";
import { Check } from "iconoir-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { RewindConfirmationDialog } from "./RewindConfirmationDialog";

// ============================================================================
// TYPES
// ============================================================================

interface StageDataEntry {
    validatedAt?: number;
    // Other fields like artifactId, ringkasan can be added if needed
}

interface PaperStageProgressProps {
    currentStage: string;
    stageStatus: string;
    /** Stage data with validatedAt timestamps - needed for rewind functionality */
    stageData?: Record<string, StageDataEntry>;
    /** Callback when user confirms rewind to a specific stage */
    onRewindRequest?: (targetStage: PaperStageId) => void;
    /** Whether a rewind operation is in progress */
    isRewindPending?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum number of stages back that user can rewind */
const MAX_REWIND_STAGES = 2;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a stage is a valid rewind target
 * - Must be completed (has validatedAt)
 * - Must be within MAX_REWIND_STAGES of current stage
 * - Must be before current stage (not current or future)
 */
function isValidRewindTarget(
    stageId: PaperStageId,
    stageIndex: number,
    currentIndex: number,
    stageData?: Record<string, StageDataEntry>
): { canRewind: boolean; reason?: string } {
    // Not a completed stage
    if (stageIndex >= currentIndex) {
        return { canRewind: false };
    }

    // No stageData provided
    if (!stageData) {
        return { canRewind: false };
    }

    // Stage was never validated
    const stageEntry = stageData[stageId];
    if (!stageEntry?.validatedAt) {
        return { canRewind: false, reason: "Stage ini belum pernah divalidasi" };
    }

    // Beyond max rewind limit
    const stagesBack = currentIndex - stageIndex;
    if (stagesBack > MAX_REWIND_STAGES) {
        return {
            canRewind: false,
            reason: `Hanya bisa rewind max ${MAX_REWIND_STAGES} tahap ke belakang`,
        };
    }

    return { canRewind: true };
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PaperStageProgress: React.FC<PaperStageProgressProps> = ({
    currentStage,
    stageStatus,
    stageData,
    onRewindRequest,
    isRewindPending = false,
}) => {
    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [targetStageForRewind, setTargetStageForRewind] = useState<PaperStageId | null>(null);

    const currentIndex = currentStage === "completed"
        ? STAGE_ORDER.length
        : STAGE_ORDER.indexOf(currentStage as PaperStageId);

    // Handle click on a completed stage badge
    const handleStageClick = useCallback((stageId: PaperStageId, stageIndex: number) => {
        if (!onRewindRequest) return;

        const { canRewind } = isValidRewindTarget(stageId, stageIndex, currentIndex, stageData);
        if (!canRewind) return;

        // Open confirmation dialog
        setTargetStageForRewind(stageId);
        setDialogOpen(true);
    }, [currentIndex, stageData, onRewindRequest]);

    // Handle rewind confirmation
    const handleRewindConfirm = useCallback(() => {
        if (!targetStageForRewind || !onRewindRequest) return;
        onRewindRequest(targetStageForRewind);
        setDialogOpen(false);
        setTargetStageForRewind(null);
    }, [targetStageForRewind, onRewindRequest]);

    // Handle dialog close
    const handleDialogClose = useCallback((open: boolean) => {
        if (!open) {
            setTargetStageForRewind(null);
        }
        setDialogOpen(open);
    }, []);

    return (
        <>
            <div className="w-full bg-[var(--chat-card)] backdrop-blur-sm border-b border-[color:var(--chat-border)] shadow-sm overflow-x-auto no-scrollbar">
                <div className="flex items-center min-w-max p-4 gap-2">
                    {STAGE_ORDER.map((stageId, index) => {
                        const isCompleted = index < currentIndex;
                        const isActive = index === currentIndex;
                        const label = getStageLabel(stageId);
                        const stageNumber = getStageNumber(stageId);

                        // Check rewind eligibility
                        const rewindCheck = isValidRewindTarget(stageId, index, currentIndex, stageData);
                        const canRewind = isCompleted && onRewindRequest && rewindCheck.canRewind;
                        const showTooltip = isCompleted && onRewindRequest && !rewindCheck.canRewind && rewindCheck.reason;

                        // Badge element - reusable
                        const badgeElement = (
                            <div
                                data-testid={`stage-badge-${stageId}`}
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                                    isCompleted
                                        ? "bg-[var(--chat-success)] border-[color:var(--chat-success)] text-[var(--chat-success-foreground)]"
                                        : isActive
                                            ? "bg-[var(--chat-info)] border-[color:var(--chat-info)] text-[var(--chat-info-foreground)] shadow-[0_0_10px_var(--chat-info)]"
                                            : "bg-[var(--chat-muted)] border-[color:var(--chat-border)] text-[var(--chat-muted-foreground)]",
                                    // Rewind styles
                                    canRewind && "cursor-pointer hover:scale-110 hover:shadow-[0_0_15px_var(--chat-success)] active:scale-95",
                                    canRewind && "ring-0 hover:ring-2 hover:ring-[var(--chat-success)]"
                                )}
                                onClick={canRewind ? () => handleStageClick(stageId, index) : undefined}
                                role={canRewind ? "button" : undefined}
                                tabIndex={canRewind ? 0 : undefined}
                                onKeyDown={canRewind ? (e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        handleStageClick(stageId, index);
                                    }
                                } : undefined}
                                aria-label={canRewind ? `Kembali ke tahap ${label}` : undefined}
                            >
                                {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : stageNumber}
                            </div>
                        );

                        return (
                            <React.Fragment key={stageId}>
                                <div
                                    className={cn(
                                        "flex flex-col items-center gap-1.5 transition-all duration-300 px-3",
                                        isActive ? "opacity-100 scale-105" : "opacity-60 grayscale-[0.5]",
                                        canRewind && "opacity-100 grayscale-0" // Make rewindable stages more visible
                                    )}
                                >
                                    {/* Badge with optional tooltip */}
                                    {showTooltip ? (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                {badgeElement}
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-[200px]">
                                                {rewindCheck.reason}
                                            </TooltipContent>
                                        </Tooltip>
                                    ) : (
                                        badgeElement
                                    )}

                                    <span
                                        className={cn(
                                            "text-[10px] font-medium whitespace-nowrap",
                                            isActive ? "text-[var(--chat-info)]" : "text-[var(--chat-muted-foreground)]",
                                            canRewind && "text-[var(--chat-success)]" // Highlight label for rewindable
                                        )}
                                    >
                                        {label}
                                    </span>
                                    {isActive && (
                                        <div className="flex gap-1">
                                            <span className={cn(
                                                "text-[8px] uppercase tracking-tighter px-1.5 py-0.5 rounded-full",
                                                stageStatus === "pending_validation" ? "bg-[var(--chat-warning)] text-[var(--chat-warning-foreground)]" :
                                                    stageStatus === "revision" ? "bg-[var(--chat-destructive)] text-[var(--chat-destructive-foreground)]" :
                                                        "bg-[var(--chat-info)] text-[var(--chat-info-foreground)] animate-pulse"
                                            )}>
                                                {stageStatus === "pending_validation" ? "Menunggu Anda" :
                                                    stageStatus === "revision" ? "Revisi" : "Sedang menulis..."}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {index < STAGE_ORDER.length - 1 && (
                                    <div
                                        className={cn(
                                            "w-6 h-[2px] mb-6 transition-colors",
                                            isCompleted ? "bg-[var(--chat-success)]" : "bg-[var(--chat-muted)]"
                                        )}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Rewind Confirmation Dialog */}
            <RewindConfirmationDialog
                open={dialogOpen}
                onOpenChange={handleDialogClose}
                targetStage={targetStageForRewind}
                currentStage={currentStage}
                onConfirm={handleRewindConfirm}
                isSubmitting={isRewindPending}
            />
        </>
    );
};
