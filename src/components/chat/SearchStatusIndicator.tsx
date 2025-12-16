"use client"

import { GlobeIcon, AlertCircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type SearchStatus = "searching" | "done" | "off" | "error"

interface SearchStatusIndicatorProps {
    status: SearchStatus
}

export function SearchStatusIndicator({ status }: SearchStatusIndicatorProps) {
    if (status !== "searching" && status !== "error") return null

    const isError = status === "error"
    const text = isError ? "Pencarian gagal" : "Mencari..."

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
            {isError ? (
                <AlertCircleIcon className="h-4 w-4" />
            ) : (
                <GlobeIcon className="h-4 w-4 animate-pulse text-blue-500" />
            )}
            <span>{text}</span>
        </div>
    )
}

