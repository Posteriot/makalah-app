import { memo } from "react"
import { cn } from "@/lib/utils"

interface VignetteOverlayProps {
  /** Additional className */
  className?: string
}

/**
 * VignetteOverlay - Edge darkening effect
 *
 * Creates radial gradient that darkens edges.
 * Theme-agnostic: renders identically in dark/light mode.
 * Use TintOverlay as sibling for brightness adaptation.
 *
 * Layer order: z-index -1 (above aurora, below TintOverlay)
 *
 * Performance: Wrapped in React.memo to prevent re-renders
 * when parent state changes.
 */
export const VignetteOverlay = memo(function VignetteOverlay({
  className
}: VignetteOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none",
        "[z-index:-1]",
        // Theme-agnostic vignette (~20% opacity middle ground)
        "[background:radial-gradient(circle_at_50%_40%,transparent_25%,rgba(0,0,0,0.12)_55%,rgba(0,0,0,0.25)_100%)]",
        className
      )}
      aria-hidden="true"
    />
  )
})
