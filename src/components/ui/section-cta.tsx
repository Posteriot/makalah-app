import Link from "next/link"
import { cn } from "@/lib/utils"

interface SectionCTAProps {
  href: string
  children: React.ReactNode
  className?: string
  isLoading?: boolean
}

/**
 * SectionCTA - Reusable CTA button untuk marketing sections
 *
 * Mechanical Grace CTA: Standard border + Slate surface + solid hover.
 *
 * @example
 * <SectionCTA href="/sign-up">AYO MULAI</SectionCTA>
 * <SectionCTA href="/pricing">LIHAT DETAIL PAKET</SectionCTA>
 */
export function SectionCTA({ href, children, className, isLoading }: SectionCTAProps) {
  return (
    <Link
      href={href}
      className={cn(
        // Structure for stripes animation
        "group relative overflow-hidden",
        // Base layout
        "inline-flex items-center justify-center gap-2 rounded-action px-2 py-1",
        // Typography
        "text-signal text-sm font-medium",
        // Light mode diam: dark button
        "border border-transparent bg-[color:var(--slate-800)] text-[color:var(--slate-100)]",
        // Light mode hover: text & border darken
        "hover:text-[color:var(--slate-800)] hover:border-[color:var(--slate-600)]",
        // Dark mode diam: light button
        "dark:bg-[color:var(--slate-100)] dark:text-[color:var(--slate-800)]",
        // Dark mode hover: text & border lighten
        "dark:hover:text-[color:var(--slate-100)] dark:hover:border-[color:var(--slate-400)]",
        // Transition & focus
        "transition-colors focus-ring",
        // Loading state
        isLoading && "pointer-events-none opacity-70",
        className
      )}
      aria-busy={isLoading}
    >
      {/* Diagonal stripes overlay - slides in on hover */}
      <span
        className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
        aria-hidden="true"
      />
      {/* Text content - stays above stripes */}
      <span className="relative z-10">{children}</span>
    </Link>
  )
}
