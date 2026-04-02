import { internalMutation } from "../_generated/server"

/**
 * Seed migration: Insert pembaruan-abstrak-skill into stageSkills + v1 draft
 *
 * Run via: npx convex run migrations:seedPembaruanAbstrakSkill
 *
 * This creates the skill catalog entry and a v1 draft version.
 * Admin must then publish and activate via Admin Panel → Stage Skills.
 *
 * Guard: skips if skill already exists for stageScope "pembaruan_abstrak".
 */

const SKILL_CONTENT = `## Objective
Revise the initial abstract (Stage 4) to align with actual research findings from all approved core stages (Stages 1-10). The original abstract was written as a projection before real results existed. Now that every core stage is approved, systematically compare the original abstract against actual methodology, findings, and conclusions — then propose a precisely targeted update that preserves the research vision while correcting specifics.

## Input Context
Read and cross-reference ALL of the following approved stage data:
- Stage 4 (Abstract): ringkasanPenelitian, keywords — this is the baseline to revise
- Stage 5 (Introduction): rumusanMasalah, tujuanPenelitian — verify problem statement alignment
- Stage 6 (Literature Review): kerangkaTeoretis, gapAnalysis — confirm theoretical framing still holds
- Stage 7 (Methodology): pendekatanPenelitian, desainPenelitian, teknikAnalisis — check if methodology diverged from what abstract described
- Stage 8 (Results): temuanUtama, dataPoints — incorporate actual findings that abstract may have projected differently
- Stage 9 (Discussion): interpretasiTemuan, implikasiPraktis, keterbatasanPenelitian — reflect real implications
- Stage 10 (Conclusion): ringkasanHasil, jawabanRumusanMasalah — verify conclusions match abstract claims
- Living outline checklist context (checkedAt, checkedBy, editHistory) — ensure structural coherence

Strategy: identify every claim in the original abstract, then verify each against the approved data above. Flag mismatches as candidates for revision.

## Tool Policy
Allowed:
- google_search (passive mode) — ONLY when user explicitly requests verification or enrichment
- updateStageData — to persist the revised abstract data
- createArtifact — to create the updated abstract artifact (type: "section")
- submitStageForValidation — after user agrees with the revision
Disallowed:
- compileDaftarPustaka (mode: persist) — not applicable to this stage
- stage jumping — only update current stage data
- self-initiated google_search — this stage compiles existing approved data, no new research needed unless user asks

## Output Contract
Required:
- ringkasan — max 280 characters summarizing what changed (approval will fail without this)
- ringkasanPenelitianBaru — full updated abstract text (target 150-300 words)
- perubahanUtama — array of strings, each describing one significant change from the original
Recommended:
- ringkasanDetail — max 1000 characters elaborating why changes were made
- keywordsBaru — updated keyword list (only if content changes warrant it; otherwise omit to keep original)
- wordCount — word count of the updated abstract

## Guardrails
- Never rewrite the abstract from scratch — always start from the original and make targeted edits
- Never fabricate references, data, or findings not present in the approved stages
- Never change keywords without explicit justification tied to actual content evolution
- Never skip user confirmation before submitting for validation
- Never call google_search and updateStageData/createArtifact/submitStageForValidation in the same turn
- Always present a clear side-by-side or tracked-changes view (original vs proposed) before saving
- Preserve the core research vision and novelty angle established in Phase 1 (Stages 1-2)
- If the original abstract is already well-aligned with actual results, say so — do not force unnecessary changes

## Done Criteria
The updated abstract is agreed upon with the user. ringkasan field is stored (max 280 chars). perubahanUtama lists all significant deviations from the original. createArtifact has been called with type "section" containing the full revised abstract text. The draft is ready for user validation via submitStageForValidation.
`

export default internalMutation({
  args: {},
  handler: async ({ db }) => {
    // Guard: check if skill already exists for pembaruan_abstrak
    const existing = await db
      .query("stageSkills")
      .withIndex("by_stageScope", (q) => q.eq("stageScope", "pembaruan_abstrak"))
      .first()

    if (existing) {
      console.log("[seedPembaruanAbstrakSkill] Skill already exists, skipping.")
      return { skipped: true, skillId: existing.skillId }
    }

    // Find a superadmin user to use as createdBy
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
      throw new Error("No admin/superadmin user found. Seed a user first.")
    }

    const now = Date.now()

    // Insert skill catalog entry
    const skillRefId = await db.insert("stageSkills", {
      skillId: "pembaruan-abstrak-skill",
      stageScope: "pembaruan_abstrak",
      name: "pembaruan-abstrak-skill",
      description: "Stage instruction for pembaruan_abstrak — revise initial abstract to align with actual research findings.",
      allowedTools: [
        "google_search",
        "updateStageData",
        "createArtifact",
        "submitStageForValidation",
      ],
      isEnabled: true,
      createdBy: adminUser._id,
      createdAt: now,
      updatedAt: now,
    })

    // Insert v1 as active version (ready to use immediately)
    await db.insert("stageSkillVersions", {
      skillRefId,
      skillId: "pembaruan-abstrak-skill",
      version: 1,
      content: SKILL_CONTENT.trim(),
      status: "active",
      changeNote: "Initial seed: pembaruan abstrak skill v1",
      createdBy: adminUser._id,
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      activatedAt: now,
    })

    // Audit log
    await db.insert("stageSkillAuditLogs", {
      skillRefId,
      skillId: "pembaruan-abstrak-skill",
      version: 1,
      action: "create",
      actorId: adminUser._id,
      metadata: {
        source: "seedPembaruanAbstrakSkill",
        stageScope: "pembaruan_abstrak",
      },
      createdAt: now,
    })

    await db.insert("stageSkillAuditLogs", {
      skillRefId,
      skillId: "pembaruan-abstrak-skill",
      version: 1,
      action: "activate",
      actorId: adminUser._id,
      metadata: {
        source: "seedPembaruanAbstrakSkill",
      },
      createdAt: now,
    })

    console.log("[seedPembaruanAbstrakSkill] Created pembaruan-abstrak-skill v1 (active)")
    return {
      skipped: false,
      skillId: "pembaruan-abstrak-skill",
      skillRefId,
      version: 1,
      status: "active",
    }
  },
})
