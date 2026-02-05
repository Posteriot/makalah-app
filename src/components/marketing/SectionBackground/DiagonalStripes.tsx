import { memo } from "react"
import { cn } from "@/lib/utils"

interface DiagonalStripesProps {
  /** Additional className */
  className?: string
}

/**
 * DiagonalStripes - 45° repeating stripe pattern
 *
 * Dark mode: light stripes (slate-50 at 12% opacity)
 * Light mode: dark stripes (slate-900 at 10% opacity)
 * 1px width, 8px gap, 45° angle
 * Performance: Wrapped in React.memo with memoized style.
 */
export const DiagonalStripes = memo(function DiagonalStripes({
  className
}: DiagonalStripesProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none z-0",
        // Dark mode: light stripes
        "dark:[background-image:repeating-linear-gradient(45deg,color-mix(in_oklab,var(--slate-50),transparent_88%)_0,color-mix(in_oklab,var(--slate-50),transparent_88%)_1px,transparent_1px,transparent_8px)]",
        // Light mode: dark stripes
        "[background-image:repeating-linear-gradient(45deg,color-mix(in_oklab,var(--slate-900),transparent_90%)_0,color-mix(in_oklab,var(--slate-900),transparent_90%)_1px,transparent_1px,transparent_8px)]",
        className
      )}
      aria-hidden="true"
    />
  )
})
