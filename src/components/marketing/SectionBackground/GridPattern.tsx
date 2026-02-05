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
 * Performance: Wrapped in React.memo.
 */
export const GridPattern = memo(function GridPattern({
  className
}: GridPatternProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none",
        "bg-[linear-gradient(color-mix(in_oklab,var(--slate-400),transparent_85%)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--slate-400),transparent_85%)_1px,transparent_1px)]",
        "bg-[length:48px_48px]",
        className
      )}
      aria-hidden="true"
    />
  )
})
