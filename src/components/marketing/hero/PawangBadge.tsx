import { SectionBadge } from "@/components/ui/section-badge"

/**
 * PawangBadge - Hero badge linking to About page
 * Displays "Anda Pawang, Ai Tukang" tagline with animated blinking orange dot
 */
export function PawangBadge() {
  return (
    <SectionBadge href="/about" className="mb-[18px] lg:mb-0">
      Anda Pawang, Ai Tukang
    </SectionBadge>
  )
}
