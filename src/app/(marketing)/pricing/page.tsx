"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { SectionBadge } from "@/components/ui/section-badge"
import { GridPattern, DottedPattern } from "@/components/marketing/SectionBackground"
import { PricingCard, PricingCarousel, PricingSkeleton } from "@/components/marketing/pricing"

export default function PricingPage() {
  const plans = useQuery(api.pricingPlans.getActivePlans)

  return (
    <section
      className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden bg-background py-6 md:py-10"
      style={{ paddingTop: "calc(var(--header-h) + 60px)" }}
      id="pricing"
    >
      {/* Background patterns - using memoized React components */}
      <GridPattern className="z-0" />
      <DottedPattern spacing={24} withRadialMask={false} className="z-0" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-16 gap-comfort content-center">
          {/* Section Header */}
          <div className="col-span-16 flex flex-col items-start gap-3 md:gap-4 mb-4 md:mb-8">
            <SectionBadge>Pemakaian & Harga</SectionBadge>
            <h1 className="text-narrative text-2xl sm:text-[2rem] md:text-[2.5rem] font-medium leading-[1.3] text-foreground">
              Tak Perlu Bayar Mahal
              <br />
              Untuk Karya Yang Masuk Akal
            </h1>
            <p className="text-interface text-sm text-muted-foreground max-w-xl">
              Pilih paket penggunaan sesuai kebutuhan. Mau ujicoba dulu yang
              gratisan? Boleh! Atau langsung bayar per paper? Aman!
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
