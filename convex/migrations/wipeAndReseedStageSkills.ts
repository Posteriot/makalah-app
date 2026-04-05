import { mutation } from "../_generated/server"
import { v } from "convex/values"

/**
 * Migration: Wipe all stage skills and reseed with F1-F6 aligned versions.
 *
 * Run via: npx convex run migrations/wipeAndReseedStageSkills:wipeAll
 * Then:    npx convex run migrations/wipeAndReseedStageSkills:seedAll
 *
 * Step 1 (wipeAll): Deletes ALL rows from stageSkills, stageSkillVersions, stageSkillAuditLogs.
 * Step 2 (seedAll): Creates fresh skills with F1-F6 aligned content, published + activated.
 */

export const wipeAll = mutation({
    args: {},
    handler: async (ctx) => {
        // Delete all versions first (FK to stageSkills)
        const versions = await ctx.db.query("stageSkillVersions").collect()
        for (const v of versions) {
            await ctx.db.delete(v._id)
        }
        console.log(`Deleted ${versions.length} stageSkillVersions`)

        // Delete all audit logs
        const logs = await ctx.db.query("stageSkillAuditLogs").collect()
        for (const l of logs) {
            await ctx.db.delete(l._id)
        }
        console.log(`Deleted ${logs.length} stageSkillAuditLogs`)

        // Delete all skills
        const skills = await ctx.db.query("stageSkills").collect()
        for (const s of skills) {
            await ctx.db.delete(s._id)
        }
        console.log(`Deleted ${skills.length} stageSkills`)

        return { deletedVersions: versions.length, deletedLogs: logs.length, deletedSkills: skills.length }
    },
})

const ADMIN_USER_ID = "jn755zs64zgafr0mn4qhrghzwn7x6y48" as any

function getSkills(): Array<{
    stageScope: string
    skillId: string
    name: string
    description: string
    content: string
}> { return [
    {
        stageScope: "gagasan",
        skillId: "gagasan-skill",
        name: "gagasan-skill",
        description: "Stage instruction for gagasan in Makalah AI paper workflow.",
        content: GAGASAN_CONTENT,
    },
    {
        stageScope: "topik",
        skillId: "topik-skill",
        name: "topik-skill",
        description: "Stage instruction for topik in Makalah AI paper workflow.",
        content: TOPIK_CONTENT,
    },
    {
        stageScope: "outline",
        skillId: "outline-skill",
        name: "outline-skill",
        description: "Stage instruction for outline in Makalah AI paper workflow.",
        content: OUTLINE_CONTENT,
    },
    {
        stageScope: "abstrak",
        skillId: "abstrak-skill",
        name: "abstrak-skill",
        description: "Stage instruction for abstrak in Makalah AI paper workflow.",
        content: ABSTRAK_CONTENT,
    },
    {
        stageScope: "pendahuluan",
        skillId: "pendahuluan-skill",
        name: "pendahuluan-skill",
        description: "Stage instruction for pendahuluan in Makalah AI paper workflow.",
        content: PENDAHULUAN_CONTENT,
    },
    {
        stageScope: "tinjauan_literatur",
        skillId: "tinjauan-literatur-skill",
        name: "tinjauan-literatur-skill",
        description: "Stage instruction for tinjauan_literatur in Makalah AI paper workflow.",
        content: TINJAUAN_LITERATUR_CONTENT,
    },
    {
        stageScope: "metodologi",
        skillId: "metodologi-skill",
        name: "metodologi-skill",
        description: "Stage instruction for metodologi in Makalah AI paper workflow.",
        content: METODOLOGI_CONTENT,
    },
    {
        stageScope: "hasil",
        skillId: "hasil-skill",
        name: "hasil-skill",
        description: "Stage instruction for hasil in Makalah AI paper workflow.",
        content: HASIL_CONTENT,
    },
    {
        stageScope: "diskusi",
        skillId: "diskusi-skill",
        name: "diskusi-skill",
        description: "Stage instruction for diskusi in Makalah AI paper workflow.",
        content: DISKUSI_CONTENT,
    },
    {
        stageScope: "kesimpulan",
        skillId: "kesimpulan-skill",
        name: "kesimpulan-skill",
        description: "Stage instruction for kesimpulan in Makalah AI paper workflow.",
        content: KESIMPULAN_CONTENT,
    },
    {
        stageScope: "pembaruan_abstrak",
        skillId: "pembaruan-abstrak-skill",
        name: "pembaruan-abstrak-skill",
        description: "Stage instruction for pembaruan_abstrak in Makalah AI paper workflow.",
        content: PEMBARUAN_ABSTRAK_CONTENT,
    },
    {
        stageScope: "daftar_pustaka",
        skillId: "daftar-pustaka-skill",
        name: "daftar-pustaka-skill",
        description: "Stage instruction for daftar_pustaka in Makalah AI paper workflow.",
        content: DAFTAR_PUSTAKA_CONTENT,
    },
    {
        stageScope: "lampiran",
        skillId: "lampiran-skill",
        name: "lampiran-skill",
        description: "Stage instruction for lampiran in Makalah AI paper workflow.",
        content: LAMPIRAN_CONTENT,
    },
    {
        stageScope: "judul",
        skillId: "judul-skill",
        name: "judul-skill",
        description: "Stage instruction for judul in Makalah AI paper workflow.",
        content: JUDUL_CONTENT,
    },
] }

