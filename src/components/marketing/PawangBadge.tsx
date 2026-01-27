"use client"

import Link from "next/link"

/**
 * PawangBadge - Hero badge linking to About page
 * Displays "Anda Pawang, Ai Tukang" tagline with animated dot
 */
export function PawangBadge() {
  return (
    <Link
      href="/about"
      className="badge-link inline-block mb-6"
    >
      <div className="badge-group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[rgba(232,102,9,0.1)] border border-[rgba(232,102,9,0.2)] transition-all duration-300 hover:translate-y-[-2px] hover:bg-[rgba(232,102,9,0.15)] hover:border-[rgba(232,102,9,0.4)] hover:shadow-[0_0_15px_rgba(232,102,9,0.2)]">
        <span className="badge-dot w-1.5 h-1.5 rounded-full bg-[var(--brand-orange)] shadow-[0_0_6px_var(--brand-orange)]" />
        <span className="badge-text text-[11px] font-bold tracking-[0.2em] text-[var(--luxe-zinc-400)] uppercase">
          Anda Pawang, Ai Tukang
        </span>
      </div>
    </Link>
  )
}
