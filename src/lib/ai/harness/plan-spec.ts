import { z } from "zod"

// ============================================================================
// CONSTANTS
// ============================================================================

export const PLAN_DATA_PART_TYPE = "plan-data-part" as const
export const PLAN_FENCE_OPEN = "```plan-spec"

/**
 * Regex to detect unfenced plan-spec YAML emitted by model without code fences.
 * Matches: "stage: <word>\nsummary: <text>\ntasks:\n" followed by task entries.
 * Used as safety net when model doesn't comply with fence instruction.
 */
export const UNFENCED_PLAN_REGEX = /(?:^|\n)(stage:\s*\w+\s*\nsummary:\s*.+\ntasks:\s*\n(?:\s*-\s*label:\s*.+\n\s*status:\s*(?:complete|in-progress|pending)\s*\n?)+)/g

// ============================================================================
// SCHEMA
// ============================================================================

export const planTaskSchema = z.object({
  label: z.string().min(1),
  status: z.enum(["complete", "in-progress", "pending"]),
})

export const planSpecSchema = z.object({
  stage: z.string().min(1),
  summary: z.string().min(1),
  tasks: z.array(planTaskSchema).min(1).max(10),
})

// ============================================================================
// TYPES
// ============================================================================

export type PlanSpec = z.infer<typeof planSpecSchema>
export type PlanTask = z.infer<typeof planTaskSchema>

export type PlanDataPart = {
  type: typeof PLAN_DATA_PART_TYPE
  data: { spec: PlanSpec }
}
