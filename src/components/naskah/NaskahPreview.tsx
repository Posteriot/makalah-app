"use client"

import { cn } from "@/lib/utils"
import {
  NASKAH_TITLE_PAGE_ANCHOR_ID,
  getNaskahSectionAnchorId,
} from "@/lib/naskah/anchors"
import type { NaskahSection } from "@/lib/naskah/types"

interface NaskahPreviewProps {
  title: string
  sections: NaskahSection[]
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
 * Section content is rendered as plain text via `whitespace-pre-wrap`.
 * Phase 1 does not parse markdown or HTML inside section bodies. If a
 * future phase adds rich rendering, the change is local to this
 * component.
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
        {/*
          No explicit color class — the heading inherits the dark
          paper text color from PageContainer below. Setting
          text-[var(--chat-foreground)] here would invert to white in
          dark mode and become invisible against the white page.
        */}
        <h1 className="text-4xl font-semibold">{title}</h1>
      </PageContainer>

      {sections.map((section) => (
        <PageContainer
          key={section.key}
          id={getNaskahSectionAnchorId(section.key)}
        >
          <h2 className="mb-6 text-2xl font-semibold">{section.label}</h2>
          <div className="whitespace-pre-wrap text-base leading-relaxed">
            {section.content}
          </div>
        </PageContainer>
      ))}
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
        "rounded-sm border border-[color:var(--chat-border)] bg-white shadow-sm",
        "text-[#1a1a1a]",
        className,
      )}
    >
      {children}
    </section>
  )
}
