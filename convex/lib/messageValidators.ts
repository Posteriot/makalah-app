import { v } from "convex/values"

export const planSnapshotValidator = v.object({
  stage: v.string(),
  summary: v.optional(v.string()),
  tasks: v.array(v.object({
    label: v.string(),
    status: v.string(),
  })),
})
