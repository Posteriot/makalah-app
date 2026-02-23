"use client"

import { useState } from "react"
import { NavArrowDown, NavArrowUp, CheckCircle, OpenNewWindow } from "iconoir-react"
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

export function SourcesIndicator({ sources }: SourcesIndicatorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [showAll, setShowAll] = useState(false)

    if (!sources || sources.length === 0) return null

    const indexedSources = sources.map((source, idx) => ({ source, idx }))
    const displayedSources = showAll ? indexedSources : indexedSources.slice(0, 5)
    const remainingCount = sources.length - 5
    const hasMore = sources.length > 5

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
                <button
                    className="flex w-full items-center gap-2 py-1.5 text-left transition-colors hover:opacity-80"
                >
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-[var(--chat-muted-foreground)]" />
                    <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-[var(--chat-muted-foreground)]">
                        Menemukan {sources.length} rujukan
                    </span>
                    <NavArrowDown
                        className={cn(
                            "h-3.5 w-3.5 text-[var(--chat-muted-foreground)] transition-transform duration-200",
                            isOpen && "rotate-180"
                        )}
                    />
                </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-1">
                <div className="flex flex-col divide-y divide-[var(--chat-border)]">
                    {displayedSources.map(({ source, idx }) => {
                        const parts = getWebCitationDisplayParts(source)
                        return (
                            <SourceItem key={idx} parts={parts} />
                        )
                    })}
                </div>

                {hasMore && (
                    <button
                        type="button"
                        onClick={() => setShowAll(!showAll)}
                        className="flex items-center gap-1 pt-1 font-mono text-[11px] text-[var(--chat-muted-foreground)] transition-colors hover:text-[var(--chat-foreground)]"
                    >
                        {showAll ? (
                            <NavArrowUp className="h-3.5 w-3.5" />
                        ) : (
                            <>
                                <NavArrowDown className="h-3.5 w-3.5" />
                                <span>+{remainingCount}</span>
                            </>
                        )}
                    </button>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}

function SourceItem({ parts }: { parts: ReturnType<typeof getWebCitationDisplayParts> }) {
    return (
        <a
            href={parts.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-0.5 py-1.5 transition-colors hover:opacity-80"
        >
            <span className="text-xs font-medium text-[var(--chat-foreground)] flex items-center gap-1">
                {parts.title}
                <OpenNewWindow className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-70 transition-opacity" />
            </span>
            <span className="truncate font-mono text-[11px] text-[var(--chat-info)] dark:text-[oklch(0.746_0.16_232.661)] group-hover:underline">
                {parts.url}
            </span>
        </a>
    )
}
