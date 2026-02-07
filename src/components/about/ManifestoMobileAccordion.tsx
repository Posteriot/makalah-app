"use client"

import { NavArrowDown } from "iconoir-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface ManifestoMobileAccordionProps {
  heading: string
  paragraphs: string[]
  isOpen: boolean
  onOpenChange: (nextOpen: boolean) => void
}

export function ManifestoMobileAccordion({
  heading,
  paragraphs,
  isOpen,
  onOpenChange,
}: ManifestoMobileAccordionProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <div className="overflow-hidden rounded-shell border-main border-border bg-card/75 backdrop-blur-sm">
        <div className="px-4 pt-4 pb-3">
          <p className="text-interface text-base font-medium leading-snug text-foreground">
            {heading}
          </p>
        </div>

        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="space-y-4 border-t border-hairline px-4 py-4">
            {paragraphs.map((paragraph, index) => (
              <p
                key={index}
                className="text-narrative text-base leading-relaxed text-[color:var(--slate-600)] dark:text-[color:var(--slate-50)]"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </CollapsibleContent>

        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "group relative overflow-hidden flex w-full items-center justify-center border border-transparent border-t border-hairline px-4 py-3",
              "text-signal text-[11px] font-bold",
              "bg-[color:var(--slate-800)] text-[color:var(--slate-100)]",
              "hover:text-[color:var(--slate-800)] hover:border-[color:var(--slate-600)]",
              "dark:bg-[color:var(--slate-100)] dark:text-[color:var(--slate-800)]",
              "dark:hover:text-[color:var(--slate-100)] dark:hover:border-[color:var(--slate-400)]",
              "text-left transition-colors focus-ring"
            )}
            aria-label={isOpen ? "Tutup manifesto" : "Baca manifesto lengkap"}
          >
            <span
              className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
              aria-hidden="true"
            />
            <span className="relative z-10">
              {isOpen ? "TUTUP" : "BACA LENGKAP"}
            </span>
            <NavArrowDown
              className={cn(
                "pointer-events-none absolute right-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform duration-300",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
      </div>
    </Collapsible>
  )
}
