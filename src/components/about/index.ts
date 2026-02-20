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
export { ManifestoSectionStatic } from "./ManifestoSectionStatic"
export { ManifestoSectionCMS } from "./ManifestoSectionCMS"
export { ProblemsSection } from "./ProblemsSection"
export { ProblemsSectionStatic } from "./ProblemsSectionStatic"
export { ProblemsSectionCMS } from "./ProblemsSectionCMS"
export { AgentsSection } from "./AgentsSection"
export { AgentsSectionStatic } from "./AgentsSectionStatic"
export { AgentsSectionCMS } from "./AgentsSectionCMS"
export { CareerContactSection } from "./CareerContactSection"
export { CareerContactSectionStatic } from "./CareerContactSectionStatic"
export { CareerContactSectionCMS } from "./CareerContactSectionCMS"
