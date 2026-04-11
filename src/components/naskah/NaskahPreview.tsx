"use client"

import { cn } from "@/lib/utils"
import {
  NASKAH_TITLE_PAGE_ANCHOR_ID,
  getNaskahSectionAnchorId,
} from "@/lib/naskah/anchors"
import type { NaskahSection } from "@/lib/naskah/types"
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer"

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
 * Centered A4-style paper preview.
 *
 * The first page container is the title page (D-043, D-045) — a cover-
 * style layout that contains only the resolved paper title. Each
 * subsequent section starts on its own page container (D-047, D-048)
 * with `id="section-{key}"` so sidebar anchor links scroll directly to
 * the section start.
 *
 * Section content is parsed as markdown via the existing chat
 * `MarkdownRenderer`, producing proper headings, paragraphs, bold,
 * italic, ordered/unordered lists, tables, code blocks, and blockquotes.
 * The renderer uses chat-* tokens so the rendered typography adapts to
 * the paper's `bg-[var(--chat-muted)]` surface automatically in both
 * light and dark modes.
 *
 * Two chat-specific styles are neutralized for paper context via
 * arbitrary-selector overrides on the wrapper:
 *   - `h2` border-t divider: removed. In chat messages the border helps
 *     separate artifact sections; in a paper the section label above
 *     already provides that visual anchor, and a mid-body horizontal
 *     rule reads as out of place.
 *   - `h2` top padding compensating for the removed border: also removed,
 *     replaced with a plain `mt-8` for consistent section spacing.
 *
 * Inline padding mirrors the export PDF margins from
 * `src/lib/export/pdf-builder.ts` (top/bottom 2.5cm, left 3cm, right
 * 2cm) so the web preview stays visually close to the eventual export
 * per D-055.
 */
export function NaskahPreview({ title, sections }: NaskahPreviewProps) {
  return (
    <div className="flex h-full flex-col items-center gap-8 overflow-y-auto bg-[var(--chat-background)] py-10">
      <PageContainer
        id={NASKAH_TITLE_PAGE_ANCHOR_ID}
        testId="naskah-title-page"
        className="flex flex-col items-center justify-center text-center"
      >
        <h1 className="text-4xl font-semibold">{title}</h1>
      </PageContainer>

      {sections.map((section) => {
        const markdown = stripLeadingDuplicateHeading(
          section.content,
          section.label,
        )
        return (
          <PageContainer
            key={section.key}
            id={getNaskahSectionAnchorId(section.key)}
          >
            <h2 className="mb-6 text-2xl font-semibold">{section.label}</h2>
            <MarkdownRenderer
              markdown={markdown}
              context="artifact"
              className={cn(
                "text-base leading-relaxed",
                // Neutralize chat-specific h2 styling: drop the top border
                // and the compensating padding, use plain top margin.
                "[&_h2]:border-t-0 [&_h2]:pt-0 [&_h2]:mt-8",
              )}
            />
          </PageContainer>
        )
      })}
    </div>
  )
}

interface PageContainerProps {
  id: string
  testId?: string
  className?: string
  children: React.ReactNode
}

/**
 * Single A4-style page container. Approximates A4 proportions and
 * mirrors the PDF builder's margin convention.
 */
function PageContainer({
  id,
  testId,
  className,
  children,
}: PageContainerProps) {
  return (
    <section
      id={id}
      data-testid={testId}
      className={cn(
        // A4 ~210mm × 297mm; cap to a max width for desktop preview
        "w-full max-w-[210mm] min-h-[297mm]",
        // Mirror pdf-builder margins: top/bottom 2.5cm, left 3cm, right 2cm
        "pt-[2.5cm] pb-[2.5cm] pl-[3cm] pr-[2cm]",
        // Paper surface uses chat-muted per Q4 — matches chat input fill
        // so the paper feels part of the same visual family as the rest
        // of the chat scope. Token-based so the fill adapts automatically
        // between light and dark modes (user requirement #6).
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
