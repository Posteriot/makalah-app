"use client"

import { cn } from "@/lib/utils"

interface VignetteOverlayProps {
  /** Additional className */
  className?: string
}

/**
 * VignetteOverlay - Edge darkening effect
 *
 * Creates radial gradient that darkens edges.
 * Lighter in light mode, stronger in dark mode.
 *
 * Layer order: z-index -1 (above aurora, below content)
 */
export function VignetteOverlay({ className }: VignetteOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none",
        "[z-index:-1]",
        // Dark mode: stronger vignette
        "dark:[background:radial-gradient(circle_at_50%_40%,rgba(0,0,0,0.15)_20%,rgba(0,0,0,0.35)_55%,rgba(0,0,0,0.55)_100%)]",
        // Light mode: subtle vignette
        "[background:radial-gradient(circle_at_50%_40%,transparent_30%,rgba(0,0,0,0.05)_60%,rgba(0,0,0,0.12)_100%)]",
        className
      )}
      aria-hidden="true"
    />
  )
}
