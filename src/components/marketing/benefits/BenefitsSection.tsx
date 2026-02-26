import { BenefitsBadge } from "./BenefitsBadge"
import { BenefitsTitle } from "./BenefitsTitle"
import { BentoBenefitsGrid } from "./BentoBenefitsGrid"
import { BenefitsAccordion } from "./BenefitsAccordion"
import { DocsCTA } from "./DocsCTA"
import { GridPattern, DiagonalStripes, DottedPattern } from "@/components/marketing/SectionBackground"

/**
 * BenefitsSection - "Kenapa Makalah AI?" section
 *
 * Responsive layout:
 * - Desktop (md+): Bento grid 2x2 di atas grid 16-kolom
 * - Mobile (<md): Accordion with card styling, single open, all collapsed by default
 * - DocsCTA at bottom center
 *
 * Accepts optional `items` prop from CMS. If provided, passes to grid/accordion;
 * otherwise they use their own hardcoded fallback arrays.
 */

type BenefitItem = {
  title: string
  description: string
}

type BenefitsSectionProps = {
  items?: BenefitItem[]
  showGridPattern?: boolean
  showDiagonalStripes?: boolean
  showDottedPattern?: boolean
}

export function BenefitsSection({ items, showGridPattern, showDiagonalStripes, showDottedPattern }: BenefitsSectionProps) {
  return (
    <section
      className="relative isolate h-[100svh] min-h-[100svh] overflow-hidden bg-background"
      id="kenapa-makalah-ai"
    >
      {/* Background patterns */}
      {showGridPattern !== false && <GridPattern className="z-0 opacity-80" />}
      {showDiagonalStripes !== false && <DiagonalStripes className="opacity-40" />}
      {showDottedPattern !== false && <DottedPattern spacing={24} withRadialMask={true} />}

      <div className="relative z-10 mx-auto h-full w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="grid h-full grid-cols-16 content-center gap-comfort">
          {/* Section Header */}
          <div className="col-span-16 md:col-span-12 md:col-start-3 flex flex-col gap-comfort">
            <BenefitsBadge />
            <BenefitsTitle />
          </div>

          {/* Desktop: Bento Grid */}
          <div className="col-span-16 md:col-span-12 md:col-start-3">
            <BentoBenefitsGrid items={items} />
          </div>

          {/* Mobile: Accordion */}
          <div className="col-span-16 md:col-span-12 md:col-start-3">
            <BenefitsAccordion items={items} />
          </div>

          {/* Documentation CTA - Bottom Center */}
          <div className="col-span-16 md:col-span-12 md:col-start-3">
            <DocsCTA />
          </div>
        </div>
      </div>
    </section>
  )
}
