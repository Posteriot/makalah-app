"use client"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { cn } from "@/lib/utils"

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

// Simplified card type for teaser - no features list, no per-card CTA
type TeaserPlan = {
  _id: string
  name: string
  price: string
  unit?: string
  isHighlighted: boolean
  creditSummary: string
}

// ════════════════════════════════════════════════════════════════
// Teaser Card Component
// ════════════════════════════════════════════════════════════════

function TeaserCard({ plan }: { plan: TeaserPlan }) {
  return (
    <div
      className={cn(
        "pricing-card-teaser",
        plan.isHighlighted && "highlighted"
      )}
    >
      {/* Popular tag for highlighted card */}
      {plan.isHighlighted && (
        <div className="popular-tag">Solusi Terbaik</div>
      )}

      <div className="card-content-teaser">
        <h3>{plan.name}</h3>
        <p className="price">
          {plan.price}
          {plan.unit && <span className="unit">{plan.unit}</span>}
        </p>
        <div className="divider" />
        <p className="credit-summary">{plan.creditSummary}</p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// Teaser Carousel Component (Mobile)
// ════════════════════════════════════════════════════════════════

function TeaserCarousel({ plans }: { plans: TeaserPlan[] }) {
  // Start at highlighted plan (BPP) for better UX
  const highlightedIndex = plans.findIndex((p) => p.isHighlighted)
  const [activeSlide, setActiveSlide] = useState(
    highlightedIndex >= 0 ? highlightedIndex : 0
  )
  const startXRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)

  const clampIndex = useCallback(
    (index: number) => {
      if (plans.length === 0) return 0
      return Math.max(0, Math.min(index, plans.length - 1))
    },
    [plans.length]
  )

  const handleSwipe = useCallback(
    (diff: number) => {
      const threshold = 48
      if (Math.abs(diff) < threshold) return
      setActiveSlide((current) => {
        const direction = diff > 0 ? 1 : -1
        return clampIndex(current + direction)
      })
    },
    [clampIndex]
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      startXRef.current = event.clientX
      isDraggingRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    []
  )

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || startXRef.current === null) return
      const diff = startXRef.current - event.clientX
      handleSwipe(diff)
      isDraggingRef.current = false
      startXRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    },
    [handleSwipe]
  )

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || startXRef.current === null) return
      const diff = startXRef.current - event.clientX
      handleSwipe(diff)
      isDraggingRef.current = false
      startXRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    },
    [handleSwipe]
  )

  return (
    <div className="pricing-carousel-teaser md:hidden">
      <div
        className="carousel-track"
        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {plans.map((plan) => (
          <div key={plan._id} className="carousel-slide">
            <TeaserCard plan={plan} />
          </div>
        ))}
      </div>

      {/* Navigation Dots */}
      <div className="carousel-dots">
        {plans.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveSlide(clampIndex(index))}
            className={cn(
              "carousel-dot",
              activeSlide === index && "carousel-dot--active"
            )}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// Skeleton Component
// ════════════════════════════════════════════════════════════════

function TeaserSkeleton() {
  return (
    <section className="pricing-teaser">
      <div className="grid-thin" />
      <div className="bg-dot-grid" />

      <div className="pricing-container">
        <div className="section-header">
          <div className="badge-group">
            <span className="h-5 w-5 bg-muted rounded-full animate-pulse" />
            <span className="h-4 w-28 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-64 bg-muted rounded mx-auto mt-4 animate-pulse" />
        </div>

        <div className="pricing-grid-teaser hidden md:grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="pricing-card-teaser animate-pulse">
              <div className="card-content-teaser">
                <div className="h-5 bg-muted rounded w-24 mx-auto" />
                <div className="h-7 bg-muted rounded w-28 mx-auto mt-3" />
                <div className="divider" />
                <div className="h-4 bg-muted rounded w-32 mx-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════
// Helper Function
// ════════════════════════════════════════════════════════════════

function getCreditSummary(slug: string, features: string[]): string {
  // Extract credit info based on slug (matching plan definitions)
  switch (slug) {
    case "gratis":
      return "50 kredit"
    case "bpp":
      return "300 kredit (~15 halaman)"
    case "pro":
      return "2000 kredit (~5 paper)"
    default:
      // Fallback: try to extract from first feature
      return features[0] || ""
  }
}

// ════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════

export function PricingTeaser() {
  const plansData = useQuery(api.pricingPlans.getActivePlans)

  // Transform to teaser format (simplified)
  const teaserPlans: TeaserPlan[] = (plansData || []).map((plan) => ({
    _id: plan._id,
    name: plan.name,
    price: plan.price,
    unit: plan.unit,
    isHighlighted: plan.isHighlighted,
    creditSummary: getCreditSummary(plan.slug, plan.features),
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
    <section className="pricing-teaser" id="pemakaian-harga">
      {/* Background patterns */}
      <div className="grid-thin" />
      <div className="bg-dot-grid" />

      <div className="pricing-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="badge-group">
            <span className="badge-dot" />
            <span className="badge-text">Pemakaian & Harga</span>
          </div>
          <h2 className="section-title">
            Investasi untuk
            <br />
            Masa Depan Akademik.
          </h2>
        </div>

        {/* Desktop: Grid */}
        <div className="pricing-grid-teaser hidden md:grid">
          {teaserPlans.map((plan) => (
            <TeaserCard key={plan._id} plan={plan} />
          ))}
        </div>

        {/* Mobile: Carousel */}
        <TeaserCarousel plans={teaserPlans} />

        {/* Global CTA - Link to full pricing page */}
        <div className="teaser-cta">
          <Link href="/pricing" className="btn-outline">
            Lihat Detail Paket →
          </Link>
        </div>
      </div>
    </section>
  )
}
