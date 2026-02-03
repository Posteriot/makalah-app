"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface SectionBadgeProps {
  children: React.ReactNode
  href?: string
  className?: string
}

/**
 * SectionBadge - Reusable badge untuk marketing sections
 *
 * Animated orange dot + uppercase text pada background teal.
 * Optional href untuk jadikan link dengan hover effects.
 *
 * @example
 * <SectionBadge>Kenapa Makalah AI?</SectionBadge>
 * <SectionBadge href="/about">Anda Pawang, Ai Tukang</SectionBadge>
 */
export function SectionBadge({ children, href, className }: SectionBadgeProps) {
  const badgeContent = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2a7d6e]",
        href && "transition-all duration-300 hover:translate-y-[-2px] hover:bg-[#339485]",
        className
      )}
    >
      {/* Animated orange dot */}
      <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-[badge-dot-blink_1.5s_ease-in-out_infinite]" />
      {/* Badge text */}
      <span className="text-[10px] font-medium tracking-wide text-white/95 uppercase">
        {children}
      </span>
    </div>
  )

  if (href) {
    return <Link href={href}>{badgeContent}</Link>
  }

  return badgeContent
}
