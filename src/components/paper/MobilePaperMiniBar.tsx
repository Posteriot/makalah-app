"use client"

import { useState } from "react"
import { STAGE_ORDER, getStageLabel, type PaperStageId } from "../../../convex/paperSessions/constants"
import { cn } from "@/lib/utils"
import { Check, NavArrowDown, NavArrowUp } from "iconoir-react"

// ============================================================================
// TYPES
// ============================================================================

interface StageDataEntry {
  validatedAt?: number
}

interface MobilePaperMiniBarProps {
  currentStage: PaperStageId
  stageStatus: string
  stageData?: Record<string, StageDataEntry>
  onRewindRequest?: (targetStage: PaperStageId) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * MobilePaperMiniBar - Compact paper stage indicator above chat input (mobile only)
 *
 * Collapsed: Single line showing current stage name + progress counter
 * Expanded: Horizontal scrollable stage pills with completion/active state
 *
 * Hidden on md+ breakpoints (desktop uses PaperStageProgress in sidebar).
 */
export function MobilePaperMiniBar({
  currentStage,
  stageStatus,
  stageData,
  onRewindRequest,
}: MobilePaperMiniBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const currentIndex = STAGE_ORDER.indexOf(currentStage)
  const stageNumber = currentIndex + 1

  return (
    <div className="md:hidden border-t border-[color:var(--chat-border)] bg-[var(--chat-muted)]">
      {/* Collapsed bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-mono"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block w-2 h-2 rounded-full",
              stageStatus === "pending_validation"
                ? "bg-[var(--chat-warning)]"
                : stageStatus === "revision"
                  ? "bg-[var(--chat-destructive)]"
                  : "bg-[var(--chat-info)] animate-pulse"
            )}
          />
          <span className="font-semibold text-[var(--chat-foreground)]">
            {getStageLabel(currentStage)}
          </span>
        </div>
        <span className="flex items-center gap-1 text-[var(--chat-muted-foreground)]">
          <span className="tabular-nums">{stageNumber}/13</span>
          {isExpanded ? (
            <NavArrowDown className="h-3 w-3" />
          ) : (
            <NavArrowUp className="h-3 w-3" />
          )}
        </span>
      </button>

      {/* Expanded stage pills */}
      {isExpanded && (
        <div className="overflow-x-auto no-scrollbar pb-2 px-4">
          <div className="flex items-center gap-1.5 min-w-max">
            {STAGE_ORDER.map((stage, index) => {
              const isCompleted = stageData?.[stage]?.validatedAt != null
              const isCurrent = stage === currentStage
              const canRewind = isCompleted && index < currentIndex && onRewindRequest != null

              return (
                <button
                  key={stage}
                  onClick={() => {
                    if (canRewind) {
                      onRewindRequest(stage)
                    }
                  }}
                  disabled={!canRewind && !isCurrent}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-2 py-1 rounded-badge",
                    "text-[10px] font-mono min-w-[48px] transition-colors",
                    isCompleted
                      ? "bg-[var(--chat-success)]/15 text-[var(--chat-success)]"
                      : isCurrent
                        ? "bg-[var(--chat-info)] text-[var(--chat-info-foreground)]"
                        : "bg-transparent text-[var(--chat-muted-foreground)]",
                    canRewind && "cursor-pointer active:scale-95"
                  )}
                >
                  <span className="font-semibold">
                    {isCompleted ? (
                      <Check className="h-3 w-3 inline" />
                    ) : isCurrent ? (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="truncate max-w-[40px]">
                    {getStageLabel(stage).slice(0, 6)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
