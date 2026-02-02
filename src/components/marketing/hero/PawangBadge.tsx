"use client"

import Link from "next/link"

/**
 * PawangBadge - Hero badge linking to About page
 * Displays "Anda Pawang, Ai Tukang" tagline with animated blinking orange dot
 * Theme-aware: dark bg + light text in both modes for strong visibility
 */
export function PawangBadge() {
  return (
    <Link
      href="/about"
      className="inline-block mb-[18px] lg:mb-0"
    >
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2a7d6e] transition-all duration-300 hover:translate-y-[-2px] hover:bg-[#339485]">
        {/* Animated orange dot */}
        <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-[badge-dot-blink_1.5s_ease-in-out_infinite]" />
        {/* Badge text */}
        <span className="text-[10px] font-medium tracking-wide text-white/95 uppercase">
          Anda Pawang, Ai Tukang
        </span>
      </div>
    </Link>
  )
}
