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
        "inline-flex items-center justify-center gap-2 rounded-action border-main border-[color:var(--slate-950)] bg-[color:var(--slate-950)] px-4 py-2 text-signal text-[11px] font-bold text-[color:var(--slate-50)] transition-colors hover:bg-[color:var(--slate-900)]",
        "dark:border-[color:var(--slate-50)] dark:bg-[color:var(--slate-50)] dark:text-[color:var(--slate-950)] dark:hover:bg-[color:var(--slate-200)]",
        "focus-ring",
        isLoading && "pointer-events-none opacity-70",
        className
      )}
      aria-busy={isLoading}
    >
      {children}
    </Link>
  )
}
