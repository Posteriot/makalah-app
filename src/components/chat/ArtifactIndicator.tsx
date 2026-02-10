"use client"

import { CheckCircle, NavArrowRight } from "iconoir-react"
import { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"

interface ArtifactIndicatorProps {
    artifactId: Id<"artifacts">
    title: string
    onSelect: (id: Id<"artifacts">) => void
}

/**
 * ArtifactIndicator - Shows when artifact is created
 *
 * Mockup compliance:
 * - GREEN background with border
 * - "ARTIFACT CREATED" badge (uppercase, green)
 * - Artifact title
 * - "View >" button on right
 */
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
            className={cn(
                "flex items-center gap-3 w-full text-left",
                "px-3 py-2.5 rounded-action",
                // Mechanical Grace: .border-ai (dashed Sky)
                "bg-sky-500/10 border border-dashed border-sky-500/50",
                "hover:bg-sky-500/20 hover:border-sky-500/70",
                "transition-all duration-150 cursor-pointer",
                "group"
            )}
            aria-label={`View artifact: ${title}`}
            role="button"
            tabIndex={0}
        >
            {/* Success Icon */}
            <CheckCircle className="h-5 w-5 text-sky-500 flex-shrink-0" />

            {/* Content */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
                {/* SYSTEM_OUTPUT Badge - Mechanical Grace */}
                <span className="inline-flex px-2 py-0.5 rounded-badge text-[10px] font-mono font-semibold uppercase tracking-wide bg-sky-500/20 text-sky-400 border border-dashed border-sky-500/30">
                    SYSTEM_OUTPUT
                </span>

                {/* Title */}
                <span className="text-sm font-medium text-foreground truncate">
                    {title}
                </span>
            </div>

            {/* View Button */}
            <span className="flex items-center gap-0.5 text-xs font-mono text-sky-400 font-medium flex-shrink-0 group-hover:underline uppercase">
                VIEW
                <NavArrowRight className="h-4 w-4" />
            </span>
        </button>
    )
}
