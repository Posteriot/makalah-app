"use client"

import Link from "next/link"

/**
 * HeroDocsCTA Component
 *
 * Secondary CTA button linking to documentation page
 */
export function HeroDocsCTA() {
  return (
    <Link
      href="/documentation"
      className="btn-outline font-sans text-[12px] font-medium px-3 py-1.5 inline-flex items-center"
    >
      LIHAT DOKUMENTASI
    </Link>
  )
}
