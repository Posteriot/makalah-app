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
 * Amber signal dot + uppercase text pada surface Slate.
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
        "inline-flex w-fit items-center gap-2 rounded-badge px-2.5 py-1",
        "bg-[color:var(--emerald-600)] text-[color:var(--slate-50)]",
        href &&
          "group transition-colors duration-300 hover:bg-[color:var(--emerald-900)]",
        className
      )}
    >
      {/* Animated amber dot */}
      <span className="h-2 w-2 rounded-full bg-[color:var(--amber-500)] shadow-[0_0_6px_var(--amber-500)] animate-pulse" />
      {/* Badge text */}
      <span
        className={cn(
          "text-signal text-[10px] font-bold",
          href && "group-hover:text-[color:var(--slate-100)]"
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
