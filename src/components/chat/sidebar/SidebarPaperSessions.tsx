"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { Skeleton } from "@/components/ui/skeleton"
import { FileTextIcon, FolderIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getStageLabel,
  getStageNumber,
  type PaperStageId,
} from "../../../../convex/paperSessions/constants"
import { useState } from "react"
import { Id } from "../../../../convex/_generated/dataModel"

interface SidebarPaperSessionsProps {
  currentConversationId: string | null
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
  isArtifactPanelOpen?: boolean
  onArtifactPanelToggle?: () => void
  onCloseMobile?: () => void
}

interface PaperSessionItem {
  _id: Id<"paperSessions">
  conversationId: Id<"conversations">
  paperTitle?: string
  currentStage: string
  stageStatus: string
  _creationTime: number
  updatedAt?: number
}

interface ArtifactItem {
  _id: Id<"artifacts">
  title: string
  type: string
  version: number
  conversationId: Id<"conversations">
  invalidatedAt?: number
}

/**
 * SidebarPaperSessions - Paper session folder for ACTIVE conversation
 *
 * Displays paper session for the currently active conversation only.
 * Behavior matches SidebarProgress - shows content based on currentConversationId.
 * Multi-tab support: automatically updates when user switches tabs.
 *
 * Matches mockup: Orange folder icons, blue status dots, artifact items with badges.
 */
export function SidebarPaperSessions({
  currentConversationId,
  onArtifactSelect,
  isArtifactPanelOpen,
  onArtifactPanelToggle,
  onCloseMobile,
}: SidebarPaperSessionsProps) {
  const { user } = useCurrentUser()

  // Single folder expanded state (default: expanded)
  const [isExpanded, setIsExpanded] = useState(true)

  // Query paper session for ACTIVE conversation only (like SidebarProgress)
  const { session, isPaperMode, currentStage, isLoading } = usePaperSession(
    currentConversationId as Id<"conversations"> | undefined
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Header skeleton */}
        <div className="pt-5 px-4 pb-3">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
        {/* Items skeleton */}
        <div className="py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-[18px] w-[18px]" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state - no paper session in this conversation (matches SidebarProgress)
  if (!isPaperMode || !session) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="pt-5 px-4 pb-3">
          <div className="text-base font-semibold">Paper Sessions</div>
          <div className="text-[13px] text-muted-foreground">
            Paper folders and artifacts
          </div>
        </div>
        {/* Empty state - same messaging as SidebarProgress */}
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <FileTextIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <span className="text-sm text-muted-foreground/70 font-medium mb-1">
            Tidak ada paper aktif
          </span>
          <span className="text-xs text-muted-foreground/50">
            Percakapan ini bukan sesi penulisan paper
          </span>
        </div>
      </div>
    )
  }

  // Build session item from usePaperSession data
  const sessionItem: PaperSessionItem = {
    _id: session._id as Id<"paperSessions">,
    conversationId: session.conversationId as Id<"conversations">,
    paperTitle: session.paperTitle,
    currentStage: currentStage as string,
    stageStatus: session.stageStatus as string,
    _creationTime: session._creationTime,
    updatedAt: session.updatedAt,
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - matches mockup: padding 20px 16px 12px 16px, no border */}
      <div className="pt-5 px-4 pb-3">
        <div className="text-base font-semibold">Paper Sessions</div>
        <div className="text-[13px] text-muted-foreground">
          Paper folders and artifacts
        </div>
      </div>

      {/* Paper Folder - Single session for active conversation */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        <PaperFolderItem
          session={sessionItem}
          isExpanded={isExpanded}
          isSelected={true} // Always selected since it's the active conversation
          onToggle={() => setIsExpanded(!isExpanded)}
          onArtifactSelect={onArtifactSelect}
          isArtifactPanelOpen={isArtifactPanelOpen}
          onArtifactPanelToggle={onArtifactPanelToggle}
          onCloseMobile={onCloseMobile}
          userId={user!._id}
        />
      </div>
    </div>
  )
}

/**
 * PaperFolderItem - Individual paper folder with artifacts
 */
