import { Suspense } from "react"
import Link from "next/link"
import { UserPlus } from "lucide-react"
import { PawangBadge } from "@/components/marketing/PawangBadge"
import { ChatInputHeroMock } from "@/components/marketing/ChatInputHeroMock"
import { HeroResearchMock } from "@/components/marketing/HeroResearchMock"
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

      {/* Hero Section - Two-column flex layout */}
      <section className="hero-section hero-vivid hero-grid-thin">
        {/* Diagonal Stripes Background */}
        <div className="hero-diagonal-stripes" />

        {/* IDE Layout Lines (Decorative) */}
        <div className="hero-ide-line-y hidden lg:block" style={{ left: "calc(50% - 600px)" }} />
        <div className="hero-ide-line-y hidden lg:block" style={{ right: "calc(50% - 600px)" }} />

        {/* Hero Flex Container */}
        <div className="hero-flex">
          {/* Hero Left - Text Content */}
          <div className="hero-left">
            {/* Pawang Badge */}
            <PawangBadge />

            {/* Hero Heading */}
            <h1 className="hero-heading">
              Ngobrol<span className="text-brand">+</span>Riset
              <br />
              <span className="text-brand">+</span>Brainstorming
              <br />
              <span className="text-brand">=</span>Paper<span className="text-brand">_</span>Akademik
            </h1>

            {/* Subheading */}
            <p className="hero-subheading">
              Nggak perlu prompt ruwet. Ide apapun bakal diolah Agen Makalah AI menjadi paper utuh
            </p>

            {/* CTA Button */}
            <div className="hero-actions">
              <Link
                href="/auth/waiting-list"
                className="btn-brand text-base px-6 py-3 inline-flex items-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                <span>Daftarkan email untuk uji coba</span>
              </Link>
            </div>
          </div>

          {/* Hero Right - Layered Mockup */}
          <div className="hero-right">
            <div className="mockup-layered-container">
              {/* Back Layer - Research Code Mockup */}
              <HeroResearchMock />

              {/* Front Layer - Chat Input Mockup (animated) */}
              <ChatInputHeroMock />
            </div>
          </div>
        </div>

        {/* Bottom Fade */}
        <div className="hero-fade-bottom" />
      </section>

      {/* Benefits Section */}
      <BenefitsSection />

      {/* Pricing Section */}
      <PricingSection />
    </>
  )
}
