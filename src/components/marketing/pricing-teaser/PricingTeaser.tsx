"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { TeaserPlan } from "./types"
import { PricingTeaserBadge } from "./PricingTeaserBadge"
import { PricingTeaserTitle } from "./PricingTeaserTitle"
import { TeaserCard } from "./TeaserCard"
import { TeaserCarousel } from "./TeaserCarousel"
import { TeaserSkeleton } from "./TeaserSkeleton"
import { TeaserCTA } from "./TeaserCTA"
import { GridPattern, DottedPattern } from "@/components/marketing/SectionBackground"

// ════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════

export function PricingTeaser() {
  const plansData = useQuery(api.pricingPlans.getActivePlans)

  // Transform to teaser format using database fields
  const teaserPlans: TeaserPlan[] = (plansData || []).map((plan) => ({
    _id: plan._id,
    name: plan.name,
    price: plan.price,
    unit: plan.unit,
    isHighlighted: plan.isHighlighted,
    description: plan.teaserDescription || "",
    creditNote: plan.teaserCreditNote || "",
  }))

  // Loading state
  if (!plansData) {
    return <TeaserSkeleton />
  }

  // Empty state - unlikely but handle gracefully
  if (plansData.length === 0) {
    return null
  }

  return (
    <section
      className="relative h-dvh min-h-[580px] md:min-h-[700px] flex flex-col justify-center px-4 md:px-6 overflow-hidden bg-muted/30 dark:bg-black"
      id="pemakaian-harga"
    >
      {/* Background patterns - using memoized React components */}
      <GridPattern className="z-0" />
      <DottedPattern spacing={24} withRadialMask={false} className="z-0" />

      <div className="relative z-10 w-full max-w-[var(--container-max-width)] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col items-start gap-3 md:gap-4 mb-4 md:mb-8">
          <PricingTeaserBadge />
          <PricingTeaserTitle />
        </div>

        {/* Desktop: Grid */}
        <div className="hidden md:grid grid-cols-3 gap-6 items-stretch">
          {teaserPlans.map((plan) => (
            <TeaserCard key={plan._id} plan={plan} />
          ))}
        </div>

        {/* Mobile: Carousel */}
        <TeaserCarousel plans={teaserPlans} />

        {/* Global CTA - Link to full pricing page */}
        <TeaserCTA />
      </div>
    </section>
  )
}
