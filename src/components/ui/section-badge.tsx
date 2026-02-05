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
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-badge bg-[color:var(--emerald-500)]",
        href && "group transition-colors duration-300 hover:bg-[color:var(--emerald-800)]",
        className
      )}
    >
      {/* Animated amber dot */}
      <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-primary/40 animate-pulse" />
      {/* Badge text */}
      <span
        className={cn(
          "text-signal text-[10px] font-bold uppercase text-[color:var(--slate-900)]",
          href && "group-hover:text-[color:var(--slate-50)]"
        )}
      >
        {children}
      </span>
    </div>
  )

  if (href) {
    return <Link href={href}>{badgeContent}</Link>
  }

  return badgeContent
}
