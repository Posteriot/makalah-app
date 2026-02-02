import Image from "next/image"
import { cn } from "@/lib/utils"

type HeroHeadingSvgProps = {
  className?: string
}

/**
 * HeroHeadingSvg - SVG heading with theme-aware colors
 * Uses separate SVG files for light/dark mode
 */
export function HeroHeadingSvg({ className }: HeroHeadingSvgProps) {
  return (
    <span
      className={cn("block w-full max-w-[520px] h-auto", className)}
      aria-hidden="true"
    >
      {/* Dark mode heading (light text) */}
      <Image
        src="/heading-dark-mode.svg"
        alt="Ngobrol+Riset +Brainstorming +Kolaboratif =Paper_Akademik"
        width={520}
        height={246}
        className="hidden dark:block w-full h-auto max-h-[35vh] object-contain lg:max-h-none"
        priority
      />
      {/* Light mode heading (dark text) */}
      <Image
        src="/heading-light-mode.svg"
        alt="Ngobrol+Riset +Brainstorming +Kolaboratif =Paper_Akademik"
        width={520}
        height={246}
        className="block dark:hidden w-full h-auto max-h-[35vh] object-contain lg:max-h-none"
        priority
      />
    </span>
  )
}
