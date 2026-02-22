"use client"

import { useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

/**
 * BenefitsAccordion - Mobile Accordion View
 * Design synced with BentoBenefitsGrid (desktop)
 *
 * - Single item open at a time (mutual exclusive)
 * - All collapsed by default
 * - Blinking dot matching desktop design (Amber)
 * - Design tokens: Slate surface, Hairline border, text-narrative, text-interface
 *
 * Accepts optional `items` prop from CMS. If provided, uses CMS data;
 * otherwise falls back to hardcoded `benefits` array.
 */

type BenefitItem = {
  title: string
  description: string
}

type BenefitsAccordionProps = {
  items?: BenefitItem[]
}

const benefits = [
  {
    id: "sparring-partner",
    title: "Sparring Partner",
    description:
      "Pendamping penulisan riset sekaligus mitra diskusi, dari tahap ide hingga paper jadi. Alat kolaboratif yang memastikan setiap karya akuntabel dan berkualitas akademik.",
  },
  {
    id: "chat-natural",
    title: "Chat Natural",
    description:
      "Ngobrol saja, layaknya percakapan lazim. Tanggapi setiap respons maupun pertanyaan agent menggunakan Bahasa Indonesia sehari-hari, tanpa prompt rumit.",
  },
  {
    id: "bahasa-manusiawi",
    title: "Bahasa Manusiawi",
    description:
      'Gunakan fitur "Refrasa" untuk membentuk gaya penulisan bahasa Indonesia manusiawi, bukan khas robot, tanpa mengubah makna—ritme paragraf, variasi kalimat, dan istilah jadi rapi.',
  },
  {
    id: "dipandu-bertahap",
    title: "Dipandu Bertahap",
    description:
      "Workflow ketat dan terstruktur, mengolah ide hingga paper jadi, dengan sitasi kredibel dan format sesuai preferensi.",
  },
]

export function BenefitsAccordion({ items }: BenefitsAccordionProps) {
  const [openItem, setOpenItem] = useState<string>("")

  const benefitsData = items
    ? items.map((item, i) => ({
        id: `benefit-${i}`,
        title: item.title,
        description: item.description,
      }))
    : benefits

  return (
    <div className="md:hidden">
      <Accordion
        type="single"
        collapsible
        value={openItem}
        onValueChange={(value) => setOpenItem(value ?? "")}
        className="flex flex-col gap-comfort"
      >
        {benefitsData.map((benefit) => (
          <AccordionItem
            key={benefit.id}
            value={benefit.id}
            className="group relative overflow-hidden rounded-md border-hairline bg-card/85 backdrop-blur-[1px] transition-all duration-300 hover:-translate-y-1 hover:bg-slate-200 hover:border-slate-400 dark:bg-slate-900/85 dark:hover:bg-slate-700 dark:hover:border-slate-600"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                {/* Blinking dot - matches desktop */}
                <span className="h-2.5 w-2.5 min-w-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px] shadow-amber-500" />
                <span className="text-narrative font-medium text-base text-foreground">
                  {benefit.title}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="text-interface text-xs leading-relaxed text-muted-foreground pl-5">
                {benefit.description}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
