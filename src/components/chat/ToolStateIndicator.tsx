"use client"

import { cn } from "@/lib/utils"
import { WarningCircle, Globe } from "iconoir-react"

interface ToolStateIndicatorProps {
    toolName: string
    state: string
    errorText?: string
    /** Keep indicator visible while assistant response is still streaming */
    persistUntilDone?: boolean
}

const SHIMMER_TEXTS = new Set([
    "Pencarian web",
    "Memulai sesi paper",
    "Mengambil status sesi paper",
    "Menyimpan progres tahapan",
    "Mengirim validasi tahapan",
    "Mengomplisasi daftar pustaka",
    "Respons agen",
])

const TOOL_LABEL_MAP: Record<string, string> = {
    google_search: "Pencarian web",
    getCurrentPaperState: "Mengambil status sesi paper",
    updateStageData: "Menyimpan progres tahapan",
    submitStageForValidation: "Mengirim validasi tahapan",
    createArtifact: "Membuat artifak",
    updateArtifact: "Memperbarui artifak",
    renameConversationTitle: "Mengubah judul percakapan",
    assistant_response: "Respons agen",
}

const STATE_LABEL_MAP: Record<string, string> = {
    "input-streaming": "menjalankan",
    "input-available": "memproses",
    "output-available": "selesai",
    result: "hasil",
    "output-error": "galat",
    error: "galat",
    unknown: "tidak diketahui",
}

const toFallbackLabel = (value: string) => value.replace(/[_-]+/g, " ").trim().toLowerCase()

export const getToolLabel = (toolName: string) => TOOL_LABEL_MAP[toolName] ?? toFallbackLabel(toolName)

const getStateLabel = (state: string) => STATE_LABEL_MAP[state] ?? toFallbackLabel(state)

const normalizeErrorText = (errorText?: string): string | null => {
    const raw = (errorText ?? "").trim()
    if (!raw) return null

    const normalized = raw.toLowerCase()
    if (
        normalized === "unknown" ||
        normalized === "tidak diketahui" ||
        normalized === "undefined" ||
        normalized === "null" ||
        normalized === "[object object]"
    ) {
        return null
    }

    return raw
}

export function ToolStateIndicator({ toolName, state, errorText, persistUntilDone = false }: ToolStateIndicatorProps) {
    // Skip if state implies success (handled by ArtifactIndicator) or if state is result
    const isCompletedState = state === "output-available" || state === "result"
    if (isCompletedState && !persistUntilDone) return null

    const normalizedState = isCompletedState && persistUntilDone ? "input-available" : state

    const isError = normalizedState === 'output-error' || normalizedState === 'error'
    const isProcessing = normalizedState === 'input-streaming' || normalizedState === 'input-available'

    const isGoogleSearch = toolName === 'google_search'
    const toolLabel = getToolLabel(toolName)
    const stateLabel = getStateLabel(normalizedState)
    const normalizedErrorText = normalizeErrorText(errorText)
    const toolContextLabel = toolLabel.toLowerCase()

    let text = ""
    if (normalizedState === 'input-streaming' && toolName === "compileDaftarPustaka") {
        text = "Mengomplisasi daftar pustaka"
    }
    else if (normalizedState === 'input-streaming') {
        text = isGoogleSearch ? "Pencarian web" : `Menjalankan ${toolLabel}`
    }
    else if (normalizedState === 'input-available') {
        text = toolLabel
    }
    else if (isError) {
        text = normalizedErrorText
            ? `Galat: ${normalizedErrorText}`
            : `Galat pada ${toolContextLabel}`
    }
    else text = `Status ${toolLabel}: ${stateLabel}`

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
                isGoogleSearch ? (
                    <Globe className="h-4 w-4 animate-pulse text-current" />
                ) : (
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )
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
