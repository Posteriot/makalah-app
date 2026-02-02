import { Suspense } from "react"
import { PawangBadge } from "@/components/marketing/hero/PawangBadge"
import { ChatInputHeroMock } from "@/components/marketing/hero/ChatInputHeroMock"
import { HeroResearchMock } from "@/components/marketing/hero/HeroResearchMock"
import { HeroHeading } from "@/components/marketing/hero/HeroHeading"
import { HeroSubheading } from "@/components/marketing/hero/HeroSubheading"
import { HeroCTA } from "@/components/marketing/hero/HeroCTA"
import { BenefitsSection } from "@/components/marketing/benefits"
import { PricingTeaser } from "@/components/marketing/PricingTeaser"
import { WaitlistToast } from "@/components/marketing/WaitlistToast"

export default function MarketingHomePage() {
  return (
    <>
      {/* Waitlist Toast Handler */}
      <Suspense fallback={null}>
        <WaitlistToast />
      </Suspense>

      {/* Hero Section - Two-column flex layout */}
      <section className="hero-section hero-vivid hero-grid-thin">
        {/* Vignette overlay - darkens aurora edges */}
        <div className="hero-vignette" />

        {/* Diagonal Stripes Background */}
        <div className="hero-diagonal-stripes" />

        {/* IDE Layout Lines (Decorative) */}
        <div className="hero-ide-line-y hidden lg:block" style={{ left: "calc(50% - 600px)" }} />
        <div className="hero-ide-line-y hidden lg:block" style={{ right: "calc(50% - 600px)" }} />

        {/* Hero Flex Container */}
        <div className="hero-flex">
          {/* Hero Left - Text Content */}
          <div className="hero-left">
            {/* Pawang Badge */}
            <PawangBadge />

            {/* Hero Heading */}
            <HeroHeading />

            {/* Subheading */}
            <HeroSubheading />

            {/* CTA Button */}
            <div className="hero-actions">
              <HeroCTA />
            </div>
          </div>

          {/* Hero Right - Layered Mockup */}
          <div className="hero-right">
            <div className="mockup-layered-container">
              {/* Back Layer - Research Code Mockup */}
              <HeroResearchMock />

              {/* Front Layer - Chat Input Mockup (animated) */}
              <ChatInputHeroMock />
            </div>
          </div>
        </div>

        {/* Bottom Fade */}
        <div className="hero-fade-bottom" />
      </section>

      {/* Benefits Section */}
      <BenefitsSection />

      {/* Pricing Teaser - Simplified cards linking to /pricing */}
      <PricingTeaser />
    </>
  )
}
