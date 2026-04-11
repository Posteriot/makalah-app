"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  NASKAH_TITLE_PAGE_ANCHOR_ID,
  getNaskahSectionAnchorId,
} from "@/lib/naskah/anchors"
import { splitMarkdownIntoBlocks } from "@/lib/naskah/split-markdown"
import type { NaskahSection } from "@/lib/naskah/types"
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer"
import { usePaginatedBlocks } from "./usePaginatedBlocks"

interface NaskahPreviewProps {
  title: string
  sections: NaskahSection[]
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
 * Each section is handled by `PaginatedSection`, which splits the
 * section's markdown into block chunks, measures each chunk in a hidden
 * scratch container, and distributes chunks across as many A4
 * `PageContainer` instances as needed. Page 1 of each section shows the
 * section label; pages 2+ continue with content only (Word-style).
 *
 * Phase-1 edge case: a single markdown block taller than one page
 * content area overflows its page visually (rather than splitting at
 * line level). This is documented in `usePaginatedBlocks` and is rare in
 * typical naskah content.
 *
 * Inline padding mirrors the export PDF margins from
 * `src/lib/export/pdf-builder.ts` (top/bottom 2.5cm, left 3cm, right
 * 2cm) so the web preview stays visually close to the eventual export
 * per D-055.
 */
export function NaskahPreview({ title, sections }: NaskahPreviewProps) {
  const { ref: pageMeasurementRef, heightPx: contentAreaHeightPx } =
    useContentAreaHeightPx()

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
        />
      ))}
    </div>
  )
}

interface PaginatedSectionProps {
  section: NaskahSection
  contentAreaHeightPx: number | null
}

/**
 * One section, possibly split across multiple A4 pages.
 *
 * Pipeline:
 *   content → stripLeadingDuplicateHeading → splitMarkdownIntoBlocks
 *   → render blocks in hidden scratch container → measure heights
 *   → usePaginatedBlocks distributes into pages → render visible
 *     PageContainers.
 *
 * Re-runs pagination whenever `contentAreaHeightPx` changes (window
 * resize) or the stripped markdown changes (new section content).
 */
function PaginatedSection({
  section,
  contentAreaHeightPx,
}: PaginatedSectionProps) {
  const strippedMarkdown = useMemo(
    () => stripLeadingDuplicateHeading(section.content, section.label),
    [section.content, section.label],
  )

  const blocks = useMemo(
    () => splitMarkdownIntoBlocks(strippedMarkdown),
    [strippedMarkdown],
  )

  // A monotonically-incrementing trigger tied to the current block
  // content. The hook re-runs measurement when this bumps. We use a
  // ref-counted bump rather than a content hash to guarantee that ANY
  // change to the strippedMarkdown identity triggers re-measurement —
  // including same-length edits (typo fixes, character swaps) where
  // the block count and total character count are unchanged but
  // individual block heights may differ due to glyph metrics or line
  // wrapping. The previous string-length heuristic missed those cases.
  const triggerCounterRef = useRef(0)
  const lastTrackedMarkdownRef = useRef<string | null>(null)
  if (lastTrackedMarkdownRef.current !== strippedMarkdown) {
    lastTrackedMarkdownRef.current = strippedMarkdown
    triggerCounterRef.current += 1
  }
  const measureTrigger = triggerCounterRef.current

  const { pages, measurementRef } = usePaginatedBlocks({
    blockCount: blocks.length,
    contentAreaHeightPx,
    measureTrigger,
  })

  // Section label always anchors page 1. Tests rely on the DOM anchor
  // id being on the first page element.
  const anchorId = getNaskahSectionAnchorId(section.key)

  // Stable className passed to every MarkdownRenderer instance. The
  // arbitrary selector overrides neutralize chat-specific h2 styling —
  // see NaskahPreview doc comment above.
  const markdownClassName = cn(
    "text-base leading-relaxed",
    "[&_h2]:border-t-0 [&_h2]:pt-0 [&_h2]:mt-8",
  )

  // Sentinel: when there are zero blocks (e.g., a section whose
  // content is empty after duplicate-heading stripping) we still want
  // to render one PageContainer so the section label appears in the
  // paper. `[[]]` is one page with no block indices.
  const visiblePages = pages.length === 0 ? [[]] : pages

  return (
    <>
      {/*
        Hidden scratch container. Renders every block individually so
        `usePaginatedBlocks` can query them by data-block-idx and read
        offsetHeight. Marked aria-hidden so assistive tech ignores the
        duplicate content; visibility:hidden + pointer-events:none keeps
        it off-screen and non-interactive.
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
          "text-base leading-relaxed",
        )}
      >
        {blocks.map((block, idx) => (
          <div key={idx} data-block-idx={idx}>
            <MarkdownRenderer
              markdown={block}
              context="artifact"
              className={markdownClassName}
            />
          </div>
        ))}
      </div>

      {visiblePages.map((pageBlockIndices, pageIdx) => {
        const isFirstPage = pageIdx === 0
        return (
          <PageContainer
            key={pageIdx}
            id={isFirstPage ? anchorId : undefined}
            testId={isFirstPage ? `naskah-section-${section.key}` : undefined}
            data-section-key={section.key}
            data-page-index={pageIdx}
          >
            {isFirstPage && (
              <h2 className="mb-6 text-2xl font-semibold">{section.label}</h2>
            )}
            {pageBlockIndices.map((blockIdx) => (
              <MarkdownRenderer
                key={blockIdx}
                markdown={blocks[blockIdx]}
                context="artifact"
                className={markdownClassName}
              />
            ))}
          </PageContainer>
        )
      })}
    </>
  )
}

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
