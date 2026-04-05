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
Transform the approved gagasan into a definitive, research-ready topic with a clear title, sharpened angle, and identified research gap. Derive from existing gagasan material — do not initiate new search.

## Input Context
Read the approved gagasan stage data (ideKasar, analisis, angle, novelty, referensiAwal) and any prior web search references.

## Web Search
Policy: passive.
DERIVATION MODE: Do NOT initiate a new web search at this stage.
Use approved gagasan material, saved references, and completed-stage context as the basis.
If the user explicitly asks for more search at topik, redirect deeper research to gagasan or tinjauan_literatur.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — ONLY after user confirms topic direction via choice card
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- Jumping to another stage
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Fabricating references or factual claims

## Visual Language
You have two communication channels: text and the interactive choice card.
Derive 2-3 topic options from gagasan material. Present via YAML choice card with your RECOMMENDATION as the highlighted default. User confirms by selecting — not by extended discussion.

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
Never fabricate references. Derive all content from approved gagasan material.
Do NOT initiate a fresh search from topik; derive from gagasan material instead.

## Done Criteria
Artifact is created after user confirms topic direction via choice card, submitted for validation.`

const OUTLINE_CONTENT = `## Objective
Build the paper framework as the primary checklist. Generate full outline from approved gagasan + topik material. Create artifact as v1. Present outline structure via choice card with options for directional changes (reorder, add/remove sections). User validates direction.

## Input Context
Read approved data from gagasan and topik stages.

## Web Search
Policy: passive.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.

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
Use the choice card proactively when guiding, recommending, or presenting directions.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- sections
- totalWordCount
Recommended:
- completenessScore

## Guardrails
Never skip sections that already exist — all must be in the outline.

## Done Criteria
Artifact is created with outline structure, submitted for validation.`

const ABSTRAK_CONTENT = `## Objective
Synthesize the idea and topic into a unified research vision. Analyze Phase 1 data, present 2-3 abstract framing approaches via choice card with RECOMMENDATION. After user picks, generate abstract DIRECTLY to artifact as v1 working draft.

## Input Context
Read approved data from gagasan and topik stages.

## Web Search
Policy: passive.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.

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
Use the choice card to present 2-3 abstract framing approaches with your RECOMMENDATION.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- ringkasanPenelitian
- keywords
Recommended:
- wordCount

## Guardrails
Do NOT dump full draft text in chat — generate to artifact instead.

## Done Criteria
Artifact is created after user picks approach via choice card, submitted for validation.`

const PENDAHULUAN_CONTENT = `## Objective
Develop the novelty argument into a strong academic narrative. Analyze material, present 2-3 narrative approaches via choice card with RECOMMENDATION. After user picks, generate DIRECTLY to artifact as v1.

## Input Context
Read approved data from gagasan, topik, and outline stages. Use argumentasi kebaruan and research gap as primary anchor.

## Web Search
Policy: passive.
REVIEW MODE: Generate from approved gagasan, topik, and saved references. Do NOT initiate new search by default.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.

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
- Creating PLACEHOLDER citations — if references are needed, request a web search first

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card to present 2-3 narrative approaches for pendahuluan (e.g., inverted pyramid vs historical progression vs problem-first).

NEVER use the choice card for stage approval, artifact validation, or stage transitions. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

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
Every strong claim MUST be supported by a reference from existing material or web search.
NEVER create PLACEHOLDER citations like "(Penulis, Tahun)".

## Done Criteria
Artifact is created after user picks approach, submitted for validation.`

const TINJAUAN_LITERATUR_CONTENT = `## Objective
Deepen the theoretical foundation and State of the Art. After search completes, analyze literature and present 2-3 framework/synthesis approaches via choice card with RECOMMENDATION. After user picks, generate review DIRECTLY to artifact as v1.

## Input Context
Start from references already available in gagasan and topik stages. Expand from there.

## Web Search
Policy: active — DEEP ACADEMIC SEARCH MODE.
Proactively initiate deeper academic search when the literature base is still thin.
Focus on journals, empirical studies, theoretical frameworks, and state-of-the-art discussions.
When search runs in this turn, present actual findings in the same response. Do NOT ask the user to confirm before searching.
IMPORTANT: Web search and function tools cannot run in the same turn. After search results arrive, use function tools to save findings.
Target 3-5 academically-focused search queries for deepening.

## Function Tools
Allowed:
- updateStageData — save stage progress. Call with partial references in the NEXT turn after search findings are presented — not in the search turn itself.
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
Use the choice card to present 2-3 theoretical framework/synthesis approaches after search findings are discussed.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- kerangkaTeoretis
- reviewLiteratur
Recommended:
- gapAnalysis
- justifikasiPenelitian
- referensi

