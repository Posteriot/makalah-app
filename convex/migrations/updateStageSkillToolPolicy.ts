import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import {
  STAGE_SCOPE_VALUES,
  ACTIVE_SEARCH_STAGES,
} from "../stageSkills/constants"
import type { PaperStageId } from "../paperSessions/constants"

/**
 * Migration: Replace ## Tool Policy with ## Web Search + ## Function Tools
 * in all 14 stage skill active versions.
 *
 * Run dry-run first:
 *   npx convex run migrations:updateStageSkillToolPolicy
 *
 * Then execute:
 *   npx convex run migrations:updateStageSkillToolPolicy --args '{"execute": true}'
 *
 * What it does:
 * 1. For each of 14 stages, fetches active version from DB
 * 2. Replaces ## Tool Policy section with ## Web Search + ## Function Tools
 * 3. Creates new version (active), demotes old to published
 * 4. Removes google_search from allowedTools on catalog
 * 5. Logs to audit table
 *
 * Guard: skips stages already migrated (content has ## Web Search)
 */

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const WEB_SEARCH_ACTIVE = `## Web Search
Policy: active.
When factual evidence, references, or literature data is needed, express your search
intent clearly in your response (e.g., "I will search for references about X" or
"I need to find supporting data for Y"). Then ASK the user to confirm or respond —
search runs on the NEXT user turn. Do NOT say "please wait" — the user MUST send
a message for search to execute.
IMPORTANT: Web search and function tools cannot run in the same turn. After search
results arrive, use function tools to save findings.
Do not fabricate references — if evidence is needed, request a search.`

const WEB_SEARCH_PASSIVE = `## Web Search
Policy: passive — only when user explicitly requests it.
Do not initiate search on your own. If user asks you to search, express your intent
clearly (e.g., "I will search for references about X"). Then ASK the user to confirm —
search runs on the NEXT user turn. Do NOT say "please wait" — the user MUST send
a message for search to execute.
IMPORTANT: Web search and function tools cannot run in the same turn.
Do not fabricate references — if evidence is needed, ask user whether to search.`

function getWebSearchTemplate(stage: PaperStageId): string {
  if (ACTIVE_SEARCH_STAGES.includes(stage)) return WEB_SEARCH_ACTIVE
  return WEB_SEARCH_PASSIVE
}

// Base function tools (shared by all stages except daftar_pustaka which has custom Disallowed)
const FUNCTION_TOOLS_ALLOWED = `## Function Tools
Allowed:
- updateStageData — save stage progress (ringkasan required)
- createArtifact — create stage output artifact
- submitStageForValidation — present draft for user review (Approve/Revise). System may auto-present when ready.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence`

const FUNCTION_TOOLS_DISALLOWED_BASE = `Disallowed:
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Submission without ringkasan
- Calling function tools in the same turn as web search`

const FUNCTION_TOOLS_DISALLOWED_DAFTAR_PUSTAKA = `Disallowed:
- Stage jumping
- Submission without ringkasan
- Calling function tools in the same turn as web search
- Placeholder bibliography entries
- Manual compile without compileDaftarPustaka (mode: persist)
NOTE: compileDaftarPustaka (mode: persist) IS allowed at this stage.`

const PER_STAGE_ADDITIONAL_DISALLOWED: Record<PaperStageId, string | null> = {
  gagasan: "- Fabricating references or factual claims",
  topik: "- Unsupported topic claims without evidence",
  outline: "- Initiating web search without user request",
  abstrak: "- New factual claims without source support",
  pendahuluan: "- Domain name as citation author, unsupported factual statements",
  tinjauan_literatur: "- Fabricated literature entries",
  metodologi: "- Method claims without clear rationale",
  hasil: "- Inventing data points",
  diskusi: "- Unsupported interpretation claims",
  kesimpulan: "- Introducing unrelated new findings",
  pembaruan_abstrak: "- Self-initiated search (compiles existing data)",
  daftar_pustaka: null, // handled by custom Disallowed block
  lampiran: "- Unnecessary appendix inflation",
  judul: "- Titles not grounded in approved content",
}

function getFunctionToolsSection(stage: PaperStageId): string {
  if (stage === "daftar_pustaka") {
    return `${FUNCTION_TOOLS_ALLOWED}\n${FUNCTION_TOOLS_DISALLOWED_DAFTAR_PUSTAKA}`
  }

  const additional = PER_STAGE_ADDITIONAL_DISALLOWED[stage]
  const disallowed = additional
    ? `${FUNCTION_TOOLS_DISALLOWED_BASE}\n${additional}`
    : FUNCTION_TOOLS_DISALLOWED_BASE

  return `${FUNCTION_TOOLS_ALLOWED}\n${disallowed}`
}

// ---------------------------------------------------------------------------
// Content replacement
// ---------------------------------------------------------------------------

