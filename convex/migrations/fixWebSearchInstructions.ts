import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import { STAGE_SCOPE_VALUES } from "../stageSkills/constants"

/**
 * Migration: Fix web search instructions in DB stage skills.
 *
 * Problems fixed:
 * 1. "orchestrator detects/executes automatically" causes deadlock —
 *    model says "please wait" but user must send a message for next turn
 * 2. Indonesian examples in English-policy instructions
 *
 * Run dry-run first:
 *   npx convex run migrations:fixWebSearchInstructions
 *
 * Then execute:
 *   npx convex run migrations:fixWebSearchInstructions --args '{"execute": true}'
 *
 * Guard: Only patches skills that contain the problematic patterns.
 */

// Patterns to find and replace
const REPLACEMENTS: Array<{ find: RegExp; replace: string }> = [
  // Fix active search: replace orchestrator-detects pattern with ask-user pattern
  {
    find: /express your search\s*\n?intent clearly in your response \(e\.g\., "Saya akan mencari[^"]*"\s*(?:or\s*\n?"[^"]*"\s*)?\)\.\s*The orchestrator detects\s*(?:this\s*)?intent and\s*\n?\s*executes (?:web )?search automatically in the next turn\./gi,
    replace: `express your search intent clearly in your response (e.g., "I will search for references about X").
Then ASK the user to confirm or respond — search runs on the NEXT user turn.
Do NOT say "please wait" — the user MUST send a message for search to execute.`,
  },
  // Fix passive search: replace orchestrator-detects pattern
  {
    find: /express your intent\s*\n?clearly \(e\.g\., "Saya akan mencari[^"]*"\)\.\s*The orchestrator will detect\s*\n?\s*and execute the search automatically in the next turn\./gi,
    replace: `express your intent clearly (e.g., "I will search for references about X").
Then ASK the user to confirm — search runs on the NEXT user turn.
Do NOT say "please wait" — the user MUST send a message for search to execute.`,
  },
  // Catch any remaining "orchestrator detects" patterns
  {
    find: /The orchestrator detects this intent and executes (?:web )?search automatically in the next turn\./gi,
    replace: `Then ASK the user to confirm or respond — search runs on the NEXT user turn.
Do NOT say "please wait" — the user MUST send a message for search to execute.`,
  },
  // Fix remaining Indonesian search examples
  {
    find: /"Saya akan mencari referensi tentang X"/g,
    replace: `"I will search for references about X"`,
  },
  {
    find: /"Perlu mencari data pendukung untuk Y"/g,
    replace: `"I need to find supporting data for Y"`,
  },
  {
    find: /"Saya akan mencari data pendukung tentang X"/g,
    replace: `"I will search for supporting data about X"`,
  },
  {
    find: /"Saya akan mencari literatur tentang X"/g,
    replace: `"I will search for literature about X"`,
  },
  {
    find: /"Saya akan mencari contoh metodologi serupa"/g,
    replace: `"I will search for similar methodology examples"`,
  },
  {
    find: /"Saya akan mencari studi pembanding"/g,
    replace: `"I will search for comparative studies"`,
  },
]

function applyReplacements(content: string): { newContent: string; changeCount: number } {
  let result = content
  let changeCount = 0

  for (const { find, replace } of REPLACEMENTS) {
    const before = result
    result = result.replace(find, replace)
    if (result !== before) changeCount++
  }

  return { newContent: result, changeCount }
}

export default internalMutation({
  args: {
    execute: v.optional(v.boolean()),
  },
  handler: async ({ db }, { execute }) => {
    const dryRun = !execute
    const prefix = "[fixWebSearchInstructions]"
    const mode = dryRun ? "DRY-RUN" : "EXECUTE"
    console.log(`${prefix} Starting migration (${mode})`)

    const adminUser = await db
      .query("users")
      .filter((q) =>
        q.or(
          q.eq(q.field("role"), "superadmin"),
          q.eq(q.field("role"), "admin")
        )
      )
      .first()

    if (!adminUser) {
      throw new Error(`${prefix} No admin/superadmin user found.`)
    }

    const now = Date.now()
    let updated = 0
    let skipped = 0
    let errors = 0
    const details: Array<{ stage: string; action: string; changes?: number; reason?: string }> = []

    for (const stage of STAGE_SCOPE_VALUES) {
      try {
        const skill = await db
          .query("stageSkills")
          .withIndex("by_stageScope", (q) => q.eq("stageScope", stage))
          .first()

        if (!skill) {
          details.push({ stage, action: "SKIPPED", reason: "no catalog entry" })
          skipped++
          continue
        }

        const activeVersion = await db
          .query("stageSkillVersions")
          .withIndex("by_skillId_status", (q) =>
            q.eq("skillId", skill.skillId).eq("status", "active")
          )
          .first()

        if (!activeVersion) {
          details.push({ stage, action: "SKIPPED", reason: "no active version" })
          skipped++
          continue
        }

        const { newContent, changeCount } = applyReplacements(activeVersion.content)

        if (changeCount === 0) {
          details.push({ stage, action: "SKIPPED", reason: "no matching patterns" })
          skipped++
          continue
        }

        if (dryRun) {
          console.log(`${prefix} [${stage}] WOULD UPDATE — ${changeCount} replacements, v${activeVersion.version} -> v${activeVersion.version + 1}`)
          details.push({ stage, action: "WOULD_UPDATE", changes: changeCount })
          updated++
          continue
        }

        // Demote current active to published
        await db.patch(activeVersion._id, {
          status: "published",
          updatedAt: now,
        })

        // Create new active version
        const newVersion = activeVersion.version + 1
        await db.insert("stageSkillVersions", {
          skillRefId: skill._id,
          skillId: skill.skillId,
          version: newVersion,
          content: newContent,
          status: "active",
          changeNote: "Migration: fix web search trigger instructions (deadlock fix + English)",
          createdBy: adminUser._id,
          createdAt: now,
          updatedAt: now,
          publishedAt: now,
          activatedAt: now,
        })

        // Audit log
        await db.insert("stageSkillAuditLogs", {
          skillRefId: skill._id,
          skillId: skill.skillId,
          version: newVersion,
          action: "migrate_fix_web_search_instructions",
          actorId: adminUser._id,
          metadata: {
            source: "fixWebSearchInstructions",
            stageScope: stage,
            changeCount,
            dryRun: false,
          },
          createdAt: now,
        })

        console.log(`${prefix} [${stage}] UPDATED — ${changeCount} replacements, v${activeVersion.version} -> v${newVersion}`)
        details.push({ stage, action: "UPDATED", changes: changeCount })
        updated++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`${prefix} [${stage}] ERROR — ${msg}`)
        details.push({ stage, action: "ERROR", reason: msg })
        errors++
      }
    }

    const summary = { mode, updated, skipped, errors, total: STAGE_SCOPE_VALUES.length, details }
    console.log(`${prefix} Done: ${updated} updated, ${skipped} skipped, ${errors} errors`)
    return summary
  },
})
