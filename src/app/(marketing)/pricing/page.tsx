"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { SectionBadge } from "@/components/ui/section-badge"
import { GridPattern, DottedPattern, DiagonalStripes } from "@/components/marketing/SectionBackground"
import { PricingCard, PricingCarousel, PricingSkeleton } from "@/components/marketing/pricing"

// Static fallback values
const FALLBACK_BADGE = "Pemakaian & Harga"
const FALLBACK_TITLE = "Tak Perlu Bayar Mahal\nUntuk Karya Yang Masuk Akal"
const FALLBACK_SUBTITLE = "Pilih paket penggunaan sesuai kebutuhan. Mau ujicoba dulu yang gratisan? Boleh! Atau langsung bayar per paper? Aman!"

export default function PricingPage() {
  const plans = useQuery(api.pricingPlans.getActivePlans)
  const headerSection = useQuery(api.pageContent.getSection, {
    pageSlug: "pricing",
    sectionSlug: "pricing-page-header",
  })

  // Use CMS data if published, otherwise static fallback
  const useCms = headerSection?.isPublished === true
  const badgeText = useCms ? (headerSection.badgeText || FALLBACK_BADGE) : FALLBACK_BADGE
  const titleText = useCms ? (headerSection.title || FALLBACK_TITLE) : FALLBACK_TITLE
  const subtitleText = useCms ? (headerSection.subtitle || FALLBACK_SUBTITLE) : FALLBACK_SUBTITLE

  return (
    <section
      className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden bg-background pb-6 md:pb-10 pt-[calc(var(--header-h)+60px)] md:pt-[calc(var(--header-h)+60px)]"
      id="pricing"
    >
      {/* Background patterns — conditional via CMS when published */}
      {(!useCms || headerSection.showGridPattern !== false) && <GridPattern className="z-0" />}
      {(!useCms || headerSection.showDottedPattern !== false) && <DottedPattern spacing={24} withRadialMask={false} className="z-0" />}
      {(!useCms || headerSection.showDiagonalStripes !== false) && <DiagonalStripes className="z-0" />}

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-16 gap-comfort content-center">
          {/* Section Header */}
          <div className="col-span-16 flex flex-col items-start gap-3 md:gap-4 mb-4 md:mb-8">
            <SectionBadge>{badgeText}</SectionBadge>
            <h1 className="text-narrative text-2xl sm:text-[2rem] md:text-[2.5rem] font-medium leading-[1.3] text-foreground">
              {titleText.split("\n").map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </h1>
            <p className="text-interface text-sm text-muted-foreground max-w-xl">
              {subtitleText}
            </p>
          </div>

          {/* Loading state */}
          {plans === undefined && (
            <div className="col-span-16">
              <PricingSkeleton />
            </div>
          )}

          {/* Empty state */}
          {plans && plans.length === 0 && (
            <div className="col-span-16 text-center py-12">
              <p className="text-interface text-xs text-muted-foreground">
                Paket harga sedang disiapkan. Silakan cek kembali nanti.
              </p>
            </div>
          )}

          {/* Loaded state with data */}
          {plans && plans.length > 0 && (
            <>
              {/* Desktop: Grid */}
              <div className="col-span-16">
                <div className="hidden md:grid grid-cols-3 gap-6 items-stretch">
                  {plans.map((plan) => (
                    <PricingCard key={plan._id} plan={plan} />
                  ))}
                </div>
              </div>

              {/* Mobile: Carousel */}
              <div className="col-span-16">
                <PricingCarousel plans={plans} />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
