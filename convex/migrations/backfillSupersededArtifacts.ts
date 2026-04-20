import { internalMutation } from "../_generated/server"

/**
 * Migration: Backfill invalidatedAt on superseded artifact versions.
 *
 * Problem: createArtifactVersion previously did not invalidate the old version
 * when creating a new one. This left old versions visible in artifact lists
 * after rewind/cancel invalidated the newer version.
 *
 * Fix: For every artifact that has been superseded (another artifact has it as
 * parentId), set invalidatedAt if not already set.
 *
 * Run via: npx convex run migrations/backfillSupersededArtifacts
 *
 * Safe to run multiple times (idempotent — skips already-invalidated artifacts).
 */
export default internalMutation({
    args: {},
    handler: async (ctx) => {
        const allArtifacts = await ctx.db.query("artifacts").collect()

        // Build set of artifact IDs that have been superseded (some other artifact has them as parentId)
        const supersededIds = new Set<string>()
        for (const artifact of allArtifacts) {
            if (artifact.parentId) {
                supersededIds.add(String(artifact.parentId))
            }
        }

        const now = Date.now()
        let patched = 0
        let skipped = 0

        for (const artifact of allArtifacts) {
            if (supersededIds.has(String(artifact._id)) && !artifact.invalidatedAt) {
                await ctx.db.patch(artifact._id, { invalidatedAt: now })
                patched++
            } else if (supersededIds.has(String(artifact._id))) {
                skipped++
            }
        }

        console.log(`[MIGRATION] backfillSupersededArtifacts: patched=${patched} skipped=${skipped} total=${allArtifacts.length}`)
        return { patched, skipped, total: allArtifacts.length }
    },
})
