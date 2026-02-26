import { memo } from "react"
import { cn } from "@/lib/utils"

interface DiagonalStripesProps {
  /** Additional className */
  className?: string
}

/**
 * DiagonalStripes - 45° repeating stripe pattern
 *
 * Dark mode: light stripes (white at 12% opacity)
 * Light mode: dark stripes (black at 10% opacity)
 * 1px width, 8px gap, 45° angle
 *
 * Uses rgba() instead of color-mix() to avoid CSS minifier stripping
 * the space between color-stop value and position (e.g. `%)0` → `%) 0`),
 * which causes broken rendering on mobile Safari.
 */
export const DiagonalStripes = memo(function DiagonalStripes({
  className
}: DiagonalStripesProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 min-h-[100svh] md:min-h-full pointer-events-none z-0",
        // Dark mode: light stripes
        "dark:[background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.12)_0,rgba(255,255,255,0.12)_1px,transparent_1px,transparent_8px)]",
        // Light mode: dark stripes
        "[background-image:repeating-linear-gradient(45deg,rgba(0,0,0,0.10)_0,rgba(0,0,0,0.10)_1px,transparent_1px,transparent_8px)]",
        className
      )}
      aria-hidden="true"
    />
  )
})
