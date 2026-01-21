"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const PRICING_PLANS = [
  {
    id: "gratis",
    name: "Gratis",
    price: "Rp.0",
    unit: null,
    isDisabled: false,
    tagline: "Akses awal tanpa biaya untuk mengenal alur Makalah AI.",
    features: [
      "Eksplorasi alur penyunan hingga draft.",
      "Upgrade kapan saja lewat halaman harga.",
    ],
    cta: "Coba Gratis",
    ctaHref: "/sign-up",
    isHighlight: true,
  },
  {
    id: "bpp",
    name: "Bayar Per Tugas",
    price: "Rpxx.xxx",
    unit: "per paper",
    isDisabled: true,
    tagline: "Bayar sesuai kebutuhan untuk menyelesaikan satu paper setara 15 halaman A4.",
    features: [
      "Selesaikan satu makalah lengkap.",
      "Bayar hanya saat ada tugas saja.",
    ],
    cta: "Belum Aktif",
    ctaHref: null,
    isHighlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "Rpxxx.xxx",
    unit: "per bulan",
    isDisabled: true,
    tagline: "Langganan untuk penyusunan banyak paper akademik per bulan dengan diskusi agent tanpa batas.",
    features: [
      "Penyusunan hingga enam paper.",
      "Diskusi agent tanpa batas.",
      "Dukungan operasional prioritas.",
    ],
    cta: "Belum Aktif",
    ctaHref: null,
    isHighlight: false,
  },
]

function PricingCard({ plan }: { plan: (typeof PRICING_PLANS)[0] }) {
  return (
    <div
      className={cn(
        "pricing-card",
        plan.isHighlight && "pricing-card--highlight"
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
          {plan.cta}
        </Link>
      ) : (
        <button disabled className="btn-disabled pricing-cta">
          {plan.cta}
        </button>
      )}
    </div>
  )
}

function PricingCarousel() {
  const [activeSlide, setActiveSlide] = useState(0)

  return (
    <div className="pricing-carousel md:hidden">
      <div
        className="carousel-track"
        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
      >
        {PRICING_PLANS.map((plan) => (
          <div key={plan.id} className="carousel-slide">
            <PricingCard plan={plan} />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="carousel-dots">
        {PRICING_PLANS.map((_, index) => (
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

export function PricingSection() {
  return (
    <section className="pricing-section" id="pricing">
      <div className="section-container">
        <h2 className="section-heading">
          Pilih paket penggunaan
          <br />
          sesuai kebutuhan
        </h2>

        <Link href="/pricing" className="pricing-link">
          Lihat detail paket lengkap
          <ChevronRight className="w-4 h-4" />
        </Link>

        {/* Desktop: Grid */}
        <div className="pricing-grid hidden md:grid">
          {PRICING_PLANS.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* Mobile: Carousel */}
        <PricingCarousel />
      </div>
    </section>
  )
}
