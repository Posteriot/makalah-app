import { memo, useMemo } from "react"
import { cn } from "@/lib/utils"

interface GridPatternProps {
  /** Grid cell size in pixels */
  size?: number
  /** Line color (supports Tailwind arbitrary values) */
  color?: string
  /** Additional className */
  className?: string
}

/**
 * GridPattern - Research grid overlay
 *
 * Creates a subtle grid pattern overlay.
 * Default: 48px cells with slate-400 lines at 15% opacity.
 *
 * Performance: Wrapped in React.memo with memoized style object.
 */
export const GridPattern = memo(function GridPattern({
  size = 48,
  color = "rgba(148, 163, 184, 0.15)",
  className
}: GridPatternProps) {
  // Memoize style object to prevent recreation on parent re-renders
  const style = useMemo(() => ({
    backgroundImage: `
      linear-gradient(${color} 1px, transparent 1px),
      linear-gradient(90deg, ${color} 1px, transparent 1px)
    `.trim(),
    backgroundSize: `${size}px ${size}px`,
  }), [size, color])

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none",
        className
      )}
      style={style}
      aria-hidden="true"
    />
  )
})
