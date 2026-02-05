"use client"

import { Copy, Check } from "iconoir-react"
import { useState } from "react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

// ============================================================================
// HIDDEN FEATURES (Not Yet Implemented)
// See: .references/hidden-features.md
// - Insert to Paper (CHAT-046)
// - Save to Snippets (CHAT-047)
// ============================================================================

interface QuickActionsProps {
    content: string
}

export function QuickActions({ content }: QuickActionsProps) {
    const [isCopied, setIsCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        } catch {
            alert("Failed to copy to clipboard")
        }
    }

    return (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={handleCopy}
                        className={`flex items-center gap-1 text-[10px] font-mono transition-colors p-1.5 rounded-md hover:bg-muted ${
                            isCopied ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
                        }`}
                        aria-label="Copy to clipboard"
                    >
                        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>{isCopied ? "Copied" : "Copy"}</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent>Copy to clipboard</TooltipContent>
            </Tooltip>
        </div>
    )
}
