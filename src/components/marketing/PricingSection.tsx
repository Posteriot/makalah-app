"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
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

function PricingCard({ plan }: { plan: PricingPlan }) {
  // Determine button style based on plan
  const getButtonClass = () => {
    if (plan.isHighlighted) return "btn-brand-vivid"
    return "btn-outline"
  }

  return (
    <div
      className={cn(
        "pricing-card",
        plan.isHighlighted && "pricing-card--highlight"
      )}
    >
      {/* Popular tag for highlighted card */}
      {plan.isHighlighted && (
        <div className="popular-tag">SOLUSI TERBAIK</div>
      )}

      <div className="card-header">
        <h3 className="pricing-name">{plan.name}</h3>
        <p className="pricing-price">
          <span
            className={cn(
              "price-amount",
              plan.isDisabled && "price-amount--disabled"
            )}
          >
            {plan.price}
          </span>
          {plan.unit && <span className="price-unit">{plan.unit}</span>}
        </p>
      </div>

      <ul className="price-features">
        {plan.features.map((feature, index) => (
          <li key={`${plan._id}-feature-${index}`}>
            {feature}
          </li>
        ))}
      </ul>

      {plan.ctaHref ? (
        <Link
          href={plan.ctaHref}
          className={cn("pricing-cta", getButtonClass())}
        >
          {plan.ctaText}
        </Link>
      ) : (
        <button disabled className="pricing-cta btn-disabled">
          {plan.ctaText}
        </button>
      )}

      {/* Aurora glow effect */}
      <div className="card-aurora" />
    </div>
  )
}

function PricingCarousel({ plans }: { plans: PricingPlan[] }) {
  const [activeSlide, setActiveSlide] = useState(0)

  return (
    <div className="pricing-carousel md:hidden">
      <div
        className="carousel-track"
        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
      >
        {plans.map((plan) => (
          <div key={plan._id} className="carousel-slide">
            <PricingCard plan={plan} />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="carousel-dots">
        {plans.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveSlide(index)}
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
    <section className="pricing-section" id="pemakaian-harga">
      {/* Background patterns */}
      <div className="pricing-bg-grid" />
      <div className="pricing-bg-dots" />

      <div className="pricing-container">
        {/* Section Header */}
        <div className="pricing-header">
          <div className="pricing-badge">
            <span className="pricing-badge-dot" />
            <span className="pricing-badge-text">Pemakaian & Harga</span>
          </div>
          <h2 className="pricing-title">
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
                <PricingCard key={plan._id} plan={plan} />
              ))}
            </div>

            {/* Mobile: Carousel */}
            <PricingCarousel plans={plans} />
          </>
        )}

        {/* Link to full pricing page - centered below cards */}
        {showCta && (
          <div className="pricing-cta-wrapper">
            <Link href="/pricing" className="btn-brand">
              Lihat detail paket lengkap
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
