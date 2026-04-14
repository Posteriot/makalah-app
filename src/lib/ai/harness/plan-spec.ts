import { z } from "zod"

// ============================================================================
// CONSTANTS
// ============================================================================

export const PLAN_DATA_PART_TYPE = "plan-data-part" as const
export const PLAN_FENCE_OPEN = "```plan-spec"
export const PLAN_FENCE_CLOSE = "```"

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
