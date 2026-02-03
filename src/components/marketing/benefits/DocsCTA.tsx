import { SectionCTA } from "@/components/ui/section-cta"

/**
 * DocsCTA Component
 *
 * CTA button linking to documentation page
 */
export function DocsCTA() {
  return (
    <div className="flex justify-center mt-8">
      <SectionCTA href="/documentation">LIHAT DOKUMENTASI</SectionCTA>
    </div>
  )
}
