import { BenefitsBadge } from "./BenefitsBadge"
import { BenefitsTitle } from "./BenefitsTitle"
import { BentoBenefitsGrid } from "./BentoBenefitsGrid"
import { BenefitsAccordion } from "./BenefitsAccordion"
import { DocsCTA } from "./DocsCTA"

/**
 * BenefitsSection - "Kenapa Makalah AI?" section
 *
 * Responsive layout:
 * - Desktop (md+): Bento grid with asymmetric cards and SVG illustrations
 * - Mobile (<md): Accordion with card styling, single open, all collapsed by default
 * - DocsCTA at bottom center
 */
export function BenefitsSection() {
  return (
    <section className="benefits-section" id="kenapa-makalah-ai">
      {/* Background patterns */}
      <div className="benefits-bg-stripes" />
      <div className="benefits-bg-dots" />

      {/* Top border line */}
      <div className="benefits-top-line" />

      <div className="benefits-container">
        {/* Section Header */}
        <div className="benefits-header">
          <BenefitsBadge />
          <BenefitsTitle />
        </div>

        {/* Desktop: Bento Grid */}
        <BentoBenefitsGrid />

        {/* Mobile: Accordion */}
        <BenefitsAccordion />

        {/* Documentation CTA - Bottom Center */}
        <DocsCTA />
      </div>
    </section>
  )
}
