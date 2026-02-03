import { memo, useMemo } from "react"
import { cn } from "@/lib/utils"

interface DottedPatternProps {
  /** Dot spacing in pixels */
  spacing?: number
  /** Enable radial fade mask from center */
  withRadialMask?: boolean
  /** Additional className */
  className?: string
}

/**
 * DottedPattern - Radial dot grid overlay
 *
 * Creates a subtle dot pattern.
 * Dark mode: white dots (12% opacity)
 * Light mode: dark dots (12% opacity)
 * Default: 24px spacing, 1px dots
 * Optional radial mask fading from center.
 *
 * Performance: Wrapped in React.memo with memoized style.
 * will-change hint for mask-image compositing.
 */
export const DottedPattern = memo(function DottedPattern({
  spacing = 24,
  withRadialMask = true,
  className
}: DottedPatternProps) {
  // Memoize combined style object
  const style = useMemo(() => ({
    backgroundSize: `${spacing}px ${spacing}px`,
    ...(withRadialMask && {
      maskImage: "radial-gradient(circle at center, black 50%, transparent 100%)",
      WebkitMaskImage: "radial-gradient(circle at center, black 50%, transparent 100%)",
    }),
  }), [spacing, withRadialMask])

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none z-[1]",
        // Dark mode: white dots
        "dark:[background-image:radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)]",
        // Light mode: dark dots
        "[background-image:radial-gradient(rgba(0,0,0,0.12)_1px,transparent_1px)]",
        // Hint browser to optimize mask compositing
        withRadialMask && "[will-change:mask-image]",
        className
      )}
      style={style}
      aria-hidden="true"
    />
  )
})
