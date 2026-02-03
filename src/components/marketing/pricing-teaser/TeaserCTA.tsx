import { SectionCTA } from "@/components/ui/section-cta"

/**
 * TeaserCTA Component
 *
 * CTA button linking to full pricing page
 */
export function TeaserCTA() {
  return (
    <div className="flex justify-center mt-8">
      <SectionCTA href="/pricing">LIHAT DETAIL PAKET</SectionCTA>
    </div>
  )
}
