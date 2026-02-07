"use client"

import { SectionBadge } from "@/components/ui/section-badge"
import { DiagonalStripes, DottedPattern } from "@/components/marketing/SectionBackground"
import { PROBLEMS_ITEMS } from "./data"
import { AccordionAbout } from "./AccordionAbout"

const DESKTOP_TITLE_LINES: Record<string, [string, string]> = {
  curiosity: ["Ai Mematikan", "Rasa Ingin Tahu?"],
  prompting: ["Prompting Yang", "Ribet"],
  citation: ["Sitasi &", "Provenance"],
  plagiarism: ["Plagiarisme?", "Dipagari Etis"],
  transparency: ["Transparansi proses", "penyusunan"],
  detection: ["Deteksi AI", "Problematik"],
}

export function ProblemsSection() {
  // Transform items for accordion (mobile)
  const accordionItems = PROBLEMS_ITEMS.map((item) => ({
    id: item.id,
    title: item.title,
    content: item.description,
  }))

  return (
    <section
      className="relative isolate overflow-hidden bg-[color:var(--section-bg-alt)]"
      id="problems"
    >
      {/* Background patterns */}
      <DiagonalStripes className="opacity-40" />
      <DottedPattern spacing={24} withRadialMask={true} />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="grid grid-cols-1 gap-comfort md:grid-cols-16">
          {/* Section Header */}
          <div className="col-span-1 mb-8 flex flex-col items-start gap-3 md:col-span-12 md:col-start-3 md:mb-12 md:gap-4">
            <SectionBadge>Persoalan</SectionBadge>
            <h2 className="text-narrative text-3xl font-medium leading-tight tracking-tight text-foreground md:text-3xl lg:text-4xl">
              Apa saja persoalan yang dijawab?
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

          {/* Desktop: 16-col bento mapping (8/8) */}
          <div className="hidden md:col-span-12 md:col-start-3 md:grid grid-cols-16 gap-comfort">
            {PROBLEMS_ITEMS.map((item) => {
              const titleLines = DESKTOP_TITLE_LINES[item.id] ?? [item.title, ""]

              return (
                <div
                  key={item.id}
                  className="group relative col-span-8 flex flex-col rounded-shell border-hairline bg-transparent p-comfort transition-colors duration-200 hover:bg-[color:var(--slate-200)] dark:hover:bg-[color:var(--slate-900)]"
                >
                  <div className="relative flex flex-1 flex-col">
                    <h3 className="text-narrative font-light text-3xl leading-[1.1] text-foreground m-0 mb-6">
                      {titleLines[0]}
                      <br />
                      {titleLines[1]}
                    </h3>
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 h-2.5 w-2.5 min-w-2.5 rounded-full bg-[color:var(--amber-500)] shadow-[0_0_8px_var(--amber-500)] animate-pulse" />
                      <p className="text-interface m-0 text-xs leading-relaxed text-muted-foreground hover:text-slate-50">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
