"use client"

import { cn } from "@/lib/utils"
import type {
  NaskahSnapshotStatus,
  NaskahTitleSource,
} from "@/lib/naskah/types"

interface NaskahHeaderProps {
  title: string
  /** Reserved for future title-source badges; not rendered in phase 1. */
  titleSource: NaskahTitleSource
  status: NaskahSnapshotStatus
  pageEstimate: number
  updatePending: boolean
  isRefreshing?: boolean
  onRefresh?: () => void
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
              "inline-flex items-center rounded-full px-2 py-0.5",
              "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
              "text-xs font-medium",
            )}
          >
            Bertumbuh
          </span>
        )}
        <span className="text-[var(--chat-muted-foreground)]">
          Naskah sedang bertumbuh seiring section tervalidasi.
        </span>
        <span className="ml-auto text-[var(--chat-muted-foreground)]">
          Estimasi {pageEstimate} halaman
        </span>
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
