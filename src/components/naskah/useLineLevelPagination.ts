"use client"

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

/**
 * One paginated slice of a flowing content tree, expressed as a vertical
 * pixel range relative to the top of the measurement container.
 *
 * - `startY` is the top of the page's visible window in the measurement
 *   container's coordinate space.
 * - `endY` is the bottom — always a "snap point" landed on a complete
 *   line bottom or block bottom, never mid-line. The slice height is
 *   `endY - startY` and is at most `contentAreaHeightPx`.
 *
 * The visible page renders the same flowing content with
 * `marginTop: -startY` inside an `overflow:hidden` wrapper of height
 * `endY - startY`. That clips the page to exactly the line range that
 * fits, leaving any sub-line whitespace (≤ one line height) as natural
 * trailing margin at the bottom of the page.
 */
export interface LineLevelPage {
  startY: number
  endY: number
}

export interface UseLineLevelPaginationResult {
  pages: LineLevelPage[]
  measurementRef: React.RefObject<HTMLDivElement | null>
  isReady: boolean
}

export interface UseLineLevelPaginationOptions {
  /**
   * Available content area height in pixels (page height minus top +
   * bottom margins). When `null`, the hook stays in fallback mode and
   * returns a single page covering the full measurement height.
   */
  contentAreaHeightPx: number | null
  /**
   * Opaque value the caller changes whenever the rendered content
   * identity has changed. The hook re-runs measurement whenever this
   * value changes by reference. Typical caller pattern:
   *   `const measureTrigger = useMemo(() => Math.random(), [content])`
   * The hook never reads the value — it only uses it as a `useEffect`
   * dependency.
   */
  measureTrigger: unknown
}

/**
 * Convert a flowing content tree (rendered once into a hidden
 * measurement container) into a list of A4-style page slices that snap
 * page breaks to complete-line boundaries.
 *
 * **The "Word break" approach:**
 *
 * A naive block-level greedy fill leaves visual whitespace below short
 * paragraphs because an entire next block jumps to the next page rather
 * than splitting. This hook fixes that by walking inside the rendered
 * content to find every complete line bottom
 * (via `Range.getClientRects()` on text nodes plus block-element
 * `getBoundingClientRect()` for non-text breakpoints), then greedy-fills
 * pages by snapping each break to the largest line bottom that fits
 * inside `pageStartY + contentAreaHeightPx`. The bottom of any given
 * page therefore has at most one line's worth of whitespace — the
 * smallest gap physically possible without splitting glyphs mid-line,
 * which matches what Microsoft Word and Google Docs produce.
 *
 * **Usage contract:**
 *
 * 1. Caller renders the FULL section content (heading + every block,
 *    spacing intact) once inside a hidden measurement container
 *    (position: fixed, off-screen). The caller attaches `measurementRef`
 *    to the container's root element.
 * 2. Caller passes `contentAreaHeightPx` and `measureTrigger`.
 * 3. Hook reads measurements via `useLayoutEffect`, computes page slices,
 *    and returns them as `pages: { startY, endY }[]`.
 * 4. Caller renders N visible `PageContainer`s. Inside each, the SAME
 *    flowing content is rendered again, wrapped in:
 *      <div style={{ height: endY - startY, overflow: "hidden" }}>
 *        <div style={{ marginTop: -startY }}>
 *          {flowing content tree}
 *        </div>
 *      </div>
 *    The clip + offset combo exposes only the slice for that page.
 *
 * **Snap-point sources:**
 *
 * - Text node lines: `Range.selectNodeContents(textNode)` →
 *   `getClientRects()` returns one rect per visual line of that text
 *   node. The bottom of every rect is a candidate snap point.
 * - Block elements: `getBoundingClientRect().bottom` for h1-h6, p, li,
 *   ul, ol, blockquote, hr, div elements gives extra snap points where
 *   block-level margins close (e.g., the bottom of a paragraph
 *   including its `mb` spacing). This catches gaps between subsection
 *   wrappers that have explicit `mt-12` spacing.
 *
 * Both sources are merged, deduped, and sorted ascending.
 *
 * **Greedy fill rule:**
 *
 * For each new page starting at `pageStartY`, find the largest snap
 * point `s` satisfying `pageStartY < s ≤ pageStartY + contentAreaHeightPx`.
 * That `s` becomes `pageEndY`. Next page starts at `pageEndY`.
 *
 * If no snap point fits in the budget (e.g., one block is taller than
 * `contentAreaHeightPx` — phase-1 known limitation), the hook advances
 * by the full budget. Such oversized content overflows visually inside
 * its single page rather than splitting at glyph level.
 *
 * **Re-measurement triggers:**
 *
 * - `contentAreaHeightPx` or `measureTrigger` changes.
 * - Window resize (debounced).
 * - `document.fonts.ready` first resolution after mount.
 *
 * **SSR safety:** measurement only runs in the browser via
 * `useLayoutEffect`. Initial state is the empty page list, which the
 * caller renders as a single fallback page server-side; pagination
 * settles on the client right after first paint.
 *
 * **Phase 1 limitations (documented for future work):**
 *
 * - No widow/orphan rule: a heading at the very bottom of a page can be
 *   stranded from its body. In practice naskah uses `##` subsection
 *   headings split atomically via `splitMarkdownAtHeadings`, so the
 *   heading and at least its first paragraph stay in the same atomic
 *   wrapper element — which the block-bottom snap mostly preserves.
 * - Inline images and other non-text leaf elements are not measured via
 *   Range API, only via block bottom. Naskah currently has no inline
 *   media so this is fine.
 * - One snap pass only — no rebalancing across pages to even out
 *   bottom whitespace. Word does the same: each page is filled
 *   greedy-style.
 */
