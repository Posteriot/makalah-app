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
                "bg-transparent border-0",
                // Animation
                "transition-all duration-300",
                "animate-in fade-in slide-in-from-bottom-2"
            )}
            role="status"
            aria-live="polite"
            aria-label="Agen sedang berpikir"
        >
            {/* Text - Terminal style, Mono */}
            <span className="text-[11px] font-mono tracking-wider text-[var(--chat-muted-foreground)]">
                Agen memproses
            </span>

            {/* Animated dots matching mockup .thinking-dots */}
            <div className="flex items-center gap-1">
                <span
                    className={cn(
                        "h-1.5 w-1.5 rounded-full bg-[var(--chat-muted-foreground)]",
                        "animate-thinking-dot thinking-dot-1"
                    )}
                />
                <span
                    className={cn(
                        "h-1.5 w-1.5 rounded-full bg-[var(--chat-muted-foreground)]",
                        "animate-thinking-dot thinking-dot-2"
                    )}
                />
                <span
                    className={cn(
                        "h-1.5 w-1.5 rounded-full bg-[var(--chat-muted-foreground)]",
                        "animate-thinking-dot thinking-dot-3"
                    )}
                />
            </div>
        </div>
    )
}
