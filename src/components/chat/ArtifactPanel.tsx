"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { ArtifactViewer } from "./ArtifactViewer"
import { ArtifactList } from "./ArtifactList"
import { Button } from "@/components/ui/button"
import {
  XIcon,
  ChevronLeftIcon,
  FileTextIcon,
  PanelRightCloseIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Artifact type from Convex
type ArtifactType =
  | "code"
  | "outline"
  | "section"
  | "table"
  | "citation"
  | "formula"

interface ArtifactPanelProps {
  conversationId: Id<"conversations"> | null
  isOpen: boolean
  onToggle: () => void
  selectedArtifactId: Id<"artifacts"> | null
  onSelectArtifact: (id: Id<"artifacts">) => void
}

/**
 * ArtifactPanel - Artifact viewer panel
 *
 * Features:
 * - Viewer-focused layout (no tools grid per mockup)
 * - Collapsed/expanded toggle
 * - Artifact list with type filter
 * - Selected artifact state management
 * - Width controlled by parent resizer
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
  selectedArtifactId,
  onSelectArtifact,
}: ArtifactPanelProps) {
  const [typeFilter, setTypeFilter] = useState<ArtifactType | null>(null)
  const { user: currentUser } = useCurrentUser()

  // Fetch artifacts with optional type filter
  const artifacts = useQuery(
    api.artifacts.listByConversation,
    conversationId && currentUser?._id
      ? {
          conversationId,
          userId: currentUser._id,
          type: typeFilter ?? undefined,
        }
      : "skip"
  )

  const artifactCount = artifacts?.length ?? 0

  // Collapsed state - show button on right edge
  if (!isOpen) {
    // Don't show collapsed button if no artifacts
    if (artifactCount === 0) return null

    return (
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className={cn(
            "rounded-l-lg rounded-r-none border-r-0",
            "shadow-md px-2 py-6",
            "flex flex-col items-center gap-1",
            "bg-card hover:bg-accent",
            "text-muted-foreground hover:text-foreground",
            "transition-colors duration-150"
          )}
          aria-label={`Open artifacts panel (${artifactCount} artifacts)`}
        >
          <FileTextIcon className="h-4 w-4" />
          <span className="text-xs font-medium">{artifactCount}</span>
          <ChevronLeftIcon className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  // Expanded state - show full panel
  return (
    <div
      className={cn(
        "flex flex-col h-full w-full",
        "bg-card",
        "transition-all duration-300 ease-in-out"
      )}
    >
      {/* Header - Clean style without border (matches mockup) */}
      <div className="p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">Artifacts</h2>
          {artifactCount > 0 && (
            <span
              className={cn(
                "text-xs font-medium",
                "px-2 py-0.5 rounded-full",
                "bg-muted text-muted-foreground"
              )}
            >
              {artifactCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn(
              "h-6 w-6 rounded",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-accent",
              "transition-colors duration-150"
            )}
            aria-label="Minimize artifacts panel"
          >
            <PanelRightCloseIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body: Viewer-focused layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main viewer area */}
        <div
          className={cn(
            "flex-1 overflow-hidden",
            "border-t border-border"
          )}
        >
          {selectedArtifactId ? (
            <ArtifactViewer artifactId={selectedArtifactId} />
          ) : (
            // Empty state when no artifact selected
            <div
              className={cn(
                "flex flex-col items-center justify-center",
                "h-full p-8 text-center"
              )}
            >
              <FileTextIcon
                className={cn(
                  "h-12 w-12 mb-4",
                  "text-muted-foreground opacity-50"
                )}
              />
              <p className="text-sm text-muted-foreground max-w-[200px]">
                {artifactCount > 0
                  ? "Pilih artifact dari daftar di bawah untuk melihat isinya"
                  : "Belum ada artifact. AI akan membuat artifact saat menulis paper."}
              </p>
            </div>
          )}
        </div>

        {/* Artifact list at bottom */}
        {artifactCount > 0 && (
          <div
            className={cn(
              "border-t border-border",
              "h-48 shrink-0 overflow-hidden"
            )}
          >
            <ArtifactList
              artifacts={artifacts ?? []}
              selectedId={selectedArtifactId}
              onSelect={onSelectArtifact}
              typeFilter={typeFilter}
              onFilterChange={setTypeFilter}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default ArtifactPanel
