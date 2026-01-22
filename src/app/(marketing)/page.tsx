import { Suspense } from "react"
import Link from "next/link"
import { UserPlus } from "lucide-react"
import { PawangBadge } from "@/components/marketing/PawangBadge"
import { ChatInputHeroMock } from "@/components/marketing/ChatInputHeroMock"
import { BenefitsSection } from "@/components/marketing/BenefitsSection"
import { PricingSection } from "@/components/marketing/PricingSection"
import { WaitlistToast } from "@/components/marketing/WaitlistToast"

export default function MarketingHomePage() {
  return (
    <>
      {/* Waitlist Toast Handler */}
      <Suspense fallback={null}>
        <WaitlistToast />
      </Suspense>

      {/* Hero Section */}
      <section className="hero-section section-screen-with-header hero-vivid hero-grid-thin">
        <div className="hero-content">
          {/* Pawang Badge */}
          <PawangBadge />

          {/* Hero Heading */}
          <h1 className="font-hero text-[2.5rem] md:text-[4rem] font-bold leading-[1.1] tracking-[-0.02em]">
            Ngobrol<span className="text-brand">+</span>Riset
            <br />
            <span className="text-brand">+</span>Brainstorming
            <br />
            <span className="text-brand">=</span>Paper<span className="text-brand">_</span>Akademik
          </h1>

          {/* Subheading */}
          <p className="text-base md:text-lg text-muted-foreground max-w-[500px]">
            Nggak perlu prompt ruwet, ide apapun bakal diolah Agen Makalah Ai menjadi paper utuh
          </p>

          {/* CTA Button */}
          <Link
            href="/auth/waiting-list"
            className="btn-brand text-base px-6 py-3 inline-flex items-center gap-2 mt-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>Daftarkan email untuk uji coba</span>
          </Link>

          {/* ChatInputHeroMock (Desktop only) */}
          <ChatInputHeroMock />
        </div>

        {/* Bottom Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-[120px] bg-gradient-to-b from-transparent to-background pointer-events-none" />
      </section>

      {/* Benefits Section */}
      <BenefitsSection />

      {/* Pricing Section */}
      <PricingSection />
    </>
  )
}