const DEFAULT_ALLOWED_TOOLS = [
    "updateStageData",
    "createArtifact",
    "compileDaftarPustaka",
    "submitStageForValidation",
]

export const seedAll = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now()
        const results: string[] = []

        for (const skill of getSkills()) {
            // Create skill catalog
            const skillRefId = await ctx.db.insert("stageSkills", {
                skillId: skill.skillId,
                stageScope: skill.stageScope as any,
                name: skill.name,
                description: skill.description,
                allowedTools: DEFAULT_ALLOWED_TOOLS,
                isEnabled: true,
                createdBy: ADMIN_USER_ID,
                createdAt: now,
                updatedAt: now,
            })

            // Create v1 as active directly
            await ctx.db.insert("stageSkillVersions", {
                skillRefId,
                skillId: skill.skillId,
                version: 1,
                content: skill.content,
                status: "active",
                changeNote: "F1-F6 aligned version — clean slate",
                createdBy: ADMIN_USER_ID,
                createdAt: now,
                updatedAt: now,
                publishedAt: now,
                activatedAt: now,
            })

            results.push(`${skill.skillId} → v1 active`)
        }

        console.log(`Seeded ${results.length} skills:`, results.join(", "))
        return { seeded: results.length, skills: results }
    },
})

// ============================================================================
// SKILL CONTENT — F1-F6 aligned
// ============================================================================

const GAGASAN_CONTENT = `## Objective
Shape the user's rough idea into a feasible research direction with a clear novelty claim.

## Input Context
Read the latest user message, current stage data, recent web search references, and any prior approved stage summaries.

## Web Search
Policy: active.
PROACTIVE DUAL SEARCH MODE: When research is incomplete, proactively recommend search covering BOTH academic sources (journals, studies) and non-academic sources (news, data, policy, field context).
When search runs in this turn, present actual findings in the same response. Do NOT ask the user to confirm before searching.
IMPORTANT: Web search and function tools cannot run in the same turn. After search results arrive, use function tools to save findings.
Do not fabricate references — if evidence is needed, request a search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- Jumping to another stage
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Fabricating references or factual claims

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (research angles, focus options, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- ideKasar
- analisis
- angle
- novelty
Recommended:
- referensiAwal

## Guardrails
Keep the flow collaborative. Ask focused clarification questions before drafting the final stage content.
Call updateStageData with partial data after each milestone (angle agreed, references found). Save in the NEXT turn after search findings — not in the search turn itself.

## Done Criteria
The user confirms the direction, artifact is created and submitted for validation.`

const TOPIK_CONTENT = `## Objective
Convert the agreed idea into a definitive, defensible research topic with explicit research gap.

## Input Context
Read approved output from gagasan, latest user feedback, and current stage references.

## Web Search
Policy: passive.
DERIVATION MODE: Do NOT initiate a new web search at this stage.
Use approved gagasan material, saved references, and completed-stage context as the basis.
If the user explicitly asks for more search at topik, redirect deeper research to gagasan or tinjauan_literatur.
IMPORTANT: Web search and function tools cannot run in the same turn. After search results arrive, use function tools to save findings.
Do not fabricate references — if evidence is needed, request a search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — ONLY after user confirms topic direction via choice card
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Unsupported topic claims without evidence

Derive 2-3 topic options from gagasan material. Present via YAML choice card with your RECOMMENDATION as the highlighted default. User confirms by selecting — not by extended discussion.

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (topic angles, framing options, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- definitif
- angleSpesifik
- argumentasiKebaruan
- researchGap
Recommended:
- referensiPendukung

## Guardrails
Prefer specific and measurable topic framing over broad, generic phrasing.

## Done Criteria
The user approves the definitive topic via choice card, artifact is created after user confirms topic direction via choice card.`