function PaperFolderItem({
  session,
  isExpanded,
  isSelected,
  onToggle,
  onArtifactSelect,
  isArtifactPanelOpen,
  onArtifactPanelToggle,
  onCloseMobile,
  userId,
}: {
  session: PaperSessionItem
  isExpanded: boolean
  isSelected: boolean
  onToggle: () => void
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
  isArtifactPanelOpen?: boolean
  onArtifactPanelToggle?: () => void
  onCloseMobile?: () => void
  userId: Id<"users">
}) {
  // Query artifacts for this paper session's conversation
  const artifacts = useQuery(
    api.artifacts.listByConversation,
    isExpanded
      ? { conversationId: session.conversationId, userId }
      : "skip"
  ) as ArtifactItem[] | undefined

  const stageNumber = getStageNumber(
    session.currentStage as PaperStageId | "completed"
  )
  const stageLabel = getStageLabel(
    session.currentStage as PaperStageId | "completed"
  )
  const paperTitle = session.paperTitle || "Paper_Tanpa_Judul"
  // Convert spaces to underscores for display (matching mockup style)
  const displayTitle = paperTitle.replace(/\s+/g, "_")

  // Status color - blue for in-progress, green for completed
  const isCompleted = session.currentStage === "completed"
  const statusColorClass = isCompleted ? "bg-success" : "bg-info"

  // Group artifacts by type and get latest version of each
  const latestArtifacts = artifacts
    ? getLatestArtifactVersions(artifacts)
    : []

  return (
    <div className="mb-0.5">
      {/* Folder Header */}
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-4 cursor-pointer transition-colors",
          "hover:bg-accent"
        )}
        onClick={onToggle}
      >
        {/* Chevron - rotates when expanded */}
        <ChevronRightIcon
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-150 shrink-0",
            isExpanded && "rotate-90"
          )}
        />

        {/* Status Dot - 8px, blue for in-progress */}
        <div
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            statusColorClass
          )}
        />

        {/* Folder Icon - ORANGE color (warning) */}
        <FolderIcon className="h-[18px] w-[18px] text-warning shrink-0" />

        {/* Folder Name */}
        <span className="text-[13px] font-medium truncate flex-1">
          {displayTitle}
        </span>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="pl-6">
          {/* Stage Info */}
          <div className="text-[11px] text-muted-foreground py-1 px-4">
            Stage {stageNumber}/13 - {stageLabel}
          </div>

          {/* Artifact Items */}
          {latestArtifacts.length > 0 ? (
            latestArtifacts.map((artifact) => (
              <ArtifactTreeItem
                key={artifact._id}
                artifact={artifact}
                conversationId={session.conversationId}
                isSelected={isSelected}
                onArtifactSelect={onArtifactSelect}
                isArtifactPanelOpen={isArtifactPanelOpen}
                onArtifactPanelToggle={onArtifactPanelToggle}
                onCloseMobile={onCloseMobile}
              />
            ))
          ) : (
            <div className="text-[11px] text-muted-foreground/70 italic py-2 px-4">
              No artifacts yet
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * ArtifactTreeItem - Individual artifact item in the tree
 */
function ArtifactTreeItem({
  artifact,
  conversationId,
  isSelected,
  onArtifactSelect,
  isArtifactPanelOpen,
  onArtifactPanelToggle,
  onCloseMobile,
}: {
  artifact: ArtifactItem
  conversationId: Id<"conversations">
  isSelected: boolean
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
  isArtifactPanelOpen?: boolean
  onArtifactPanelToggle?: () => void
  onCloseMobile?: () => void
}) {
  // Determine if artifact is "final" (validated/not invalidated)
  const isFinal = !artifact.invalidatedAt

  const handleClick = () => {
    // Open artifact panel if not open
    if (!isArtifactPanelOpen && onArtifactPanelToggle) {
      onArtifactPanelToggle()
    }
    // Select this artifact
    if (onArtifactSelect) {
      onArtifactSelect(artifact._id)
    }
    // Close mobile menu
    onCloseMobile?.()
  }

  return (
    <Link
      href={`/chat/${conversationId}`}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 py-1.5 px-4 cursor-pointer transition-colors",
        "hover:bg-accent",
        isSelected && "bg-primary/10"
      )}
    >
      {/* Document Icon - green for final, muted otherwise */}
      <FileTextIcon
        className={cn(
          "h-4 w-4 shrink-0",
          isFinal ? "text-success" : "text-muted-foreground"
        )}
      />

      {/* File Name */}
      <span className="text-[13px] truncate flex-1">{artifact.title}</span>

      {/* Version Badge */}
      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
        v{artifact.version}
      </span>

      {/* FINAL Badge - only for validated artifacts */}
      {isFinal && (
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-success text-white shrink-0 ml-1">
          FINAL
        </span>
      )}
    </Link>
  )
}

/**
 * Get latest version of each artifact (by title/type)
 * Groups artifacts and returns only the highest version of each
 */
function getLatestArtifactVersions(artifacts: ArtifactItem[]): ArtifactItem[] {
  const latestMap = new Map<string, ArtifactItem>()

  for (const artifact of artifacts) {
    const key = `${artifact.type}-${artifact.title}`
    const existing = latestMap.get(key)

    if (!existing || artifact.version > existing.version) {
      latestMap.set(key, artifact)
    }
  }

  // Sort by title for consistent display
  return Array.from(latestMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  )
}

export default SidebarPaperSessions
