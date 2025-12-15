"use client"

import { cn } from "@/lib/utils"
import { Loader2Icon, AlertCircleIcon } from "lucide-react"

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

    let text = ""
    if (state === 'input-streaming') text = `AI menyiapkan ${toolName}...`
    else if (state === 'input-available') text = `Memproses ${toolName}...`
    else if (isError) text = `Gagal: ${errorText || "Terjadi kesalahan"}`
    else text = `${toolName} (${state})`

    return (
        <div
            className={cn(
                "flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm transition-all duration-300 animate-in fade-in zoom-in-95",
                isError
                    ? "border-destructive/20 bg-destructive/10 text-destructive"
                    : "border-blue-500/20 bg-blue-500/10 text-foreground"
            )}
            role="status"
            aria-label={text}
        >
            {isProcessing && <Loader2Icon className="h-4 w-4 animate-spin text-blue-500" />}
            {isError && <AlertCircleIcon className="h-4 w-4" />}
            <span>{text}</span>
        </div>
    )
}
