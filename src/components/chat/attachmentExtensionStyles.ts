import { splitFileName } from "@/lib/types/attached-file"

/**
 * Shared visual configuration for rendering file-type badges in attachment UI.
 *
 * Two consumers:
 * - `MessageAttachment` (sent message bubble) — renders `label` as text inside
 *   a colored square using `bg`/`text`.
 * - `ChatInputAttachment` (upload preview above chat input) — renders a document
 *   icon inside a square using `bg`/`text` for background/icon color, and
 *   uses `label` as the text subtitle below the filename.
 */

export interface ExtensionStyle {
    bg: string
    text: string
    label: string
}

export const EXTENSION_STYLES: Record<string, ExtensionStyle> = {
    pdf: { bg: "bg-red-500/15", text: "text-red-400", label: "PDF" },
    doc: { bg: "bg-blue-500/15", text: "text-blue-400", label: "DOC" },
    docx: { bg: "bg-blue-500/15", text: "text-blue-400", label: "DOC" },
    xls: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "XLS" },
    xlsx: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "XLS" },
    ppt: { bg: "bg-orange-500/15", text: "text-orange-400", label: "PPT" },
    pptx: { bg: "bg-orange-500/15", text: "text-orange-400", label: "PPT" },
    txt: { bg: "bg-zinc-500/15", text: "text-zinc-400", label: "TXT" },
}

const FALLBACK_STYLE: ExtensionStyle = {
    bg: "bg-[color:var(--chat-muted)]",
    text: "text-[color:var(--chat-muted-foreground)]",
    label: "FILE",
}

export function resolveExtensionStyle(name: string): ExtensionStyle {
    const { extension } = splitFileName(name)
    const key = extension.replace(/^\./, "").toLowerCase()
    if (key && EXTENSION_STYLES[key]) return EXTENSION_STYLES[key]

    // Generic fallback — show uppercase extension (max 4 chars) or "FILE"
    const fallbackLabel = key ? key.toUpperCase().slice(0, 4) : "FILE"
    return {
        bg: FALLBACK_STYLE.bg,
        text: FALLBACK_STYLE.text,
        label: fallbackLabel,
    }
}
