"use client"

import { useState } from "react"
import { NavArrowDown, CheckCircle, OpenNewWindow } from "iconoir-react"

import { Button } from "@/components/ui/button"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getWebCitationDisplayParts } from "@/lib/citations/apaWeb"
import { cn } from "@/lib/utils"

interface Source {
    url: string
    title: string
    publishedAt?: number | null
}

interface SourcesIndicatorProps {
    sources: Source[]
}

/**
 * SourcesIndicator - Collapsible sources panel
 *
 * Mockup compliance:
 * - "Found X sources" header with GREEN background + checkmark
 * - Collapsible with chevron rotation
 * - Source items: Title on top, URL below (text-xs, muted)
 */
export function SourcesIndicator({ sources }: SourcesIndicatorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [showAll, setShowAll] = useState(false)

    if (!sources || sources.length === 0) return null

    const indexedSources = sources.map((source, idx) => ({ source, idx }))
    const displayedSources = showAll ? indexedSources : indexedSources.slice(0, 5)
    const remainingCount = sources.length - 5
    const hasMore = sources.length > 5

    return (
        <div className="space-y-2">
            {/* "Found X sources" Header - Mechanical Grace Emerald success */}
            <div
                className={cn(
                    "flex items-center gap-2.5 px-3 py-2",
                    // Mechanical Grace: .rounded-badge (6px) + Emerald border
                    "rounded-badge border-l-4 border-l-[var(--ds-sources-header-border)] bg-[var(--ds-sources-header-bg)]",
                    "text-sm"
                )}
            >
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-[var(--ds-sources-header-fg)]" />
                <span className="font-mono text-xs font-medium uppercase tracking-wide text-[var(--ds-sources-header-fg)]">
                    Menemukan {sources.length} {sources.length === 1 ? "rujukan" : "rujukan"}
                </span>
            </div>

            {/* Collapsible Sources List */}
            <Collapsible
                open={isOpen}
                onOpenChange={setIsOpen}
                // Mechanical Grace: .border-hairline + .rounded-badge
                className="rounded-badge border border-border/50 bg-muted/30"
            >
                {/* Collapsed Header */}
                <CollapsibleTrigger asChild>
                    <button
                        className={cn(
                            "flex w-full items-center justify-between gap-3",
                            "px-3 py-2 text-sm",
                            "hover:bg-accent/50 transition-colors rounded-badge",
                            isOpen && "border-b border-border/50 rounded-b-none"
                        )}
                    >
                        <span className="font-mono font-medium text-foreground">
                            {sources.length} {sources.length === 1 ? "rujukan" : "rujukan"}
                        </span>
                        <NavArrowDown
                            className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                isOpen && "rotate-180"
                            )}
                        />
                    </button>
                </CollapsibleTrigger>

                {/* Expanded Content */}
                <CollapsibleContent className="px-3 py-2">
                    {/* Mechanical Grace: .border-hairline dividers */}
                    <div className="flex flex-col divide-y divide-border/50">
                        {displayedSources.map(({ source, idx }) => {
                            const parts = getWebCitationDisplayParts(source)
                            return (
                                <SourceItem key={idx} parts={parts} />
                            )
                        })}
                    </div>

                    {/* Show More Button */}
                    {hasMore && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAll(!showAll)}
                            className="h-7 w-full mt-2 text-xs font-mono text-muted-foreground hover:text-foreground"
                        >
                            {showAll ? "Gulung" : `Tampilkan ${remainingCount} lagi`}
                        </Button>
                    )}
                </CollapsibleContent>
            </Collapsible>
        </div>
    )
}

/**
 * Individual source item
 */
function SourceItem({ parts }: { parts: ReturnType<typeof getWebCitationDisplayParts> }) {
    return (
        <a
            href={parts.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                "group flex flex-col gap-0.5 py-2",
                "-mx-1 px-1 rounded transition-colors",
                "hover:bg-[var(--ds-sources-item-hover-bg)]"
            )}
        >
            {/* Title */}
            <span className="text-sm font-medium text-foreground flex items-center gap-1">
                {parts.title}
                {/* Mechanical Grace: .icon-micro (12px) */}
                <OpenNewWindow className="h-3 w-3 opacity-0 group-hover:opacity-70 transition-opacity" />
            </span>

            {/* URL - Mechanical Grace: Mono typography */}
            <span className="truncate font-mono text-xs text-muted-foreground transition-colors hover:text-[var(--ds-sources-link-hover-fg)]">
                {parts.url}
            </span>
        </a>
    )
}
