/**
 * About Page Icon Utilities
 *
 * Helper functions and icon mapping for about page components.
 * Section components can use getIcon() to convert icon name strings
 * to React components for passing to ContentCard or other components.
 */

import {
  Lightbulb,
  MessageCircle,
  MessageSquareQuote,
  MessageSquareText,
  ShieldCheck,
  Link,
  Link2,
  AlertTriangle,
  BookOpen,
  Search,
  Sparkles,
  Share2,
  Briefcase,
  Mail,
} from "lucide-react"

/**
 * Map of icon names to their Lucide React components.
 * Add new icons here as needed for about page content.
 */
export const ICON_MAP = {
  Lightbulb,
  MessageCircle,
  MessageSquareQuote,
  MessageSquareText,
  ShieldCheck,
  Link,
  Link2,
  AlertTriangle,
  BookOpen,
  Search,
  Sparkles,
  Share2,
  Briefcase,
  Mail,
} as const

/** Type for valid icon names in the map */
export type IconName = keyof typeof ICON_MAP

/**
 * Get a Lucide icon component by name.
 *
 * @param iconName - The name of the icon (must match ICON_MAP key)
 * @returns The icon component or null if not found
 *
 * @example
 * ```tsx
 * const Icon = getIcon("Lightbulb")
 * if (Icon) {
 *   return <ContentCard icon={<Icon className="h-4 w-4" />} ... />
 * }
 * ```
 */
export function getIcon(iconName: string) {
  return ICON_MAP[iconName as IconName] || null
}
