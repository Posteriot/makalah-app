import { Suspense } from "react"
import {
  PawangBadge,
  ChatInputHeroMock,
  HeroResearchMock,
  HeroHeading,
  HeroSubheading,
  HeroCTA,
} from "@/components/marketing/hero"
import { BenefitsSection } from "@/components/marketing/benefits"
import { PricingTeaser } from "@/components/marketing/pricing-teaser"
import { WaitlistToast } from "@/components/marketing/WaitlistToast"

// New background components
import { AuroraBackground, VignetteOverlay } from "@/components/marketing/PageBackground"
import { TintOverlay } from "@/components/marketing/BackgroundOverlay"
import { GridPattern, DiagonalStripes, FadeBottom } from "@/components/marketing/SectionBackground"

export default function MarketingHomePage() {
  return (
    <>
      {/* Waitlist Toast Handler */}
      <Suspense fallback={null}>
        <WaitlistToast />
      </Suspense>

      {/* Hero Section */}
      <section className="hero-section relative isolate overflow-hidden">
        {/* Background Layers (bottom to top) */}
        <AuroraBackground />
        <VignetteOverlay />
        <TintOverlay intensity={15} className="z-0" />
        <GridPattern />
        <DiagonalStripes />

        {/* Hero Flex Container */}
        <div className="hero-flex">
          {/* Hero Left - Text Content */}
          <div className="hero-left">
            <PawangBadge />
            <HeroHeading />
            <HeroSubheading />
            <div className="hero-actions">
              <HeroCTA />
            </div>
          </div>

          {/* Hero Right - Layered Mockup */}
          <div className="hero-right">
            <div className="mockup-layered-container">
              <HeroResearchMock />
              <ChatInputHeroMock />
            </div>
          </div>
        </div>

        {/* Bottom Fade */}
        <FadeBottom />
      </section>

      {/* Benefits Section */}
      <BenefitsSection />

      {/* Pricing Teaser */}
      <PricingTeaser />
    </>
  )
}
