"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type HeroHeadingSvgProps = {
  className?: string
}

export function HeroHeadingSvg({ className }: HeroHeadingSvgProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Text color based on theme
  const textColor = mounted && resolvedTheme === "light" ? "#191921" : "#e6e7e8"
  const accentColor = "#ee4036" // Red for + = _

  return (
    <span className={cn("hero-heading-svg", className)} aria-hidden="true">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 260.23 97.97"
        className="hero-heading-svg__img"
        style={{
          fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
          fontSize: "31.24px",
          fontWeight: 500,
          letterSpacing: "-0.05em",
        }}
      >
        <text x="1.11" y="28.48" fill={textColor}>
          Ngobrol
          <tspan fill={accentColor}>+</tspan>
          Riset
        </text>
        <text x="1.11" y="58.48" fill={textColor}>
          <tspan fill={accentColor}>+</tspan>
          Brainstorming
        </text>
        <text x="1.11" y="88.48" fill={textColor}>
          <tspan fill={accentColor}>=</tspan>
          Paper
          <tspan fill={accentColor}>_</tspan>
          Akademik
        </text>
      </svg>
    </span>
  )
}
