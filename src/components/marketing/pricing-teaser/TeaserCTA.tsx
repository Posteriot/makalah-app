import Link from "next/link"

/**
 * TeaserCTA Component
 *
 * CTA button linking to full pricing page
 * Styling follows DocsCTA pattern (uses btn-brand)
 * Inverted background: dark in light mode, light in dark mode
 */
export function TeaserCTA() {
  return (
    <div className="flex justify-center mt-8">
      <Link
        href="/pricing"
        className="btn-brand font-sans text-[12px] font-medium px-3 py-1.5 inline-flex items-center"
      >
        LIHAT DETAIL PAKET
      </Link>
    </div>
  )
}
