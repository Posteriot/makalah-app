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
                        <Undo className="h-5 w-5 text-amber-500" />
                        Kembali ke tahap {targetLabel}?
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            <p>
                                Lo akan kembali dari tahap <strong>{currentLabel}</strong> ke tahap <strong>{targetLabel}</strong>.
                            </p>
                            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                                <WarningTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                <div className="text-xs text-amber-200">
                                    <strong>Perhatian:</strong> Semua artifact dan keputusan dari tahap {targetLabel} sampai {currentLabel} akan ditandai sebagai <em>invalidated</em> dan perlu direvisi ulang.
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Progress lo tidak hilang, tapi perlu divalidasi ulang setelah revisi.
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
                        className="bg-amber-500 hover:bg-amber-600 text-black"
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
