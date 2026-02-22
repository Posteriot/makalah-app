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
                "flex items-center gap-2.5 px-1 py-1",
                "text-[11px] font-mono tracking-wide transition-all duration-300",
                "animate-in fade-in slide-in-from-left-2",
                // Status-specific text/icon tones only (no bg/border)
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
            {status === "searching" ? (
                <span className={cn("inline-flex items-center gap-1.5", config.textClass)}>
                    <span>{config.text}</span>
                    <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-thinking-dot thinking-dot-1" />
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-thinking-dot thinking-dot-2" />
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-thinking-dot thinking-dot-3" />
                    </span>
                </span>
            ) : (
                <span className={config.textClass}>
                    {config.text}
                </span>
            )}
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
                text: customMessage || "Pencarian",
                containerClass: "",
                iconClass: "text-[var(--ds-text-muted)]",
                textClass: "text-[var(--ds-text-muted)]",
            }

        case "done":
            return {
                icon: <CheckCircle className="h-4 w-4" />,
                text: customMessage || "Pencarian selesai",
                containerClass: "",
                iconClass: "text-[var(--ds-state-success-fg)]",
                textClass: "text-[var(--ds-state-success-fg)]",
            }

        case "error":
            return {
                icon: <XmarkCircle className="h-4 w-4" />,
                text: customMessage || "Pencarian gagal",
                containerClass: "",
                iconClass: "text-[var(--ds-state-danger-fg)]",
                textClass: "text-[var(--ds-state-danger-fg)]",
            }

        default:
            return {
                icon: <Search className="h-4 w-4" />,
                text: "Pencarian",
                containerClass: "",
                iconClass: "text-[var(--ds-text-muted)]",
                textClass: "text-[var(--ds-text-muted)]",
            }
    }
}
