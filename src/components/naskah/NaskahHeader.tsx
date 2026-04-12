"use client"

import { ZoomIn, ZoomOut } from "iconoir-react"
import { cn } from "@/lib/utils"
import type {
  NaskahSection,
  NaskahSnapshotStatus,
  NaskahTitleSource,
} from "@/lib/naskah/types"
import { NaskahDownloadButton } from "./NaskahDownloadButton"

interface NaskahHeaderProps {
  title: string
  /** Reserved for future title-source badges; not rendered in phase 1. */
  titleSource: NaskahTitleSource
  status: NaskahSnapshotStatus
  /**
   * Actual rendered page count from NaskahPreview's line-level
   * pagination, or the compiler's estimate as fallback before
   * measurement fires.
   */
  pageCount: number
  updatePending: boolean
  isRefreshing?: boolean
  onRefresh?: () => void
  downloadSections: NaskahSection[]
  downloadEnabled: boolean
  /** Current zoom level (0.5 – 2.0). Controls scale of the paper preview. */
  zoomLevel: number
  /** Callback to change the zoom level. */
  onZoomChange: (level: number) => void
}

const ZOOM_STEP = 0.1
const ZOOM_MIN = 0.5
const ZOOM_MAX = 2.0

/**
 * Naskah header.
 *
 * Row 1: paper title (compact).
 * Row 2: status badge + info text + zoom controls + page count + download.
 *
 * When `updatePending` is true, an inline update banner appears below
 * with the "Update" CTA per D-029.
 */
export function NaskahHeader({
  title,
  status,
  pageCount,
  updatePending,
  isRefreshing = false,
  onRefresh,
  downloadSections,
  downloadEnabled,
  zoomLevel,
  onZoomChange,
}: NaskahHeaderProps) {
  return (
    <header
      data-testid="naskah-header"
      className="bg-[var(--chat-background)] px-6 py-5 md:px-8"
    >
      <div className="mb-1.5">
        <span className="block text-base font-semibold text-[var(--chat-foreground)]">
          {title}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {status === "growing" && (
          <span
            className={cn(
              "inline-flex items-center rounded-badge border px-1.5 py-0.5",
              "border-[color:var(--chat-info)] bg-[var(--chat-info)]",
              "text-[10px] font-mono font-bold tracking-wide text-[var(--chat-info-foreground)]",
              "shrink-0",
            )}
          >
            Bertumbuh
          </span>
        )}
        <span className="text-[var(--chat-muted-foreground)]">
          Naskah sedang bertumbuh seiring section tervalidasi.
        </span>
        <div className="ml-auto flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoomLevel <= ZOOM_MIN}
              onClick={() =>
                onZoomChange(
                  Math.max(ZOOM_MIN, Math.round((zoomLevel - ZOOM_STEP) * 10) / 10),
                )
              }
              className={cn(
                "rounded p-1 text-[var(--chat-muted-foreground)] transition-colors",
                "hover:bg-[var(--chat-muted)] hover:text-[var(--chat-foreground)]",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
              )}
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoomLevel >= ZOOM_MAX}
              onClick={() =>
                onZoomChange(
                  Math.min(ZOOM_MAX, Math.round((zoomLevel + ZOOM_STEP) * 10) / 10),
                )
              }
              className={cn(
                "rounded p-1 text-[var(--chat-muted-foreground)] transition-colors",
                "hover:bg-[var(--chat-muted)] hover:text-[var(--chat-foreground)]",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
              )}
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
          <span className="text-[var(--chat-muted-foreground)]">
            {pageCount} Halaman
          </span>
          <NaskahDownloadButton
            title={title}
            sections={downloadSections}
            disabled={!downloadEnabled}
          />
        </div>
      </div>

      {updatePending && (
        <div
          className={cn(
            "mt-3 flex items-center justify-between gap-3 rounded-action px-3 py-2",
            "border border-[color:var(--chat-border)] bg-[var(--chat-card)]",
          )}
        >
          <span className="text-sm text-[var(--chat-foreground)]">
            Versi naskah terbaru tersedia.
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cn(
              "rounded-action px-3 py-1 text-sm font-medium",
              "bg-[var(--chat-info)] text-white",
              "disabled:cursor-not-allowed disabled:opacity-60",
              "hover:bg-[color:color-mix(in_oklab,var(--chat-info)_88%,black)]",
              "transition-colors",
            )}
          >
            {isRefreshing ? "Memuat..." : "Update"}
          </button>
        </div>
      )}
    </header>
  )
}
