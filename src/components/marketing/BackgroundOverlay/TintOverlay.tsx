import { memo, useMemo } from "react"
import { cn } from "@/lib/utils"

interface TintOverlayProps {
  /** Intensity of the tint (0-100) */
  intensity?: number
  /** Additional className */
  className?: string
}

/**
 * TintOverlay - Dark/Light mode tint control
 *
 * Provides a semi-transparent overlay that adapts to theme.
 * Dark mode: darkens with black overlay
 * Light mode: lightens with white overlay
 *
 * Performance: Wrapped in React.memo to prevent re-renders.
 * Opacity is memoized to avoid recalculation.
 */
export const TintOverlay = memo(function TintOverlay({
  intensity = 20,
  className
}: TintOverlayProps) {
  // Memoize opacity calculation to prevent style object recreation
  const style = useMemo(() => ({ opacity: intensity / 100 }), [intensity])

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none",
        "bg-white dark:bg-black",
        className
      )}
      style={style}
      aria-hidden="true"
    />
  )
})
