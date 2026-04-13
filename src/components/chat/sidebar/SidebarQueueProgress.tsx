"use client"

import { useState, useCallback, useMemo } from "react"
import { useQuery } from "convex/react"
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import {
  STAGE_ORDER,
  getStageLabel,
  getStageNumber,
  type PaperStageId,
} from "../../../../convex/paperSessions/constants"
import { cn } from "@/lib/utils"
import { GitBranch, NavArrowDown, NavArrowRight } from "iconoir-react"
import { Skeleton } from "@/components/ui/skeleton"
import { RewindConfirmationDialog } from "@/components/paper/RewindConfirmationDialog"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { resolvePaperDisplayTitle } from "@/lib/paper/title-resolver"
import {
  PHASE_GROUPS,
  deriveTaskList,
  type TaskItem,
} from "@/lib/paper/task-derivation"

// ============================================================================
// TYPES
// ============================================================================

interface SidebarQueueProgressProps {
  conversationId: string | null
}

type MilestoneState = "completed" | "current" | "pending"

interface StageDataEntry {
  validatedAt?: number
  [key: string]: unknown
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a stage is a valid rewind target
 * - Must be completed (has validatedAt)
 * - Must be before current stage (not current or future)
 */
function isValidRewindTarget(
  stageId: PaperStageId,
  stageIndex: number,
  currentIndex: number,
  stageData?: Record<string, StageDataEntry>
): { canRewind: boolean; reason?: string } {
  if (stageIndex >= currentIndex) {
    return { canRewind: false }
  }

  if (!stageData) {
    return { canRewind: false }
  }

  const stageEntry = stageData[stageId]
  if (!stageEntry?.validatedAt) {
    return { canRewind: false, reason: "Stage ini belum pernah divalidasi" }
  }

  return { canRewind: true }
}

// ============================================================================
// TASK ITEM COMPONENT
// ============================================================================

function TaskListItem({ task }: { task: TaskItem }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          task.status === "complete" && "bg-[oklch(0.777_0.152_181.912)]",
          task.status === "pending" && "bg-[var(--chat-muted-foreground)] opacity-40"
        )}
      />
      <span
        className={cn(
          "text-[11px] font-sans",
          task.status === "complete" && "text-[var(--chat-muted-foreground)]",
          task.status === "pending" && "text-[var(--chat-muted-foreground)] opacity-60"
        )}
      >
        {task.label}
      </span>
    </div>
  )
}

// ============================================================================
// MILESTONE ITEM COMPONENT
// ============================================================================

interface MilestoneItemProps {
  stageId: PaperStageId
  index: number
  state: MilestoneState
  isLast: boolean
  canRewind: boolean
  rewindReason?: string
  onRewindClick?: () => void
  subTasks?: TaskItem[]
}

