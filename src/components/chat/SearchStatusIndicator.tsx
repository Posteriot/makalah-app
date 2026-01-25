"use client"

import { SearchIcon, CheckCircleIcon, XCircleIcon, LoaderIcon } from "lucide-react"
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
                // Base styles - full width horizontal bar
                "flex items-center gap-2.5 px-3 py-2 rounded-md",
                "text-sm transition-all duration-300",
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
                icon: <LoaderIcon className="h-4 w-4 animate-spin" />,
                text: customMessage || "Running literature search...",
                containerClass: "bg-info/15 border-l-info",
                iconClass: "text-info",
                textClass: "text-info",
            }

        case "done":
            return {
                icon: <CheckCircleIcon className="h-4 w-4" />,
                text: customMessage || "Literature search completed",
                containerClass: "bg-success/15 border-l-success",
                iconClass: "text-success",
                textClass: "text-success",
            }

        case "error":
            return {
                icon: <XCircleIcon className="h-4 w-4" />,
                text: customMessage || "Search failed - API timeout",
                containerClass: "bg-destructive/15 border-l-destructive",
                iconClass: "text-destructive",
                textClass: "text-destructive",
            }

        default:
            return {
                icon: <SearchIcon className="h-4 w-4" />,
                text: "Search",
                containerClass: "bg-muted border-l-muted-foreground",
                iconClass: "text-muted-foreground",
                textClass: "text-muted-foreground",
            }
    }
}
