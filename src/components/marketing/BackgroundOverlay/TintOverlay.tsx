"use client"

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
 */
export function TintOverlay({ intensity = 20, className }: TintOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none",
        "bg-black dark:bg-black",
        "light:bg-white",
        className
      )}
      style={{ opacity: intensity / 100 }}
      aria-hidden="true"
    />
  )
}