function MilestoneItem({
  stageId,
  index,
  state,
  isLast,
  canRewind,
  rewindReason,
  onRewindClick,
  subTasks,
}: MilestoneItemProps) {
  const label = getStageLabel(stageId)

  // Status text based on state
  const statusText =
    state === "completed"
      ? "Selesai"
      : state === "current"
        ? "Sedang berjalan"
        : undefined

  // Milestone dot element - Teal family: dark (completed), light (current), muted (pending)
  const dotElement = (
    <div
      className={cn(
        "w-3 h-3 rounded-full border-2 shrink-0 z-10 transition-all",
        state === "completed" &&
          "bg-[oklch(0.777_0.152_181.912)] border-[color:oklch(0.777_0.152_181.912)]",
        // Current state: teal-600 (darkest) -- active focus
        state === "current" &&
          "bg-[var(--chat-success)] border-[color:var(--chat-success)] ring-2 ring-[var(--chat-success)] ring-offset-1 ring-offset-[var(--chat-sidebar)]",
        state === "pending" && "bg-transparent border-[color:var(--chat-muted-foreground)]",
        // Rewind styles
        canRewind &&
          "cursor-pointer hover:scale-125 hover:ring-2 hover:ring-[var(--chat-success)]"
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
        {/* Connecting Line */}
        {!isLast && (
          <div
            className={cn(
              "w-0.5 flex-1 min-h-[24px]",
              state === "completed" &&
                "bg-gradient-to-b from-[oklch(0.777_0.152_181.912)] to-[var(--chat-success)]",
              state === "current" &&
                "bg-gradient-to-b from-[var(--chat-success)] to-[var(--chat-border)]",
              state === "pending" && "bg-[var(--chat-border)]"
            )}
          />
        )}
      </div>

      {/* Milestone Content */}
      <div className={cn("pb-4", isLast && "pb-0")}>
        <div
          className={cn(
            "text-sm font-mono transition-colors",
            state === "completed" && "font-medium text-[color:color-mix(in_oklab,var(--chat-foreground)_82%,var(--chat-muted-foreground))]",
            state === "current" && "font-semibold text-[var(--chat-foreground)]",
            state === "pending" && "font-medium text-[color:color-mix(in_oklab,var(--chat-muted-foreground)_92%,var(--chat-sidebar-border))]",
            canRewind && "group-hover:text-[var(--chat-foreground)]"
          )}
        >
          {index + 1}. {label}
        </div>
        {statusText && (
          <div
            className={cn(
              "text-[11px] font-sans transition-colors",
              state === "completed" && "text-[var(--chat-muted-foreground)]",
              state === "current" && "text-[color:color-mix(in_oklab,var(--chat-foreground)_78%,var(--chat-muted-foreground))]"
            )}
          >
            {statusText}
          </div>
        )}
        {/* Sub-tasks: only shown for current/active stage */}
        {subTasks && subTasks.length > 0 && state === "current" && (
          <div className="mt-1.5 ml-0.5 space-y-0">
            {subTasks.map((task) => (
              <TaskListItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// PHASE SECTION COMPONENT
// ============================================================================

interface PhaseSectionProps {
  label: string
  stages: readonly PaperStageId[]
  currentIndex: number
  currentStage: PaperStageId | "completed"
  stageData?: Record<string, StageDataEntry>
  onStageClick: (stageId: PaperStageId, stageIndex: number) => void
  /** Whether this is the last phase group (affects last-stage line rendering) */
  isLastPhase: boolean
}

function PhaseSection({
  label,
  stages,
  currentIndex,
  currentStage,
  stageData,
  onStageClick,
  isLastPhase,
}: PhaseSectionProps) {
  const getMilestoneState = (stageId: PaperStageId): MilestoneState => {
    const stageIndex = STAGE_ORDER.indexOf(stageId)
    if (currentStage === "completed") return "completed"
    if (stageIndex < currentIndex) return "completed"
    if (stageIndex === currentIndex) return "current"
    return "pending"
  }

  // Determine phase status for auto-expand logic
  const phaseStates = stages.map((s) => getMilestoneState(s))
  const hasCurrentStage = phaseStates.includes("current")
  const allCompleted = phaseStates.every((s) => s === "completed")
  const allPending = phaseStates.every((s) => s === "pending")

  // Auto-expand: phase with current stage = expanded, completed = expanded, future = collapsed
  const defaultOpen = hasCurrentStage || allCompleted
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Count completed stages in this phase
  const completedCount = phaseStates.filter((s) => s === "completed").length
  const totalCount = stages.length

  // Derive sub-tasks for the active stage
  const activeStageId = hasCurrentStage
    ? stages[phaseStates.indexOf("current")]
    : undefined
  const subTaskSummary = useMemo(() => {
    if (!activeStageId || !stageData) return null
    return deriveTaskList(activeStageId, stageData as Record<string, unknown>)
  }, [activeStageId, stageData])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 py-1.5 px-0 group/phase cursor-pointer">
        {isOpen ? (
          <NavArrowDown className="h-3 w-3 text-[var(--chat-muted-foreground)] shrink-0" />
        ) : (
          <NavArrowRight className="h-3 w-3 text-[var(--chat-muted-foreground)] shrink-0" />
        )}
        <span
          className={cn(
            "text-[10px] font-mono font-bold uppercase tracking-widest",
            allPending
              ? "text-[var(--chat-muted-foreground)] opacity-50"
              : "text-[var(--chat-muted-foreground)]"
          )}
        >
          {label}
        </span>
        <span className="text-[10px] font-mono text-[var(--chat-muted-foreground)] ml-auto">
          {completedCount}/{totalCount}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-1 mt-1">
          {stages.map((stageId, phaseIdx) => {
            const globalIndex = STAGE_ORDER.indexOf(stageId)
            const state = getMilestoneState(stageId)
            const rewindInfo = isValidRewindTarget(
              stageId,
              globalIndex,
              currentIndex,
              stageData
            )
            // isLast: last stage in this phase AND last phase overall
            const isLastInPhase = phaseIdx === stages.length - 1
            const isLastOverall = isLastPhase && isLastInPhase

            return (
              <MilestoneItem
                key={stageId}
                stageId={stageId}
                index={globalIndex}
                state={state}
                isLast={isLastOverall}
                canRewind={state === "completed" && rewindInfo.canRewind}
                rewindReason={rewindInfo.reason}
                onRewindClick={() => onStageClick(stageId, globalIndex)}
                subTasks={
                  state === "current" ? subTaskSummary?.tasks : undefined
                }
              />
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * SidebarQueueProgress - Phase-grouped paper milestone timeline with sub-task visibility
 *
 * Replaces SidebarProgress with:
 * - 4 collapsible phase sections (Foundation, Core Sections, Results & Analysis, Finalization)
 * - Sub-task list under the active stage derived from stageData
 * - Auto-expand logic: current phase expanded, completed phases expanded, future phases collapsed
 *
 * Preserves all SidebarProgress features:
 * - Rewind support (any validated stage) with confirmation dialog
 * - Progress header with title and percentage bar
 * - Loading, empty, and no-conversation states
 */
export function SidebarQueueProgress({ conversationId }: SidebarQueueProgressProps) {
  // Get user for rewind mutation
  const { user } = useCurrentUser()

  // Get paper session for current conversation
  const {
    session,
    currentStage,
    stageData,
    rewindToStage,
    isLoading,
  } = usePaperSession(conversationId as Id<"conversations"> | undefined)

  const conversation = useQuery(
    api.conversations.getConversation,
    conversationId ? { conversationId: conversationId as Id<"conversations"> } : "skip"
  )

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

  // Initial state before any conversation is selected
  if (!conversationId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-[var(--chat-muted-foreground)] opacity-50">
        <GitBranch className="h-8 w-8 mb-2" />
        <span className="text-sm font-mono font-medium">
          Belum ada linimasa progres penyusunan paper. Silakan mulai percakapan baru.
        </span>
      </div>
    )
  }

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

  // Loading guard - session is resolving from Convex
  if (!session) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-xs text-[var(--chat-muted-foreground)]">Memuat...</span>
      </div>
    )
  }

  // Calculate progress
  const stageNumber = getStageNumber(currentStage)
  const totalStages = STAGE_ORDER.length
  const progressPercent = Math.round((stageNumber / totalStages) * 100)
  const { displayTitle: paperTitle } = resolvePaperDisplayTitle({
    paperTitle: session.paperTitle,
    workingTitle: session.workingTitle,
    conversationTitle: conversation?.title,
  })

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-[color:var(--chat-sidebar-border)]">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--chat-muted-foreground)] mb-1">Progress</div>
          <div className="text-xs font-sans font-medium text-[var(--chat-muted-foreground)] truncate mb-3">
            {paperTitle}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="h-2 rounded-full overflow-hidden bg-[var(--chat-muted)] ring-1 ring-[var(--chat-border)]">
              <div
                className="h-full bg-[var(--chat-success)] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-xs font-sans text-[var(--chat-muted-foreground)] text-right">
              {progressPercent}% &middot; Stage {stageNumber}/{totalStages}
            </div>
          </div>
        </div>

        {/* Phase-grouped Timeline */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin space-y-2">
          {PHASE_GROUPS.map((phase, phaseIdx) => (
            <PhaseSection
              key={`${conversationId}-${phase.label}`}
              label={phase.label}
              stages={phase.stages}
              currentIndex={currentIndex}
              currentStage={currentStage}
              stageData={stageData as Record<string, StageDataEntry> | undefined}
              onStageClick={handleStageClick}
              isLastPhase={phaseIdx === PHASE_GROUPS.length - 1}
            />
          ))}
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
