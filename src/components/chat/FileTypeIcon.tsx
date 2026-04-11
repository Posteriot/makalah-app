"use client"

import { cn } from "@/lib/utils"

/**
 * Monochrome file-type icon rendered as a pure SVG using `currentColor`.
 *
 * Shape: outline file body with a folded top-right corner. Inside the body,
 * the extension label (PDF / DOC / XLS / PPT / TXT / IMG) is rendered as
 * monospace text. Both the outline stroke and the text fill use
 * `currentColor`, so the icon adapts to whatever text color its parent sets
 * — matching the `currentColor`-based pattern already used by iconoir-react
 * throughout the chat UI.
 *
 * Why custom vs a library (file-icon-vectors, untitledui, etc.):
 * - All available file-icon libraries ship hardcoded fill colors.
 * - We want a single gray/slate family that adapts to dark/light mode without
 *   CSS overrides or variant swaps.
 * - Tiny bundle: one component, six string labels, zero dependencies.
 */

export type FileTypeIconExtension = "pdf" | "doc" | "xls" | "ppt" | "txt" | "img"

interface FileTypeIconProps {
    extension: FileTypeIconExtension
    className?: string
    "aria-label"?: string
}

const LABELS: Record<FileTypeIconExtension, string> = {
    pdf: "PDF",
    doc: "DOC",
    xls: "XLS",
    ppt: "PPT",
    txt: "TXT",
    img: "IMG",
}

export function FileTypeIcon({
    extension,
    className,
    "aria-label": ariaLabel,
}: FileTypeIconProps) {
    const label = LABELS[extension]
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            // NOTE: className must use `size-*` (not `h-* w-*`), otherwise the
            // shadcn DropdownMenuItem wrapper auto-forces `size-4` via the
            // selector `[&_svg:not([class*='size-'])]:size-4`.
            className={cn("size-5", className)}
            role={ariaLabel ? "img" : undefined}
            aria-label={ariaLabel}
            aria-hidden={ariaLabel ? undefined : true}
        >
            {/* File body outline with folded top-right corner */}
            <path
                d="M5 3a1 1 0 0 1 1-1h8.5L19 6.5V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3z M14.5 2v5H19"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            {/* Extension label inside the body */}
            <text
                x="12"
                y="17"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontSize="7"
                fontWeight="700"
                textAnchor="middle"
                fill="currentColor"
            >
                {label}
            </text>
        </svg>
    )
}
