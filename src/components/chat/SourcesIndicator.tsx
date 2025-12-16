
"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Globe } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getApaWebReferenceParts } from "@/lib/citations/apaWeb"
import { cn } from "@/lib/utils"

interface Source {
    url: string
    title: string
}

interface SourcesIndicatorProps {
    sources: Source[]
}

export function SourcesIndicator({ sources }: SourcesIndicatorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [showAll, setShowAll] = useState(false)

    if (!sources || sources.length === 0) return null

    const displayedSources = showAll ? sources : sources.slice(0, 5)
    const remainingCount = sources.length - 5
    const hasMore = sources.length > 5

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className={cn(
                "flex w-fit flex-col gap-2 rounded-lg border text-sm shadow-sm transition-all duration-200",
                "border-blue-500/20 bg-blue-500/10", // Consistent tool state styling
                isOpen ? "p-3" : "px-3 py-2"
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Globe className="h-4 w-4" />
                    <span className="font-medium">
                        {sources.length} sumber ditemukan
                    </span>
                </div>
                <CollapsibleTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                    >
                        {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                        <span className="sr-only">Toggle sources</span>
                    </Button>
                </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="space-y-3 pt-1">
                <div className="flex flex-col gap-2">
                    {displayedSources.map((source, index) => {
                        const parts = getApaWebReferenceParts(source)

                        return (
                            <div
                                key={index}
                                className="group flex flex-col gap-0.5 rounded-md p-2 hover:bg-blue-500/5 hover:shadow-sm border border-transparent hover:border-blue-500/10 transition-all text-foreground/90 font-serif"
                            >
                                <a
                                    href={parts.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="leading-snug hover:underline decoration-blue-500/50 underline-offset-4 text-xs block"
                                >
                                    <span className="italic font-medium">
                                        {parts.title}
                                    </span>
                                    <span className="text-muted-foreground ml-1">
                                        {(parts.siteName ?? parts.author)}.
                                    </span>
                                    <span className="text-muted-foreground ml-1 break-all">
                                        {parts.url}
                                    </span>
                                </a>
                            </div>
                        )
                    })}
                </div>

                {hasMore && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAll(!showAll)}
                        className="h-7 w-full text-xs text-muted-foreground hover:text-foreground font-sans"
                    >
                        {showAll ? "Sembunyikan" : `Tampilkan ${remainingCount} lainnya`}
                    </Button>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}
