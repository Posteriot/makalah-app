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
      className="badge-link inline-block mb-6"
    >
      <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-zinc-900/80 dark:bg-black/30 backdrop-blur-sm border border-[rgba(232,102,9,0.5)] dark:border-[rgba(232,102,9,0.4)] transition-all duration-300 hover:translate-y-[-2px] hover:bg-zinc-900/90 dark:hover:bg-black/40 hover:border-[rgba(232,102,9,0.7)] dark:hover:border-[rgba(232,102,9,0.6)] hover:shadow-[0_0_20px_rgba(232,102,9,0.25)]">
        {/* Animated orange dot */}
        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-[badge-dot-blink_1.5s_ease-in-out_infinite]" />
        {/* Badge text */}
        <span className="text-[13px] font-medium tracking-wide text-white/95">
          Anda Pawang, Ai Tukang
        </span>
      </div>
    </Link>
  )
}
