"use client"

import { CheckCircleIcon, ArrowRightIcon } from "lucide-react"
import { Id } from "../../../convex/_generated/dataModel"

interface ArtifactIndicatorProps {
    artifactId: Id<"artifacts">
    title: string
    onSelect: (id: Id<"artifacts">) => void
}

export function ArtifactIndicator({ artifactId, title, onSelect }: ArtifactIndicatorProps) {
    const handleClick = () => {
        onSelect(artifactId)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelect(artifactId)
        }
    }

    return (
        <button
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors cursor-pointer w-full text-left"
            aria-label={`Lihat artifact: ${title}`}
            role="button"
            tabIndex={0}
        >
            <CheckCircleIcon className="h-4 w-4 text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
                <span className="text-xs text-green-600 dark:text-green-400">Artifact dibuat</span>
                <div className="font-medium text-sm truncate">{title}</div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <span>Lihat</span>
                <ArrowRightIcon className="h-3 w-3" />
            </div>
        </button>
    )
}
