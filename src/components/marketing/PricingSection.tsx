"use client"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { cn } from "@/lib/utils"

// Type for pricing plan from Convex
type PricingPlan = {
  _id: string
  name: string
  slug: string
  price: string
  priceValue?: number
  unit?: string
  tagline: string
  features: string[]
  isHighlighted: boolean
  isDisabled: boolean
  ctaText: string
  ctaHref?: string
  sortOrder: number
}

type PricingSectionProps = {
  showCta?: boolean
}

function PricingCard({ plan, showCta }: { plan: PricingPlan; showCta: boolean }) {
  return (
    <div
      className={cn(
        "pricing-card",
        plan.isHighlighted && "highlighted"
      )}
    >
      {/* Popular tag for highlighted card - outside card-content for overflow */}
      {plan.isHighlighted && (
        <div className="popular-tag">Solusi Terbaik</div>
      )}

      {/* Card content wrapper - clips aurora effect */}
      <div className="card-content">
        <div className="card-header">
          <h3>{plan.name}</h3>
          <p className="price">
            {plan.price}
            {plan.unit && <span className="unit">{plan.unit}</span>}
          </p>
        </div>

        <ul className="price-features">
          {plan.features.map((feature, index) => (
            <li key={`${plan._id}-feature-${index}`}>
              {feature}
            </li>
          ))}
        </ul>

        {showCta && (
          <>
            {plan.ctaHref ? (
              <Link
                href={plan.ctaHref}
                className={cn(
                  "btn full-width",
                  plan.isHighlighted ? "btn-brand-vivid" : "btn-outline"
                )}
              >
                {plan.ctaText}
              </Link>
            ) : (
              <button disabled className="btn btn-disabled full-width">
                {plan.ctaText}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PricingCarousel({ plans, showCta }: { plans: PricingPlan[]; showCta: boolean }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const startXRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)

  const clampIndex = useCallback((index: number) => {
    if (plans.length === 0) return 0
    return Math.max(0, Math.min(index, plans.length - 1))
  }, [plans.length])

  const handleSwipe = useCallback((diff: number) => {
    const threshold = 48
    if (Math.abs(diff) < threshold) return
    setActiveSlide((current) => {
      const direction = diff > 0 ? 1 : -1
      return clampIndex(current + direction)
    })
  }, [clampIndex])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    startXRef.current = event.clientX
    isDraggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || startXRef.current === null) return
    const diff = startXRef.current - event.clientX
    handleSwipe(diff)
    isDraggingRef.current = false
    startXRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }, [handleSwipe])

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || startXRef.current === null) return
    const diff = startXRef.current - event.clientX
    handleSwipe(diff)
    isDraggingRef.current = false
    startXRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }, [handleSwipe])

  return (
    <div className="pricing-carousel md:hidden">
      <div
        className="carousel-track"
        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {plans.map((plan) => (
          <div key={plan._id} className="carousel-slide">
            <PricingCard plan={plan} showCta={showCta} />
          </div>
        ))}
      </div>

      {/* Dots */}
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

function PricingSkeleton() {
  return (
    <div className="pricing-grid hidden md:grid">
      {[1, 2, 3].map((i) => (
        <div key={i} className="pricing-card animate-pulse">
          <div className="card-header">
            <div className="h-6 bg-muted rounded w-24" />
            <div className="h-8 bg-muted rounded w-32 mt-2" />
          </div>
          <ul className="price-features mt-4 space-y-3">
            <li className="h-4 bg-muted rounded w-full" />
            <li className="h-4 bg-muted rounded w-5/6" />
            <li className="h-4 bg-muted rounded w-4/5" />
          </ul>
          <div className="h-12 bg-muted rounded w-full mt-6" />
        </div>
      ))}
    </div>
  )
}

function PricingEmpty() {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">
        Paket harga sedang disiapkan. Silakan cek kembali nanti.
      </p>
    </div>
  )
}

export function PricingSection({ showCta = true }: PricingSectionProps) {
  const plans = useQuery(api.pricingPlans.getActivePlans)

  return (
    <section className="pricing" id="pemakaian-harga">
      {/* Background patterns - persis mockup */}
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

        {/* Loading state */}
        {plans === undefined && <PricingSkeleton />}

        {/* Empty state */}
        {plans && plans.length === 0 && <PricingEmpty />}

        {/* Loaded state with data */}
        {plans && plans.length > 0 && (
          <>
            {/* Desktop: Grid */}
            <div className="pricing-grid hidden md:grid">
              {plans.map((plan) => (
                <PricingCard key={plan._id} plan={plan} showCta={showCta} />
              ))}
            </div>

            {/* Mobile: Carousel */}
            <PricingCarousel plans={plans} showCta={showCta} />
          </>
        )}
      </div>
    </section>
  )
}
