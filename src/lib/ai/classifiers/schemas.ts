import { z } from "zod"

import type { SearchResponseMode } from "../web-search/reference-presentation"

// ============================================================================
// Domain 4: Exact Source Follow-Up Classifier
// ============================================================================

export const ExactSourceClassifierSchema = z.object({
  mode: z.enum([
    "force_inspect",
    "clarify",
    "none",
  ]).describe(
    "Follow-up mode for source inspection. " +
    "'force_inspect' = user wants exact details from a specific source. " +
    "'clarify' = ambiguous, ask which source. " +
    "'none' = not an exact-source request."
  ),

  sourceIntent: z.enum([
    "exact_detail",
    "summary",
    "continuation",
    "none",
  ]).describe(
    "Type of source-related intent. " +
    "'exact_detail' = title, author, date, verbatim quote. " +
    "'summary' = summarize, condense, conclude. " +
    "'continuation' = follow-up on previously discussed source. " +
    "'none' = no source-related intent detected."
  ),

  mentionedSourceHint: z.string().nullable().describe(
    "Source identifier mentioned by user (title fragment, domain name, author name). " +
    "Used as a hint for source matching logic. Null if no source mentioned."
  ),

  needsClarification: z.boolean().describe(
    "True if multiple sources could match or intent is ambiguous."
  ),

  confidence: z.number().describe(
    "Classifier confidence between 0 and 1."
  ),

  reason: z.string().describe(
    "Brief explanation of classification."
  ),
})

export type ExactSourceClassifierOutput = z.infer<typeof ExactSourceClassifierSchema>

// ============================================================================
// Domain 5: Search Response Mode Classifier
// ============================================================================

export const SearchResponseModeSchema = z.object({
  responseMode: z.enum([
    "synthesis",
    "reference_inventory",
  ]).describe(
    "How search results should be presented. " +
    "'synthesis' = integrate sources into a narrative answer. " +
    "'reference_inventory' = present sources as a structured list."
  ),

  confidence: z.number().describe(
    "Classifier confidence between 0 and 1."
  ),

  reason: z.string().describe(
    "Brief explanation of mode selection."
  ),
})

export type SearchResponseModeOutput = z.infer<typeof SearchResponseModeSchema>

// ============================================================================
// Domain 3: Route-Level Revision Intent Classifier
// ============================================================================

export const RevisionIntentSchema = z.object({
  hasRevisionIntent: z.boolean().describe(
    "True if user message expresses intent to modify, revise, or redo existing content."
  ),

  confidence: z.number().describe(
    "Classifier confidence between 0 and 1."
  ),

  reason: z.string().describe(
    "Brief explanation of classification."
  ),
})

export type RevisionIntentOutput = z.infer<typeof RevisionIntentSchema>

// ============================================================================
// Type Compatibility Assertions
// ============================================================================
// These compile-time checks verify that classifier output types are compatible
// with existing runtime types. If any assertion fails, TypeScript will error.

// SearchResponseModeOutput.responseMode must be assignable to SearchResponseMode
type _AssertSearchModeCompat = SearchResponseModeOutput["responseMode"] extends
  SearchResponseMode ? true : never
const _searchCheck: _AssertSearchModeCompat = true as const
void _searchCheck
