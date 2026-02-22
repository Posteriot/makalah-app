"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { TeaserPlan } from "./types"
import { SectionBadge } from "@/components/ui/section-badge"
import { TeaserCard } from "./TeaserCard"
import { TeaserCarousel } from "./TeaserCarousel"
import { TeaserSkeleton } from "./TeaserSkeleton"
import { TeaserCTA } from "./TeaserCTA"
import { GridPattern, DottedPattern } from "@/components/marketing/SectionBackground"

// Static fallback values
const FALLBACK_BADGE = "Pemakaian & Harga"
const FALLBACK_TITLE = "Investasi untuk\nMasa Depan Akademik."

// ════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════

export function PricingTeaser() {
  const plansData = useQuery(api.pricingPlans.getActivePlans)
  const headerSection = useQuery(api.pageContent.getSection, {
    pageSlug: "home",
    sectionSlug: "pricing-teaser",
  })

  // Use CMS data if published, otherwise static fallback
  const useCms = headerSection?.isPublished === true
  const badgeText = useCms ? (headerSection.badgeText || FALLBACK_BADGE) : FALLBACK_BADGE
  const titleText = useCms ? (headerSection.title || FALLBACK_TITLE) : FALLBACK_TITLE

  // Transform to teaser format using database fields
  const teaserPlans: TeaserPlan[] = (plansData || []).map((plan) => ({
    _id: plan._id,
    name: plan.name,
    price: plan.price,
    unit: plan.unit,
    isHighlighted: plan.isHighlighted,
    isDisabled: plan.isDisabled,
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
      className="relative h-[100svh] flex flex-col justify-center overflow-hidden bg-background"
      id="pemakaian-harga"
    >
      {/* Background patterns — conditional via CMS when published */}
      {(!useCms || headerSection.showGridPattern !== false) && <GridPattern className="z-0" />}
      {(!useCms || headerSection.showDottedPattern !== false) && <DottedPattern spacing={24} withRadialMask={false} className="z-0" />}

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-10">
        <div className="grid grid-cols-16 gap-comfort content-center">
          {/* Section Header */}
          <div className="col-span-16 md:col-span-12 md:col-start-3 flex flex-col items-start gap-3 md:gap-4 mb-4 md:mb-8">
            <SectionBadge>{badgeText}</SectionBadge>
            <h2 className="text-narrative text-2xl sm:text-[2rem] md:text-[2.5rem] font-medium leading-[1.3] text-foreground">
              {titleText.split("\n").map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </h2>
          </div>

          {/* Desktop: Grid */}
          <div className="col-span-16 md:col-span-12 md:col-start-3">
            <div className="hidden md:grid grid-cols-3 gap-6 items-stretch">
              {teaserPlans.map((plan) => (
                <TeaserCard key={plan._id} plan={plan} />
              ))}
            </div>

            {/* Mobile: Carousel */}
            <TeaserCarousel plans={teaserPlans} />
          </div>

          {/* Global CTA - Link to full pricing page */}
          <div className="col-span-16 md:col-span-12 md:col-start-3">
            <TeaserCTA />
          </div>
        </div>
      </div>
    </section>
  )
}
