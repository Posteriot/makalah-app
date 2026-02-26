import { memo } from "react"
import { cn } from "@/lib/utils"

interface GridPatternProps {
  /** Additional className */
  className?: string
}

/**
 * GridPattern - Research grid overlay
 *
 * Creates a subtle grid pattern overlay.
 * Default: 48px cells with slate-400 lines at 15% opacity.
 *
 * Uses rgba() instead of color-mix() to avoid CSS minifier stripping
 * the space between color-stop value and position on mobile Safari.
 */
export const GridPattern = memo(function GridPattern({
  className
}: GridPatternProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 min-h-[100svh] md:min-h-full pointer-events-none border-b border-[rgba(159,159,159,0.15)]",
        "bg-[linear-gradient(rgba(159,159,159,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(159,159,159,0.15)_1px,transparent_1px)]",
        "bg-[length:48px_48px]",
        className
      )}
      aria-hidden="true"
    />
  )
})
