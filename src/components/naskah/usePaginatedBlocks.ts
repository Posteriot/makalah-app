"use client"

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

/**
 * Result type for `usePaginatedBlocks`.
 *
 * - `pages` is an array of pages; each page is an array of block INDICES
 *   (not the block content itself) from the original `blocks` input.
 *   Indices let the caller map back to whatever React nodes they already
 *   rendered, without the hook needing to know about content types.
 * - `measurementRef` is attached to the caller's hidden scratch
 *   container. Children of that container must expose `data-block-idx`
 *   attributes so the hook can query them by index.
 * - `isReady` flips from `false` to `true` on the first successful
 *   measurement. Before `isReady` the `pages` array contains a default
 *   fallback (one page containing all blocks).
 */
export interface UsePaginatedBlocksResult {
  pages: number[][]
  measurementRef: React.RefObject<HTMLDivElement | null>
  isReady: boolean
}

export interface UsePaginatedBlocksOptions {
  /**
   * Total number of blocks to distribute. Usually derived from the
   * parent's `blocks.length`. Passing just the count (not the content
   * array) lets the hook treat blocks as opaque identifiers and avoid
   * unnecessary re-runs when content strings are equal by reference.
   */
  blockCount: number
  /**
   * Available content area height in pixels. This is the space inside
   * the page after top + bottom margins are subtracted.
   * When `null`, the hook is in "not ready" state and returns a
   * fallback single-page distribution.
   */
  contentAreaHeightPx: number | null
  /**
   * A monotonically-increasing trigger value that the caller bumps when
   * the rendered block content has changed (e.g., section content
   * rewritten, markdown split result changed). The hook re-runs
   * measurement whenever this changes.
   */
  measureTrigger: number
}

/**
 * Hook that converts a flat list of rendered "blocks" into a list of
 * pages by measuring each block's pixel height and greedy-filling pages
 * of a given content area height.
 *
 * **Usage contract:**
 *
 * 1. Caller renders N blocks inside a hidden scratch container. Each
 *    block wrapper element MUST have `data-block-idx="<i>"` for
 *    i = 0..N-1.
 * 2. Caller attaches `measurementRef` to the scratch container root.
 * 3. Caller passes `blockCount`, `contentAreaHeightPx`, and
 *    `measureTrigger` to the hook.
 * 4. Hook runs a `useLayoutEffect` that queries children by
 *    `data-block-idx`, reads `offsetHeight` for each, and greedy-fills
 *    pages.
 * 5. Caller reads `pages` (an array of index arrays) and renders N
 *    visible `PageContainer` components, each mapping its indices back
 *    to the underlying block content.
 *
 * **Greedy fill rule:**
 * - Start page 0 with height budget `contentAreaHeightPx`.
 * - For each block `i` with height `h_i`:
 *     - If adding `h_i` to the current page would exceed the budget
 *       AND the current page already has at least one block, start a
 *       new page with `i` on it.
 *     - Otherwise (block fits OR current page is empty), append `i` to
 *       the current page.
 *   The "already has at least one block" clause ensures an oversized
 *   single block is rendered on its own page rather than being looped
 *   forever or losing its place. It overflows visually — documented
 *   as known phase-1 behavior in NaskahPreview.
 *
 * **Re-measurement triggers:**
 * - `blockCount`, `contentAreaHeightPx`, or `measureTrigger` changes.
 * - Window resize (debounced).
 * - `document.fonts.ready` first resolution after mount (fonts affect
 *   block height).
 *
 * **SSR safety:** the hook relies on layout measurement which only runs
 * in the browser. The initial state is a single-page fallback that
 * renders correctly server-side; pagination kicks in on the client.
 */
export function usePaginatedBlocks({
  blockCount,
  contentAreaHeightPx,
  measureTrigger,
}: UsePaginatedBlocksOptions): UsePaginatedBlocksResult {
  const measurementRef = useRef<HTMLDivElement | null>(null)
  const [pages, setPages] = useState<number[][]>(() =>
    defaultSinglePage(blockCount),
  )
  const [isReady, setIsReady] = useState(false)
  // Bumped by window-resize / fonts-ready side effects to force a
  // re-run of the measurement effect. Kept internal so the hook's
  // external API stays minimal.
  const [internalTrigger, setInternalTrigger] = useState(0)

  const measure = useCallback(() => {
    if (contentAreaHeightPx == null || contentAreaHeightPx <= 0) {
      setPages(defaultSinglePage(blockCount))
      setIsReady(false)
      return
    }
    const root = measurementRef.current
    if (!root) {
      setPages(defaultSinglePage(blockCount))
      setIsReady(false)
      return
    }

    const elements = Array.from(
      root.querySelectorAll<HTMLElement>("[data-block-idx]"),
    )
    if (elements.length === 0) {
      // Empty content — no pages to render, but mark as ready so the
      // caller stops showing a fallback.
      setPages([])
      setIsReady(true)
      return
    }

    const heights = new Array<number>(blockCount).fill(0)
    for (const el of elements) {
      const idxAttr = el.getAttribute("data-block-idx")
      if (idxAttr == null) continue
      const idx = Number.parseInt(idxAttr, 10)
      if (!Number.isFinite(idx) || idx < 0 || idx >= blockCount) continue
      heights[idx] = el.offsetHeight
    }

    const nextPages: number[][] = []
    let currentPage: number[] = []
    let currentHeight = 0

    for (let i = 0; i < blockCount; i += 1) {
      const h = heights[i]
      if (currentPage.length === 0) {
        // Always place the first block on a fresh page, regardless of
        // whether it overflows. Edge case Q2A per the plan: oversized
        // blocks overflow their page visually.
        currentPage.push(i)
        currentHeight = h
        continue
      }
      if (currentHeight + h > contentAreaHeightPx) {
        nextPages.push(currentPage)
        currentPage = [i]
        currentHeight = h
      } else {
        currentPage.push(i)
        currentHeight += h
      }
    }
    if (currentPage.length > 0) {
      nextPages.push(currentPage)
    }

    setPages(nextPages)
    setIsReady(true)
  }, [blockCount, contentAreaHeightPx])

  // Primary measurement effect. Runs synchronously after the scratch
  // container has rendered (via useLayoutEffect) so the visible output
  // switches to paginated form before the browser paints.
  useLayoutEffect(() => {
    measure()
    // `internalTrigger` is intentionally included so window-resize and
    // fonts-ready can force a re-measurement without changing the
    // caller-provided props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, measureTrigger, internalTrigger])

  // Window resize: debounced re-measurement. Uses rAF + timeout to
  // avoid running on every pixel of a drag.
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

  // Font load: re-measure when webfonts finish loading, because block
  // heights depend on the metrics of the loaded font. If the environment
  // does not support `document.fonts`, skip silently.
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

  // Memoize the returned object so consumer components do not re-render
  // unnecessarily when unrelated parent state changes.
  return useMemo(
    () => ({ pages, measurementRef, isReady }),
    [pages, measurementRef, isReady],
  )
}

function defaultSinglePage(blockCount: number): number[][] {
  if (blockCount <= 0) return []
  const indices: number[] = new Array(blockCount)
  for (let i = 0; i < blockCount; i += 1) indices[i] = i
  return [indices]
}
