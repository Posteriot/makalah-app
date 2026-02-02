"use client"

import { useState, useRef, useEffect } from "react"
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
 * - Click outside closes any open accordion
 * - Blinking dot matching desktop design
 * - Design tokens: bg-dot, font-sans, font-mono
 */

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

export function BenefitsAccordion() {
  const [openItem, setOpenItem] = useState<string>("")
  const accordionRef = useRef<HTMLDivElement>(null)

  // Close accordion when clicking/touching outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        accordionRef.current &&
        !accordionRef.current.contains(event.target as Node)
      ) {
        setOpenItem("")
      }
    }

    document.addEventListener("click", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)

    return () => {
      document.removeEventListener("click", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [])

  return (
    <div ref={accordionRef} className="md:hidden">
      <Accordion
        type="single"
        collapsible
        value={openItem}
        onValueChange={(value) => setOpenItem(value ?? "")}
        className="flex flex-col gap-3"
      >
        {benefits.map((benefit) => (
          <AccordionItem
            key={benefit.id}
            value={benefit.id}
            className="group relative overflow-hidden rounded-lg border border-bento-border-light dark:border-bento-border bg-transparent hover:bg-bento-light-hover dark:hover:bg-bento-hover hover:border-bento-border-light-hover dark:hover:border-bento-border-hover hover:-translate-y-1 transition-all duration-300"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                {/* Blinking dot - matches desktop */}
                <span className="w-2.5 h-2.5 min-w-2.5 rounded-full bg-dot-light dark:bg-dot animate-badge-dot shadow-[0_0_8px_var(--color-dot-light)] dark:shadow-[0_0_8px_var(--color-dot)]" />
                <span className="font-sans font-medium text-base text-foreground">
                  {benefit.title}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="font-mono text-sm leading-relaxed text-muted-foreground pl-5">
                {benefit.description}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
