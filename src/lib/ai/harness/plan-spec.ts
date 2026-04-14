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

/**
 * Enforce plan immutability: if a persisted plan already exists,
 * the new plan must have the same task count. Only status changes
 * are allowed. If task count differs, merge statuses from the new
 * plan onto the existing plan's task structure.
 *
 * Returns the plan to persist (original if first emission, merged if locked).
 */
export function enforcePlanImmutability(
  newPlan: PlanSpec,
  existingPlan: PlanSpec | undefined,
  stage: string,
): PlanSpec {
  if (!existingPlan?.tasks?.length) {
    // First emission — accept as-is, this becomes the locked structure
    return newPlan
  }

  if (newPlan.tasks.length === existingPlan.tasks.length) {
    // Same count — accept status updates, preserve labels from existing
    return {
      ...newPlan,
      tasks: existingPlan.tasks.map((existing, i) => ({
        label: existing.label,
        status: newPlan.tasks[i]?.status ?? existing.status,
      })),
    }
  }

  // Task count changed — model violated immutability.
  // Merge: keep existing structure, apply status updates by best-match index.
  console.warn(
    `[PLAN-IMMUTABILITY] rejected task mutation: ${existingPlan.tasks.length} → ${newPlan.tasks.length} tasks (stage=${stage}). Keeping existing structure with status updates.`
  )
  return {
    ...existingPlan,
    tasks: existingPlan.tasks.map((existing, i) => ({
      label: existing.label,
      // Use new plan's status if index exists, otherwise keep existing
      status: i < newPlan.tasks.length ? newPlan.tasks[i].status : existing.status,
    })),
  }
}
