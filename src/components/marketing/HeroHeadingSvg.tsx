"use client"

import Image from "next/image"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type HeroHeadingSvgProps = {
  className?: string
}

export function HeroHeadingSvg({ className }: HeroHeadingSvgProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect -- Standard pattern for hydration safety */
  useEffect(() => {
    setMounted(true)
  }, [])

  // Render placeholder with same dimensions during SSR to prevent layout shift
  // Use dark as default since it matches the fallback theme
  const src = mounted && resolvedTheme === "light"
    ? "/hero-heading-light.svg"
    : "/hero-heading-dark.svg"

  return (
    <span className={cn("hero-heading-svg", className)} aria-hidden="true">
      <Image
        src={src}
        alt=""
        width={850}
        height={339}
        priority
        className="hero-heading-svg__img"
      />
    </span>
  )
}
