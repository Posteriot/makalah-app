import type { NaskahSectionKey } from "./types"

/**
 * DOM anchor conventions for the naskah preview page.
 *
 * The sidebar and the preview both need to agree on:
 *   - the anchor id of the title page entry
 *   - the anchor id of each section entry
 *   - the human-readable label for the title page entry
 *
 * These constants live OUTSIDE `types.ts` so the type module stays focused
 * on data shape and does not pick up DOM-convention concerns.
 */

export const NASKAH_TITLE_PAGE_ANCHOR_ID = "title-page" as const
export const NASKAH_TITLE_PAGE_LABEL = "Judul Kerja"

export function getNaskahSectionAnchorId(key: NaskahSectionKey): string {
  return `section-${key}`
}
