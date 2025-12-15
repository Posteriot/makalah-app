"use client"

import { cn } from "@/lib/utils"

interface ThinkingIndicatorProps {
    visible: boolean
}

export function ThinkingIndicator({ visible }: ThinkingIndicatorProps) {
    if (!visible) return null

    return (
        <div
            className={cn(
                "flex w-fit items-center gap-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
                !visible && "animate-out fade-out slide-out-to-bottom-2"
            )}
            role="status"
            aria-live="polite"
            aria-label="AI sedang berpikir"
        >
            <span>AI sedang berpikir</span>
            <div className="flex items-center gap-0.5 ml-1">
                <span className="h-1 w-1 rounded-full bg-current animate-thinking-dot thinking-dot-1" />
                <span className="h-1 w-1 rounded-full bg-current animate-thinking-dot thinking-dot-2" />
                <span className="h-1 w-1 rounded-full bg-current animate-thinking-dot thinking-dot-3" />
            </div>
        </div>
    )
}
