"use client"

import { useState, useCallback } from "react"
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { Id } from "../../../../convex/_generated/dataModel"
import {
  STAGE_ORDER,
  getStageLabel,
  getStageNumber,
  type PaperStageId,
} from "../../../../convex/paperSessions/constants"
import { cn } from "@/lib/utils"
import { GitBranch } from "iconoir-react"
import { Skeleton } from "@/components/ui/skeleton"
import { RewindConfirmationDialog } from "@/components/paper/RewindConfirmationDialog"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum number of stages back that user can rewind */
const MAX_REWIND_STAGES = 2

// ============================================================================
// TYPES
// ============================================================================

interface SidebarProgressProps {
  conversationId: string | null
}

type MilestoneState = "completed" | "current" | "pending"

interface StageDataEntry {
  validatedAt?: number
  [key: string]: unknown
}

interface MilestoneItemProps {
  stageId: PaperStageId
  index: number
  state: MilestoneState
  isLast: boolean
  canRewind: boolean
  rewindReason?: string
  onRewindClick?: () => void
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a stage is a valid rewind target
 * - Must be completed (has validatedAt)
 * - Must be within MAX_REWIND_STAGES of current stage
 * - Must be before current stage (not current or future)
 */
function isValidRewindTarget(
  stageId: PaperStageId,
  stageIndex: number,
  currentIndex: number,
  stageData?: Record<string, StageDataEntry>
): { canRewind: boolean; reason?: string } {
  // Not a completed stage
  if (stageIndex >= currentIndex) {
    return { canRewind: false }
  }

  // No stageData provided
  if (!stageData) {
    return { canRewind: false }
  }

  // Stage was never validated
  const stageEntry = stageData[stageId]
  if (!stageEntry?.validatedAt) {
    return { canRewind: false, reason: "Stage ini belum pernah divalidasi" }
  }

  // Beyond max rewind limit
  const stagesBack = currentIndex - stageIndex
  if (stagesBack > MAX_REWIND_STAGES) {
    return {
      canRewind: false,
      reason: `Hanya bisa rewind max ${MAX_REWIND_STAGES} tahap ke belakang`,
    }
  }

  return { canRewind: true }
}

// ============================================================================
// MILESTONE ITEM COMPONENT
// ============================================================================

function MilestoneItem({
  stageId,
  index,
  state,
  isLast,
  canRewind,
  rewindReason,
  onRewindClick,
}: MilestoneItemProps) {
  const label = getStageLabel(stageId)

  // Status text based on state (matches mockup: English labels)
  const statusText =
    state === "completed"
      ? "Completed"
      : state === "current"
        ? "In Progress"
        : undefined

  // Milestone dot element - Mechanical Grace: Amber for completed
  const dotElement = (
    <div
      className={cn(
        "w-3 h-3 rounded-full border-2 shrink-0 z-10 transition-all",
        state === "completed" && "bg-amber-500 border-amber-500",
        // Current state: solid fill + ring outline
        state === "current" && "bg-sky-500 border-sky-500 ring-2 ring-sky-500/30 ring-offset-1 ring-offset-sidebar",
        state === "pending" && "bg-transparent border-muted-foreground/50",
        // Rewind styles
        canRewind &&
          "cursor-pointer hover:scale-125 hover:ring-2 hover:ring-amber-500/50"
      )}
      onClick={canRewind ? onRewindClick : undefined}
      role={canRewind ? "button" : undefined}
      tabIndex={canRewind ? 0 : undefined}
      onKeyDown={
        canRewind
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onRewindClick?.()
              }
            }
          : undefined
      }
      aria-label={canRewind ? `Kembali ke tahap ${label}` : undefined}
    />
  )

  // Show tooltip for non-rewindable completed stages
  const showTooltip = state === "completed" && !canRewind && rewindReason

  return (
    <div
      className={cn(
        "flex gap-3 relative group",
        canRewind && "cursor-pointer"
      )}
      onClick={canRewind ? onRewindClick : undefined}
    >
      {/* Milestone Dot & Line */}
      <div className="flex flex-col items-center">
        {/* Dot with optional tooltip */}
        {showTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>{dotElement}</TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px] font-mono text-xs">
              {rewindReason}
            </TooltipContent>
          </Tooltip>
        ) : (
          dotElement
        )}
        {/* Connecting Line - Mechanical Grace: .border-hairline */}
        {!isLast && (
          <div
            className={cn(
              "w-0.5 flex-1 min-h-[24px]",
              state === "completed" ? "bg-amber-500" : "bg-slate-700"
            )}
          />
        )}
      </div>

      {/* Milestone Content - Mechanical Grace: .text-interface */}
      <div className={cn("pb-4", isLast && "pb-0")}>
        <div
          className={cn(
            "text-sm font-mono font-medium transition-colors",
            state === "current" && "text-sky-400",
            state === "pending" && "text-muted-foreground",
            canRewind && "group-hover:text-amber-400"
          )}
        >
          {index + 1}. {label}
        </div>
        {statusText && (
          <div
            className={cn(
              "text-xs font-mono transition-colors",
              // Mechanical Grace: Amber completed, Sky in progress
              state === "completed" && "text-amber-500",
              state === "current" && "text-sky-400"
            )}
          >
            {statusText}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * SidebarProgress - Paper milestone timeline with Rewind support
 *
 * Displays a vertical timeline of the 13 paper writing stages.
 * Shows progress for the current conversation's paper session.
 * Supports rewind to previous stages (max 2 stages back).
 *
 * Components:
 * - Header: Title "Progress", subtitle (paper name), progress bar with percentage
 * - Milestone timeline: 13 stages with states (completed, current, pending)
 * - Rewind: Click completed stages to rewind (with confirmation dialog)
 * - Empty state: "No active paper session" if no paper in conversation
 */
export function SidebarProgress({ conversationId }: SidebarProgressProps) {
  // Get user for rewind mutation
  const { user } = useCurrentUser()

  // Get paper session for current conversation
  const {
    session,
    isPaperMode,
    currentStage,
    stageData,
    rewindToStage,
    isLoading,
  } = usePaperSession(conversationId as Id<"conversations"> | undefined)

  // Rewind dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [targetStageForRewind, setTargetStageForRewind] =
    useState<PaperStageId | null>(null)
  const [isRewindPending, setIsRewindPending] = useState(false)

  // Current stage index for rewind calculations
  const currentIndex =
    currentStage === "completed"
      ? STAGE_ORDER.length
      : STAGE_ORDER.indexOf(currentStage as PaperStageId)

  // Handle click on a completed stage
  const handleStageClick = useCallback(
    (stageId: PaperStageId, stageIndex: number) => {
      const { canRewind } = isValidRewindTarget(
        stageId,
        stageIndex,
        currentIndex,
        stageData as Record<string, StageDataEntry> | undefined
      )
      if (!canRewind) return

      // Open confirmation dialog
      setTargetStageForRewind(stageId)
      setDialogOpen(true)
    },
    [currentIndex, stageData]
  )

  // Handle rewind confirmation
  const handleRewindConfirm = useCallback(async () => {
    if (!targetStageForRewind || !user?._id) return

    setIsRewindPending(true)
    try {
      await rewindToStage(user._id, targetStageForRewind)
    } finally {
      setIsRewindPending(false)
      setDialogOpen(false)
      setTargetStageForRewind(null)
    }
  }, [targetStageForRewind, user?._id, rewindToStage])

  // Handle dialog close
  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setTargetStageForRewind(null)
    }
    setDialogOpen(open)
  }, [])

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
        <GitBranch className="h-8 w-8 mb-2" />
        <span className="text-sm font-mono font-medium mb-1">Tidak ada paper aktif</span>
        <span className="text-xs font-mono">
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

    // Handle "completed" special case
    if (currentStage === "completed") {
      return "completed"
    }

    if (stageIndex < currentIndex) return "completed"
    if (stageIndex === currentIndex) return "current"
    return "pending"
  }

  // Check if stage can be rewound to
  const getRewindInfo = (
    stageId: PaperStageId,
    stageIndex: number
  ): { canRewind: boolean; reason?: string } => {
    return isValidRewindTarget(
      stageId,
      stageIndex,
      currentIndex,
      stageData as Record<string, StageDataEntry> | undefined
    )
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header - Mechanical Grace: .border-hairline */}
        <div className="p-4 border-b border-slate-800">
          <div className="text-sm font-semibold mb-1">Progress</div>
          <div className="text-xs font-mono text-muted-foreground truncate mb-3">
            {paperTitle}
          </div>

          {/* Progress Bar - Mechanical Grace: .rounded-full, Amber fill */}
          <div className="space-y-1">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-xs font-mono text-muted-foreground text-right">
              {progressPercent}% &middot; Stage {stageNumber}/{totalStages}
            </div>
          </div>
        </div>

        {/* Milestone Timeline */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {STAGE_ORDER.map((stageId, index) => {
            const state = getMilestoneState(stageId)
            const rewindInfo = getRewindInfo(stageId, index)

            return (
              <MilestoneItem
                key={stageId}
                stageId={stageId}
                index={index}
                state={state}
                isLast={index === STAGE_ORDER.length - 1}
                canRewind={state === "completed" && rewindInfo.canRewind}
                rewindReason={rewindInfo.reason}
                onRewindClick={() => handleStageClick(stageId, index)}
              />
            )
          })}
        </div>
      </div>

      {/* Rewind Confirmation Dialog */}
      <RewindConfirmationDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        targetStage={targetStageForRewind}
        currentStage={currentStage as string}
        onConfirm={handleRewindConfirm}
        isSubmitting={isRewindPending}
      />
    </>
  )
}

export default SidebarProgress
