"use client"

import { cn } from "@/lib/utils"

interface DiagonalStripesProps {
  /** Enable fade mask from top to bottom */
  withFadeMask?: boolean
  /** Additional className */
  className?: string
}

/**
 * DiagonalStripes - 45° repeating stripe pattern
 *
 * Dark mode: white stripes (rgba 255,255,255 at 12% opacity)
 * Light mode: dark stripes (rgba 0,0,0 at 10% opacity)
 * 1px width, 8px gap, 45° angle
 * Optional fade mask from top to bottom.
 */
export function DiagonalStripes({
  withFadeMask = true,
  className
}: DiagonalStripesProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none z-0",
        // Dark mode: white stripes
        "dark:[background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.12)_0,rgba(255,255,255,0.12)_1px,transparent_1px,transparent_8px)]",
        // Light mode: dark stripes
        "[background-image:repeating-linear-gradient(45deg,rgba(0,0,0,0.10)_0,rgba(0,0,0,0.10)_1px,transparent_1px,transparent_8px)]",
        className
      )}
      style={{
        ...(withFadeMask && {
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 90%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 90%)",
        }),
      }}
      aria-hidden="true"
    />
  )
}
