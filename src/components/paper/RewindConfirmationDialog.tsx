"use client";

import React from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { STAGE_ORDER, getStageLabel, type PaperStageId } from "../../../convex/paperSessions/constants";
import { Undo, WarningTriangle } from "iconoir-react";

interface RewindConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targetStage: PaperStageId | null;
    currentStage: string;
    onConfirm: () => void;
    isSubmitting?: boolean;
}

export const RewindConfirmationDialog: React.FC<RewindConfirmationDialogProps> = ({
    open,
    onOpenChange,
    targetStage,
    currentStage,
    onConfirm,
    isSubmitting = false,
}) => {
    if (!targetStage) return null;

    const targetLabel = getStageLabel(targetStage);
    const currentLabel = getStageLabel(currentStage as PaperStageId);

    const targetIndex = STAGE_ORDER.indexOf(targetStage);
    const currentIndex = currentStage === "completed"
        ? STAGE_ORDER.length
        : STAGE_ORDER.indexOf(currentStage as PaperStageId);
    const invalidatedCount = currentIndex - targetIndex;

    const handleConfirm = () => {
        onConfirm();
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent data-chat-scope="" className="border-0">
                <AlertDialogHeader className="text-left">
                    <AlertDialogTitle className="flex items-center gap-2 text-left text-sm whitespace-nowrap sm:text-lg sm:whitespace-normal">
                        <Undo className="h-4 w-4 text-[var(--chat-warning)] sm:h-5 sm:w-5" />
                        Kembali ke tahap {targetLabel}?
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            <p className="text-left text-xs leading-relaxed sm:text-sm">
                                Kamu akan kembali dari tahap <strong>{currentLabel}</strong> ke tahap <strong>{targetLabel}</strong>.
                            </p>
                            <div className="chat-rewind-comment-box flex items-start gap-2 p-3 rounded-md">
                                <WarningTriangle className="h-4 w-4 text-[var(--chat-foreground)] shrink-0" />
                                <div className="text-left text-xs leading-relaxed text-[var(--chat-foreground)]">
                                    {invalidatedCount >= STAGE_ORDER.length ? (
                                        <>Seluruh baseline makalah ({invalidatedCount} tahap) akan ditandai <em>invalidated</em> dan perlu direvisi ulang dari awal.</>
                                    ) : (
                                        <>{invalidatedCount} tahap (dari {targetLabel} sampai {currentLabel}) akan ditandai <em>invalidated</em> dan perlu divalidasi ulang setelah revisi.</>
                                    )}
                                </div>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 sm:gap-2">
                    <AlertDialogCancel
                        disabled={isSubmitting}
                        className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
                    >
                        Batal
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="chat-validation-approve-button rounded-action h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
                    >
                        {isSubmitting ? (
                            <>
                                <Undo className="h-4 w-4 mr-2 animate-spin" />
                                Memproses...
                            </>
                        ) : (
                            <>Ya, Kembali ke {targetLabel}</>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
