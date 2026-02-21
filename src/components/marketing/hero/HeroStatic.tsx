"use client"

import { PawangBadge } from "./PawangBadge"
import { HeroHeading } from "./HeroHeading"
import { HeroSubheading } from "./HeroSubheading"
import { HeroCTA } from "./HeroCTA"
import { HeroResearchMock } from "./HeroResearchMock"
import { ChatInputHeroMock } from "./ChatInputHeroMock"
import { GridPattern, DiagonalStripes } from "@/components/marketing/SectionBackground"

/**
 * HeroStatic — static fallback hero section.
 *
 * Render hero section persis seperti versi hardcoded sebelumnya.
 * Digunakan ketika tidak ada data CMS atau section belum dipublish.
 */
export function HeroStatic() {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-background">
      {/* Background Layers (bottom to top) */}
      <GridPattern className="z-0 opacity-80" />
      <DiagonalStripes className="opacity-80" />

      {/* Hero Flex Container */}
      <div className="relative z-[1] mx-auto flex min-h-[100svh] max-w-7xl items-center px-4 py-10 md:px-8 md:py-24">
        <div className="grid grid-cols-1 gap-comfort lg:grid-cols-16 lg:gap-16">
          {/* Hero Left - Text Content */}
          <div className="flex flex-col items-start text-left justify-center lg:col-span-7 lg:justify-start">
            <PawangBadge />
            <HeroHeading />
            <HeroSubheading />
            <div className="mt-4 w-full">
              <HeroCTA />
            </div>
          </div>

          {/* Hero Right - Layered Mockup */}
          <div className="hidden lg:flex lg:col-span-9 lg:items-center lg:justify-end">
            <div className="relative h-[480px] w-full max-w-[560px]">
              <HeroResearchMock />
              <ChatInputHeroMock />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
