"use client"

import { useState, useCallback, useRef } from "react"
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
import { GitBranch, EditPencil, Plus, Xmark, FloppyDisk } from "iconoir-react"
import { Skeleton } from "@/components/ui/skeleton"
import { RewindConfirmationDialog } from "@/components/paper/RewindConfirmationDialog"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { resolvePaperDisplayTitle } from "@/lib/paper/title-resolver"
import type { OutlineSection } from "@/lib/paper/stage-types"
import { getSectionsForStage } from "@/lib/paper/outline-utils"

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

interface PendingEdit {
  action: "add" | "edit" | "remove"
  sectionId: string
  parentId?: string
  judul?: string
  estimatedWordCount?: number
}

interface MilestoneItemProps {
  stageId: PaperStageId
  index: number
  state: MilestoneState
  isLast: boolean
  canRewind: boolean
  rewindReason?: string
  onRewindClick?: () => void
  outlineSections?: OutlineSection[]
  isCurrentStage?: boolean
  editMode?: boolean
  onEditSection?: (sectionId: string, judul: string) => void
  onRemoveSection?: (sectionId: string) => void
  onAddSection?: (parentId: string) => void
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
  outlineSections,
  isCurrentStage,
  editMode,
  onEditSection,
  onRemoveSection,
  onAddSection,
}: MilestoneItemProps) {
  const [expanded, setExpanded] = useState(isCurrentStage ?? false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const label = getStageLabel(stageId)
  const hasSections = outlineSections && outlineSections.length > 0

  // Section stats
  const completedCount = outlineSections?.filter(s => s.status === "complete").length ?? 0
  const totalCount = outlineSections?.length ?? 0

  // Status text based on state
  const statusText =
    state === "completed"
      ? "Selesai"
      : state === "current"
        ? "Sedang berjalan"
        : undefined

  // Toggle expand on header click (only if has sections and not a rewind action)
  const handleHeaderClick = useCallback(() => {
    if (hasSections) {
      setExpanded(prev => !prev)
    }
  }, [hasSections])

  // Milestone dot element - Teal family: dark (completed), light (current), muted (pending)
  const dotElement = (
    <div
      className={cn(
        "w-3 h-3 rounded-full border-2 shrink-0 z-10 transition-all",
        state === "completed" &&
          "bg-[oklch(0.777_0.152_181.912)] border-[color:oklch(0.777_0.152_181.912)]",
        // Current state: teal-600 (darkest) — active focus
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
      <div className={cn("pb-4 flex-1 min-w-0", isLast && "pb-0")}>
        {/* Header row — clickable to expand/collapse when has sections */}
        <div
          className={cn(
            "flex items-center gap-1",
            hasSections && !canRewind && "cursor-pointer"
          )}
          onClick={canRewind ? onRewindClick : handleHeaderClick}
        >
          <div
            className={cn(
              "text-sm font-mono transition-colors flex-1",
              state === "completed" && "font-semibold text-[var(--chat-foreground)]",
              state === "current" && "font-semibold text-[var(--chat-foreground)]",
              state === "pending" && "font-medium text-[var(--chat-muted-foreground)]",
              canRewind && "group-hover:text-[var(--chat-foreground)]"
            )}
          >
            {index + 1}. {label}
          </div>
          {/* Section count badge (collapsed) */}
          {hasSections && !expanded && (
            <span className="text-[10px] font-mono text-[var(--chat-muted-foreground)] shrink-0">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>

        {/* Status text */}
        {statusText && (
          <div
            className={cn(
              "text-xs font-mono transition-colors",
              state === "completed" && "text-[var(--chat-foreground)]",
              state === "current" && "text-[var(--chat-muted-foreground)]"
            )}
          >
            {statusText}
          </div>
        )}

        {/* Outline sub-items (expanded) */}
        {hasSections && expanded && (
          <div className="mt-1.5 space-y-0.5">
            {outlineSections!.map(section => (
              <div
                key={section.id}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-mono group/section",
                  section.status === "complete"
                    ? "text-[var(--chat-foreground)]"
                    : "text-[var(--chat-muted-foreground)]",
                  (section.level ?? 2) >= 3 && "pl-3"
                )}
              >
                <span className="shrink-0 w-3 text-center">
                  {section.status === "complete" ? "✓" : "○"}
                </span>
                {editMode && editingId === section.id ? (
                  <input
                    ref={inputRef}
                    className="flex-1 min-w-0 bg-transparent border-b border-[var(--chat-border)] outline-none text-xs font-mono px-0 py-0.5"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && editValue.trim()) {
                        onEditSection?.(section.id, editValue.trim())
                        setEditingId(null)
                      }
                      if (e.key === "Escape") {
                        setEditingId(null)
                      }
                    }}
                    onBlur={() => {
                      if (editValue.trim() && editValue.trim() !== section.judul) {
                        onEditSection?.(section.id, editValue.trim())
                      }
                      setEditingId(null)
                    }}
                    autoFocus
                  />
                ) : (
                  <span
                    className={cn("truncate flex-1", editMode && "cursor-text")}
                    onClick={editMode ? () => {
                      setEditingId(section.id)
                      setEditValue(section.judul ?? "")
                    } : undefined}
                  >
                    {section.judul}
                  </span>
                )}
                {editMode && editingId !== section.id && (
                  <button
                    className="shrink-0 opacity-0 group-hover/section:opacity-100 text-[var(--chat-muted-foreground)] hover:text-[color:var(--destructive)] transition-opacity"
                    onClick={() => onRemoveSection?.(section.id)}
                    aria-label={`Hapus ${section.judul}`}
                  >
                    <Xmark className="w-3 h-3" strokeWidth={2} />
                  </button>
                )}
              </div>
            ))}
            {/* Add section button in edit mode */}
            {editMode && (
              <button
                className="flex items-center gap-1.5 text-xs font-mono text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)] transition-colors mt-1"
                onClick={() => onAddSection?.(stageId)}
              >
                <Plus className="w-3 h-3" strokeWidth={2} />
                <span>Tambah subbab</span>
              </button>
            )}
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
 * Shows outline sub-items with expand/collapse when outline exists.
 *
 * Components:
 * - Header: Title "Progress", subtitle (paper name), progress bar with percentage
 * - Milestone timeline: 13 stages with states (completed, current, pending)
 * - Outline sub-items: checkmark status per outline section within each stage
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
    updateOutlineSections,
    isLoading,
  } = usePaperSession(conversationId as Id<"conversations"> | undefined)

  const conversation = useQuery(
    api.conversations.getConversation,
    conversationId ? { conversationId: conversationId as Id<"conversations"> } : "skip"
  )

  // Outline edit mode state
  const [editMode, setEditMode] = useState(false)
  const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const addCounter = useRef(0)

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

  // Outline edit handlers
  const handleEditSection = useCallback((sectionId: string, judul: string) => {
    setPendingEdits(prev => {
      // Replace existing edit for same section, or add new
      const existing = prev.findIndex(e => e.sectionId === sectionId && e.action === "edit")
      if (existing !== -1) {
        const updated = [...prev]
        updated[existing] = { ...updated[existing], judul }
        return updated
      }
      return [...prev, { action: "edit" as const, sectionId, judul }]
    })
  }, [])

  const handleRemoveSection = useCallback((sectionId: string) => {
    setPendingEdits(prev => {
      // If this section was added in this batch, just remove the add
      const addIdx = prev.findIndex(e => e.sectionId === sectionId && e.action === "add")
      if (addIdx !== -1) {
        return prev.filter((_, i) => i !== addIdx)
      }
      // Remove any pending edits for this section, then add remove
      return [
        ...prev.filter(e => e.sectionId !== sectionId),
        { action: "remove" as const, sectionId },
      ]
    })
  }, [])

  const handleAddSection = useCallback((parentId: string) => {
    addCounter.current++
    const newId = `${parentId}.new_${addCounter.current}`
    setPendingEdits(prev => [
      ...prev,
      { action: "add" as const, sectionId: newId, parentId, judul: "Subbab baru" },
    ])
  }, [])

  const handleSaveEdits = useCallback(async () => {
    if (!user?._id || pendingEdits.length === 0) return
    setIsSaving(true)
    try {
      await updateOutlineSections(user._id, pendingEdits)
      setPendingEdits([])
      setEditMode(false)
    } catch (err) {
      console.error("Failed to save outline edits:", err)
    } finally {
      setIsSaving(false)
    }
  }, [user?._id, pendingEdits, updateOutlineSections])

  const handleCancelEdits = useCallback(() => {
    setPendingEdits([])
    setEditMode(false)
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

  // Empty state - no paper session in this conversation
  if (!isPaperMode || !session) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-[var(--chat-muted-foreground)] opacity-50">
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
  const { displayTitle: paperTitle } = resolvePaperDisplayTitle({
    paperTitle: session.paperTitle,
    workingTitle: session.workingTitle,
    conversationTitle: conversation?.title,
  })

  // Extract outline sections for sub-item display
  const outlineData = stageData?.outline as Record<string, unknown> | undefined
  const allOutlineSections = (outlineData?.sections ?? []) as OutlineSection[]

  // Can edit outline: must be past outline stage and outline must exist
  const PRE_OUTLINE = ["gagasan", "topik", "outline"]
  const canEditOutline = allOutlineSections.length > 0
    && !PRE_OUTLINE.includes(currentStage as string)
    && currentStage !== "completed"

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
        <div className="p-4 border-b border-[color:var(--chat-sidebar-border)]">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--chat-muted-foreground)]">Progress</div>
            {canEditOutline && !editMode && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-0.5 text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)] transition-colors"
                    onClick={() => setEditMode(true)}
                    aria-label="Edit outline"
                  >
                    <EditPencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="font-mono text-xs">
                  Edit subbab outline
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="text-xs font-mono text-[var(--chat-muted-foreground)] truncate mb-3">
            {paperTitle}
          </div>

          {/* Progress Bar - Mechanical Grace: .rounded-full, Emerald fill */}
          <div className="space-y-1">
            <div className="h-2 rounded-full overflow-hidden bg-[var(--chat-muted)] ring-1 ring-[var(--chat-border)]">
              <div
                className="h-full bg-[var(--chat-success)] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-xs font-mono text-[var(--chat-muted-foreground)] text-right">
              {progressPercent}% &middot; Stage {stageNumber}/{totalStages}
            </div>
          </div>
        </div>

        {/* Milestone Timeline */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {STAGE_ORDER.map((stageId, index) => {
            const state = getMilestoneState(stageId)
            const rewindInfo = getRewindInfo(stageId, index)
            let sectionsForStage = allOutlineSections.length > 0
              ? getSectionsForStage(stageId, allOutlineSections)
              : undefined

            // In edit mode, merge pending edits into display
            if (editMode && sectionsForStage) {
              const removedIds = new Set(pendingEdits.filter(e => e.action === "remove").map(e => e.sectionId))
              sectionsForStage = sectionsForStage
                .filter(s => !removedIds.has(s.id))
                .map(s => {
                  const editForSection = pendingEdits.find(e => e.sectionId === s.id && e.action === "edit")
                  return editForSection ? { ...s, judul: editForSection.judul } : s
                })
              // Add pending "add" sections for this stage
              const addsForStage = pendingEdits.filter(
                e => e.action === "add" && e.parentId === stageId
              )
              for (const add of addsForStage) {
                sectionsForStage.push({
                  id: add.sectionId,
                  judul: add.judul,
                  level: 2,
                  parentId: stageId,
                })
              }
            }

            return (
              <MilestoneItem
                key={stageId}
                stageId={stageId}
                index={index}
                state={state}
                isLast={index === STAGE_ORDER.length - 1}
                canRewind={!editMode && state === "completed" && rewindInfo.canRewind}
                rewindReason={rewindInfo.reason}
                onRewindClick={() => handleStageClick(stageId, index)}
                outlineSections={sectionsForStage && sectionsForStage.length > 0 ? sectionsForStage : undefined}
                isCurrentStage={state === "current"}
                editMode={editMode}
                onEditSection={handleEditSection}
                onRemoveSection={handleRemoveSection}
                onAddSection={handleAddSection}
              />
            )
          })}
        </div>

        {/* Edit mode: Save/Cancel bar */}
        {editMode && (
          <div className="p-3 border-t border-[color:var(--chat-sidebar-border)] flex items-center gap-2">
            <button
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-action text-xs font-mono font-semibold transition-colors",
                pendingEdits.length > 0
                  ? "bg-[var(--chat-success)] text-white hover:opacity-90"
                  : "bg-[var(--chat-muted)] text-[var(--chat-muted-foreground)] cursor-not-allowed"
              )}
              onClick={handleSaveEdits}
              disabled={pendingEdits.length === 0 || isSaving}
            >
              <FloppyDisk className="w-3.5 h-3.5" strokeWidth={1.5} />
              {isSaving ? "Menyimpan..." : `Simpan (${pendingEdits.length})`}
            </button>
            <button
              className="px-3 py-1.5 rounded-action text-xs font-mono text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)] border border-[var(--chat-border)] transition-colors"
              onClick={handleCancelEdits}
              disabled={isSaving}
            >
              Batal
            </button>
          </div>
        )}
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
