"use client"

import { useState } from "react"
import { ChevronDownIcon, CheckCircleIcon, ExternalLinkIcon } from "lucide-react"

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
            {/* "Found X sources" Header - GREEN mockup style */}
            <div
                className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md",
                    "bg-success/15 border-l-4 border-l-success",
                    "text-sm"
                )}
            >
                <CheckCircleIcon className="h-4 w-4 text-success flex-shrink-0" />
                <span className="text-success font-medium">
                    Found {sources.length} {sources.length === 1 ? "source" : "sources"}
                </span>
            </div>

            {/* Collapsible Sources List */}
            <Collapsible
                open={isOpen}
                onOpenChange={setIsOpen}
                className="rounded-lg border border-border bg-muted/30"
            >
                {/* Collapsed Header */}
                <CollapsibleTrigger asChild>
                    <button
                        className={cn(
                            "flex w-full items-center justify-between gap-3",
                            "px-3 py-2 text-sm",
                            "hover:bg-accent/50 transition-colors rounded-lg",
                            isOpen && "border-b border-border rounded-b-none"
                        )}
                    >
                        <span className="font-medium text-foreground">
                            {sources.length} {sources.length === 1 ? "source" : "sources"}
                        </span>
                        <ChevronDownIcon
                            className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                isOpen && "rotate-180"
                            )}
                        />
                    </button>
                </CollapsibleTrigger>

                {/* Expanded Content */}
                <CollapsibleContent className="px-3 py-2">
                    <div className="flex flex-col divide-y divide-border">
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
                            className="h-7 w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            {showAll ? "Show less" : `Show ${remainingCount} more`}
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
                "hover:bg-accent/30 -mx-1 px-1 rounded transition-colors"
            )}
        >
            {/* Title */}
            <span className="text-sm font-medium text-foreground group-hover:text-primary flex items-center gap-1">
                {parts.title}
                <ExternalLinkIcon className="h-3 w-3 opacity-0 group-hover:opacity-70 transition-opacity" />
            </span>

            {/* URL */}
            <span className="text-xs text-muted-foreground truncate">
                {parts.url}
            </span>
        </a>
    )
}
