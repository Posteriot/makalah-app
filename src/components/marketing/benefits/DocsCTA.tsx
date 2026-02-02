"use client"

import Link from "next/link"

/**
 * DocsCTA Component
 *
 * Secondary CTA button linking to documentation page
 * Inverted background: dark in light mode, light in dark mode (uses btn-brand)
 * Styling follows HeroCTA pattern
 * Includes wrapper with spacing (mt-8) and centering
 */
export function DocsCTA() {
  return (
    <div className="flex justify-center mt-8">
      <Link
        href="/documentation"
        className="btn-brand font-sans text-[12px] font-medium px-3 py-1.5 inline-flex items-center"
      >
        LIHAT DOKUMENTASI
      </Link>
    </div>
  )
}
