"use client"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { cn } from "@/lib/utils"

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════
// CTA Component with Auth-Aware Redirect
// ════════════════════════════════════════════════════════════════

function PricingCTA({
  slug,
  isHighlighted,
  isSignedIn,
}: {
  slug: string
  isHighlighted: boolean
  isSignedIn: boolean
}) {
  // Define destinations per tier
  const getDestination = (): string => {
    switch (slug) {
      case "gratis":
        return "/get-started"
      case "bpp":
        return "/checkout/bpp"
      case "pro":
        return "/checkout/pro"
      default:
        return "/get-started"
    }
  }

  // Build href with redirect param if not signed in
  const getHref = (): string => {
    const dest = getDestination()
    if (!isSignedIn) {
      return `/sign-up?redirect=${encodeURIComponent(dest)}`
    }
    return dest
  }

  // Get CTA text per tier
  const getCtaText = (): string => {
    switch (slug) {
      case "gratis":
        return "Mulai Gratis"
      case "bpp":
        return "Beli Kredit"
      case "pro":
        return "Segera Hadir"
      default:
        return "Mulai"
    }
  }

  // PRO is always disabled (coming soon)
  if (slug === "pro") {
    return (
      <button disabled className="btn btn-disabled full-width">
        {getCtaText()}
      </button>
    )
  }

  return (
    <Link
      href={getHref()}
      className={cn(
        "btn full-width",
        isHighlighted ? "btn-brand-vivid" : "btn-outline"
      )}
    >
      {getCtaText()}
    </Link>
  )
}

// ════════════════════════════════════════════════════════════════
// Pricing Card Component
// ════════════════════════════════════════════════════════════════

function PricingCard({
  plan,
  isSignedIn,
}: {
  plan: PricingPlan
  isSignedIn: boolean
}) {
  return (
    <div
      className={cn("pricing-card", plan.isHighlighted && "highlighted")}
    >
      {/* Popular tag for highlighted card */}
      {plan.isHighlighted && (
        <div className="popular-tag">Solusi Terbaik</div>
      )}

      {/* Card content wrapper */}
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
            <li key={`${plan._id}-feature-${index}`}>{feature}</li>
          ))}
        </ul>

        {/* Auth-aware CTA */}
        <PricingCTA
          slug={plan.slug}
          isHighlighted={plan.isHighlighted}
          isSignedIn={isSignedIn}
        />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// Pricing Carousel (Mobile)
// ════════════════════════════════════════════════════════════════

function PricingCarousel({
  plans,
  isSignedIn,
}: {
  plans: PricingPlan[]
  isSignedIn: boolean
}) {
  // Start at highlighted plan (BPP)
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
            <PricingCard plan={plan} isSignedIn={isSignedIn} />
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

// ════════════════════════════════════════════════════════════════
// Main Page Component
// ════════════════════════════════════════════════════════════════

export default function PricingPage() {
  const { isSignedIn } = useUser()
  const plans = useQuery(api.pricingPlans.getActivePlans)

  return (
    <>
      {/* Hero Header */}
      <section className="hero-section hero-vivid hero-grid-thin">
        <div className="hero-content">
          <h1 className="hero-heading">
            Tak Perlu Bayar Mahal
            <br />
            Untuk Karya Yang Masuk Akal
          </h1>
          <p className="hero-subheading">
            Pilih paket penggunaan sesuai kebutuhan. Mau ujicoba dulu yang
            gratisan? Boleh! Atau langsung bayar per paper? Aman!
          </p>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="pricing" id="pricing-cards">
        {/* Background patterns */}
        <div className="grid-thin" />
        <div className="bg-dot-grid" />

        <div className="pricing-container">
          {/* Loading state */}
          {plans === undefined && <PricingSkeleton />}

          {/* Empty state */}
          {plans && plans.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Paket harga sedang disiapkan. Silakan cek kembali nanti.
              </p>
            </div>
          )}

          {/* Loaded state with data */}
          {plans && plans.length > 0 && (
            <>
              {/* Desktop: Grid */}
              <div className="pricing-grid hidden md:grid">
                {plans.map((plan) => (
                  <PricingCard
                    key={plan._id}
                    plan={plan}
                    isSignedIn={isSignedIn ?? false}
                  />
                ))}
              </div>

              {/* Mobile: Carousel */}
              <PricingCarousel plans={plans} isSignedIn={isSignedIn ?? false} />
            </>
          )}
        </div>
      </section>
    </>
  )
}
