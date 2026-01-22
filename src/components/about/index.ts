/**
 * About Page Components Barrel Export
 *
 * Re-exports all about page components and data constants
 */

// Data constants and types
export {
  // Types
  type ManifestoContent,
  type ProblemItem,
  type AgentStatus,
  type AgentItem,
  type ContactContent,
  type CareerContactItem,
  // Hero
  HERO_CONTENT,
  // Manifesto
  MANIFESTO_CONTENT,
  // Problems
  PROBLEMS_ITEMS,
  // Agents
  AGENTS_ITEMS,
  AGENT_STATUS_LABELS,
  // Career & Contact
  CAREER_CONTACT_ITEMS,
  // Section headings
  SECTION_HEADINGS,
} from "./data"

// Icon utilities
export { ICON_MAP, getIcon, type IconName } from "./icons"

// Components
export {
  AccordionAbout,
  type AccordionAboutProps,
  type AccordionItemData,
  type AccordionBadgeVariant,
} from "./AccordionAbout"

export { ContentCard, type ContentCardProps } from "./ContentCard"

// Section components
export { HeroSection } from "./HeroSection"
export { ManifestoSection } from "./ManifestoSection"
export { ProblemsSection } from "./ProblemsSection"
export { AgentsSection } from "./AgentsSection"
export { CareerContactSection } from "./CareerContactSection"
