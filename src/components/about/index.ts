/**
 * About Page Components Barrel Export
 *
 * Re-exports all about page components and data constants
 */

// Data constants and types
export {
  // Types
  type ProblemItem,
  type AgentStatus,
  type AgentItem,
  type ContactContent,
  type CareerContactItem,
  // Problems
  PROBLEMS_ITEMS,
  // Agents
  AGENTS_ITEMS,
  AGENT_STATUS_LABELS,
  // Career & Contact
  CAREER_CONTACT_ITEMS,
} from "./data"

// Components
export {
  AccordionAbout,
  type AccordionAboutProps,
  type AccordionItemData,
  type AccordionBadgeVariant,
} from "./AccordionAbout"

// Section components
export { ManifestoSection } from "./ManifestoSection"
export { ManifestoSectionCMS } from "./ManifestoSectionCMS"
export { ProblemsSection } from "./ProblemsSection"
export { ProblemsSectionCMS } from "./ProblemsSectionCMS"
export { AgentsSection } from "./AgentsSection"
export { AgentsSectionCMS } from "./AgentsSectionCMS"
export { CareerContactSection } from "./CareerContactSection"
export { CareerContactSectionCMS } from "./CareerContactSectionCMS"