## Guardrails
EVERY reference MUST come from web search OR from Phase 1.
NEVER create PLACEHOLDER citations or fabricate "standard textbook" references.
Better to have 5 REAL references than 20 FAKE references.

## Done Criteria
Artifact is created after user picks framework approach via choice card, submitted for validation.`

const METODOLOGI_CONTENT = `## Objective
Plan the technical research steps for validity and reliability. Analyze research direction, present 2-3 methodology approaches via choice card (e.g., qualitative/quantitative/mixed) with RECOMMENDATION. After user picks, generate DIRECTLY to artifact as v1.

## Input Context
The methodology MUST align with the research gap (topik) and objectives (pendahuluan).

## Web Search
Policy: passive.
REVIEW MODE: Derive methodology from approved research direction, not from fresh search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.

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
Use the choice card to present 2-3 methodology approaches (qualitative/quantitative/mixed) with justification.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- pendekatanPenelitian
- desainPenelitian
Recommended:
- metodePerolehanData
- teknikAnalisis
- etikaPenelitian
- alatInstrumen

## Guardrails
Do NOT present methodology options via choice card first — do NOT generate without structured option selection.

## Done Criteria
Artifact is created after user picks methodology approach, submitted for validation.`

const HASIL_CONTENT = `## Objective
Present findings clearly and in a structured manner. Based on metodologi (research design, data collection method), proactively propose a data-input structure via choice card: expected finding categories, presentation format options (narrative/tabular/mixed), with RECOMMENDATION. User provides data into agent-proposed framework. Then generate to artifact as v1.

## Input Context
Use metodologi data (pendekatanPenelitian, metodePerolehanData) and pendahuluan (rumusanMasalah) as primary reference.

## Web Search
Policy: passive.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.

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
- Creating fictitious findings

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card to propose data-input structure and presentation format options.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- temuanUtama
- metodePenyajian
Recommended:
- dataPoints

## Guardrails
Do NOT create fictitious findings. Results must come from user's actual data.

## Done Criteria
Artifact is created after user provides data into agent-proposed structure, submitted for validation.`

const DISKUSI_CONTENT = `## Objective
Connect findings with literature and the theoretical framework. Generate discussion DIRECTLY to artifact as v1 working draft. Cross-reference findings with tinjauan literatur. No choice card decision point needed — this is a direct-generate stage.

## Input Context
Use hasil (temuanUtama) + tinjauan literatur (kerangkaTeoretis, referensi) as primary basis.

## Web Search
Policy: passive.
REVIEW MODE: Do NOT proactively search. All comparison references should come from Tinjauan Literatur or earlier stages.
If the user explicitly requests additional comparative references, it runs immediately. When search runs, findings appear in the same response.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
Disallowed:
- emitChoiceCard — this is a direct-generate stage; no choice card decision point needed
- Jumping to another stage
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Fabricating references or factual claims

## Visual Language
This is a direct-generate stage. Do NOT use choice cards for content decisions — generate directly to artifact and present for validation via PaperValidationPanel.

## Output Contract
Required:
- interpretasiTemuan
- perbandinganLiteratur
Recommended:
- implikasiTeoretis
- implikasiPraktis
- keterbatasanPenelitian
- saranPenelitianMendatang
- sitasiTambahan

## Guardrails
Use references from Tinjauan Literatur and Phase 1 for comparison. Do NOT initiate new search.
NEVER create PLACEHOLDER citations.

## Done Criteria
Artifact is created with complete discussion, submitted for validation.`

const KESIMPULAN_CONTENT = `## Objective
Summarize results and provide future direction. Generate conclusion DIRECTLY to artifact as v1 working draft. Map answers 1:1 to problem formulation. No choice card decision point needed — this is a direct-generate stage.

## Input Context
Use hasil (temuanUtama), diskusi (interpretasi + keterbatasan), and rumusanMasalah from pendahuluan.

## Web Search
Policy: passive.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
Disallowed:
- emitChoiceCard — this is a direct-generate stage; no choice card decision point needed
- Jumping to another stage
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search

## Visual Language
This is a direct-generate stage. Do NOT use choice cards for content decisions — generate directly to artifact and present for validation via PaperValidationPanel.

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
NO new findings or interpretations. ONLY draw from hasil + diskusi.

## Done Criteria
Artifact is created with complete conclusion, submitted for validation.`

const PEMBARUAN_ABSTRAK_CONTENT = `## Objective
Revise the initial abstract (Stage 4) to align with actual research findings from all approved core stages (Stages 1-10). Generate updated abstract comparison DIRECTLY to artifact as v1 working draft. No extended discussion before saving — this is a direct-generate stage.

