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
      className="relative min-h-[580px] md:min-h-[700px] px-4 md:px-6 pb-16 md:pb-24 overflow-hidden bg-background text-foreground"
      style={{ paddingTop: "calc(var(--header-h) + 60px)" }}
      id="pricing"
    >
      {/* Background patterns - using memoized React components */}
      <GridPattern className="z-0" />
      <DottedPattern spacing={24} withRadialMask={false} className="z-0" />

      <div className="relative z-10 w-full max-w-[var(--container-max-width)] mx-auto grid grid-cols-16 gap-4">
        {/* Section Header */}
        <div className="col-span-16 flex flex-col items-start gap-3 md:gap-4 mb-6 md:mb-8">
          <SectionBadge>Pemakaian & Harga</SectionBadge>
          <h1 className="font-mono text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            Tak Perlu Bayar Mahal
            <br />
            Untuk Karya Yang Masuk Akal
          </h1>
          <p className="font-mono text-[11px] md:text-sm text-muted-foreground max-w-xl">
            Pilih paket penggunaan sesuai kebutuhan. Mau ujicoba dulu yang
            gratisan? Boleh! Atau langsung bayar per paper? Aman!
          </p>
        </div>

        {/* Loading state */}
        {plans === undefined && <PricingSkeleton />}

        {/* Empty state */}
        {plans && plans.length === 0 && (
          <div className="col-span-16 text-center py-12">
            <p className="font-mono text-xs text-muted-foreground">
              Paket harga sedang disiapkan. Silakan cek kembali nanti.
            </p>
          </div>
        )}

        {/* Loaded state with data */}
        {plans && plans.length > 0 && (
          <>
            {/* Desktop: Grid */}
            <div className="col-span-16 hidden md:grid grid-cols-16 gap-4 items-stretch">
              {plans.map((plan, index) => (
                <div
                  key={plan._id}
                  className={
                    index === 1
                      ? "md:col-span-6"
                      : "md:col-span-5"
                  }
                >
                  <PricingCard plan={plan} />
                </div>
              ))}
            </div>

            {/* Mobile: Carousel */}
            <PricingCarousel plans={plans} />
          </>
        )}
      </div>
    </section>
  )
}
