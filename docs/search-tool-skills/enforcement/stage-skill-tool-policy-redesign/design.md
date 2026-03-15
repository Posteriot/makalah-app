# Design: Stage Skill Tool Policy Redesign

> Replace phantom `google_search` references in 14 stage skills and 3 system notes with accurate web search mechanism descriptions.

## Constraints

- **No regex solutions.** Instruction-layer changes only.
- **Skills/instructions provide intelligence, not code.** Per project architecture constraint.
- **Model instructions in English.** Indonesian for user-facing output only.
- **Stage skills are in Convex DB** (`stageSkills` table), not file-based.
- **Search decision logic stays in code.** `route.ts` + `paper-search-helpers.ts` own workflow control.

## Problem Statement

All 14 stage skills in the database reference `google_search` as an allowed function tool in their Tool Policy section. `google_search` does not exist as a function tool in this system. Web search is an orchestrator-level capability:

1. `route.ts` decides search mode based on `stagePolicy` + 3-layer protection + LLM router
2. Search is executed by orchestrator via retriever chain (Perplexity → Grok)
3. Model never calls search directly — it expresses intent in natural language

Additionally, 3 system notes in `paper-search-helpers.ts` reference `google_search`:
- `PAPER_TOOLS_ONLY_NOTE`: "Tool google_search TIDAK TERSEDIA"
- `getResearchIncompleteNote()`: "Gunakan tool google_search"
- `getFunctionToolsModeNote()`: Already fine but uses Indonesian (should be English)

This causes the model to:
- Try to "call" a non-existent tool in compose phase → generates search promises instead of synthesis
- Misunderstand the search mechanism → announces phantom tool usage
- Conflict with COMPOSE_PHASE_DIRECTIVE which says "no tools available"

## Solution: Replace Tool Policy with Web Search + Function Tools Sections

### Component 1: Stage Skill Tool Policy Replacement

Replace the single `## Tool Policy` section in all 14 stage skills with two separate sections: `## Web Search` and `## Function Tools`.

**Web Search — ACTIVE template** (for: gagasan, topik, pendahuluan, tinjauan_literatur, metodologi, diskusi):

```
## Web Search
Policy: active.
When factual evidence, references, or literature data is needed, express your search
intent clearly in your response (e.g., "Saya akan mencari referensi tentang X" or
"Perlu mencari data pendukung untuk Y"). The orchestrator detects this intent and
executes web search automatically in the next turn.
IMPORTANT: Web search and function tools cannot run in the same turn. After search
results arrive, use function tools to save findings.
Do not fabricate references — if evidence is needed, request a search.
```

**Web Search — PASSIVE template** (for: outline, abstrak, hasil, kesimpulan, pembaruan_abstrak, daftar_pustaka, lampiran, judul):

```
## Web Search
Policy: passive — only when user explicitly requests it.
Do not initiate search on your own. If user asks you to search, express your intent
clearly (e.g., "Saya akan mencari referensi tentang X"). The orchestrator will detect
and execute the search automatically in the next turn.
IMPORTANT: Web search and function tools cannot run in the same turn.
Do not fabricate references — if evidence is needed, ask user whether to search.
```

**Function Tools — Base template:**

```
## Function Tools
Allowed:
- updateStageData — save stage progress (ringkasan required)
- createArtifact — create stage output artifact
- submitStageForValidation — submit for user approval (only after explicit user confirmation)
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
Disallowed:
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Submission without ringkasan
- Calling function tools in the same turn as web search
```

**Per-stage Function Tools variations:**

| Stage | Additional Disallowed |
|-------|----------------------|
| gagasan | Fabricating references or factual claims |
| topik | Unsupported topic claims without evidence |
| outline | Initiating web search without user request |
| abstrak | New factual claims without source support |
| pendahuluan | Domain name as citation author, unsupported factual statements |
| tinjauan_literatur | Fabricated literature entries |
| metodologi | Method claims without clear rationale |
| hasil | Inventing data points |
| diskusi | Unsupported interpretation claims |
| kesimpulan | Introducing unrelated new findings |
| pembaruan_abstrak | Self-initiated search (compiles existing data) |
| daftar_pustaka | Placeholder bibliography entries, manual compile without compileDaftarPustaka (mode: persist). NOTE: `compileDaftarPustaka (mode: persist)` IS allowed at this stage. |
| lampiran | Unnecessary appendix inflation |
| judul | Titles not grounded in approved content |

### Component 2: System Notes Update (`paper-search-helpers.ts`)

Three system notes updated. All converted to English per architecture constraint.

**`PAPER_TOOLS_ONLY_NOTE`:**

```typescript
export const PAPER_TOOLS_ONLY_NOTE = `
═══════════════════════════════════════════════════════════════════
FUNCTION TOOLS MODE (NO WEB SEARCH)
═══════════════════════════════════════════════════════════════════

TECHNICAL CONSTRAINT:
- Web search is NOT available this turn.
- Do NOT promise to search for references/literature.
- Available tools: updateStageData, submitStageForValidation, createArtifact, updateArtifact.

IF FACTUAL DATA/REFERENCES ARE NEEDED:
- Ask user to explicitly request a search.
- Example: "Untuk melanjutkan, saya perlu mencari referensi. Bolehkah saya carikan?"
- Do NOT fabricate/hallucinate references — this is FORBIDDEN.
═══════════════════════════════════════════════════════════════════`
```

