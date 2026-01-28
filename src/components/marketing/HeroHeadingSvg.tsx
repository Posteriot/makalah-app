"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useTheme } from "next-themes"
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

  const theme = mounted ? resolvedTheme : "dark"
  const src = theme === "light" ? "/hero-heading-light.svg" : "/hero-heading-dark.svg"

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
