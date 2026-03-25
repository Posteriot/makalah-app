"use client"

import { useState } from "react"
import { NavArrowDown, NavArrowUp, NavArrowRight, CheckCircle, OpenNewWindow } from "iconoir-react"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getWebCitationDisplayParts } from "@/lib/citations/apaWeb"
import { cn } from "@/lib/utils"

interface Source {
    sourceId?: string
    url: string | null
    title: string
    publishedAt?: number | null
    verificationStatus?: "verified_content" | "unverified_link" | "unavailable"
    documentKind?: "html" | "pdf" | "unknown"
    note?: string
}

interface SourcesIndicatorProps {
    sources: Source[]
    /** When provided, clicking opens the Sources sheet instead of expanding inline */
    onOpenSheet?: (sources: Source[]) => void
}

export function SourcesIndicator({ sources, onOpenSheet }: SourcesIndicatorProps) {
    if (!sources || sources.length === 0) return null

    // Sheet mode: simple button, no inline expand
    if (onOpenSheet) {
        return (
            <button
                type="button"
                onClick={() => onOpenSheet(sources)}
                className="flex w-full items-center gap-2 py-1.5 text-left transition-colors hover:opacity-80"
            >
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-[var(--chat-muted-foreground)]" />
                <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-[var(--chat-muted-foreground)]">
                    Menemukan {sources.length} rujukan
                </span>
                <NavArrowDown className="h-3.5 w-3.5 text-[var(--chat-muted-foreground)] transition-colors md:hidden" />
                <NavArrowRight className="hidden h-3.5 w-3.5 text-[var(--chat-muted-foreground)] transition-colors md:block" />
            </button>
        )
    }

    // Inline collapsible mode (for ArtifactViewer / FullsizeArtifactModal)
    return <SourcesCollapsible sources={sources} />
}

function SourcesCollapsible({ sources }: { sources: Source[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [showAll, setShowAll] = useState(false)

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
                        return (
                            <SourceItem key={idx} source={source} />
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

function SourceItem({ source }: { source: Source }) {
    const url = typeof source.url === "string" && source.url.trim().length > 0 ? source.url : null
    const parts = url
        ? getWebCitationDisplayParts({
            url,
            title: source.title,
            publishedAt: source.publishedAt,
        })
        : null
    const label =
        source.verificationStatus === "verified_content"
            ? "Konten terverifikasi"
            : source.verificationStatus === "unverified_link"
                ? "Tautan belum diverifikasi"
                : source.verificationStatus === "unavailable"
                    ? "Tidak tersedia"
                    : null

    if (!url || !parts) {
        return (
            <div className="group flex flex-col gap-0.5 py-1.5">
                <span className="text-xs font-medium text-[var(--chat-foreground)] flex flex-wrap items-center gap-1">
                    {source.title}
                    {label && (
                        <span className="rounded-badge border border-[var(--chat-border)] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--chat-muted-foreground)]">
                            {label}
                        </span>
                    )}
                </span>
                <span className="font-mono text-[11px] text-[var(--chat-muted-foreground)]">
                    URL tidak tersedia
                </span>
                {source.note && (
                    <span className="text-[11px] text-[var(--chat-muted-foreground)]">{source.note}</span>
                )}
            </div>
        )
    }

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
            {label && (
                <span className="rounded-badge border border-[var(--chat-border)] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--chat-muted-foreground)]">
                    {label}
                </span>
            )}
            {source.documentKind && (
                <span className="rounded-badge border border-[var(--chat-border)] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--chat-muted-foreground)]">
                    {source.documentKind === "pdf" ? "PDF" : source.documentKind === "html" ? "HTML" : "UNKNOWN"}
                </span>
            )}
        </a>
    )
}
