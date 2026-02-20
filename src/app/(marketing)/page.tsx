import { Suspense } from "react"
import { HeroSection } from "@/components/marketing/hero"
import { BenefitsSectionWrapper } from "@/components/marketing/benefits"
import { WorkflowFeatureSection, RefrasaFeatureSection } from "@/components/marketing/features"
import { PricingTeaser } from "@/components/marketing/pricing-teaser"
import { WaitlistToast } from "@/components/marketing/WaitlistToast"

export default function MarketingHomePage() {
  return (
    <>
      {/* Waitlist Toast Handler */}
      <Suspense fallback={null}>
        <WaitlistToast />
      </Suspense>

      {/* Hero Section — CMS-driven with static fallback */}
      <HeroSection />

      {/* Benefits Section — CMS-driven with static fallback */}
      <BenefitsSectionWrapper />

      {/* Workflow Feature Section */}
      <WorkflowFeatureSection />

      {/* Refrasa Feature Section */}
      <RefrasaFeatureSection />

      {/* Pricing Teaser */}
      <PricingTeaser />
    </>
  )
}
