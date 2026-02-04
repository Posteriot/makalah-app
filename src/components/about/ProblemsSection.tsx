"use client"

import { SectionBadge } from "@/components/ui/section-badge"
import { GridPattern, DottedPattern } from "@/components/marketing/SectionBackground"
import { PROBLEMS_ITEMS } from "./data"
import { getIcon } from "./icons"
import { AccordionAbout } from "./AccordionAbout"
import { cn } from "@/lib/utils"

export function ProblemsSection() {
  // Transform items for accordion (mobile)
  const accordionItems = PROBLEMS_ITEMS.map((item) => ({
    id: item.id,
    title: item.title,
    content: item.description,
  }))

  return (
    <section
      className="relative px-4 md:px-6 py-16 md:py-24 overflow-hidden bg-muted/30 dark:bg-black"
      id="problems"
    >
      {/* Background patterns */}
      <GridPattern size={48} className="z-0" />
      <DottedPattern spacing={24} withRadialMask={false} className="z-0" />

      <div className="relative z-10 w-full max-w-[var(--container-max-width)] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col items-start gap-3 md:gap-4 mb-8 md:mb-12">
          <SectionBadge>Persoalan</SectionBadge>
          <h2 className="font-mono text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight text-foreground leading-tight">
            Apa Saja Persoalan Yang Dijawab?
          </h2>
        </div>

        {/* Mobile: Accordion */}
        <div className="md:hidden">
          <AccordionAbout items={accordionItems} />
        </div>

        {/* Desktop: 2-column grid */}
        <div className="hidden md:grid grid-cols-2 gap-6">
          {PROBLEMS_ITEMS.map((item) => {
            const Icon = getIcon(item.iconName)
            return (
              <div
                key={item.id}
                className={cn(
                  "group relative overflow-hidden h-full min-h-[180px] flex flex-col p-6 md:p-8 rounded-lg",
                  "border border-black/20 dark:border-white/25",
                  "hover:bg-bento-light-hover dark:hover:bg-bento-hover",
                  "hover:border-black/30 dark:hover:border-white/35",
                  "hover:-translate-y-1 transition-all duration-300"
                )}
              >
                {/* Icon + Title row */}
                <div className="flex items-start gap-4 mb-4">
                  {Icon && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand/10">
                      <Icon className="h-5 w-5 text-brand" />
                    </div>
                  )}
                  <h3 className="font-mono text-lg font-medium text-foreground leading-tight pt-2">
                    {item.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="font-mono text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
