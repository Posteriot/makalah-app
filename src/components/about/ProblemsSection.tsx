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
      className="relative overflow-hidden bg-background px-4 py-16 md:px-6 md:py-24"
      id="problems"
    >
      {/* Background patterns */}
      <GridPattern className="z-0" />
      <DottedPattern spacing={24} withRadialMask={false} className="z-0" />

      <div className="relative z-10 mx-auto w-full max-w-[var(--container-max-width)]">
        <div className="grid grid-cols-1 gap-comfort md:grid-cols-16">
          {/* Section Header */}
          <div className="col-span-1 mb-8 flex flex-col items-start gap-3 md:col-span-12 md:col-start-1 md:mb-12 md:gap-4">
            <SectionBadge>Persoalan</SectionBadge>
            <h2 className="font-mono text-2xl leading-tight tracking-tight text-foreground md:text-3xl lg:text-4xl">
              Apa Saja Persoalan Yang Dijawab?
            </h2>
          </div>

          {/* Mobile: Accordion */}
          <div className="col-span-1 md:hidden">
            <AccordionAbout items={accordionItems} />
          </div>

          {/* Desktop: 16-col bento mapping (8/8) */}
          <div className="hidden md:col-span-16 md:grid md:grid-cols-16 md:gap-comfort">
            {PROBLEMS_ITEMS.map((item) => {
              const Icon = getIcon(item.iconName)
              return (
                <div
                  key={item.id}
                  className={cn(
                    "col-span-8 group relative flex h-full min-h-[180px] flex-col overflow-hidden rounded-lg p-6 md:p-8",
                    "border border-black/20 dark:border-white/25",
                    "hover:bg-bento-light-hover dark:hover:bg-bento-hover",
                    "hover:border-black/30 dark:hover:border-white/35",
                    "hover:-translate-y-1 transition-all duration-300"
                  )}
                >
                  {/* Icon + Title row */}
                  <div className="mb-4 flex items-start gap-4">
                    {Icon && (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand/10">
                        <Icon className="h-5 w-5 text-brand" />
                      </div>
                    )}
                    <h3 className="pt-2 font-mono text-lg font-medium leading-tight text-foreground">
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
      </div>
    </section>
  )
}