function replaceToolPolicySection(
  content: string,
  stage: PaperStageId
): { newContent: string; replaced: boolean } {
  // Find ## Tool Policy heading
  const toolPolicyRegex = /^## Tool Policy\s*$/m
  const match = toolPolicyRegex.exec(content)
  if (!match) {
    return { newContent: content, replaced: false }
  }

  const startIdx = match.index

  // Find the next ## heading after Tool Policy
  const afterToolPolicy = content.substring(startIdx + match[0].length)
  const nextHeadingMatch = /^## /m.exec(afterToolPolicy)

  const webSearch = getWebSearchTemplate(stage)
  const functionTools = getFunctionToolsSection(stage)
  const replacement = `${webSearch}\n\n${functionTools}\n`

  let newContent: string
  if (nextHeadingMatch) {
    // There's a next heading — replace up to it (exclusive)
    const endIdx = startIdx + match[0].length + nextHeadingMatch.index
    newContent = content.substring(0, startIdx) + replacement + "\n" + content.substring(endIdx)
  } else {
    // Tool Policy is the last section — replace to end
    newContent = content.substring(0, startIdx) + replacement
  }

  return { newContent, replaced: true }
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

export default internalMutation({
  args: {
    execute: v.optional(v.boolean()),
  },
  handler: async ({ db }, { execute }) => {
    const dryRun = !execute
    const prefix = "[updateStageSkillToolPolicy]"
    const mode = dryRun ? "DRY-RUN" : "EXECUTE"
    console.log(`${prefix} Starting migration (${mode})`)

    // Find admin user for createdBy
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
    const details: Array<{ stage: string; action: string; reason?: string }> = []

    for (const stage of STAGE_SCOPE_VALUES) {
      try {
        // Fetch skill catalog entry
        const skill = await db
          .query("stageSkills")
          .withIndex("by_stageScope", (q) => q.eq("stageScope", stage))
          .first()

        if (!skill) {
          console.log(`${prefix} [${stage}] SKIPPED — no skill catalog entry`)
          details.push({ stage, action: "SKIPPED", reason: "no catalog entry" })
          skipped++
          continue
        }

        // Fetch active version
        const activeVersion = await db
          .query("stageSkillVersions")
          .withIndex("by_skillId_status", (q) =>
            q.eq("skillId", skill.skillId).eq("status", "active")
          )
          .first()

        if (!activeVersion) {
          console.log(`${prefix} [${stage}] SKIPPED — no active version`)
          details.push({ stage, action: "SKIPPED", reason: "no active version" })
          skipped++
          continue
        }

        // Guard: already migrated?
        if (activeVersion.content.includes("## Web Search")) {
          console.log(`${prefix} [${stage}] SKIPPED — already migrated`)
          details.push({ stage, action: "SKIPPED", reason: "already migrated" })
          skipped++
          continue
        }

        // Guard: has ## Tool Policy?
        if (!activeVersion.content.includes("## Tool Policy")) {
          console.log(`${prefix} [${stage}] SKIPPED — no ## Tool Policy found`)
          details.push({ stage, action: "SKIPPED", reason: "no Tool Policy section" })
          skipped++
          continue
        }

        // Perform replacement
        const { newContent, replaced } = replaceToolPolicySection(
          activeVersion.content,
          stage
        )

        if (!replaced) {
          console.log(`${prefix} [${stage}] ERROR — replacement failed`)
          details.push({ stage, action: "ERROR", reason: "replacement failed" })
          errors++
          continue
        }

        if (dryRun) {
          console.log(`${prefix} [${stage}] WOULD UPDATE — v${activeVersion.version} -> v${activeVersion.version + 1}`)
          details.push({ stage, action: "WOULD_UPDATE" })
          updated++
          continue
        }

        // Execute: demote current active to published
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
          changeNote: "Migration: replace Tool Policy with Web Search + Function Tools",
          createdBy: adminUser._id,
          createdAt: now,
          updatedAt: now,
          publishedAt: now,
          activatedAt: now,
        })

        // Remove google_search from allowedTools
        const newAllowedTools = (skill.allowedTools || []).filter(
          (t: string) => t !== "google_search"
        )
        await db.patch(skill._id, {
          allowedTools: newAllowedTools,
          updatedAt: now,
        })

        // Audit log
        await db.insert("stageSkillAuditLogs", {
          skillRefId: skill._id,
          skillId: skill.skillId,
          version: newVersion,
          action: "migrate_tool_policy",
          actorId: adminUser._id,
          metadata: {
            source: "updateStageSkillToolPolicy",
            stageScope: stage,
            dryRun: false,
          },
          createdAt: now,
        })

        console.log(`${prefix} [${stage}] UPDATED — v${activeVersion.version} -> v${newVersion}`)
        details.push({ stage, action: "UPDATED" })
        updated++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`${prefix} [${stage}] ERROR — ${msg}`)
        details.push({ stage, action: "ERROR", reason: msg })
        errors++
      }
    }

    const summary = {
      mode,
      updated,
      skipped,
      errors,
      total: STAGE_SCOPE_VALUES.length,
      details,
    }

    console.log(`${prefix} Done: ${updated} updated, ${skipped} skipped, ${errors} errors`)
    return summary
  },
})
