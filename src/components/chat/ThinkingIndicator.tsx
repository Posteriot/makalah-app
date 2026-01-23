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
                // Base styles matching mockup .thinking-indicator
                "flex items-center gap-2.5",
                "px-4 py-3 mx-4 my-4",
                "bg-muted border border-border rounded-lg",
                // Animation
                "transition-all duration-300",
                "animate-in fade-in slide-in-from-bottom-2"
            )}
            role="status"
            aria-live="polite"
            aria-label="AI sedang berpikir"
        >
            {/* Text */}
            <span className="text-sm text-muted-foreground">
                AI sedang berpikir
            </span>

            {/* Animated dots matching mockup .thinking-dots */}
            <div className="flex items-center gap-1">
                <span
                    className={cn(
                        "h-1.5 w-1.5 rounded-full bg-muted-foreground",
                        "animate-thinking-dot thinking-dot-1"
                    )}
                />
                <span
                    className={cn(
                        "h-1.5 w-1.5 rounded-full bg-muted-foreground",
                        "animate-thinking-dot thinking-dot-2"
                    )}
                />
                <span
                    className={cn(
                        "h-1.5 w-1.5 rounded-full bg-muted-foreground",
                        "animate-thinking-dot thinking-dot-3"
                    )}
                />
            </div>
        </div>
    )
}
