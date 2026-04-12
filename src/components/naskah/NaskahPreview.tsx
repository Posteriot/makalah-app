"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  NASKAH_TITLE_PAGE_ANCHOR_ID,
  getNaskahSectionAnchorId,
} from "@/lib/naskah/anchors"
import { splitMarkdownAtHeadings } from "@/lib/naskah/split-markdown"
import type { NaskahSection } from "@/lib/naskah/types"
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer"
import { useLineLevelPagination } from "./useLineLevelPagination"

interface NaskahPreviewProps {
  title: string
  sections: NaskahSection[]
  /**
   * Fired whenever the total rendered page count changes. The count
   * is derived from actual line-level pagination measurements (title
   * page + every section's `pages.length`), NOT from the character-
   * based estimate in the snapshot. Consumers use this to show the
   * real "X Halaman" in the header rather than "Estimasi X halaman".
   */
  onPageCountChange?: (count: number) => void
}

/**
 * Strip a leading `# Heading` duplicate from section content when it
 * matches the section label.
 *
 * The compiler feeds section content verbatim from the underlying
 * artifact body. Some artifacts prepend their own top-level heading
 * (e.g., content for the "Pendahuluan" section starts with `# Pendahuluan`
 * followed by the actual subsections). Others (e.g., "Abstrak") start
 * directly with body paragraphs. Since NaskahPreview renders the section
 * label as its own `<h2>` above the markdown body, a leading `# Heading`
 * that matches the label produces a visible duplicate title.
 *
 * This helper removes that duplicate ONLY when the first non-whitespace
 * line is a level-1 heading whose text, case-folded and trimmed, matches
 * the section label. It preserves the rest of the content verbatim,
 * including leading blank lines that may follow the stripped heading.
 */
function stripLeadingDuplicateHeading(
  content: string,
  sectionLabel: string,
): string {
  const lines = content.split(/\r?\n/)
  let firstNonBlank = -1
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim().length > 0) {
      firstNonBlank = i
      break
    }
  }
  if (firstNonBlank === -1) return content

  const line = lines[firstNonBlank].trimStart()
  // Only strip level-1 headings (`# `) — `## Abstrak` as a real subsection
  // heading under an "Abstrak" section label should not be touched.
  if (!line.startsWith("# ") || line.startsWith("## ")) return content

  const headingText = line.slice(2).trim()
  if (headingText.toLowerCase() !== sectionLabel.toLowerCase()) return content

  // Remove the heading line and any immediately-following blank lines so
  // the body starts at the next content line.
  let cursor = firstNonBlank + 1
  while (cursor < lines.length && lines[cursor].trim().length === 0) {
    cursor += 1
  }
  return lines.slice(cursor).join("\n")
}

/**
 * Read the actual content-area height (in CSS pixels) of a
 * `PageContainer`-shaped element. Runs once on mount plus on window
 * resize. Falls back to an approximation based on 96dpi (A4 content
 * area = 297mm − 5cm margins ≈ 934px).
 *
 * The measured element is a hidden `<PageContainer>` rendered at
 * `position: fixed; visibility: hidden` so it takes up zero visual
 * space. The measurement reads `clientHeight - paddingTop -
 * paddingBottom` for correctness across font-size and user-zoom
 * variations.
 */
function useContentAreaHeightPx(): {
  ref: React.RefObject<HTMLDivElement | null>
  heightPx: number | null
} {
  const ref = useRef<HTMLDivElement | null>(null)
  const [heightPx, setHeightPx] = useState<number | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current
      if (!el) return
      const style = getComputedStyle(el)
      const paddingTop = parseFloat(style.paddingTop) || 0
      const paddingBottom = parseFloat(style.paddingBottom) || 0
      const content = el.clientHeight - paddingTop - paddingBottom
      // Reset to null on a transient zero-height measurement so the
      // hook surface reflects "not ready" rather than carrying a stale
      // valid value. Today the clone is pinned to `h-[297mm]` so this
      // should never fire, but it makes the contract robust against
      // future style changes that might shrink or detach the clone.
      setHeightPx(content > 0 ? content : null)
    }
    measure()

    if (typeof window === "undefined") return
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const onResize = () => {
      if (timeoutId != null) clearTimeout(timeoutId)
      timeoutId = setTimeout(measure, 120)
    }
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      if (timeoutId != null) clearTimeout(timeoutId)
    }
  }, [])

  return { ref, heightPx }
}

