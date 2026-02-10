"use client"

import { cn } from "@/lib/utils"
import { WarningCircle, Globe } from "iconoir-react"

interface ToolStateIndicatorProps {
    toolName: string
    state: string
    errorText?: string
}

export function ToolStateIndicator({ toolName, state, errorText }: ToolStateIndicatorProps) {
    // Skip if state implies success (handled by ArtifactIndicator) or if state is result
    if (state === 'output-available' || state === 'result') return null

    const isError = state === 'output-error' || state === 'error'
    const isProcessing = state === 'input-streaming' || state === 'input-available'

    const isGoogleSearch = toolName === 'google_search'

    // Mechanical Grace: Uppercase status labels
    let text = ""
    if (state === 'input-streaming') {
        text = isGoogleSearch ? "SEARCHING_WEB" : `RUNNING_${toolName.toUpperCase()}`
    }
    else if (state === 'input-available') {
        text = isGoogleSearch ? "SEARCHING_WEB" : `PROCESSING_${toolName.toUpperCase()}`
    }
    else if (isError) text = `ERROR: ${errorText || "UNKNOWN_ERROR"}`
    else text = `${toolName.toUpperCase()}_${state.toUpperCase()}`

    return (
        <div
            className={cn(
                // Mechanical Grace: border-ai (dashed), Mono font, uppercase
                "flex w-fit items-center gap-2 rounded-action border border-dashed px-3 py-2",
                "text-[11px] font-mono uppercase tracking-wide",
                "shadow-sm transition-all duration-300 animate-in fade-in zoom-in-95",
                isError
                    ? "border-rose-500/50 bg-rose-500/10 text-rose-500"
                    : "border-sky-500/50 bg-sky-500/10 text-sky-400"
            )}
            role="status"
            aria-label={text}
        >
            {isProcessing && (
                isGoogleSearch ? (
                    <Globe className="h-4 w-4 animate-pulse text-sky-500" />
                ) : (
                    <span className="h-4 w-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                )
            )}
            {isError && <WarningCircle className="h-4 w-4" />}
            <span>{text}</span>
        </div>
    )
}
