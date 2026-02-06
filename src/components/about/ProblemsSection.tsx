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
            <h2 className="text-interface text-2xl font-bold leading-tight tracking-tight text-foreground md:text-3xl lg:text-4xl">
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
                    "col-span-8 group relative flex h-full min-h-[180px] flex-col overflow-hidden rounded-shell p-airy",
                    "border-main border-border bg-card/40",
                    "hover:bg-accent/30",
                    "hover:-translate-y-1 transition-all duration-300"
                  )}
                >
                  {/* Icon + Title row */}
                  <div className="mb-4 flex items-start gap-4">
                    {Icon && (
                      <div className="rounded-action flex h-10 w-10 shrink-0 items-center justify-center bg-[color:var(--amber-500)]/10">
                        <Icon className="h-5 w-5 text-[color:var(--amber-500)]" />
                      </div>
                    )}
                    <h3 className="text-interface pt-2 text-lg font-bold leading-tight text-foreground">
                      {item.title}
                    </h3>
                  </div>

                  <div className="mb-4 border-t border-hairline" />

                  {/* Description */}
                  <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
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