/**
 * Centered A4-style paper preview.
 *
 * The first page container is the title page (D-043, D-045) — a cover-
 * style layout that contains only the resolved paper title.
 *
 * Each section is handled by `PaginatedSection`, which renders the
 * section's full markdown content as a single flowing tree, measures
 * line-level snap points via `useLineLevelPagination`, and renders the
 * SAME flowing tree across N visible `PageContainer`s by clipping each
 * page to its `[startY, endY)` slice. Page breaks land on complete
 * line bottoms (Word/Google Docs style), so the bottom of any given
 * page has at most one line of whitespace rather than a whole orphaned
 * paragraph.
 *
 * Phase-1 edge case: a single un-snappable element taller than one
 * page content area (e.g., a giant table) overflows visually inside
 * its page. Naskah content rarely contains such elements.
 *
 * Inline padding mirrors the export PDF margins from
 * `src/lib/export/pdf-builder.ts` (top/bottom 2.5cm, left 3cm, right
 * 2cm) so the web preview stays visually close to the eventual export
 * per D-055.
 */
export function NaskahPreview({
  title,
  sections,
  onPageCountChange,
}: NaskahPreviewProps) {
  const { ref: pageMeasurementRef, heightPx: contentAreaHeightPx } =
    useContentAreaHeightPx()

  // Per-section page counts reported by each PaginatedSection via
  // `onSectionPageCount`. Stored as a Map<sectionKey, count> and
  // aggregated into a total (title page + sum). A `useRef`-backed
  // map avoids re-renders on every individual section report; we
  // only re-render when the aggregated total actually changes.
  const sectionCountsRef = useRef(new Map<string, number>())
  const [totalPageCount, setTotalPageCount] = useState<number | null>(null)

  const handleSectionPageCount = useCallback(
    (key: string, count: number) => {
      const prev = sectionCountsRef.current.get(key)
      if (prev === count) return
      sectionCountsRef.current.set(key, count)
      let total = 1 // title page
      for (const c of sectionCountsRef.current.values()) total += c
      setTotalPageCount(total)
    },
    [],
  )

  useEffect(() => {
    if (totalPageCount != null) {
      onPageCountChange?.(totalPageCount)
    }
  }, [totalPageCount, onPageCountChange])

  return (
    <div className="flex h-full flex-col items-center gap-8 overflow-y-auto bg-[var(--chat-background)] py-10">
      {/*
        Hidden PageContainer clone used as a height reference. Not visible
        but takes the same CSS box so padding / font metrics / dpi
        zooming all match the real visible pages.
      */}
      <div
        ref={pageMeasurementRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          visibility: "hidden",
          pointerEvents: "none",
        }}
        // Mirror the visible PageContainer box: same width, same height,
        // same padding, and the same `shrink-0` so the fixed-positioned
        // measurement element's computed height is not mutated by any
        // parent flex algorithm — required for accurate content area
        // calculation below.
        className={cn(
          "w-full max-w-[210mm] h-[297mm] shrink-0",
          "pt-[2.5cm] pb-[2.5cm] pl-[3cm] pr-[2cm]",
        )}
      />

      <PageContainer
        id={NASKAH_TITLE_PAGE_ANCHOR_ID}
        testId="naskah-title-page"
        className="flex flex-col items-center justify-center text-center"
      >
        <h1 className="text-4xl font-semibold">{title}</h1>
      </PageContainer>

      {sections.map((section) => (
        <PaginatedSection
          key={section.key}
          section={section}
          contentAreaHeightPx={contentAreaHeightPx}
          onPageCount={handleSectionPageCount}
        />
      ))}
    </div>
  )
}

interface PaginatedSectionProps {
  section: NaskahSection
  contentAreaHeightPx: number | null
  /** Reports the actual rendered page count for this section. */
  onPageCount?: (sectionKey: string, count: number) => void
}

