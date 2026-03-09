import Image from "next/image"
import { cn } from "@/lib/utils"

export function HeroResearchMock() {
  return (
    <div
      className={cn(
        "hidden md:block absolute w-full transition-all duration-300 rounded-md",
        "shadow-lg",
        "z-10 top-1/2 -translate-y-1/2 scale-[0.88] -translate-x-[60px]"
      )}
    >
      <Image
        src="/images/hero-paper-session-mock.png"
        alt="Mockup sesi paper Makalah AI"
        width={769}
        height={768}
        className="h-auto w-full rounded-md"
        priority
        loading="eager"
      />
    </div>
  )
}
