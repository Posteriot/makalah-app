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
import { getStageLabel, type PaperStageId } from "../../../convex/paperSessions/constants";
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

    const handleConfirm = () => {
        onConfirm();
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Undo className="h-5 w-5 text-[var(--ds-state-warning-fg)]" />
                        Kembali ke tahap {targetLabel}?
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            <p>
                                Anda akan kembali dari tahap <strong>{currentLabel}</strong> ke tahap <strong>{targetLabel}</strong>.
                            </p>
                            <div className="flex items-start gap-2 p-3 bg-[var(--ds-state-warning-bg)] border border-[var(--ds-state-warning-border)] rounded-md">
                                <WarningTriangle className="h-4 w-4 text-[var(--ds-state-warning-fg)] mt-0.5 shrink-0" />
                                <div className="text-xs text-[var(--ds-state-warning-fg)]">
                                    <strong>Perhatian:</strong> Semua artifact dan keputusan dari tahap {targetLabel} sampai {currentLabel} akan ditandai sebagai <em>invalidated</em> dan perlu direvisi ulang.
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Progres Anda tidak hilang, tetapi perlu divalidasi ulang setelah revisi.
                            </p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>
                        Batal
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="bg-[var(--ds-state-warning-fg)] hover:brightness-110 text-[var(--ds-sidebar-cta-fg)]"
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
