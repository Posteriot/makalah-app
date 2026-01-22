"use client"

import { PROBLEMS_ITEMS, SECTION_HEADINGS } from "./data"
import { getIcon } from "./icons"
import { AccordionAbout } from "./AccordionAbout"
import { ContentCard } from "./ContentCard"

// =============================================================================
// PROBLEMS SECTION COMPONENT
// =============================================================================

/**
 * ProblemsSection - Displays problems/challenges that Makalah addresses.
 *
 * Features dual view:
 * - Mobile (< 768px): Accordion view with one-at-a-time behavior
 * - Desktop (>= 768px): 2-column grid of ContentCards with icons
 *
 * @example
 * ```tsx
 * <ProblemsSection />
 * ```
 */
export function ProblemsSection() {
  // Transform PROBLEMS_ITEMS to AccordionItemData format for mobile view
  // Note: Problems accordion does NOT show icons (per spec: title + chevron only)
  const accordionItems = PROBLEMS_ITEMS.map((item) => ({
    id: item.id,
    title: item.title,
    content: item.description,
    // NO icon for problems accordion - per spec
  }))

  return (
    <section className="section-full">
      <div className="max-w-[72rem] mx-auto">
        {/* Section Heading */}
        <h2 className="section-heading">{SECTION_HEADINGS.problems}</h2>

        {/* Mobile View: Accordion */}
        <div className="md:hidden">
          <AccordionAbout items={accordionItems} />
        </div>

        {/* Desktop View: Cards Grid (2 columns) */}
        <div className="hidden md:grid grid-cols-2 gap-8">
          {PROBLEMS_ITEMS.map((item) => {
            const Icon = getIcon(item.iconName)
            return (
              <ContentCard
                key={item.id}
                title={item.title}
                icon={Icon && <Icon className="w-6 h-6 text-brand" />}
              >
                {item.description}
              </ContentCard>
            )
          })}
        </div>
      </div>
    </section>
  )
}
