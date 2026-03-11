import { internalMutation } from "../_generated/server"

/**
 * Migration: Remove deprecated search-skill telemetry fields from aiTelemetry records.
 *
 * Old fields (removed from schema):
 *   - diversityWarning
 *   - sourcesScored
 *   - sourcesFiltered
 *   - sourcesPassedTiers
 *
 * Replaced by:
 *   - sourcesPassed
 *   - sourcesBlocked
 *
 * Run: npx convex run migrations/cleanupOldSearchSkillTelemetryFields
 */
export default internalMutation({
  args: {},
  handler: async ({ db }) => {
    const allRecords = await db
      .query("aiTelemetry")
      .collect()

    let patchedCount = 0

    for (const record of allRecords) {
      const raw = record as Record<string, unknown>

      const hasOldFields =
        "diversityWarning" in raw ||
        "sourcesScored" in raw ||
        "sourcesFiltered" in raw ||
        "sourcesPassedTiers" in raw

      if (!hasOldFields) continue

      // Derive new values from old data if not already set
      const sourcesPassed =
        (raw.sourcesPassed as number | undefined) ??
        ((raw.sourcesScored as number | undefined) ?? 0) -
          ((raw.sourcesFiltered as number | undefined) ?? 0)
      const sourcesBlocked =
        (raw.sourcesBlocked as number | undefined) ??
        (raw.sourcesFiltered as number | undefined) ??
        0

      await db.patch(record._id, {
        sourcesPassed: sourcesPassed > 0 ? sourcesPassed : undefined,
        sourcesBlocked: sourcesBlocked > 0 ? sourcesBlocked : undefined,
        // Remove old fields by setting to undefined
        diversityWarning: undefined,
        sourcesScored: undefined,
        sourcesFiltered: undefined,
        sourcesPassedTiers: undefined,
      } as never)

      patchedCount++
    }

    return { patchedCount, totalScanned: allRecords.length }
  },
})
