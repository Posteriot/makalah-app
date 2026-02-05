"use client"

import { Search, CheckCircle, XmarkCircle } from "iconoir-react"
import { cn } from "@/lib/utils"

export type SearchStatus = "searching" | "done" | "off" | "error"

interface SearchStatusIndicatorProps {
    status: SearchStatus
    /** Optional custom message to display */
    message?: string
}

/**
 * SearchStatusIndicator - Full-width status bars
 *
 * Mockup compliance:
 * - Searching: BLUE bg + spinner + "Searching for..." or "Running literature search..."
 * - Done/Success: GREEN bg + checkmark + "Literature search completed"
 * - Error: RED bg + X icon + "Search failed - API timeout"
 * - Layout: Full-width bars with left border
 */
export function SearchStatusIndicator({ status, message }: SearchStatusIndicatorProps) {
    // Don't render for "off" status
    if (status === "off") return null

    const config = getStatusConfig(status, message)

    return (
        <div
            className={cn(
                // Base styles - full width horizontal bar, Mechanical Grace
                "flex items-center gap-2.5 px-3 py-2 rounded-md",
                "text-[11px] font-mono uppercase tracking-wide transition-all duration-300",
                "animate-in fade-in slide-in-from-left-2",
                // Left border accent
                "border-l-4",
                // Status-specific colors
                config.containerClass
            )}
            role="status"
            aria-label={config.text}
        >
            {/* Icon */}
            <span className={cn("flex-shrink-0", config.iconClass)}>
                {config.icon}
            </span>

            {/* Text */}
            <span className={config.textClass}>
                {config.text}
            </span>
        </div>
    )
}

/**
 * Get configuration based on status
 */
function getStatusConfig(status: SearchStatus, customMessage?: string) {
    switch (status) {
        case "searching":
            return {
                icon: <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />,
                text: customMessage || "SEARCHING...",
                containerClass: "bg-sky-500/10 border-l-sky-500",
                iconClass: "text-sky-500",
                textClass: "text-sky-500",
            }

        case "done":
            return {
                icon: <CheckCircle className="h-4 w-4" />,
                text: customMessage || "SEARCH_COMPLETE",
                containerClass: "bg-emerald-500/10 border-l-emerald-500",
                iconClass: "text-emerald-500",
                textClass: "text-emerald-500",
            }

        case "error":
            return {
                icon: <XmarkCircle className="h-4 w-4" />,
                text: customMessage || "SEARCH_ERROR",
                containerClass: "bg-rose-500/10 border-l-rose-500",
                iconClass: "text-rose-500",
                textClass: "text-rose-500",
            }

        default:
            return {
                icon: <Search className="h-4 w-4" />,
                text: "SEARCH",
                containerClass: "bg-muted border-l-muted-foreground",
                iconClass: "text-muted-foreground",
                textClass: "text-muted-foreground",
            }
    }
}
