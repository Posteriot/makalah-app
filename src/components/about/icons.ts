/**
 * About Page Icon Utilities
 *
 * Helper functions and icon mapping for about page components.
 * Section components can use getIcon() to convert icon name strings
 * to React components for passing to ContentCard or other components.
 */

import {
  LightBulb,
  ChatBubble,
  ChatLines,
  MessageText,
  ShieldCheck,
  Link,
  WarningTriangle,
  Book,
  Search,
  Sparks,
  ShareIos,
  Suitcase,
  Mail,
} from "iconoir-react"

/**
 * Map of icon names to their Iconoir React components.
 * Add new icons here as needed for about page content.
 *
 * Migration mapping (Lucide → Iconoir):
 * - Lightbulb → LightBulb
 * - MessageCircle → ChatBubble
 * - MessageSquareQuote → ChatLines
 * - MessageSquareText → MessageText
 * - ShieldCheck → ShieldCheck
 * - Link, Link2 → Link
 * - AlertTriangle → WarningTriangle
 * - BookOpen → Book
 * - Search → Search
 * - Sparkles → Sparks
 * - Share2 → ShareIos
 * - Briefcase → Suitcase
 * - Mail → Mail
 */
export const ICON_MAP = {
  // Keep old names as keys for backward compatibility with data.ts
  Lightbulb: LightBulb,
  MessageCircle: ChatBubble,
  MessageSquareQuote: ChatLines,
  MessageSquareText: MessageText,
  ShieldCheck,
  Link,
  Link2: Link,
  AlertTriangle: WarningTriangle,
  BookOpen: Book,
  Search,
  Sparkles: Sparks,
  Share2: ShareIos,
  Briefcase: Suitcase,
  Mail,
} as const

/** Type for valid icon names in the map */
export type IconName = keyof typeof ICON_MAP

/**
 * Get an Iconoir icon component by name.
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
