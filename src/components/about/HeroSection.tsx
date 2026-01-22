/**
 * HeroSection Component for About Page
 *
 * Displays the hero section with:
 * - Heading: "AI Yang Menumbuhkan Pikiran"
 * - Subheading describing the mission
 * - CTA button linking to Gmail compose
 *
 * Uses existing CSS classes:
 * - hero-section: Base padding and layout (NOT full viewport)
 * - hero-vivid: Aurora gradient background
 * - hero-grid-thin: Research grid overlay
 */

import { HERO_CONTENT } from "./data"

export function HeroSection() {
  return (
    <section className="hero-section hero-vivid hero-grid-thin">
      <div className="hero-content">
        {/* Heading */}
        <h1 className="hero-heading">{HERO_CONTENT.heading}</h1>

        {/* Subheading */}
        <p className="hero-subheading">{HERO_CONTENT.subheading}</p>

        {/* CTA Button */}
        <a
          href={HERO_CONTENT.ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-success hero-cta"
        >
          {HERO_CONTENT.ctaText}
        </a>
      </div>

      {/* Bottom Fade Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-[120px] bg-gradient-to-b from-transparent to-background pointer-events-none" />
    </section>
  )
}