const OUTLINE_CONTENT = `## Objective
Build a coherent paper structure with section hierarchy and realistic word budget, and establish a living checklist baseline for downstream stages.
Generate full outline from approved gagasan + topik material. Create artifact as v1. Present outline structure via choice card with options for directional changes (reorder, add/remove sections). User validates direction.

## Input Context
Read approved outputs from earlier stages, especially gagasan and topik.
Prepare outline sections with stable IDs so checklist auto-check and minor-edit lifecycle can work consistently.

## Web Search
Policy: passive — only when user explicitly requests it.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.
IMPORTANT: Web search and function tools cannot run in the same turn.
Do not fabricate references — if evidence is needed, ask user whether to search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- Initiating web search without user request
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (structure options, section organization, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- sections
- totalWordCount
Recommended:
- completenessScore
- sections[].checkedAt
- sections[].checkedBy
- sections[].editHistory

## Guardrails
Ensure section ordering supports the 13-stage workflow, avoids structural duplication, and keeps IDs stable for living-checklist tracking.
Each outline section must track: checkedAt (when last verified), checkedBy (who verified), editHistory (changes log).

## Done Criteria
Outline is complete, internally consistent, living-checklist fields are structurally ready, artifact is created and linked to stage, outline structure presented for validation, and user confirms readiness.`

const ABSTRAK_CONTENT = `## Objective
Produce a concise abstract that accurately compiles approved context without introducing unsupported claims.
Analyze Phase 1 data, present 2-3 abstract framing approaches via choice card with RECOMMENDATION. After user picks, generate abstract DIRECTLY to artifact as v1 working draft.

## Input Context
Read approved summaries and structured context from prior stages.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.
Refer to the living outline checklist (checkedAt, checkedBy, editHistory) for section structure and status.

## Web Search
Policy: passive — only when user explicitly requests it.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.
IMPORTANT: Web search and function tools cannot run in the same turn.
Do not fabricate references — if evidence is needed, ask user whether to search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- New factual claims without source support
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (keyword options, abstract structure choices, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- ringkasanPenelitian
- keywords
Recommended:
- wordCount

## Guardrails
Keep the abstract aligned with previously approved stage decisions.

## Done Criteria
Abstract is concise and aligned, artifact is created after user picks approach via choice card, submitted for validation, and user confirms readiness.`

const PENDAHULUAN_CONTENT = `## Objective
Write a strong introduction with background, problem statement, research gap, objectives, significance, and optional hypothesis.
Analyze material, present 2-3 narrative approaches via choice card with RECOMMENDATION. After user picks, generate DIRECTLY to artifact as v1.

## Input Context
Read approved context from earlier stages and latest user feedback.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.
Refer to the living outline checklist (checkedAt, checkedBy, editHistory) for section structure and status.

## Web Search
Policy: passive.
REVIEW MODE: Generate from approved gagasan, topik, and saved references. Do NOT initiate new search by default.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.
IMPORTANT: Web search and function tools cannot run in the same turn. After search results arrive, use function tools to save findings.
Do not fabricate references — if evidence is needed, request a search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- Domain name as citation author
- Unsupported factual statements
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (problem framing options, research angle choices, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- latarBelakang
- rumusanMasalah
Recommended:
- researchGapAnalysis
- tujuanPenelitian
- signifikansiPenelitian
- hipotesis
- sitasiAPA

## Guardrails
Use sourced references for factual claims and keep argument flow coherent.

## Done Criteria
Introduction quality is accepted by user, artifact is created after user picks approach, submitted for validation, and draft is ready for validation.`

