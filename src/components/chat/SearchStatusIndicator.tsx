"use client"

import { Globe, WarningCircle } from "iconoir-react"
import { cn } from "@/lib/utils"

export type SearchStatus = "searching" | "composing" | "done" | "off" | "error"

interface SearchStatusIndicatorProps {
    status: SearchStatus
    /** Optional custom message to display */
    message?: string
    /** Number of sources found (used during composing status) */
    sourceCount?: number
}

const SHIMMER_TEXTS = new Set(["Pencarian internet...", "Pencarian web", "Menyusun jawaban..."])

export function SearchStatusIndicator({ status, message, sourceCount }: SearchStatusIndicatorProps) {
    if (status === "off") return null

    const isError = status === "error"
    const isProcessing = status === "searching" || status === "composing" || status === "done"
    const text = resolveText(status, message, sourceCount)

    return (
        <div
            className={cn(
                "flex w-fit items-center gap-2 px-1 py-1",
                "text-[11px] font-mono tracking-wide",
                "transition-all duration-300 animate-in fade-in zoom-in-95",
                isError
                    ? "text-[var(--chat-destructive)]"
                    : "text-[var(--chat-muted-foreground)]"
            )}
            role="status"
            aria-label={text}
        >
            {isProcessing && (
                <Globe className="h-4 w-4 animate-pulse text-current" />
            )}
            {isError && <WarningCircle className="h-4 w-4" />}
            <StatusText text={text} />
        </div>
    )
}

function StatusText({ text }: { text: string }) {
    if (!SHIMMER_TEXTS.has(text)) return <span>{text}</span>

    return (
        <span className="chat-search-shimmer">
            <span>{text}</span>
            <span aria-hidden="true" className="chat-search-shimmer-overlay">
                {text}
            </span>
        </span>
    )
}

function resolveText(status: SearchStatus, customMessage?: string, sourceCount?: number): string {
    if (customMessage && customMessage.trim().length > 0) {
        const normalized = customMessage.trim().toLowerCase()
        if (status === "searching" && normalized === "pencarian") {
            return "Pencarian internet..."
        }
        return customMessage
    }
    if (status === "searching") return "Pencarian internet..."
    if (status === "composing") {
        return sourceCount ? `Menyusun jawaban dari ${sourceCount} sumber...` : "Menyusun jawaban..."
    }
    if (status === "error") return "Galat pada pencarian web"
    return "Pencarian web"
}
