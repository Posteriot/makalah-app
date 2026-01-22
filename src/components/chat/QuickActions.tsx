"use client"

import { CopyIcon, FileTextIcon, BookmarkIcon, CheckIcon } from "lucide-react"
import { useState } from "react"

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

    const handleInsert = () => {
        // Placeholder for CHAT-046
        alert("This will be implemented in paper integration phase (Insert to Paper)")
    }

    const handleSave = () => {
        // Placeholder for CHAT-047
        alert("Content saved to your snippets")
    }

    return (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
            <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted"
                title="Copy to clipboard"
            >
                {isCopied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
                <span>{isCopied ? "Copied" : "Copy"}</span>
            </button>
            <button
                onClick={handleInsert}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted"
                title="Insert to Paper"
            >
                <FileTextIcon className="h-3.5 w-3.5" />
                <span>Insert</span>
            </button>
            <button
                onClick={handleSave}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted"
                title="Save to Snippets"
            >
                <BookmarkIcon className="h-3.5 w-3.5" />
                <span>Save</span>
            </button>
        </div>
    )
}