const TINJAUAN_LITERATUR_CONTENT = `## Objective
Build a literature review that establishes theoretical framing, gap analysis, and research justification.
After search completes, analyze literature and present 2-3 framework/synthesis approaches via choice card with RECOMMENDATION. After user picks, generate review DIRECTLY to artifact as v1.

## Input Context
Read stage summaries, existing references, and user constraints.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.
Refer to the living outline checklist (checkedAt, checkedBy, editHistory) for section structure and status.

## Web Search
Policy: active — DEEP ACADEMIC SEARCH MODE.
Proactively initiate deeper academic search when literature base is still thin.
Focus on journals, empirical studies, theoretical frameworks, state-of-the-art.
When search runs in this turn, present actual findings in the same response. Do NOT ask the user to confirm before searching.
IMPORTANT: Web search and function tools cannot run in the same turn. After search
results arrive, use function tools to save findings.
Do not fabricate references — if evidence is needed, request a search.

## Function Tools
Allowed:
- updateStageData — save stage progress. Call with partial references in the NEXT turn after search findings are presented — not in the search turn itself.
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Fabricated literature entries

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (theoretical framework choices, literature organization, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- kerangkaTeoretis
- reviewLiteratur
Recommended:
- gapAnalysis
- justifikasiPenelitian
- referensi

## Guardrails
Prioritize high-quality references and keep claims traceable to sources.

## Done Criteria
Review is coherent and evidence-backed, artifact is created after user picks framework approach, submitted for validation, and user confirms readiness.`

const METODOLOGI_CONTENT = `## Objective
Define an executable and academically defensible methodology aligned with research goals.
Analyze research direction, present 2-3 methodology approaches via choice card (e.g., qualitative/quantitative/mixed) with RECOMMENDATION. After user picks, generate DIRECTLY to artifact as v1.

## Input Context
Read approved topic, outline, and relevant methodological references.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.
Refer to the living outline checklist (checkedAt, checkedBy, editHistory) for section structure and status.

## Web Search
Policy: passive.
REVIEW MODE: Derive methodology from approved research direction, not from fresh search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.
IMPORTANT: Web search and function tools cannot run in the same turn. After search results arrive, use function tools to save findings.
Do not fabricate references — if evidence is needed, request a search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Method claims without clear rationale

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (methodology options, design choices, instrument alternatives, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- pendekatanPenelitian
- desainPenelitian
Recommended:
- metodePerolehanData
- teknikAnalisis
- alatInstrumen
- etikaPenelitian

## Guardrails
Method choices must be internally consistent and feasible for the user context.

## Done Criteria
Method plan is clear and feasible, artifact is created after user picks methodology approach, submitted for validation, and user confirms readiness.`

const HASIL_CONTENT = `## Objective
Present results clearly using user-provided or approved data representation. Based on metodologi (research design, data collection method), proactively propose a data-input structure via choice card: expected finding categories, presentation format options (narrative/tabular/mixed), with RECOMMENDATION. User provides data into agent-proposed framework. Then generate to artifact as v1.

## Input Context
Read approved methodology and prior stage outputs.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.
Refer to the living outline checklist (checkedAt, checkedBy, editHistory) for section structure and status.

## Web Search
Policy: passive — only when user explicitly requests it.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.
IMPORTANT: Web search and function tools cannot run in the same turn.
Do not fabricate references — if evidence is needed, ask user whether to search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Inventing data points

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (data presentation format options, result organization choices, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- temuanUtama
Recommended:
- metodePenyajian
- dataPoints

## Guardrails
Differentiate clearly between observed findings and interpretation.

## Done Criteria
Artifact is created after user provides data into agent-proposed structure, submitted for validation. Results are accurate and readable, and user confirms readiness.`

const DISKUSI_CONTENT = `## Objective
Interpret findings, compare them with literature, and explain implications and limitations. Generate discussion DIRECTLY to artifact as v1 working draft. Cross-reference findings with tinjauan literatur. No choice card decision point needed.

## Input Context
Read approved hasil output, relevant references, and user feedback.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.
Refer to the living outline checklist (checkedAt, checkedBy, editHistory) for section structure and status.

## Web Search
Policy: passive.
REVIEW MODE: Do NOT proactively search. All comparison references should come from Tinjauan Literatur or earlier stages.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.
IMPORTANT: Web search and function tools cannot run in the same turn. After search results arrive, use function tools to save findings.
Do not fabricate references — if evidence is needed, request a search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
Disallowed:
- emitChoiceCard — this is a direct-generate stage; no choice card decision point needed
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Unsupported interpretation claims

## Visual Language
This is a direct-generate stage. Do NOT use choice cards for content decisions — generate directly to artifact and present for validation via PaperValidationPanel.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- interpretasiTemuan
Recommended:
- perbandinganLiteratur
- implikasiTeoretis
- implikasiPraktis
- keterbatasanPenelitian
- saranPenelitianMendatang
- sitasiTambahan

## Guardrails
Keep interpretation tied to findings and cited references.

## Done Criteria
Artifact is created with complete discussion, submitted for validation. Discussion is analytically sound, and user confirms readiness.`

