"use client"

import { cn } from "@/lib/utils"
import {
  NASKAH_TITLE_PAGE_ANCHOR_ID,
  NASKAH_TITLE_PAGE_LABEL,
  getNaskahSectionAnchorId,
} from "@/lib/naskah/anchors"
import type { NaskahSection } from "@/lib/naskah/types"

interface NaskahSidebarProps {
  sections: NaskahSection[]
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
export function NaskahSidebar({ sections }: NaskahSidebarProps) {
  return (
    <nav
      data-testid="naskah-sidebar"
      aria-label="Daftar section naskah"
      className="flex h-full w-full flex-col gap-1 overflow-y-auto bg-[var(--chat-card)] p-4"
    >
      <a
        href={`#${NASKAH_TITLE_PAGE_ANCHOR_ID}`}
        className={cn(
          "rounded-action px-3 py-2 text-sm",
          "text-[var(--chat-foreground)] hover:bg-[var(--chat-accent)]",
          "transition-colors",
        )}
      >
        {NASKAH_TITLE_PAGE_LABEL}
      </a>
      {sections.map((section) => (
        <a
          key={section.key}
          href={`#${getNaskahSectionAnchorId(section.key)}`}
          className={cn(
            "rounded-action px-3 py-2 text-sm",
            "text-[var(--chat-foreground)] hover:bg-[var(--chat-accent)]",
            "transition-colors",
          )}
        >
          {section.label}
        </a>
      ))}
    </nav>
  )
}
