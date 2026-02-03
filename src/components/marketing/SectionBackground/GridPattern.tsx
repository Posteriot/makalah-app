"use client"

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
 */
export function GridPattern({
  size = 48,
  color = "rgba(148, 163, 184, 0.15)",
  className
}: GridPatternProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none",
        className
      )}
      style={{
        backgroundImage: `
          linear-gradient(${color} 1px, transparent 1px),
          linear-gradient(90deg, ${color} 1px, transparent 1px)
        `.trim(),
        backgroundSize: `${size}px ${size}px`,
      }}
      aria-hidden="true"
    />
  )
}