const KESIMPULAN_CONTENT = `## Objective
Deliver a conclusion that answers the research problem and provides practical follow-up recommendations. Generate conclusion DIRECTLY to artifact as v1 working draft. Map answers 1:1 to problem formulation. No choice card decision point needed.

## Input Context
Read approved hasil and diskusi outputs.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.
Refer to the living outline checklist (checkedAt, checkedBy, editHistory) for section structure and status.

## Web Search
Policy: passive — only when user explicitly requests it.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.
IMPORTANT: Web search and function tools cannot run in the same turn.
Do not fabricate references — if evidence is needed, ask user whether to search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
Disallowed:
- emitChoiceCard — this is a direct-generate stage; no choice card decision point needed
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Introducing unrelated new findings

## Visual Language
This is a direct-generate stage. Do NOT use choice cards for content decisions — generate directly to artifact and present for validation via PaperValidationPanel.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- ringkasanHasil
- jawabanRumusanMasalah
Recommended:
- implikasiPraktis
- saranPraktisi
- saranPeneliti
- saranKebijakan

## Guardrails
Keep the conclusion as synthesis, not as a new analysis section.

## Done Criteria
Artifact is created with complete conclusion, submitted for validation. Conclusion is complete and actionable, and user confirms readiness.`

const PEMBARUAN_ABSTRAK_CONTENT = `## Objective
Revise the initial abstract (Stage 4) to align with actual research findings from all approved core stages (Stages 1-10). The original abstract was written as a projection before real results existed. Now that every core stage is approved, systematically compare the original abstract against actual methodology, findings, and conclusions — then propose a precisely targeted update that preserves the research vision while correcting specifics. Generate updated abstract comparison DIRECTLY to artifact as v1 working draft. No extended discussion before saving.

## Input Context
Read and cross-reference ALL of the following approved stage data:
- Stage 4 (Abstract): ringkasanPenelitian, keywords — this is the baseline to revise
- Stage 5 (Introduction): rumusanMasalah, tujuanPenelitian — verify problem statement alignment
- Stage 6 (Literature Review): kerangkaTeoretis, gapAnalisis — confirm theoretical framing still holds
- Stage 7 (Methodology): pendekatanPenelitian, desainPenelitian, teknikAnalisis — check if methodology diverged from what abstract described
- Stage 8 (Results): temuanUtama, dataPoints — incorporate actual findings that abstract may have projected differently
- Stage 9 (Discussion): interpretasiTemuan, implikasiPraktis, keterbatasanPenelitian — reflect real implications
- Stage 10 (Conclusion): ringkasanHasil, jawabanRumusanMasalah — verify conclusions match abstract claims
- Living outline checklist context (checkedAt, checkedBy, editHistory) — ensure structural coherence
Refer to the living outline checklist (checkedAt, checkedBy, editHistory) for section structure and status.

Strategy: identify every claim in the original abstract, then verify each against the approved data above. Flag mismatches as candidates for revision.

## Web Search
Policy: passive — only when user explicitly requests it.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.
IMPORTANT: Web search and function tools cannot run in the same turn.
Do not fabricate references — if evidence is needed, ask user whether to search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
Disallowed:
- emitChoiceCard — this is a direct-generate stage; no choice card decision point needed
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Self-initiated search (compiles existing data)

## Visual Language
This is a direct-generate stage. Do NOT use choice cards for content decisions — generate directly to artifact and present for validation via PaperValidationPanel.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- ringkasanPenelitianBaru — full updated abstract text (target 150-300 words)
- perubahanUtama — array of strings, each describing one significant change from the original
Recommended:
- keywordsBaru — updated keyword list (only if content changes warrant it; otherwise omit to keep original)
- wordCount — word count of the updated abstract

## Guardrails
- Never rewrite the abstract from scratch — always start from the original and make targeted edits
- Never fabricate references, data, or findings not present in the approved stages
- Never change keywords without explicit justification tied to actual content evolution
- Never skip user confirmation before submitting for validation
- Web search and function tools must not run in the same turn
- Preserve the core research vision and novelty angle established in Phase 1 (Stages 1-2)
- If the original abstract is already well-aligned with actual results, say so — do not force unnecessary changes

## Done Criteria
Artifact is created with updated abstract + tracked changes, submitted for validation. perubahanUtama lists all significant deviations from the original. The draft is ready for user validation via submitStageForValidation.`