## Input Context
Read and cross-reference ALL of the following approved stage data:
- Stage 4 (Abstract): ringkasanPenelitian, keywords — this is the baseline to revise
- Stage 5 (Introduction): rumusanMasalah, tujuanPenelitian — verify problem statement alignment
- Stage 6 (Literature Review): kerangkaTeoretis, gapAnalysis — verify theoretical grounding
- Stage 7 (Methodology): pendekatanPenelitian, desainPenelitian — verify method description
- Stage 8 (Results): temuanUtama — verify findings are reflected
- Stage 9 (Discussion): interpretasiTemuan, implikasiTeoretis — verify interpretation coverage
- Stage 10 (Conclusion): ringkasanHasil, jawabanRumusanMasalah — verify conclusions match abstract claims

## Web Search
Policy: passive.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
Disallowed:
- emitChoiceCard — this is a direct-generate stage; no choice card decision point needed
- Jumping to another stage
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search

## Visual Language
This is a direct-generate stage. Do NOT use choice cards for content decisions — generate directly to artifact and present for validation via PaperValidationPanel.

## Output Contract
Required:
- ringkasanPenelitianBaru — full updated abstract text (target 150-300 words)
- perubahanUtama — array of significant changes from original abstract
Recommended:
- keywordsBaru
- wordCount

## Guardrails
Compare old vs new systematically. Highlight what changed and WHY.
Preserve the research vision / core angle from Phase 1.

## Done Criteria
Artifact is created with updated abstract + tracked changes, submitted for validation.`

const DAFTAR_PUSTAKA_CONTENT = `## Objective
Compile cross-stage references into a unified bibliography. Compile bibliography directly via compileDaftarPustaka, create artifact, present for validation. This is a direct-generate stage.

## Input Context
Compile references from ALL stages that have references:
- Stage 1 (Gagasan): referensiAwal[]
- Stage 2 (Topik): referensiPendukung[]
- Stage 5 (Pendahuluan): sitasiAPA[]
- Stage 6 (Tinjauan Literatur): referensi[]
- Stage 9 (Diskusi): sitasiTambahan[]

## Web Search
Policy: passive.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.

## Function Tools
Allowed:
- compileDaftarPustaka (mode: persist) — REQUIRED for main compilation + persist entries/count
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
Disallowed:
- emitChoiceCard — this is a direct-generate stage; no choice card decision point needed
- Jumping to another stage
- Calling function tools in the same turn as web search

## Visual Language
This is a direct-generate stage. Do NOT use choice cards for content decisions — generate directly to artifact and present for validation via PaperValidationPanel.

## Output Contract
Required:
- entries — array of references with APA 7th Edition format
- totalCount
Recommended:
- incompleteCount
- duplicatesMerged

## Guardrails
Deduplicate based on URL or title+authors+year. Sort alphabetically. Flag incomplete entries.
Do NOT add new references not present in previous stages (unless user explicitly requests search).

## Done Criteria
Artifact is created with compiled bibliography, submitted for validation.`

const LAMPIRAN_CONTENT = `## Objective
Organize supporting materials for the paper. Analyze Metodologi (instruments) and Hasil (additional data) to propose appendix items via choice card with RECOMMENDATION, including "Add custom item" option. User validates/selects items. Then generate to artifact as v1.

## Input Context
Supporting data from:
- Metodologi: instruments, questionnaires, interview guides
- Hasil: additional tables/figures too lengthy for main text
- Raw data that needs to be documented

## Web Search
Policy: passive.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to propose appendix items
Disallowed:
- Jumping to another stage
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card to propose appendix items based on Metodologi and Hasil content.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- items — array of appendices with label, judul, tipe, konten, referencedInSections
Recommended:
- tidakAdaLampiran
- alasanTidakAda

## Guardrails
Do NOT create appendices without proposing items via choice card first.

## Done Criteria
Artifact is created after user validates proposed items, submitted for validation.`

const JUDUL_CONTENT = `## Objective
Propose title options based on paper content. Generate 5 title options with different styles + coverage analysis. Present via choice card with RECOMMENDATION. After user selects, create artifact with chosen title.

## Input Context
Use data from:
- Abstrak: keywords[]
- Topik: definitif, angleSpesifik
- Overall paper content to ensure the title is representative

## Web Search
Policy: passive.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card for title selection
Disallowed:
- Jumping to another stage
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card to present 5 title options with keyword coverage scores and your RECOMMENDATION.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- opsiJudul — array of 5 options with judul, keywordsCovered, coverageScore
- judulTerpilih
Recommended:
- alasanPemilihan

## Guardrails
Do NOT choose a title for the user — always provide 5 options and wait for choice.

## Done Criteria
Artifact is created after user selects title via choice card, submitted for validation.`
