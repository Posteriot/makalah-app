"use client"

import { usePaperSession } from "@/lib/hooks/usePaperSession"
import { Id } from "../../../../convex/_generated/dataModel"
import {
  STAGE_ORDER,
  getStageLabel,
  getStageNumber,
  type PaperStageId,
} from "../../../../convex/paperSessions/constants"
import { cn } from "@/lib/utils"
import { GitBranchIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface SidebarProgressProps {
  conversationId: string | null
}

type MilestoneState = "completed" | "current" | "pending"

interface MilestoneItemProps {
  stageId: PaperStageId
  index: number
  state: MilestoneState
  isLast: boolean
}

function MilestoneItem({ stageId, index, state, isLast }: MilestoneItemProps) {
  const label = getStageLabel(stageId)

  // Status text based on state
  const statusText =
    state === "completed"
      ? "Selesai"
      : state === "current"
        ? "Sedang dikerjakan"
        : undefined

  return (
    <div className="flex gap-3 relative">
      {/* Milestone Dot & Line */}
      <div className="flex flex-col items-center">
        {/* Dot */}
        <div
          className={cn(
            "w-3 h-3 rounded-full border-2 shrink-0 z-10",
            state === "completed" && "bg-success border-success",
            state === "current" && "bg-primary border-primary",
            state === "pending" && "bg-transparent border-muted-foreground/50"
          )}
        />
        {/* Connecting Line */}
        {!isLast && (
          <div
            className={cn(
              "w-0.5 flex-1 min-h-[24px]",
              state === "completed" ? "bg-success" : "bg-muted-foreground/30"
            )}
          />
        )}
      </div>

      {/* Milestone Content */}
      <div className={cn("pb-4", isLast && "pb-0")}>
        <div
          className={cn(
            "text-sm font-medium",
            state === "current" && "text-primary",
            state === "pending" && "text-muted-foreground"
          )}
        >
          {index + 1}. {label}
        </div>
        {statusText && (
          <div
            className={cn(
              "text-xs",
              state === "completed" && "text-success",
              state === "current" && "text-primary"
            )}
          >
            {statusText}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * SidebarProgress - Paper milestone timeline
 *
 * Displays a vertical timeline of the 13 paper writing stages.
 * Shows progress for the current conversation's paper session.
 *
 * Components:
 * - Header: Title "Progress", subtitle (paper name), progress bar with percentage
 * - Milestone timeline: 13 stages with states (completed, current, pending)
 * - Empty state: "No active paper session" if no paper in conversation
 */
export function SidebarProgress({ conversationId }: SidebarProgressProps) {
  // Get paper session for current conversation
  const { session, isPaperMode, currentStage, isLoading } = usePaperSession(
    conversationId as Id<"conversations"> | undefined
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-3 w-3 rounded-full shrink-0" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state - no paper session in this conversation
  if (!isPaperMode || !session) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground opacity-50">
        <GitBranchIcon className="h-8 w-8 mb-2" />
        <span className="text-sm font-medium mb-1">Tidak ada paper aktif</span>
        <span className="text-xs">
          Percakapan ini bukan sesi penulisan paper
        </span>
      </div>
    )
  }

  // Calculate progress
  const stageNumber = getStageNumber(currentStage)
  const totalStages = STAGE_ORDER.length
  const progressPercent = Math.round((stageNumber / totalStages) * 100)
  const paperTitle = session.paperTitle || "Paper Tanpa Judul"

  // Determine state for each milestone
  const getMilestoneState = (stageId: PaperStageId): MilestoneState => {
    const stageIndex = STAGE_ORDER.indexOf(stageId)
    const currentIndex = STAGE_ORDER.indexOf(currentStage as PaperStageId)

    // Handle "completed" special case
    if (currentStage === "completed") {
      return "completed"
    }

    if (stageIndex < currentIndex) return "completed"
    if (stageIndex === currentIndex) return "current"
    return "pending"
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="text-sm font-semibold mb-1">Progress</div>
        <div className="text-xs text-muted-foreground truncate mb-3">
          {paperTitle}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {progressPercent}% &middot; Stage {stageNumber}/{totalStages}
          </div>
        </div>
      </div>

      {/* Milestone Timeline */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {STAGE_ORDER.map((stageId, index) => (
          <MilestoneItem
            key={stageId}
            stageId={stageId}
            index={index}
            state={getMilestoneState(stageId)}
            isLast={index === STAGE_ORDER.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

export default SidebarProgress
