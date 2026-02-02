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
import { gridStyle, gridStyleDark, dotsStyle, dotsStyleDark } from "./backgroundPatterns"

// ════════════════════════════════════════════════════════════════
// Helper Function
// ════════════════════════════════════════════════════════════════

function getCardContent(slug: string): { description: string; creditNote: string } {
  switch (slug) {
    case "gratis":
      return {
        description: "Cocok untuk mencoba 13 tahap workflow dan menyusun draft awal tanpa biaya.",
        creditNote: "Mendapat 50 kredit ≈ 35–45 ribu kata pemakaian total (input + output).",
      }
    case "bpp":
      return {
        description: "Tepat untuk menyelesaikan satu paper utuh hingga ekspor Word/PDF.",
        creditNote: "Mendapat 300 kredit ≈ 210–270 ribu kata pemakaian total (input + output).",
      }
    case "pro":
      return {
        description: "Ideal untuk penyusunan banyak paper dengan diskusi sepuasnya.",
        creditNote: "Mendapat 2000 kredit ≈ 1,4–1,8 juta kata pemakaian total (input + output).",
      }
    default:
      return {
        description: "",
        creditNote: "",
      }
  }
}

// ════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════

export function PricingTeaser() {
  const plansData = useQuery(api.pricingPlans.getActivePlans)

  // Transform to teaser format (simplified)
  const teaserPlans: TeaserPlan[] = (plansData || []).map((plan) => {
    const content = getCardContent(plan.slug)
    return {
      _id: plan._id,
      name: plan.name,
      price: plan.price,
      unit: plan.unit,
      isHighlighted: plan.isHighlighted,
      description: content.description,
      creditNote: content.creditNote,
    }
  })

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
      {/* Background patterns - light mode */}
      <div
        className="absolute inset-0 z-0 pointer-events-none dark:hidden"
        style={gridStyle}
      />
      <div
        className="absolute inset-0 z-0 pointer-events-none dark:hidden"
        style={dotsStyle}
      />
      {/* Background patterns - dark mode */}
      <div
        className="absolute inset-0 z-0 pointer-events-none hidden dark:block"
        style={gridStyleDark}
      />
      <div
        className="absolute inset-0 z-0 pointer-events-none hidden dark:block"
        style={dotsStyleDark}
      />

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
