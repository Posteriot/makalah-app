"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ContentCardProps {
  /** Main title of the card */
  title: string
  /** Card content - can be string or React nodes */
  children: React.ReactNode
  /** Optional icon component (ReactNode for flexibility) */
  icon?: React.ReactNode
  /** Optional subtitle/category text */
  subtitle?: string
  /** Additional class name for the card wrapper */
  className?: string
}

// =============================================================================
// CONTENT CARD COMPONENT
// =============================================================================

/**
 * ContentCard - A flexible card component for displaying content blocks.
 *
 * Used for various about page sections including:
 * - Manifesto points
 * - Problem items
 * - Feature highlights
 *
 * @example
 * ```tsx
 * import { Lightbulb } from "lucide-react"
 *
 * <ContentCard
 *   icon={<Lightbulb className="h-5 w-5" />}
 *   title="Fokus pada Inti"
 *   subtitle="Prinsip"
 * >
 *   Makalah bukan soal tampilan, tapi soal ide dan argumen yang kuat.
 * </ContentCard>
 * ```
 */
export function ContentCard({
  title,
  children,
  icon,
  subtitle,
  className,
}: ContentCardProps) {
  return (
    <div className={cn("content-card", className)}>
      <div className="card-content">
        {/* Icon container */}
        {icon && (
          <div className="card-icon-wrapper">
            <span className="card-icon">{icon}</span>
          </div>
        )}

        {/* Text content */}
        <div className="card-text">
          {subtitle && (
            <span className="card-subtitle">{subtitle}</span>
          )}
          <h3 className="card-title">{title}</h3>
          <div className="card-description">{children}</div>
        </div>
      </div>
    </div>
  )
}
