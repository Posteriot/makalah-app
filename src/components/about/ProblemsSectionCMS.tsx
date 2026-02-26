"use client"

import type { Doc } from "@convex/_generated/dataModel"
import { SectionBadge } from "@/components/ui/section-badge"
import { GridPattern, DiagonalStripes, DottedPattern } from "@/components/marketing/SectionBackground"
import { AccordionAbout } from "./AccordionAbout"

type ProblemsSectionCMSProps = {
  content: Doc<"pageContent">
}

export function ProblemsSectionCMS({ content }: ProblemsSectionCMSProps) {
  const badgeText = content.badgeText ?? "Persoalan"
  const title = content.title ?? ""
  const items = content.items ?? []

  const accordionItems = items.map((item, i) => ({
    id: `problem-${i}`,
    title: item.title,
    content: item.description,
  }))

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col justify-center overflow-hidden bg-background" id="problems">
      {content.showGridPattern !== false && <GridPattern className="z-0 opacity-80" />}
      {content.showDiagonalStripes !== false && <DiagonalStripes className="opacity-40" />}
      {content.showDottedPattern !== false && <DottedPattern spacing={24} withRadialMask={true} />}

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="grid grid-cols-1 gap-comfort md:grid-cols-16">
          <div className="col-span-1 mb-8 flex flex-col items-start gap-3 md:col-span-12 md:col-start-3 md:mb-12 md:gap-4">
            <SectionBadge>{badgeText}</SectionBadge>
            <h2 className="text-narrative text-3xl font-medium leading-tight tracking-tight text-foreground md:text-3xl lg:text-4xl">
              {title}
            </h2>
          </div>

          {/* Mobile: Accordion */}
          <div className="col-span-1 md:hidden">
            <AccordionAbout
              items={accordionItems}
              titleClassName="text-interface font-mono text-base font-medium leading-snug text-foreground tracking-normal"
              contentClassName="!px-4 !pb-4 text-base leading-relaxed text-[color:var(--slate-600)] dark:text-[color:var(--slate-50)]"
              chevronClassName="text-muted-foreground"
            />
          </div>

          {/* Desktop: card grid */}
          <div className="hidden md:col-span-12 md:col-start-3 md:grid grid-cols-16 gap-comfort">
            {items.map((item, i) => (
              <div
                key={`problem-${i}`}
                className="group relative col-span-8 flex flex-col rounded-shell border-hairline bg-slate-50 p-comfort transition-colors duration-200 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <div className="relative flex flex-1 flex-col">
                  <h3 className="text-narrative font-light text-3xl leading-[1.1] text-foreground m-0 mb-6">
                    {item.title}
                  </h3>
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 h-2.5 w-2.5 min-w-2.5 rounded-full bg-[color:var(--amber-500)] shadow-[0_0_8px_var(--amber-500)] animate-pulse" />
                    <p className="text-interface m-0 text-xs leading-relaxed text-muted-foreground hover:text-slate-900 dark:hover:text-slate-50">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
