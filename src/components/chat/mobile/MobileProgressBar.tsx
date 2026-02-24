"use client"

import {
  STAGE_ORDER,
  getStageLabel,
  type PaperStageId,
} from "../../../../convex/paperSessions/constants"
import { GitBranch, NavArrowDown, NavArrowUp } from "iconoir-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"

interface MobileProgressBarProps {
  currentStage: PaperStageId
  stageStatus: string
  stageData?: Record<string, { validatedAt?: number }>
  onRewindRequest?: (targetStage: PaperStageId) => void
}

export function MobileProgressBar({
  currentStage,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  stageStatus,
  stageData,
  onRewindRequest,
}: MobileProgressBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const currentIndex = STAGE_ORDER.indexOf(currentStage)
  const stageNumber = currentIndex + 1

  return (
    <div className="md:hidden border-t border-[color:var(--chat-border)] bg-[var(--chat-muted)]">
      {/* Collapsed bar — always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2"
      >
        <div className="flex items-center gap-2">
          <GitBranch
            className="h-3.5 w-3.5 text-[var(--chat-muted-foreground)]"
            strokeWidth={1.5}
          />
          <span className="font-sans text-xs font-semibold text-[var(--chat-foreground)]">
            {getStageLabel(currentStage)}
          </span>
        </div>
        <span className="flex items-center gap-1 text-[var(--chat-muted-foreground)]">
          <span className="font-mono text-xs tabular-nums">
            {stageNumber}/13
          </span>
          {isExpanded ? (
            <NavArrowUp className="h-3 w-3" strokeWidth={1.5} />
          ) : (
            <NavArrowDown className="h-3 w-3" strokeWidth={1.5} />
          )}
        </span>
      </button>

      {/* Expanded: horizontal scrollable circles */}
      {isExpanded && (
        <div className="overflow-x-auto no-scrollbar pb-3 px-4">
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center min-w-max">
              {STAGE_ORDER.map((stage, index) => {
                const isCompleted = stageData?.[stage]?.validatedAt != null
                const isCurrent = stage === currentStage
                const canRewind =
                  isCompleted &&
                  index >= currentIndex - 2 &&
                  index < currentIndex &&
                  onRewindRequest != null

                return (
                  <div key={stage} className="flex items-center">
                    {/* Connecting line (before circle, skip first) */}
                    {index > 0 && (
                      <div
                        className={cn(
                          "h-px w-3",
                          index <= currentIndex &&
                            stageData?.[STAGE_ORDER[index - 1]]?.validatedAt !=
                              null
                            ? "bg-[var(--chat-success)]"
                            : "bg-[var(--chat-border)]"
                        )}
                      />
                    )}

                    {/* Number circle with tooltip */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            if (canRewind) onRewindRequest!(stage)
                          }}
                          disabled={!canRewind && !isCurrent}
                          className={cn(
                            "w-7 h-7 flex items-center justify-center rounded-full text-[11px] font-mono font-semibold transition-all duration-150 shrink-0",
                            isCompleted
                              ? "bg-[var(--chat-success)] text-[var(--chat-background)]"
                              : isCurrent
                                ? "bg-transparent border-2 border-[color:var(--chat-success)] text-[var(--chat-success)]"
                                : "bg-transparent border border-[color:var(--chat-border)] text-[var(--chat-muted-foreground)]",
                            canRewind && "active:scale-95 cursor-pointer"
                          )}
                          aria-label={getStageLabel(stage)}
                        >
                          {index + 1}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        sideOffset={6}
                        className="font-sans text-xs"
                      >
                        {getStageLabel(stage)}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )
              })}
            </div>
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}