/**
 * One section, possibly split across multiple A4 pages, with
 * line-level page breaks (Word/Google Docs style).
 *
 * Pipeline:
 *   content
 *     → stripLeadingDuplicateHeading
 *     → splitMarkdownAtHeadings (atomic subsection blocks)
 *     → render full flowing tree once into hidden measurement container
 *     → useLineLevelPagination walks Range.getClientRects() + block
 *       bottoms to find snap points and computes page slices
 *     → render N visible PageContainers, each clipping the SAME flowing
 *       tree to its `[startY, endY)` slice via overflow:hidden +
 *       negative marginTop.
 *
 * **Why subsection-atomic blocks (`splitMarkdownAtHeadings`)?**
 * The previous block-level pagination split on every blank line, which
 * meant each `## Heading` became its own block separate from its body.
 * That allowed page breaks to fall between a heading and its first
 * paragraph (orphan headings). Splitting at headings keeps each
 * subsection's heading + body welded into a single wrapper element,
 * which gives the line-level snap algorithm a natural "atom" to honor:
 * the wrapper's bottom is a snap point, and as long as a wrapper fits
 * inside one page budget the heading and its body stay together.
 *
 * **Why mt-12 between block wrappers?**
 * Word convention: "two blank line spaces" between subsections. With
 * a 24px line-height, 48px (`mt-12`) ≈ two empty lines. The mt-12 lives
 * on the wrapper, not inside the markdown, so the snap algorithm can
 * page-break inside the gap if needed without producing weird
 * mid-margin breaks.
 *
 * Re-runs pagination whenever `contentAreaHeightPx` changes (window
 * resize, font load) or the stripped markdown changes (new section
 * content from a refresh).
 */
function PaginatedSection({
  section,
  contentAreaHeightPx,
  onPageCount,
}: PaginatedSectionProps) {
  const strippedMarkdown = useMemo(
    () => stripLeadingDuplicateHeading(section.content, section.label),
    [section.content, section.label],
  )

  // Subsection-atomic split — each chunk starts with a `## Heading`
  // and contains everything up to the next `##`. Sections with no `##`
  // (e.g., Abstrak) come back as a single chunk.
  const blocks = useMemo(
    () => splitMarkdownAtHeadings(strippedMarkdown, 2),
    [strippedMarkdown],
  )

  // Pass `strippedMarkdown` directly as the measurement trigger. The
  // hook treats it as an opaque dep — it never reads the value, only
  // uses identity changes to schedule a re-measurement. Because
  // `strippedMarkdown` is itself a `useMemo` keyed on
  // `[section.content, section.label]`, its identity changes whenever
  // the underlying content string changes — including same-length
  // edits like "abc" → "abx" where the character count is unchanged
  // but glyph metrics differ. (The previous string-length heuristic
  // missed those cases — caught by Codex audit M1.)
  const { pages, measurementRef, isReady } = useLineLevelPagination({
    contentAreaHeightPx,
    measureTrigger: strippedMarkdown,
  })

  // Section label always anchors page 1. Tests rely on the DOM anchor
  // id being on the first page element.
  const anchorId = getNaskahSectionAnchorId(section.key)

  // h2 styling override for markdown-rendered subsection headings.
  // The chat MarkdownRenderer ships h2 with `mt-10 pt-6 border-t` — a
  // section-divider style that's wrong for naskah where each subsection
  // is a clean heading + body. We zero those out and let the wrapper's
  // mt-12 handle inter-block spacing instead.
  const markdownClassName = cn(
    "text-base leading-relaxed",
    "[&_h2]:border-t-0 [&_h2]:pt-0 [&_h2]:mt-0",
  )

  // The flowing content tree, rendered identically into the hidden
  // measurement container AND into every visible page (clipped). This
  // is the key invariant for line-level pagination: measurement and
  // visible rendering must produce IDENTICAL DOM/style trees so the
  // snap-point Y coordinates are valid for the visible clip windows.
  const flowingContent = (
    <div className="text-base leading-relaxed">
      <h2 className="mb-6 text-2xl font-semibold">{section.label}</h2>
      {blocks.map((block, idx) => (
        <div key={idx} className={cn(idx > 0 && "mt-12")}>
          <MarkdownRenderer
            markdown={block}
            context="artifact"
            className={markdownClassName}
          />
        </div>
      ))}
    </div>
  )

  // Sentinel: when pagination hasn't computed pages yet (initial render
  // before useLayoutEffect) OR there are no pages (empty content), fall
  // back to one un-clipped page so the section label still appears.
  const visiblePages: LineLevelPageOrFallback[] =
    pages.length === 0 ? [{ startY: 0, endY: null }] : pages

  // Report actual page count to parent once pagination settles.
  // Only fires when the hook is ready (measurement complete) so the
  // parent doesn't see the fallback "1 page" count that exists before
  // the first useLayoutEffect runs.
  useEffect(() => {
    if (isReady) {
      onPageCount?.(section.key, visiblePages.length)
    }
  }, [isReady, visiblePages.length, section.key, onPageCount])

  return (
    <>
      {/*
        Hidden measurement container. Renders the FULL flowing tree
        once. The pagination hook walks this DOM via Range API +
        block-bottom rects to find snap points. aria-hidden + fixed
        off-screen positioning keeps it invisible and non-interactive.
      */}
      <div
        ref={measurementRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          visibility: "hidden",
          pointerEvents: "none",
        }}
        className={cn(
          // Same width as a real page content area so wrapping matches.
          "w-[calc(210mm_-_3cm_-_2cm)]",
        )}
      >
        {flowingContent}
      </div>

      {visiblePages.map((page, pageIdx) => {
        const isFirstPage = pageIdx === 0
        const sliceHeight =
          page.endY != null ? page.endY - page.startY : null
        return (
          <PageContainer
            key={pageIdx}
            id={isFirstPage ? anchorId : undefined}
            testId={isFirstPage ? `naskah-section-${section.key}` : undefined}
            data-section-key={section.key}
            data-page-index={pageIdx}
          >
            <div
              style={{
                height:
                  sliceHeight != null ? `${sliceHeight}px` : "100%",
                overflow: "hidden",
              }}
            >
              <div style={{ marginTop: `${-page.startY}px` }}>
                {flowingContent}
              </div>
            </div>
          </PageContainer>
        )
      })}
    </>
  )
}

