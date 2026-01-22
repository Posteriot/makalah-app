"use client"

import { AccordionAbout } from "./AccordionAbout"
import { ContentCard } from "./ContentCard"
import { Badge } from "@/components/ui/badge"
import { AGENTS_ITEMS, AGENT_STATUS_LABELS, SECTION_HEADINGS } from "./data"
import { getIcon } from "./icons"

export function AgentsSection() {
  // Map status ke badge variant
  const getBadgeVariant = (status: "available" | "in-progress") => {
    return status === "available" ? "default" : "secondary"
  }

  // Accordion items untuk mobile (dengan icon dan badge)
  const accordionItems = AGENTS_ITEMS.map((item) => {
    const Icon = getIcon(item.iconName)
    return {
      id: item.id,
      icon: Icon ? <Icon className="h-4 w-4" /> : undefined,
      title: item.title,
      content: item.description,
      badgeLabel: AGENT_STATUS_LABELS[item.status],
      badgeVariant: getBadgeVariant(item.status) as "default" | "secondary",
    }
  })

  return (
    <section className="section-full">
      <div className="max-w-[72rem] mx-auto px-4 md:px-6">
        <h2 className="section-heading">{SECTION_HEADINGS.agents}</h2>

        {/* Mobile: Accordion dengan icon dan badges */}
        <div className="md:hidden">
          <AccordionAbout items={accordionItems} />
        </div>

        {/* Desktop: Cards Grid dengan badges */}
        <div className="hidden md:grid grid-cols-2 gap-8">
          {AGENTS_ITEMS.map((item) => {
            const Icon = getIcon(item.iconName)
            return (
              <div key={item.id} className="relative h-full">
                {/* Badge positioned absolute top-right */}
                <Badge
                  variant={getBadgeVariant(item.status)}
                  className={`absolute top-4 right-4 z-10 text-[10px] uppercase tracking-wide ${
                    getBadgeVariant(item.status) === "default"
                      ? "bg-success text-success-foreground"
                      : ""
                  }`}
                >
                  {AGENT_STATUS_LABELS[item.status]}
                </Badge>
                <ContentCard
                  title={item.title}
                  icon={Icon && <Icon className="w-6 h-6 text-brand" />}
                >
                  {item.description}
                </ContentCard>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
