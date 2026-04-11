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
 * Why custom vs a file-icon library: the libraries we evaluated (e.g.
 * file-icon-vectors, untitled-ui) ship with hardcoded fills, which would
 * fight our `currentColor`-based theming and force per-variant CSS overrides.
 * A custom one-component render keeps the bundle negligible and gives us
 * native dark/light adaptivity.
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
            // NOTE: the default size class must follow the `size-*` pattern
            // (not `h-* w-*`). The shadcn DropdownMenuItem wrapper in
            // `src/components/ui/dropdown-menu.tsx` has a default-size
            // selector that clamps any child SVG without a `size-*` class
            // to 16px, which would silently shrink the icon below
            // readability inside menu items.
            className={cn("size-5", className)}
            role={ariaLabel ? "img" : undefined}
            aria-label={ariaLabel}
            aria-hidden={ariaLabel ? undefined : true}
        >
            <path
                d="M5 3a1 1 0 0 1 1-1h8.5L19 6.5V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3z M14.5 2v5H19"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
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
