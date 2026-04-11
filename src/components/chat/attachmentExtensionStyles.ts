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

/**
 * Raw lowercased file extensions we render a colored palette for.
 *
 * Distinct from `FileTypeIconExtension` in `FileTypeIcon.tsx`:
 * `FileTypeIconExtension` is keyed on icon-label slugs (one entry per
 * visual family — "doc" covers both .doc and .docx), while
 * `RawFileExtension` is keyed on actual filename extensions as parsed
 * from a user-supplied filename. A single icon family can map to
 * several raw extensions (e.g. `doc` + `docx` both resolve to the
 * "DOC" palette).
 */
export type RawFileExtension =
    | "pdf"
    | "doc"
    | "docx"
    | "xls"
    | "xlsx"
    | "ppt"
    | "pptx"
    | "txt"

export interface ExtensionStyle {
    bg: string
    text: string
    label: string
}

export const EXTENSION_STYLES: Record<RawFileExtension, ExtensionStyle> = {
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

function isRawFileExtension(key: string): key is RawFileExtension {
    return key in EXTENSION_STYLES
}

export function resolveExtensionStyle(fileName: string): ExtensionStyle {
    const { extension } = splitFileName(fileName)
    const key = extension.replace(/^\./, "").toLowerCase()
    if (isRawFileExtension(key)) return EXTENSION_STYLES[key]

    // Generic fallback — show uppercase extension (max 4 chars) or "FILE"
    const fallbackLabel = key ? key.toUpperCase().slice(0, 4) : "FILE"
    return {
        bg: FALLBACK_STYLE.bg,
        text: FALLBACK_STYLE.text,
        label: fallbackLabel,
    }
}