export function useLineLevelPagination({
  contentAreaHeightPx,
  measureTrigger,
}: UseLineLevelPaginationOptions): UseLineLevelPaginationResult {
  const measurementRef = useRef<HTMLDivElement | null>(null)
  // Single state slot keeps both `pages` and `isReady` in sync and
  // collapses what would otherwise be two `setState` calls per branch
  // into one. The `react-hooks/set-state-in-effect` lint rule fires on
  // each setState invocation inside an effect; consolidating to one
  // call halves the noise and makes the disable annotations easier to
  // audit.
  const [state, setState] = useState<{
    pages: LineLevelPage[]
    isReady: boolean
  }>({ pages: [], isReady: false })
  // Bumped by window-resize and fonts-ready effects to force a re-run
  // of the measurement effect without changing caller-provided props.
  const [internalTrigger, setInternalTrigger] = useState(0)

  useLayoutEffect(() => {
    // The lint rule `react-hooks/set-state-in-effect` flags every
    // `setState` call inside an effect because cascading renders can
    // hurt performance. DOM measurement is the canonical exception:
    // we cannot read layout-dependent values (`scrollHeight`,
    // `getClientRects`, etc.) until after React has committed the
    // DOM, and the entire purpose of `useLayoutEffect` is to do that
    // measurement and reflect it back into state synchronously
    // before paint. We disable the rule once at the function-call
    // boundary instead of at every individual `setState` site.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (contentAreaHeightPx == null || contentAreaHeightPx <= 0) {
      // Caller is in fallback mode (e.g., during SSR or before the
      // page-height clone has rendered). Reset to "not ready" so the
      // visible UI shows the unclipped fallback page.
      setState({ pages: [], isReady: false })
      return
    }
    const root = measurementRef.current
    if (!root) {
      setState({ pages: [], isReady: false })
      return
    }

    const totalHeight = root.scrollHeight
    if (totalHeight <= 0) {
      // Empty content but the hook IS ready — caller's fallback page
      // (a single un-clipped PageContainer) handles the display.
      setState({ pages: [], isReady: true })
      return
    }

    // ── Collect snap points ────────────────────────────────────────────
    // Y coordinates are stored relative to the root's top edge so they
    // remain stable regardless of where the root is positioned in the
    // viewport.
    const rootRect = root.getBoundingClientRect()
    const snapPoints = new Set<number>()

    // Text-node line bottoms via Range API.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let textNode = walker.nextNode() as Text | null
    while (textNode != null) {
      const text = textNode.textContent ?? ""
      if (text.trim().length > 0) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const rects = range.getClientRects()
        for (let i = 0; i < rects.length; i += 1) {
          // Round to integer to dedupe near-duplicates from font subpixel
          // metrics. The +0.5 push prevents rounding-down a snap to the
          // line above its true visual bottom.
          const y = Math.round(rects[i].bottom - rootRect.top + 0.5)
          if (y > 0 && y <= totalHeight) snapPoints.add(y)
        }
      }
      textNode = walker.nextNode() as Text | null
    }

    // Block-element bottoms — captures gaps that lie between block
    // boundaries (e.g., the bottom edge of a `mt-12` wrapper) so the
    // page break can land in those gaps rather than only on text lines.
    const blockEls = root.querySelectorAll<HTMLElement>(
      "h1, h2, h3, h4, h5, h6, p, li, ul, ol, blockquote, hr, div, pre, table",
    )
    for (let i = 0; i < blockEls.length; i += 1) {
      const r = blockEls[i].getBoundingClientRect()
      const y = Math.round(r.bottom - rootRect.top + 0.5)
      if (y > 0 && y <= totalHeight) snapPoints.add(y)
    }

    // Always include totalHeight so the last page's bottom snaps
    // exactly to the end of content (no trailing fractional whitespace).
    snapPoints.add(totalHeight)

    const sortedSnaps = Array.from(snapPoints).sort((a, b) => a - b)

    // ── Greedy fill ────────────────────────────────────────────────────
    const result: LineLevelPage[] = []
    let pageStartY = 0
    // Hard cap to prevent runaway loops in pathological inputs.
    const maxIterations = 200
    let iterations = 0

    while (pageStartY < totalHeight - 1 && iterations < maxIterations) {
      iterations += 1
      const budget = pageStartY + contentAreaHeightPx
      let pageEndY = -1

      // Find the largest snap point > pageStartY and ≤ budget.
      // Linear scan from the back is O(n) but simple; the snap list is
      // small enough (a few hundred entries for a typical naskah
      // section) that a binary search is unnecessary.
      for (let i = sortedSnaps.length - 1; i >= 0; i -= 1) {
        const s = sortedSnaps[i]
        if (s > pageStartY && s <= budget) {
          pageEndY = s
          break
        }
        if (s <= pageStartY) break
      }

      if (pageEndY < 0) {
        // No snap fits — content from pageStartY to budget is one
        // un-snappable chunk (e.g., an oversized image, or a line
        // taller than contentAreaHeightPx). Advance by the full budget
        // so the loop progresses; the chunk will overflow visually.
        pageEndY = Math.min(budget, totalHeight)
      }

      result.push({ startY: pageStartY, endY: pageEndY })

      // Guard against zero-width advances (would loop forever otherwise).
      if (pageEndY <= pageStartY) {
        break
      }
      pageStartY = pageEndY
    }

    if (result.length === 0) {
      result.push({ startY: 0, endY: Math.min(totalHeight, contentAreaHeightPx) })
    }

    // Single consolidated state write — see the `useState` declaration
    // above for the rationale.
    setState({ pages: result, isReady: true })
    /* eslint-enable react-hooks/set-state-in-effect */
    // `internalTrigger` is intentionally in the dep list so window
    // resize and font load can force re-measurement.
  }, [contentAreaHeightPx, measureTrigger, internalTrigger])

  // Window resize: debounced re-measurement using rAF + setTimeout to
  // avoid running on every pixel during a drag.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return
    let rafId: number | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const handleResize = () => {
      if (rafId != null) cancelAnimationFrame(rafId)
      if (timeoutId != null) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        rafId = requestAnimationFrame(() => {
          setInternalTrigger((t) => t + 1)
        })
      }, 120)
    }
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      if (rafId != null) cancelAnimationFrame(rafId)
      if (timeoutId != null) clearTimeout(timeoutId)
    }
  }, [])

  // Font load: re-measure once webfonts finish loading because line
  // metrics depend on the loaded font's box dimensions.
  useLayoutEffect(() => {
    if (typeof document === "undefined") return
    const fonts = (
      document as Document & {
        fonts?: FontFaceSet & { ready?: Promise<FontFaceSet> }
      }
    ).fonts
    if (!fonts || !fonts.ready) return
    let cancelled = false
    fonts.ready.then(() => {
      if (cancelled) return
      setInternalTrigger((t) => t + 1)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(
    () => ({
      pages: state.pages,
      measurementRef,
      isReady: state.isReady,
    }),
    [state.pages, state.isReady],
  )
}
