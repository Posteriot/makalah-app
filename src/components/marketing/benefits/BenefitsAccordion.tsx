"use client"

import { useState, useRef, useEffect } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { benefits } from "./benefitsData"

/**
 * BenefitsAccordion - Mobile Accordion View
 * - Single item open at a time (mutual exclusive)
 * - All collapsed by default
 * - Click outside closes any open accordion
 * - No SVG illustrations
 * - Card styling matching bento design
 */
export function BenefitsAccordion() {
  // Use empty string instead of undefined for controlled accordion
  // This prevents "uncontrolled to controlled" React warning
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

    // Use both click and touchstart for broader compatibility
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
        className="benefits-accordion"
      >
        {benefits.map((benefit) => {
          const Icon = benefit.icon
          return (
            <AccordionItem
              key={benefit.id}
              value={benefit.id}
              className="benefits-accordion-item"
            >
              <AccordionTrigger className="benefits-accordion-trigger">
                <div className="benefits-accordion-header">
                  <div className="bento-icon-box">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span>{benefit.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="benefits-accordion-content">
                <p>{benefit.content}</p>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
