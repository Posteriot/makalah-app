"use client"

import { useCallback, useState } from "react"
import { Download, NavArrowDown } from "iconoir-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { NaskahSection } from "@/lib/naskah/types"

interface NaskahDownloadButtonProps {
  /**
   * The naskah snapshot the user is currently viewing. Sent verbatim
   * to the export endpoint so the downloaded file matches what's on
   * screen — there's no DB roundtrip, no race against newer
   * revisions.
   */
  title: string
  sections: NaskahSection[]
  /**
   * When true, the button is disabled and shows the download icon
   * grayed out. Used while the snapshot is loading or when the naskah
   * is not yet available (no validated sections).
   */
  disabled?: boolean
}

type DownloadFormat = "pdf" | "docx"

interface FormatConfig {
  endpoint: string
  defaultFilename: string
  errorLabel: string
  menuLabel: string
}

/**
 * Per-format configuration. Centralizing this here keeps the
 * `handleDownload` callback small and removes the long if/else chain
 * that the legacy artifact-modal `handleDownload` uses. Adding a third
 * format (TXT, RTF, etc.) means adding one entry here.
 */
const FORMATS: Record<DownloadFormat, FormatConfig> = {
  pdf: {
    endpoint: "/api/naskah/export/pdf",
    defaultFilename: "naskah.pdf",
    errorLabel: "PDF",
    menuLabel: "PDF",
  },
  docx: {
    endpoint: "/api/naskah/export/word",
    defaultFilename: "naskah.docx",
    errorLabel: "DOCX",
    menuLabel: "DOCX",
  },
}

/**
 * Dropdown download button for naskah preview.
 *
 * Styled to match the existing artifact-viewer download dropdown
 * (`FullsizeArtifactModal.tsx`) so the two affordances feel like
 * siblings: same `variant="outline" size="sm"`, same h-7 / px-2.5 /
 * font-mono / 11px sizing, same icon set (Download + NavArrowDown).
 *
 * **Why a real download path (not the artifact's stub)?**
 * The legacy artifact "download" just renames the markdown text with
 * a `.pdf` / `.docx` extension and pushes it as a Blob — the file
 * opens as garbage in Word or Acrobat. For naskah we wire the click
 * to real server-side builders that produce actual PDF (via pdfkit)
 * and DOCX (via the `docx` package) files. CLAUDE.md "Never claim
 * success when it's a lie" — a Download button must produce real
 * files, not lies.
 *
 * **Failure UX:**
 * - Toast error if the API returns a non-200.
 * - Toast error if the network throws.
 * - The button stays clickable after a failure so the user can
 *   retry without remounting.
 *
 * **Loading state:**
 * - The trigger button is disabled and shows a "..." suffix while a
 *   download is in flight, preventing concurrent requests.
 */
export function NaskahDownloadButton({
  title,
  sections,
  disabled = false,
}: NaskahDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = useCallback(
    async (format: DownloadFormat) => {
      if (isDownloading) return
      const config = FORMATS[format]
      setIsDownloading(true)
      try {
        const response = await fetch(config.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, sections }),
        })

        if (!response.ok) {
          // Try to surface the server error message; fall back to
          // generic copy if the body isn't JSON.
          let serverMessage = ""
          try {
            const json = await response.json()
            if (json && typeof json.error === "string") {
              serverMessage = `: ${json.error}`
            }
          } catch {
            // ignore — body isn't JSON
          }
          throw new Error(
            `Gagal mengunduh ${config.errorLabel}${serverMessage}`,
          )
        }

        // Pull the suggested filename out of Content-Disposition
        // (`attachment; filename="..."`). Falls back to the format
        // default if the header is missing or malformed.
        const disposition = response.headers.get("Content-Disposition") ?? ""
        const filenameMatch = disposition.match(/filename="([^"]+)"/)
        const filename = filenameMatch?.[1] ?? config.defaultFilename

        // Download as Blob → object URL → simulated anchor click.
        // This is the standard browser-only download flow that doesn't
        // need a navigation or third-party helper.
        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = objectUrl
        anchor.download = filename
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)
        URL.revokeObjectURL(objectUrl)

        toast.success(`${config.errorLabel} berhasil diunduh.`)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Gagal mengunduh file."
        toast.error(message)
      } finally {
        setIsDownloading(false)
      }
    },
    [isDownloading, sections, title],
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isDownloading}
          className="h-7 px-2.5 font-mono text-[11px]"
          aria-label="Download naskah"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {isDownloading ? "Mengunduh..." : "Download"}
          <NavArrowDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="font-mono text-xs">
        <DropdownMenuItem
          onClick={() => handleDownload("pdf")}
          disabled={isDownloading}
        >
          {FORMATS.pdf.menuLabel}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleDownload("docx")}
          disabled={isDownloading}
        >
          {FORMATS.docx.menuLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