/**
 * Local union for visible page rendering. Pagination returns
 * `{startY, endY}` once measured. Before measurement (initial paint or
 * empty content) we use a fallback shape with `endY: null` that
 * triggers `height: 100%` instead of an explicit pixel value, so the
 * fallback page renders the full unclipped content while the hook
 * settles.
 */
type LineLevelPageOrFallback = { startY: number; endY: number | null }

interface PageContainerProps {
  id?: string
  testId?: string
  className?: string
  children: React.ReactNode
  "data-section-key"?: string
  "data-page-index"?: number
}

/**
 * Single A4-style page container. Approximates A4 proportions and
 * mirrors the PDF builder's margin convention.
 *
 * Uses `h-[297mm]` (fixed, not min-height) so every page container is
 * exactly one A4 page tall. Combined with the `PaginatedSection` logic
 * above, sections that span multiple pages render as a sequence of
 * fixed-height containers stacked vertically with the parent's `gap-8`
 * separating them visually.
 */
function PageContainer({
  id,
  testId,
  className,
  children,
  "data-section-key": dataSectionKey,
  "data-page-index": dataPageIndex,
}: PageContainerProps) {
  return (
    <section
      id={id}
      data-testid={testId}
      data-section-key={dataSectionKey}
      data-page-index={dataPageIndex}
      className={cn(
        // A4 ~210mm × 297mm; cap to a max width for desktop preview.
        // Fixed height (not min-height) so every page container is a
        // true one-page frame. Oversized content inside overflows the
        // bottom border visually per the phase-1 edge case documented
        // in NaskahPreview.
        //
        // `shrink-0` is load-bearing: the parent is a `flex flex-col`
        // with `overflow-y-auto`, which by default shrinks flex items
        // to fit the container. Without `shrink-0`, `h-[297mm]` gets
        // silently reduced to whatever the viewport allows, and
        // pagination's content-area budget no longer matches the
        // visible page height — content for page 1 bleeds past the
        // bottom margin into page 2's physical space.
        "w-full max-w-[210mm] h-[297mm] shrink-0",
        // Mirror pdf-builder margins: top/bottom 2.5cm, left 3cm, right 2cm
        "pt-[2.5cm] pb-[2.5cm] pl-[3cm] pr-[2cm]",
        // Paper surface uses chat-muted — matches chat input fill so the
        // paper feels part of the same visual family as the rest of the
        // chat scope. Token-based so the fill adapts between light and
        // dark modes.
        "rounded-lg border border-[color:var(--chat-border)] bg-[var(--chat-muted)]",
        "text-[var(--chat-foreground)]",
        className,
      )}
    >
      {children}
    </section>
  )
}

export { stripLeadingDuplicateHeading }
