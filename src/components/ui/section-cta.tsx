import Link from "next/link"
import { cn } from "@/lib/utils"

interface SectionCTAProps {
  href?: string
  children: React.ReactNode
  className?: string
  isLoading?: boolean
  target?: React.HTMLAttributeAnchorTarget
  rel?: string
  onClick?: () => void
  type?: "button" | "submit" | "reset"
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
export function SectionCTA({
  href,
  children,
  className,
  isLoading,
  target,
  rel,
  onClick,
  type = "button",
}: SectionCTAProps) {
  const classes = cn(
    // Structure for stripes animation
    "group relative overflow-hidden",
    // Base layout
    "inline-flex items-center justify-center gap-2 rounded-action px-2 py-1",
    // Typography
    "text-signal text-xs font-medium uppercase tracking-widest",
    // Light mode diam: dark button
    "border border-transparent bg-[color:var(--core-cta-bg)] text-[color:var(--core-cta-fg)]",
    // Light mode hover: text & border darken
    "hover:text-[color:var(--core-cta-hover-fg)] hover:border-[color:var(--core-cta-hover-border)]",
    // Transition & focus
    "transition-colors focus-ring",
    // Keep text and icon aligned in one line
    "whitespace-nowrap [&_svg]:shrink-0 [&_svg]:self-center",
    // Loading state
    isLoading && "pointer-events-none opacity-70",
    className
  )

  const content = (
    <>
      {/* Diagonal stripes overlay - slides in on hover */}
      <span
        className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
        aria-hidden="true"
      />
      {/* Text content - stays above stripes */}
      <span className="relative z-10 inline-flex items-center gap-2 whitespace-nowrap">{children}</span>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        target={target}
        rel={rel}
        className={classes}
        aria-busy={isLoading}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={classes}
      aria-busy={isLoading}
      disabled={isLoading}
    >
      {content}
    </button>
  )
}
