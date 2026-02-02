"use client"

import { HeroHeadingSvg } from "@/components/marketing/HeroHeadingSvg"

/**
 * HeroHeading Component
 *
 * Main hero heading with accessible screen reader text and SVG display
 */
export function HeroHeading() {
  return (
    <h1 className="hero-heading hero-heading--svg">
      <span className="sr-only">
        Ngobrol+Riset +Brainstorming =Paper_Akademik
      </span>
      <HeroHeadingSvg />
    </h1>
  )
}
