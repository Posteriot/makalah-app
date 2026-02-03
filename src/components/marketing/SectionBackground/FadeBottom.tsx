"use client"

import { cn } from "@/lib/utils"

interface FadeBottomProps {
  /** Height of fade area in pixels */
  height?: number
  /** Additional className */
  className?: string
}

/**
 * FadeBottom - Bottom gradient fade to background
 *
 * Creates smooth transition from section to next section.
 * Uses CSS variable --background for theme-aware fade.
 *
 * Layer order: z-index 1 (above patterns, below content)
 */
export function FadeBottom({ height = 120, className }: FadeBottomProps) {
  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 pointer-events-none z-[1]",
        "[background:linear-gradient(to_bottom,transparent,var(--background))]",
        className
      )}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    />
  )
}
