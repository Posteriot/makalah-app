"use client"

import { cn } from "@/lib/utils"
import {
  NASKAH_TITLE_PAGE_ANCHOR_ID,
  NASKAH_TITLE_PAGE_LABEL,
  getNaskahSectionAnchorId,
} from "@/lib/naskah/anchors"
import type { NaskahSection, NaskahSectionKey } from "@/lib/naskah/types"

interface NaskahSidebarProps {
  sections: NaskahSection[]
  highlightedSectionKeys?: NaskahSectionKey[]
}

/**
 * Left outline for the Naskah preview.
 *
 * The first item is "Halaman Judul" per D-052. Subsequent items follow
 * the canonical academic order of `sections` (which the compiler
 * already orders for us). Navigation uses native anchor links — no JS
 * click handler, no scroll-spy state.
 *
 * Active-section highlight on scroll (D-027) is intentionally deferred
 * to a later phase. Phase 1 ships without it.
 */
export function NaskahSidebar({
  sections,
  highlightedSectionKeys = [],
}: NaskahSidebarProps) {
  return (
    <nav
      data-testid="naskah-sidebar"
      aria-label="Daftar section naskah"
      className="flex h-full w-full min-h-0 flex-col text-[var(--chat-sidebar-foreground)]"
    >
      <div className="shrink-0 px-5 pb-3 pt-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--chat-muted-foreground)]">
          Outline
        </p>
        <p className="mt-1 text-[15px] font-semibold text-[var(--chat-sidebar-foreground)]">
          Struktur naskah
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <a
          href={`#${NASKAH_TITLE_PAGE_ANCHOR_ID}`}
          className={cn(
            "block rounded-action px-3 py-2 text-sm",
            "text-[var(--chat-sidebar-foreground)] transition-colors duration-150 hover:bg-[var(--chat-sidebar-accent)] hover:text-[var(--chat-sidebar-accent-foreground)]",
          )}
        >
          {NASKAH_TITLE_PAGE_LABEL}
        </a>
        {sections.map((section) => (
          <a
            key={section.key}
            href={`#${getNaskahSectionAnchorId(section.key)}`}
            data-changed={highlightedSectionKeys.includes(section.key)}
            className={cn(
              "mt-1 block rounded-action px-3 py-2 text-sm",
              "text-[var(--chat-sidebar-foreground)] transition-colors duration-150 hover:bg-[var(--chat-sidebar-accent)] hover:text-[var(--chat-sidebar-accent-foreground)]",
              highlightedSectionKeys.includes(section.key) &&
                "bg-[color:color-mix(in_oklab,var(--chat-info)_14%,transparent)] ring-1 ring-[color:color-mix(in_oklab,var(--chat-info)_55%,transparent)]",
            )}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
