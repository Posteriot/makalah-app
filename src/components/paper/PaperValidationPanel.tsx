"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, EditPencil, Send, WarningCircle, Xmark } from "iconoir-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PaperValidationPanelProps {
    stageLabel: string;
    onApprove: () => Promise<void>;
    onRevise: (feedback: string) => Promise<void>;
    isLoading?: boolean;
    isDirty?: boolean;
}

export const PaperValidationPanel: React.FC<PaperValidationPanelProps> = ({
    stageLabel,
    onApprove,
    onRevise,
    isLoading = false,
    isDirty = false,
}) => {
    const [showRevisionForm, setShowRevisionForm] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleApprove = async () => {
        setIsSubmitting(true);
        try {
            await onApprove();
            toast.success(`Tahap "${stageLabel}" disetujui. Lanjut ke tahap berikutnya.`);
        } catch {
            toast.error("Gagal menyetujui tahap ini. Silakan coba lagi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevise = async () => {
        if (!feedback.trim()) {
            toast.error("Silakan isi feedback terlebih dahulu agar AI mengetahui bagian yang harus diperbaiki.");
            return;
        }
        setIsSubmitting(true);
        try {
            await onRevise(feedback);
            toast.success("Feedback Anda sudah dikirim. AI akan segera merevisi.");
            setShowRevisionForm(false);
            setFeedback("");
        } catch {
            toast.error("Gagal mengirim feedback. Silakan coba lagi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className={cn(
                // Container - centered card style like mockup
                "max-w-[80%] mx-auto my-4",
                "bg-[var(--ds-status-surface)] border border-[var(--ds-status-border)] rounded-lg",
                "shadow-none",
                "animate-in fade-in slide-in-from-bottom-4 duration-500"
            )}
        >
            {isDirty && (
                <div className="flex items-start gap-2 p-3 mx-4 mt-4 mb-0 bg-[var(--ds-state-warning-bg)] border border-[var(--ds-state-warning-border)] rounded-action text-xs text-[var(--ds-state-warning-fg)]">
                    <WarningCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="font-semibold">Percakapan berubah sejak data terakhir disimpan.</span>
                        <span className="block mt-0.5 text-muted-foreground">
                            Sebaiknya minta AI sinkronkan data sebelum approve.
                        </span>
                    </div>
                </div>
            )}
            <div
                className={cn(
                    "p-4",
                    // Switch to column layout in revision mode
                    showRevisionForm ? "flex flex-col gap-3" : "flex items-center justify-between gap-4"
                )}
            >
                {/* Header Section */}
                <div className="flex items-center justify-between gap-3 flex-1">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-semibold text-foreground">
                            Validasi Tahap: {stageLabel}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Periksa draft di artifact. Apakah sudah sesuai atau perlu revisi?
                        </p>
                    </div>

                    {/* Close button for revision mode */}
                    {showRevisionForm && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowRevisionForm(false)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                            <Xmark className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Action Buttons - Inline mode */}
                {!showRevisionForm && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRevisionForm(true)}
                            disabled={isSubmitting || isLoading}
                            className={cn(
                                "gap-2 h-9 px-4 rounded-action",
                                "border-[var(--ds-artifact-chip-border)] text-[var(--ds-artifact-chip-fg)]",
                                "hover:bg-[var(--ds-artifact-chip-hover-bg)] hover:border-[var(--ds-artifact-tab-active-border)]"
                            )}
                        >
                            <EditPencil className="h-3.5 w-3.5" />
                            <span>Revisi</span>
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleApprove}
                            disabled={isSubmitting || isLoading}
                            className={cn(
                                "gap-2 h-9 px-4 rounded-action",
                                "bg-[var(--ds-status-progress-success)] hover:brightness-110",
                                "text-[var(--ds-sidebar-cta-fg)] border-none"
                            )}
                        >
                            <Check className="h-3.5 w-3.5" />
                            <span>Setujui & Lanjutkan</span>
                        </Button>
                    </div>
                )}

                {/* Revision Form */}
                {showRevisionForm && (
                    <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                        <Textarea
                            placeholder="Jelaskan bagian yang harus diperbaiki..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className={cn(
                                "resize-none min-h-[100px]",
                                "text-sm bg-muted",
                                "border-border focus:border-primary",
                                "placeholder:text-muted-foreground"
                            )}
                        />
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                onClick={handleRevise}
                                disabled={isSubmitting || !feedback.trim()}
                                className={cn(
                                    "gap-2 h-9 px-4",
                                    "bg-primary text-primary-foreground",
                                    "hover:bg-primary/90"
                                )}
                            >
                                <Send className="h-3.5 w-3.5" />
                                <span>Kirim feedback</span>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
