"use client"

import { cn } from "@/lib/utils"

interface AuroraBackgroundProps {
  /** Additional className for the container */
  className?: string
}

/**
 * AuroraBackground - Multi-color radial gradient background
 *
 * Creates 4 layered radial gradients with blur effect.
 * Adapts intensity for dark/light mode.
 *
 * Layer order: z-index -2 (behind everything)
 */
export function AuroraBackground({ className }: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        "absolute pointer-events-none",
        "-inset-[10%]", // Extend beyond container for blur bleed
        "[z-index:-2]",
        className
      )}
      style={{
        background: `
          radial-gradient(800px 700px at 80% 18%, rgba(232, 102, 9, 0.6) 0%, rgba(232, 102, 9, 0.6) 35%, transparent 60%),
          radial-gradient(700px 600px at 14% 14%, rgba(115, 185, 4, 0.5) 0%, rgba(115, 185, 4, 0.5) 30%, transparent 58%),
          radial-gradient(720px 550px at 20% 78%, rgba(25, 196, 156, 0.45) 0%, rgba(25, 196, 156, 0.45) 28%, transparent 56%),
          radial-gradient(650px 520px at 86% 82%, rgba(154, 131, 18, 0.55) 0%, rgba(154, 131, 18, 0.55) 25%, transparent 54%)
        `.trim().replace(/\s+/g, ' '),
      }}
      aria-hidden="true"
    >
      {/* Dark mode: intense blur */}
      <div
        className={cn(
          "absolute inset-0",
          "dark:opacity-100 dark:[filter:blur(60px)_saturate(2.0)_brightness(1.4)]",
          "opacity-50 [filter:blur(80px)_saturate(1.2)_brightness(1.1)]"
        )}
        style={{
          background: 'inherit',
          backgroundAttachment: 'inherit'
        }}
      />
    </div>
  )
}
