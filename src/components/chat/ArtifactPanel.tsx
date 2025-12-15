"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { ArtifactViewer } from "./ArtifactViewer"
import { ArtifactList } from "./ArtifactList"
import { Button } from "@/components/ui/button"
import { XIcon, ChevronRightIcon, FileTextIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Artifact type from Convex
type ArtifactType = "code" | "outline" | "section" | "table" | "citation" | "formula"

interface ArtifactPanelProps {
    conversationId: Id<"conversations"> | null
    isOpen: boolean
    onToggle: () => void
    selectedArtifactId: Id<"artifacts"> | null
    onSelectArtifact: (id: Id<"artifacts">) => void
}

export function ArtifactPanel({
    conversationId,
    isOpen,
    onToggle,
    selectedArtifactId,
    onSelectArtifact,
}: ArtifactPanelProps) {
    const [typeFilter, setTypeFilter] = useState<ArtifactType | null>(null)
    const currentUser = useCurrentUser()

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
                    className="rounded-l-lg rounded-r-none border-r-0 shadow-md bg-background px-2 py-6 flex flex-col items-center gap-1"
                    aria-label={`Open artifacts panel (${artifactCount} artifacts)`}
                >
                    <FileTextIcon className="h-4 w-4" />
                    <span className="text-xs font-medium">{artifactCount}</span>
                    <ChevronRightIcon className="h-3 w-3 rotate-180" />
                </Button>
            </div>
        )
    }

    // Expanded state - show full panel
    return (
        <div
            className={cn(
                "flex flex-col h-full border-l bg-background",
                "transition-all duration-300 ease-in-out"
            )}
        >
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileTextIcon className="h-5 w-5" />
                    <h2 className="font-semibold">Artifacts</h2>
                    {artifactCount > 0 && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {artifactCount}
                        </span>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    aria-label="Close artifacts panel"
                >
                    <XIcon className="h-4 w-4" />
                </Button>
            </div>

            {/* Body: Split layout - Viewer (left) + List (right) */}
            <div className="flex-1 flex overflow-hidden">
                {/* Viewer - main content area */}
                <div className="flex-1 overflow-hidden">
                    <ArtifactViewer artifactId={selectedArtifactId} />
                </div>

                {/* List - sidebar */}
                <div className="w-56 border-l overflow-hidden">
                    <ArtifactList
                        artifacts={artifacts ?? []}
                        selectedId={selectedArtifactId}
                        onSelect={onSelectArtifact}
                        typeFilter={typeFilter}
                        onFilterChange={setTypeFilter}
                    />
                </div>
            </div>
        </div>
    )
}
