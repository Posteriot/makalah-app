import { cn } from "@/lib/utils"

type HeroHeadingSvgProps = {
  className?: string
}

/**
 * HeroHeadingSvg - SVG heading with theme-aware colors
 * Uses CSS variables for theme switching to avoid hydration issues
 */
export function HeroHeadingSvg({ className }: HeroHeadingSvgProps) {
  return (
    <span
      className={cn("block w-full max-w-[720px] h-auto", className)}
      aria-hidden="true"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 260.23 97.97"
        className="w-full h-auto max-h-[35vh] object-contain lg:max-h-none"
        style={{
          fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
          fontSize: "31.24px",
          fontWeight: 500,
          letterSpacing: "-0.05em",
        }}
      >
        {/* Theme-aware text color via CSS variable */}
        <text x="1.11" y="28.48" className="fill-foreground">
          Ngobrol
          <tspan className="fill-[#ee4036]">+</tspan>
          Riset
        </text>
        <text x="1.11" y="58.48" className="fill-foreground">
          <tspan className="fill-[#ee4036]">+</tspan>
          Brainstorming
        </text>
        <text x="1.11" y="88.48" className="fill-foreground">
          <tspan className="fill-[#ee4036]">=</tspan>
          Paper
          <tspan className="fill-[#ee4036]">_</tspan>
          Akademik
        </text>
      </svg>
    </span>
  )
}
