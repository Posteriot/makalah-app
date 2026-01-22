"use client"

import { AccordionAbout } from "./AccordionAbout"
import { ContentCard } from "./ContentCard"
import {
  CAREER_CONTACT_ITEMS,
  SECTION_HEADINGS,
  type ContactContent,
} from "./data"
import { getIcon } from "./icons"

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Type guard to check if content is ContactContent object
 */
function isContactContent(
  content: string | ContactContent
): content is ContactContent {
  return typeof content === "object" && "company" in content
}

/**
 * Render content based on type (string or ContactContent)
 */
function renderContent(content: string | ContactContent) {
  if (isContactContent(content)) {
    return (
      <div className="space-y-2">
        <p className="font-medium text-foreground">{content.company}</p>
        <div className="text-muted-foreground">
          {content.address.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
        <p>
          <a
            href={`mailto:${content.email}`}
            className="text-brand hover:underline"
          >
            {content.email}
          </a>
        </p>
      </div>
    )
  }
  return <p>{content}</p>
}

// =============================================================================
// CAREER CONTACT SECTION COMPONENT
// =============================================================================

export function CareerContactSection() {
  // Accordion items untuk mobile (dengan icon dan anchorId)
  const accordionItems = CAREER_CONTACT_ITEMS.map((item) => {
    const Icon = getIcon(item.iconName)
    return {
      id: item.id,
      icon: Icon ? <Icon className="h-4 w-4" /> : undefined,
      title: item.title,
      content: renderContent(item.content),
      anchorId: item.anchorId, // untuk anchor scroll support
    }
  })

  return (
    <section id="karier-kontak" className="section-full">
      <div className="max-w-[72rem] mx-auto px-4 md:px-6">
        <h2 className="section-heading">{SECTION_HEADINGS.careerContact}</h2>

        {/* Mobile: Accordion dengan anchor IDs */}
        <div className="md:hidden">
          <AccordionAbout items={accordionItems} />
        </div>

        {/* Desktop: Cards Grid dengan anchor IDs */}
        <div className="hidden md:grid grid-cols-2 gap-8">
          {CAREER_CONTACT_ITEMS.map((item) => {
            const Icon = getIcon(item.iconName)
            return (
              <div
                key={item.id}
                id={`${item.anchorId}-desktop`}
                data-anchor-id={item.anchorId}
                className="h-full"
              >
                <ContentCard
                  title={item.title}
                  icon={Icon && <Icon className="w-6 h-6 text-brand" />}
                >
                  {renderContent(item.content)}
                </ContentCard>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
