"use client";

import React from "react";
import { STAGE_ORDER, getStageLabel, getStageNumber, type PaperStageId } from "../../../convex/paperSessions/constants";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface PaperStageProgressProps {
    currentStage: string;
    stageStatus: string;
}

export const PaperStageProgress: React.FC<PaperStageProgressProps> = ({
    currentStage,
    stageStatus,
}) => {
    const currentIndex = currentStage === "completed"
        ? STAGE_ORDER.length
        : STAGE_ORDER.indexOf(currentStage as PaperStageId);

    return (
        <div className="w-full bg-background-900/50 backdrop-blur-sm border-b border-border shadow-sm overflow-x-auto no-scrollbar">
            <div className="flex items-center min-w-max p-4 gap-2">
                {STAGE_ORDER.map((stageId, index) => {
                    const isCompleted = index < currentIndex;
                    const isActive = index === currentIndex;
                    const label = getStageLabel(stageId);
                    const stageNumber = getStageNumber(stageId);

                    return (
                        <React.Fragment key={stageId}>
                            <div
                                className={cn(
                                    "flex flex-col items-center gap-1.5 transition-all duration-300 px-3",
                                    isActive ? "opacity-100 scale-105" : "opacity-60 grayscale-[0.5]"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                                        isCompleted
                                            ? "bg-green-500/20 border-green-500 text-green-500"
                                            : isActive
                                                ? "bg-primary-500/20 border-primary-500 text-primary-500 shadow-[0_0_10px_rgba(var(--primary-500),0.3)]"
                                                : "bg-background-800 border-background-700 text-muted-foreground"
                                    )}
                                >
                                    {isCompleted ? <Check size={14} strokeWidth={3} /> : stageNumber}
                                </div>
                                <span
                                    className={cn(
                                        "text-[10px] font-medium whitespace-nowrap",
                                        isActive ? "text-primary-500" : "text-muted-foreground"
                                    )}
                                >
                                    {label}
                                </span>
                                {isActive && (
                                    <div className="flex gap-1">
                                        <span className={cn(
                                            "text-[8px] uppercase tracking-tighter px-1.5 py-0.5 rounded-full",
                                            stageStatus === "pending_validation" ? "bg-amber-500/20 text-amber-500" :
                                                stageStatus === "revision" ? "bg-red-500/20 text-red-500" :
                                                    "bg-primary-500/20 text-primary-500 animate-pulse"
                                        )}>
                                            {stageStatus === "pending_validation" ? "Menunggu lo" :
                                                stageStatus === "revision" ? "Revisi" : "Ngetik..."}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {index < STAGE_ORDER.length - 1 && (
                                <div
                                    className={cn(
                                        "w-6 h-[2px] mb-6 transition-colors",
                                        isCompleted ? "bg-green-500" : "bg-background-800"
                                    )}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};
