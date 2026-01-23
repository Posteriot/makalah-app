"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { Skeleton } from "@/components/ui/skeleton"
import { FileTextIcon, FolderIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getStageLabel,
  getStageNumber,
  type PaperStageId,
} from "../../../../convex/paperSessions/constants"
import { formatRelativeTime } from "@/lib/date/formatters"
import { useState } from "react"
import { Id } from "../../../../convex/_generated/dataModel"

interface SidebarPaperSessionsProps {
  currentConversationId: string | null
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

/**
 * SidebarPaperSessions - Paper sessions list view
 *
 * Shows all active (non-archived) paper sessions for the current user.
 * Each item displays:
 * - Paper title (or "Untitled Paper" if not set)
 * - Stage progress (e.g., "Stage 3/13 - Outline")
 * - Last update time
 *
 * Click navigates to the conversation associated with the paper session.
 */
export function SidebarPaperSessions({
  currentConversationId,
  onCloseMobile,
}: SidebarPaperSessionsProps) {
  const { user, isLoading: isUserLoading } = useCurrentUser()

  // Expanded state for folder tree (future enhancement)
  const [expandedPapers, setExpandedPapers] = useState<Set<string>>(new Set())

  // Query paper sessions for current user - filter for active only
  const paperSessions = useQuery(
    api.paperSessions.getByUser,
    user ? { userId: user._id } : "skip"
  ) as PaperSessionItem[] | undefined

  // Filter to only show active sessions (not archived)
  const activeSessions = paperSessions?.filter(
    (session) => !("archivedAt" in session && session.archivedAt)
  )

  const toggleExpanded = (paperId: string) => {
    setExpandedPapers((prev) => {
      const next = new Set(prev)
      if (next.has(paperId)) {
        next.delete(paperId)
      } else {
        next.add(paperId)
      }
      return next
    })
  }

  // Loading state
  if (isUserLoading || paperSessions === undefined) {
    return (
      <div className="p-4 space-y-3">
        <div className="mb-4">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-3 w-48" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 p-2">
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (!activeSessions || activeSessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground opacity-50">
        <FileTextIcon className="h-8 w-8 mb-2" />
        <span className="text-sm font-medium mb-1">Belum ada paper</span>
        <span className="text-xs">
          Mulai percakapan dan bilang &quot;ayo mulai bikin paper&quot;
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="text-sm font-semibold">Paper Sessions</div>
        <div className="text-xs text-muted-foreground">
          Paper folders and artifacts
        </div>
      </div>

      {/* Paper Session List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeSessions.map((session) => {
          const isSelected = currentConversationId === session.conversationId
          const isExpanded = expandedPapers.has(session._id)
          const stageNumber = getStageNumber(
            session.currentStage as PaperStageId | "completed"
          )
          const stageLabel = getStageLabel(
            session.currentStage as PaperStageId | "completed"
          )
          const paperTitle = session.paperTitle || "Paper Tanpa Judul"
          const lastUpdate = session.updatedAt || session._creationTime

          // Status indicator color
          const statusColor =
            session.stageStatus === "drafting"
              ? "bg-info"
              : session.stageStatus === "pending_validation"
                ? "bg-warning"
                : "bg-success"

          return (
            <div key={session._id} className="border-b last:border-b-0">
              {/* Paper Folder Header */}
              <div
                className={cn(
                  "flex items-start gap-2 p-3 cursor-pointer transition-colors",
                  isSelected ? "bg-list-selected-bg" : "hover:bg-list-hover-bg"
                )}
                onClick={() => toggleExpanded(session._id)}
              >
                {/* Expand/Collapse Chevron */}
                <ChevronRightIcon
                  className={cn(
                    "h-4 w-4 mt-0.5 text-muted-foreground transition-transform shrink-0",
                    isExpanded && "rotate-90"
                  )}
                />

                {/* Status Indicator */}
                <div
                  className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", statusColor)}
                  title={session.stageStatus}
                />

                {/* Folder Icon */}
                <FolderIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{paperTitle}</div>
                  <div className="text-xs text-muted-foreground">
                    Stage {stageNumber}/13 - {stageLabel}
                  </div>
                </div>
              </div>

              {/* Expanded Content - Navigate Link */}
              {isExpanded && (
                <div className="pl-10 pb-2">
                  <Link
                    href={`/chat/${session.conversationId}`}
                    onClick={() => onCloseMobile?.()}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md text-sm transition-colors",
                      "hover:bg-accent"
                    )}
                  >
                    <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Buka Percakapan
                    </span>
                  </Link>
                  <div className="px-2 py-1 text-xs text-muted-foreground">
                    Diperbarui {formatRelativeTime(lastUpdate)}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SidebarPaperSessions