const DAFTAR_PUSTAKA_CONTENT = `## Objective
Compile a clean and complete reference list from approved citations and verified sources. Compile bibliography directly via compileDaftarPustaka, create artifact, present for validation.

## Input Context
Read references used in prior stages and source metadata from stageData.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.
Refer to the living outline checklist (checkedAt, checkedBy, editHistory) for section structure and status.

## Web Search
Policy: passive — only when user explicitly requests it.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.
IMPORTANT: Web search and function tools cannot run in the same turn.
Do not fabricate references — if evidence is needed, ask user whether to search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- compileDaftarPustaka({ mode: "preview" }) — cross-stage bibliography audit without persistence
- compileDaftarPustaka({ mode: "persist" }) — finalize bibliography (mandatory for this stage)
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
Disallowed:
- emitChoiceCard — this is a direct-generate stage; no choice card decision point needed
- Placeholder bibliography entries
- Stage jumping
- Manual final bibliography compilation without compileDaftarPustaka({ mode: "persist" })
- Calling function tools in the same turn as web search

## Visual Language
This is a direct-generate stage. Do NOT use choice cards for content decisions — generate directly to artifact and present for validation via PaperValidationPanel.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- entries
- totalCount
Recommended:
- incompleteCount
- duplicatesMerged

## Guardrails
Use consistent citation formatting and avoid duplicates. Final compilation must go through compileDaftarPustaka({ mode: "persist" }).

## Done Criteria
Artifact is created with compiled bibliography, submitted for validation. compileDaftarPustaka({ mode: "persist" }) has been executed, and user confirms readiness.`

const LAMPIRAN_CONTENT = `## Objective
Prepare appendix materials that support the paper without bloating main sections. Analyze Metodologi (instruments) and Hasil (additional data) to propose appendix items via choice card with RECOMMENDATION, including 'Add custom item' option. User validates/selects items. Then generate to artifact as v1.

## Input Context
Read approved outputs and identify supplementary materials required by the user.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.
Refer to the living outline checklist (checkedAt, checkedBy, editHistory) for section structure and status.

## Web Search
Policy: passive — only when user explicitly requests it.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.
IMPORTANT: Web search and function tools cannot run in the same turn.
Do not fabricate references — if evidence is needed, ask user whether to search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Unnecessary appendix inflation

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (appendix item selection, inclusion/exclusion decisions, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- items
Recommended:
- tidakAdaLampiran
- alasanTidakAda

## Guardrails
Appendix entries must map to actual needs of the paper.

## Done Criteria
Artifact is created after user validates proposed items, submitted for validation. Appendix plan is complete (or justified as empty), and user confirms readiness.`

const JUDUL_CONTENT = `## Objective
Finalize title options and choose the strongest final title aligned with approved content. Generate 5 title options with different styles + coverage analysis. Present via choice card with RECOMMENDATION. After user selects, create artifact with chosen title.

## Input Context
Read approved summaries from all prior stages and final user positioning.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.
Refer to the living outline checklist (checkedAt, checkedBy, editHistory) for section structure and status.

## Web Search
Policy: passive — only when user explicitly requests it.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.
IMPORTANT: Web search and function tools cannot run in the same turn.
Do not fabricate references — if evidence is needed, ask user whether to search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Titles not grounded in approved content

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (title variants, framing options, final selection confirmation), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- opsiJudul
- judulTerpilih
Recommended:
- alasanPemilihan

## Guardrails
Title selection must reflect scope, contribution, and evidence from previous stages.

## Done Criteria
Artifact is created after user selects title via choice card, submitted for validation. Final title decision is approved, and stage is ready for completion.`
