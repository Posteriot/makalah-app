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
 * Menggunakan btn-brand styling. Parent handle wrapper/layout.
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
        "btn-brand text-signal text-[12px] font-bold rounded-action hover-slash px-3 py-1.5 inline-flex items-center justify-center",
        className
      )}
      aria-busy={isLoading}
    >
      {children}
    </Link>
  )
}
