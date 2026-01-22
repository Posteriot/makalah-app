"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle, ChevronRight } from "lucide-react"
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

function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <div
      className={cn(
        "pricing-card",
        plan.isHighlighted && "pricing-card--highlight"
      )}
    >
      <div className="pricing-header">
        <h3 className="pricing-name">{plan.name}</h3>
      </div>
      <div className="pricing-price">
        <span
          className={cn(
            "price-amount",
            plan.isDisabled && "price-amount--disabled"
          )}
        >
          {plan.price}
        </span>
        {plan.unit && <span className="price-unit">{plan.unit}</span>}
      </div>
      <p className="pricing-tagline">{plan.tagline}</p>
      <ul className="pricing-features">
        {plan.features.map((feature, index) => (
          <li key={index}>
            <CheckCircle />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {plan.ctaHref ? (
        <Link href={plan.ctaHref} className="btn btn-green-solid pricing-cta">
          {plan.ctaText}
        </Link>
      ) : (
        <button disabled className="btn-disabled pricing-cta">
          {plan.ctaText}
        </button>
      )}
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
          <div className="pricing-header">
            <div className="h-6 bg-muted rounded w-24" />
          </div>
          <div className="pricing-price">
            <div className="h-8 bg-muted rounded w-32" />
          </div>
          <div className="h-4 bg-muted rounded w-full mt-4" />
          <div className="h-4 bg-muted rounded w-3/4 mt-2" />
          <ul className="pricing-features mt-4 space-y-2">
            <li className="h-4 bg-muted rounded w-full" />
            <li className="h-4 bg-muted rounded w-5/6" />
          </ul>
          <div className="h-10 bg-muted rounded w-full mt-6" />
        </div>
      ))}
    </div>
  )
}

export function PricingSection() {
  const plans = useQuery(api.pricingPlans.getActivePlans)

  return (
    <section className="pricing-section" id="pricing">
      <div className="section-container">
        <h2 className="section-heading">
          Pilih paket penggunaan
          <br />
          sesuai kebutuhan
        </h2>

        {/* Loading state */}
        {plans === undefined && <PricingSkeleton />}

        {/* Loaded state */}
        {plans && (
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
        <div className="pricing-link-wrapper">
          <Link href="/pricing" className="btn-brand">
            Lihat detail paket lengkap
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
