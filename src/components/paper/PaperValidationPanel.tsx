"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Check, Edit3, Send, X } from "lucide-react";
import { toast } from "sonner";

interface PaperValidationPanelProps {
    stageLabel: string;
    onApprove: () => Promise<void>;
    onRevise: (feedback: string) => Promise<void>;
    isLoading?: boolean;
}

export const PaperValidationPanel: React.FC<PaperValidationPanelProps> = ({
    stageLabel,
    onApprove,
    onRevise,
    isLoading = false,
}) => {
    const [showRevisionForm, setShowRevisionForm] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleApprove = async () => {
        setIsSubmitting(true);
        try {
            await onApprove();
            toast.success(`Mantap! Tahap "${stageLabel}" disetujui. Lanjut ke tahap berikutnya.`);
        } catch {
            toast.error("Gagal nyetujui tahap ini. Coba lagi, ya.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevise = async () => {
        if (!feedback.trim()) {
            toast.error("Isi feedback dulu biar AI tau apa yang harus diperbaiki.");
            return;
        }
        setIsSubmitting(true);
        try {
            await onRevise(feedback);
            toast.success("Feedback lo udah dikirim. AI bakal segera revisi.");
            setShowRevisionForm(false);
            setFeedback("");
        } catch {
            toast.error("Gagal ngirim feedback. Coba lagi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="m-4 p-4 max-w-[80%] mx-auto bg-card border border-border shadow-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Validasi Tahap: {stageLabel}</h3>
                        <p className="text-xs text-muted-foreground">Periksa draft di artifact. Apakah sudah sesuai atau perlu revisi?</p>
                    </div>
                    <div className="flex gap-2">
                        {!showRevisionForm && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowRevisionForm(true)}
                                    disabled={isSubmitting || isLoading}
                                    className="gap-2 border-red-500/50 text-red-500 hover:bg-red-500/10"
                                >
                                    <Edit3 size={14} /> Revisi
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleApprove}
                                    disabled={isSubmitting || isLoading}
                                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <Check size={14} /> Approve & Lanjut
                                </Button>
                            </>
                        )}
                        {showRevisionForm && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowRevisionForm(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X size={18} />
                            </Button>
                        )}
                    </div>
                </div>

                {showRevisionForm && (
                    <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                        <Textarea
                            placeholder="Kasih tau AI yang mana yang kudu diganti..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="resize-none min-h-[100px] text-xs bg-background"
                        />
                        <Button
                            size="sm"
                            onClick={handleRevise}
                            disabled={isSubmitting || !feedback.trim()}
                            className="w-full gap-2"
                        >
                            <Send size={14} /> Kirim Feedback
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
};
