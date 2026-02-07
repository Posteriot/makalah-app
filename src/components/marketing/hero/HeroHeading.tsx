import { HeroHeadingSvg } from "@/components/marketing/hero/HeroHeadingSvg"

/**
 * HeroHeading Component
 *
 * Main hero heading with accessible screen reader text and SVG display
 */
export function HeroHeading() {
  return (
    <h1 className="text-[0px] mt-4 leading-[0] w-full">
      <span className="sr-only">
        Ngobrol+Riset+Brainstorming=Paper_Akademik
      </span>
      <HeroHeadingSvg />
    </h1>
  )
}
