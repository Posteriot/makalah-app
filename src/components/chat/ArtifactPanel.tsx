"use client"

import { useState, useRef } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { ArtifactViewer, ArtifactViewerRef } from "./ArtifactViewer"
import { ArtifactTabs } from "./ArtifactTabs"
import { ArtifactToolbar } from "./ArtifactToolbar"
import type { ArtifactTab } from "@/lib/hooks/useArtifactTabs"
import { Page } from "iconoir-react"
import { cn } from "@/lib/utils"
import { FullsizeArtifactModal } from "./FullsizeArtifactModal"

interface ArtifactPanelProps {
  conversationId: Id<"conversations"> | null
  isOpen: boolean
  onToggle: () => void
  // Tab-related props
  openTabs: ArtifactTab[]
  activeTabId: Id<"artifacts"> | null
  onTabChange: (tabId: Id<"artifacts">) => void
  onTabClose: (tabId: Id<"artifacts">) => void
}

/**
 * ArtifactPanel - Artifact viewer panel with tabbed document switching
 *
 * Features:
 * - ArtifactTabs for switching between open artifact documents
 * - ArtifactToolbar with metadata and action buttons
 * - ArtifactViewer for rendering artifact content
 * - Fullsize modal for expanded viewing
 * - Width controlled by parent resizer
 * - Panel close via TopBar (no close button in panel)
 *
 * Styling:
 * - Uses CSS variables for theme consistency
 * - Card background with border styling
 * - Smooth transitions
 */
export function ArtifactPanel({
  conversationId,
  isOpen,
  onToggle,
  openTabs,
  activeTabId,
  onTabChange,
  onTabClose,
}: ArtifactPanelProps) {
  const [isFullsizeOpen, setIsFullsizeOpen] = useState(false)
  const { user: currentUser } = useCurrentUser()

  // Ref for ArtifactViewer actions
  const viewerRef = useRef<ArtifactViewerRef>(null)

  // Fetch artifacts for this conversation
  const artifacts = useQuery(
    api.artifacts.listByConversation,
    conversationId && currentUser?._id
      ? {
          conversationId,
          userId: currentUser._id,
        }
      : "skip"
  )

  // Only render when panel is open
  if (!isOpen) {
    return null
  }

  // Find active artifact data from query
  const activeArtifact = activeTabId
    ? artifacts?.find((a) => a._id === activeTabId)
    : null

  return (
    <div
      className={cn(
        "@container/artifact",
        "flex flex-col h-full w-full",
        "bg-card rounded-shell border border-border/50",
        "transition-all duration-300 ease-in-out"
      )}
    >
      {/* Artifact Tabs */}
      <ArtifactTabs
        tabs={openTabs}
        activeTabId={activeTabId}
        onTabChange={onTabChange}
        onTabClose={onTabClose}
      />

      {/* Artifact Toolbar — metadata + actions */}
      <ArtifactToolbar
        artifact={
          activeArtifact
            ? {
                title: activeArtifact.title,
                type: activeArtifact.type,
                version: activeArtifact.version,
                createdAt: activeArtifact.createdAt ?? activeArtifact._creationTime,
              }
            : null
        }
        onDownload={(format) => {
          viewerRef.current?.setDownloadFormat(format)
          viewerRef.current?.download()
        }}
        onEdit={() => viewerRef.current?.startEdit()}
        onRefrasa={() => viewerRef.current?.triggerRefrasa()}
        onCopy={() => viewerRef.current?.copy()}
        onExpand={() => setIsFullsizeOpen(true)}
      />

      {/* Main viewer area */}
      <div className="flex-1 overflow-hidden">
        {activeTabId ? (
          <ArtifactViewer ref={viewerRef} artifactId={activeTabId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
            <Page className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
            <p className="text-[13px] text-muted-foreground max-w-[200px]">
              {openTabs.length > 0
                ? "Pilih tab artifact di atas"
                : "Buka artifact dari Paper Sessions di sidebar"}
            </p>
          </div>
        )}
      </div>

      {/* Fullsize Modal */}
      {activeTabId && (
        <FullsizeArtifactModal
          artifactId={activeTabId}
          isOpen={isFullsizeOpen}
          onClose={() => setIsFullsizeOpen(false)}
        />
      )}
    </div>
  )
}

export default ArtifactPanel
