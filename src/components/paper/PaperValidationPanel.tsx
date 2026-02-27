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
                // Container - full width on mobile, centered card on desktop
                "mx-4 my-4 md:mx-auto md:max-w-[80%]",
                "bg-[var(--chat-card)] border border-[color:var(--chat-border)] rounded-lg",
                "shadow-none",
                "animate-in fade-in slide-in-from-bottom-4 duration-500"
            )}
        >
            {isDirty && (
                <div className="mx-4 mt-4 mb-0 border-b border-[color:var(--chat-border)] pb-3">
                    <div className="flex items-start gap-3 text-sm leading-relaxed">
                        <WarningCircle className="mt-[2px] h-4 w-4 flex-shrink-0 text-[var(--chat-secondary-foreground)]" />
                        <p className="min-w-0 flex-1 text-[var(--chat-foreground)] whitespace-normal break-words">
                            Percakapan berubah sejak data terakhir disimpan. Minta Agen Makalah sinkronkan data sebelum approve.
                        </p>
                    </div>
                </div>
            )}
            <div
                className={cn(
                    "p-4",
                    // Always column on mobile; row on desktop (unless revision mode)
                    showRevisionForm ? "flex flex-col gap-3" : "flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4"
                )}
            >
                {/* Header Section */}
                <div className="flex items-center justify-between gap-3 flex-1">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-semibold text-[var(--chat-foreground)]">
                            Validasi Tahap: {stageLabel}
                        </h3>
                        <p className="text-xs text-[var(--chat-muted-foreground)]">
                            Periksa draft di artifact. Apakah sudah sesuai atau perlu revisi?
                        </p>
                    </div>

                    {/* Close button for revision mode */}
                    {showRevisionForm && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowRevisionForm(false)}
                            className="h-7 w-7 text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)] flex-shrink-0"
                        >
                            <Xmark className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Action Buttons - Inline mode */}
                {!showRevisionForm && (
                    <div className="flex gap-2 md:flex-shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRevisionForm(true)}
                            disabled={isSubmitting || isLoading}
                            className={cn(
                                "gap-2 h-9 px-4 rounded-action flex-1 md:flex-initial",
                                "border-[color:var(--chat-border)] text-[var(--chat-secondary-foreground)]",
                                "hover:bg-[var(--chat-accent)] hover:border-[color:var(--chat-primary)]"
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
                                "gap-2 h-9 px-4 rounded-action flex-1 md:flex-initial",
                                "bg-[var(--chat-success)]",
                                "text-[var(--chat-success-foreground)] border-none",
                                "transition-[background-color,box-shadow] duration-150",
                                "hover:bg-[color:color-mix(in_oklch,var(--chat-success)_88%,black)]",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-success)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--chat-card)]"
                            )}
                        >
                            <Check className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Setujui & Lanjutkan</span>
                            <span className="md:hidden">Setujui</span>
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
                                "text-sm bg-[var(--chat-muted)]",
                                "border-[color:var(--chat-border)] focus:border-[color:var(--chat-primary)]",
                                "placeholder:text-[var(--chat-muted-foreground)]"
                            )}
                        />
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                onClick={handleRevise}
                                disabled={isSubmitting || !feedback.trim()}
                                className={cn(
                                    "gap-2 h-9 px-4",
                                    "bg-[var(--chat-primary)] text-[var(--chat-primary-foreground)]",
                                    "hover:brightness-110"
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
