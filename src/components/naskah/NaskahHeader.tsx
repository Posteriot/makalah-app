"use client"

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
  pageEstimate: number
  updatePending: boolean
  isRefreshing?: boolean
  onRefresh?: () => void
  /**
   * Sections of the currently-viewed snapshot. Passed verbatim to
   * `NaskahDownloadButton` so the download endpoint receives exactly
   * the content the user is looking at — no DB roundtrip, no race
   * against newer revisions.
   */
  downloadSections: NaskahSection[]
  /**
   * When false, the download button is rendered but disabled. Used
   * during initial load and when the snapshot is unavailable (no
   * validated abstrak).
   */
  downloadEnabled: boolean
}

/**
 * Two-row Naskah header per D-058.
 *
 * Row 1: small "Naskah" identity label above the active paper title.
 * Row 2: status badge (Bertumbuh) + info text + page estimate.
 *
 * When `updatePending` is true, an inline update banner appears below
 * the two rows with the "Update" CTA. The banner is the only place that
 * surfaces the manual refresh affordance per D-029.
 */
export function NaskahHeader({
  title,
  status,
  pageEstimate,
  updatePending,
  isRefreshing = false,
  onRefresh,
  downloadSections,
  downloadEnabled,
}: NaskahHeaderProps) {
  return (
    <header
      data-testid="naskah-header"
      className="bg-[var(--chat-background)] px-6 py-5 md:px-8"
    >
      <div className="mb-3">
        <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--chat-muted-foreground)]">
          Naskah
        </span>
        <span className="mt-1 block text-xl font-semibold text-[var(--chat-foreground)]">
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
        {/*
          Right-aligned cluster: page estimate + download dropdown.
          The whole group gets `ml-auto` so it pins to the right edge
          of the row, with the page estimate sitting just left of the
          download button per D-* spec ("dropdown di sebelah kanan ui
          teks 'Estimasi X Halaman'").
        */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[var(--chat-muted-foreground)]">
            Estimasi {pageEstimate} halaman
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