**`getResearchIncompleteNote()`:**

```typescript
export const getResearchIncompleteNote = (stage: string, requirement: string): string => `
═══════════════════════════════════════════════════════════════════
ATTENTION: STAGE "${stage.toUpperCase()}" RESEARCH INCOMPLETE
═══════════════════════════════════════════════════════════════════

STATUS: ${requirement}

MANDATORY INSTRUCTIONS:
1. Express your intent to search for relevant references in your response
2. Do NOT continue discussion without requesting a search first
3. Do NOT fabricate/hallucinate references — this is FORBIDDEN
4. After search results arrive, discuss findings with user

IF YOU SKIP THE SEARCH, YOU ARE VIOLATING THE PAPER WORKFLOW PROTOCOL.
═══════════════════════════════════════════════════════════════════`
```

**`getFunctionToolsModeNote()`:**

```typescript
export const getFunctionToolsModeNote = (searchInfo: string): string => `
══════════════════════════════════════════════════
MODE: FUNCTION_TOOLS | ${searchInfo}
AVAILABLE: createArtifact, updateStageData, submitStageForValidation
TASK: Process results and continue workflow with user
══════════════════════════════════════════════════`
```

## Additional Changes Required (Amendment)

The following files were initially assumed unchanged but MUST be updated for the new section structure to work:

| File | Change | Reason |
|------|--------|--------|
| `src/lib/ai/stage-skill-validator.ts` | Update `MANDATORY_SECTIONS`, `parseDeclaredSearchPolicy()`, `createArtifact` check, `hasDangerousOverridePhrase()` | Validator enforces `## Tool Policy` as mandatory section. New `## Web Search` + `## Function Tools` sections will fail validation without this update. |
| `convex/stageSkills.ts` | Remove `google_search` from `DEFAULT_ALLOWED_TOOLS`, export the constant | `DEFAULT_ALLOWED_TOOLS` is used when creating new stage skills. Must not include phantom tool. |

## What Does NOT Change

| Component | Reason |
|-----------|--------|
| `stage-skill-contracts.ts` | ACTIVE/PASSIVE stage lists are source of truth for route.ts |
| `route.ts` search decision logic | 3-layer protection + LLM router — code layer concern |
| `aiIndicatedSearchIntent()` patterns | Detection patterns match natural language intent — still works with new skill wording |
| `paper-search-helpers.ts` detection functions | `isStageResearchIncomplete`, `isExplicitMoreSearchRequest`, etc. |
| `orchestrator.ts` | COMPOSE_PHASE_DIRECTIVE + compose flow already fixed |
| `search-results-context.ts` | Imperative language fix already done |
| `web-search-quality/SKILL.md` | Search quality skill — separate concern |
| `stage-skill-resolver.ts` | Resolver logic — fetch, validate, inject |
| Non-Tool-Policy sections in stage skills | Objective, Input Context, Output Contract, Guardrails, Done Criteria unchanged |

## Update Mechanism

Stage skills live in Convex DB (`stageSkills` + `stageSkillVersions` tables). Update via **migration script** (`convex/migrations/updateStageSkillToolPolicy.ts`) that:

1. For each of 14 skills: fetch active version content
2. Replace the `## Tool Policy` section with appropriate `## Web Search` + `## Function Tools` sections
3. Create new version with status `active`, demote previous active version to `published`
4. Update `allowedTools` on `stageSkills` catalog entry to remove `google_search`
5. Log the migration in `stageSkillAuditLogs`

Migration script is reproducible and reviewable before execution.

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/ai/paper-search-helpers.ts` | MODIFY | Update 3 system notes: remove `google_search`, convert to English |
| `src/lib/ai/stage-skill-validator.ts` | MODIFY | Accept `## Web Search` + `## Function Tools` instead of `## Tool Policy` |
| `convex/stageSkills.ts` | MODIFY | Remove `google_search` from `DEFAULT_ALLOWED_TOOLS` |
| `convex/migrations/updateStageSkillToolPolicy.ts` | CREATE | Migration script to update 14 stage skills in DB |

**Total: 3 files modified, 1 file created. 14 DB records updated via migration (content + allowedTools).**

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Model stops expressing search intent after `google_search` removed | Low | Web Search section explicitly teaches how to express intent with examples |
| `aiIndicatedSearchIntent()` patterns don't match new skill wording | Low | Skill examples use same Indonesian phrases the detector looks for ("Saya akan mencari referensi tentang X") |
| Migration script corrupts stage skill content | Low | Script replaces only Tool Policy section, preserves all other sections. Dry-run before execute. |
| System notes language change (Indonesian → English) confuses model | Very Low | Model's native language is English. Architecture constraint already requires English instructions. |

## Success Criteria

1. Zero `google_search` references in any stage skill content
2. Zero `google_search` references in `paper-search-helpers.ts` system notes
3. All system notes in English (architecture constraint)
4. Web Search section accurately describes orchestrator mechanism
5. Function Tools section lists only real tools
6. `aiIndicatedSearchIntent()` still detects model's search intent (example phrases match)
7. ACTIVE stages still trigger search via 3-layer protection
8. PASSIVE stages still trigger search on explicit user request
9. Compose phase no longer receives conflicting `google_search` tool references
