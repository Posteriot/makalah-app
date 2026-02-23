"use client"

import { useState, useRef } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { ArtifactViewer, ArtifactViewerRef } from "./ArtifactViewer"
import { RefrasaTabContent } from "@/components/refrasa/RefrasaTabContent"
import { ArtifactTabs } from "./ArtifactTabs"
import { ArtifactToolbar } from "./ArtifactToolbar"
import type { ArtifactTab } from "@/lib/hooks/useArtifactTabs"
import { Page } from "iconoir-react"
import { cn } from "@/lib/utils"
import { FullsizeArtifactModal } from "./FullsizeArtifactModal"
import { Button } from "@/components/ui/button"

interface ArtifactPanelProps {
  conversationId: Id<"conversations"> | null
  isOpen: boolean
  onToggle: () => void
  // Tab-related props
  openTabs: ArtifactTab[]
  activeTabId: Id<"artifacts"> | null
  onTabChange: (tabId: Id<"artifacts">) => void
  onTabClose: (tabId: Id<"artifacts">) => void
  onOpenTab?: (tab: ArtifactTab) => void
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
  onOpenTab,
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

  // Find active tab metadata and artifact data
  const activeTab = activeTabId ? openTabs.find((t) => t.id === activeTabId) : null
  const isRefrasaTab = activeTab?.type === "refrasa"
  const activeArtifact = activeTabId
    ? artifacts?.find((a) => a._id === activeTabId)
    : null
  const openTabCount = openTabs.length
  const isCodeArtifact = activeArtifact
    ? activeArtifact.type === "code" || activeArtifact.format === "latex"
    : false
  const contentTypeLabel = isCodeArtifact ? "Code" : "Markdown"
  const wordCount = activeArtifact?.content?.trim()
    ? activeArtifact.content.trim().split(/\s+/).length
    : 0

  return (
    <div
      className={cn(
        "@container/artifact",
        "flex h-full w-full flex-col",
        "rounded-shell border border-l-0 border-[color:var(--chat-border)] bg-[var(--chat-card)]",
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

      {/* Artifact Toolbar — metadata + actions (hidden for refrasa tabs) */}
      {!isRefrasaTab && (
        <ArtifactToolbar
          artifact={
            activeArtifact
              ? {
                  title: activeArtifact.title,
                  type: activeArtifact.type,
                  version: activeArtifact.version,
                  createdAt: activeArtifact.createdAt ?? activeArtifact._creationTime,
                  contentLength: activeArtifact.content.length,
                  wordCount,
                  contentTypeLabel,
                }
              : null
          }
          openTabCount={openTabCount}
          onDownload={(format) => {
            viewerRef.current?.setDownloadFormat(format)
            viewerRef.current?.download()
          }}
          onEdit={() => viewerRef.current?.startEdit()}
          onRefrasa={() => viewerRef.current?.triggerRefrasa()}
          onCopy={() => viewerRef.current?.copy()}
          onExpand={() => setIsFullsizeOpen(true)}
          onClosePanel={onToggle}
        />
      )}

      {/* Main viewer area */}
      <div className="flex-1 overflow-hidden">
        {activeTabId && isRefrasaTab && conversationId && currentUser?._id ? (
          <RefrasaTabContent
            artifactId={activeTabId}
            conversationId={conversationId}
            userId={currentUser._id}
            onTabClose={onTabClose}
            onExpand={() => setIsFullsizeOpen(true)}
            onActivateTab={onTabChange}
          />
        ) : activeTabId && activeArtifact ? (
          <ArtifactViewer
            ref={viewerRef}
            artifactId={activeTabId}
            onOpenRefrasaTab={(tab) => {
              onOpenTab?.(tab as ArtifactTab)
            }}
          />
        ) : activeTabId && !activeArtifact ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <Page className="h-10 w-10 text-[var(--chat-muted-foreground)]" />
            <p className="max-w-[260px] text-sm text-[var(--chat-muted-foreground)]">
              Artifak aktif tidak ditemukan. Kemungkinan artifak sudah berubah atau tidak lagi tersedia.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="font-mono"
              onClick={() => onTabClose(activeTabId)}
            >
              Tutup Tab Aktif
            </Button>
          </div>
        ) : openTabCount > 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <Page className="h-10 w-10 text-[var(--chat-muted-foreground)]" />
            <p className="max-w-[260px] text-sm text-[var(--chat-muted-foreground)]">
              Pilih salah satu tab di atas untuk lanjut membaca atau mengedit artifak.
            </p>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
            <Page className="mb-4 h-12 w-12 text-[var(--chat-muted-foreground)]" />
            <p className="max-w-[260px] text-[13px] text-[var(--chat-muted-foreground)]">
              Belum ada artifak yang dibuka. Pilih artifak dari Sidebar Paper Sessions untuk memulai workspace.
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
          openTabs={openTabs}
          activeTabId={activeTabId}
          onTabChange={onTabChange}
          onTabClose={onTabClose}
          onOpenTab={onOpenTab!}
        />
      )}
    </div>
  )
}

export default ArtifactPanel
