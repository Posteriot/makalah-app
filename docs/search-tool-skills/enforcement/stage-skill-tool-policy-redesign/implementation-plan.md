# Stage Skill Tool Policy Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace phantom `google_search` references in 14 stage skills (DB) and 3 system notes (`paper-search-helpers.ts`) with accurate web search mechanism descriptions.

**Architecture:** Instruction-layer changes only. Stage skills teach Gemini how to trigger web search via natural language intent (detected by orchestrator) and how to use real function tools. Migration script updates DB records. Validator updated to accept new section structure.

**Tech Stack:** Convex (DB + migration), TypeScript, Vitest

**Design doc:** `docs/search-tool-skills/enforcement/stage-skill-tool-policy-redesign/design.md`

---

## Design Doc Amendment — Validator Update Required (APPLIED)

The design doc originally said `stage-skill-validator.ts` does NOT change. This was incorrect — the validator enforces `## Tool Policy` as a mandatory section. The design doc has been **already patched** with an "Additional Changes Required (Amendment)" section.

Changes needed in validator:
1. `MANDATORY_SECTIONS`: Replace `"Tool Policy"` with `"Web Search"` and `"Function Tools"`
2. `parseDeclaredSearchPolicy()`: Detect `Policy: active` / `Policy: passive` from new Web Search section
3. `createArtifact` check: Move from `Tool Policy` section to `Function Tools` section
4. `hasDangerousOverridePhrase()`: Update `google_search` pattern to match new terminology

Additionally, `DEFAULT_ALLOWED_TOOLS` in `convex/stageSkills.ts` includes `"google_search"` — must be removed.

---

### Task 1: Update `stage-skill-validator.ts` — Accept New Section Structure

**Files:**
- Modify: `src/lib/ai/stage-skill-validator.ts`
- Test: `src/lib/ai/stage-skill-validator.test.ts`

**Step 1: Write failing tests for new section structure**

Add tests to `src/lib/ai/stage-skill-validator.test.ts`. First, create a new valid content constant using the new `## Web Search` + `## Function Tools` structure, then write tests that expect validation to pass with the new structure and fail with old structure.

```typescript
const VALID_GAGASAN_CONTENT_V2 = `
## Objective
Define a feasible research idea with clear novelty.

## Input Context
Read user intent, prior approved summaries, and available references.

## Web Search
Policy: active.
When factual evidence, references, or literature data is needed, express your search
intent clearly in your response (e.g., "Saya akan mencari referensi tentang X" or
"Perlu mencari data pendukung untuk Y"). The orchestrator detects this intent and
executes web search automatically in the next turn.
IMPORTANT: Web search and function tools cannot run in the same turn. After search
results arrive, use function tools to save findings.
Do not fabricate references — if evidence is needed, request a search.

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
- Fabricating references or factual claims

## Output Contract
Required:
- ringkasan
Recommended:
- ringkasanDetail
- ideKasar
- analisis
- angle
- novelty

## Guardrails
Never fabricate references and never skip user confirmation before submit.

## Done Criteria
Stage draft is agreed, ringkasan is stored, and draft is ready for validation.
`

// Add these test cases:

it("passes valid content with new Web Search + Function Tools sections", () => {
  const result = validateStageSkillContent({
    stageScope: "gagasan",
    skillId: "gagasan-skill",
    name: "gagasan-skill",
    description: "Stage instruction for gagasan in Makalah AI paper workflow.",
    content: VALID_GAGASAN_CONTENT_V2,
  })
  expect(result.ok).toBe(true)
  expect(result.issues).toHaveLength(0)
  expect(result.metadata.declaredSearchPolicy).toBe("active")
})

it("detects search policy from Web Search section", () => {
  const passiveContent = VALID_GAGASAN_CONTENT_V2
    .replace("Policy: active.", "Policy: passive — only when user explicitly requests it.")
  const result = validateStageSkillContent({
    stageScope: "gagasan",
    skillId: "gagasan-skill",
    name: "gagasan-skill",
    description: "Stage instruction for gagasan in Makalah AI paper workflow.",
    content: passiveContent,
  })
  // Should fail: gagasan expects active, but content says passive
  expect(result.ok).toBe(false)
  expect(result.issues.some(i => i.code === "search_policy_mismatch")).toBe(true)
})

it("rejects content missing Function Tools section", () => {
  const noFunctionTools = VALID_GAGASAN_CONTENT_V2
    .replace(/## Function Tools[\s\S]*?(?=## Output Contract)/, "")
  const result = validateStageSkillContent({
    stageScope: "gagasan",
    skillId: "gagasan-skill",
    name: "gagasan-skill",
    description: "Stage instruction for gagasan in Makalah AI paper workflow.",
    content: noFunctionTools,
  })
  expect(result.ok).toBe(false)
  expect(result.issues.some(i => i.code === "missing_section_function_tools")).toBe(true)
})

it("rejects content missing createArtifact in Function Tools", () => {
  const noArtifact = VALID_GAGASAN_CONTENT_V2
    .replace("- createArtifact — create stage output artifact\n", "")
  const result = validateStageSkillContent({
    stageScope: "gagasan",
    skillId: "gagasan-skill",
    name: "gagasan-skill",
    description: "Stage instruction for gagasan in Makalah AI paper workflow.",
    content: noArtifact,
  })
  expect(result.ok).toBe(false)
  expect(result.issues.some(i => i.code === "missing_create_artifact_in_function_tools")).toBe(true)
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/ai/stage-skill-validator.test.ts`
Expected: New tests FAIL (validator still expects old structure)

**Step 3: Update validator to accept new structure**

In `src/lib/ai/stage-skill-validator.ts`:

1. Update `MANDATORY_SECTIONS` (line 5-12):
```typescript
const MANDATORY_SECTIONS = [
    "Objective",
    "Input Context",
    "Web Search",
    "Function Tools",
    "Output Contract",
    "Guardrails",
    "Done Criteria",
];
```

2. Update `parseDeclaredSearchPolicy()` (line 83-91) to also detect `Policy: active` / `Policy: passive`:
```typescript
function parseDeclaredSearchPolicy(content: string): "active" | "passive" | undefined {
    const explicit = content.match(/searchPolicy:\s*(active|passive)\b/i)?.[1]?.toLowerCase();
    if (explicit === "active" || explicit === "passive") return explicit;

    // New format: "Policy: active." or "Policy: passive — ..."
    const webSearchSection = getSection(content, "Web Search");
    const policyMatch = webSearchSection.match(/^Policy:\s*(active|passive)\b/im)?.[1]?.toLowerCase();
    if (policyMatch === "active" || policyMatch === "passive") return policyMatch;

    // Legacy format (will be removed after migration)
    const bodySignal = content.match(/google_search\s*\((active|passive)\s+mode/i)?.[1]?.toLowerCase();
    if (bodySignal === "active" || bodySignal === "passive") return bodySignal;

    return undefined;
}
```

3. Update `createArtifact` check (line 225-233) to check `Function Tools` section:
```typescript
    // Validate that Function Tools mentions createArtifact
    // Required for all stages — artifact is the mandatory output reviewed by user
    const functionToolsSection = getSection(content, "Function Tools");
    if (functionToolsSection && !/createArtifact/i.test(functionToolsSection)) {
        issues.push({
            code: "missing_create_artifact_in_function_tools",
            message: `Function Tools wajib menyebut createArtifact untuk stage "${input.stageScope}". Artifact adalah hasil akhir yang di-review user.`,
        });
    }
```

4. Update `hasDangerousOverridePhrase()` (line 108) — replace `google_search` with generic pattern:
```typescript
        /\bcall\s+(web\s+search|function\s+tools)\s+and\s+(updateStageData|web\s+search)\s+in\s+the\s+same\s+turn\b/i,
```

**Step 4: Update existing test fixtures to use new structure**

Update `VALID_GAGASAN_CONTENT` constant in the test file to use `## Web Search` + `## Function Tools` instead of `## Tool Policy`. Also update the non-English test content to use the new section names. Keep existing tests that still apply.

**Step 5: Run all tests to verify they pass**

Run: `npx vitest run src/lib/ai/stage-skill-validator.test.ts`
Expected: ALL tests PASS

**Step 6: Commit**

```bash
git add src/lib/ai/stage-skill-validator.ts src/lib/ai/stage-skill-validator.test.ts
git commit -m "feat: update stage skill validator to accept Web Search + Function Tools sections

Replace mandatory 'Tool Policy' section with 'Web Search' and 'Function Tools'.
Update search policy detection for new 'Policy: active/passive' format.
Move createArtifact check to Function Tools section."
```

---

### Task 2: Update `stageSkills.ts` test fixture and `DEFAULT_ALLOWED_TOOLS`

**Files:**
- Modify: `convex/stageSkills.ts` (remove `google_search` from `DEFAULT_ALLOWED_TOOLS`)
- Modify: `convex/stageSkills.test.ts` (update `VALID_GAGASAN_SKILL` fixture)

**Step 1: Write failing test — verify DEFAULT_ALLOWED_TOOLS no longer contains google_search**

In `convex/stageSkills.test.ts`, add a new describe block at the end:

```typescript
describe("DEFAULT_ALLOWED_TOOLS", () => {
  it("does not include google_search", () => {
    expect(DEFAULT_ALLOWED_TOOLS).not.toContain("google_search")
    expect(DEFAULT_ALLOWED_TOOLS).toContain("updateStageData")
    expect(DEFAULT_ALLOWED_TOOLS).toContain("createArtifact")
    expect(DEFAULT_ALLOWED_TOOLS).toContain("submitStageForValidation")
    expect(DEFAULT_ALLOWED_TOOLS).toContain("compileDaftarPustaka")
  })
})
```

Note: `DEFAULT_ALLOWED_TOOLS` must be exported from `stageSkills.ts` first.

**Step 2: Run test to verify it fails**

Run: `npx vitest run convex/stageSkills.test.ts`
Expected: FAIL — `DEFAULT_ALLOWED_TOOLS` still has `google_search`, and is not exported

**Step 3: Update `convex/stageSkills.ts`**

1. Export `DEFAULT_ALLOWED_TOOLS` and remove `google_search`:
```typescript
export const DEFAULT_ALLOWED_TOOLS = [
    "updateStageData",
    "createArtifact",
    "compileDaftarPustaka",
    "submitStageForValidation",
];
```

2. Update `VALID_GAGASAN_SKILL` in `convex/stageSkills.test.ts` to use new `## Web Search` + `## Function Tools` structure (same pattern as validator test fixture from Task 1).

**Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/stageSkills.test.ts`
Expected: ALL tests PASS

**Step 5: Commit**

```bash
git add convex/stageSkills.ts convex/stageSkills.test.ts
git commit -m "feat: remove google_search from DEFAULT_ALLOWED_TOOLS, update test fixtures

google_search is not a real function tool. Web search is an orchestrator
capability triggered by natural language intent."
```

---

### Task 3: Update `paper-search-helpers.ts` System Notes

**Files:**
- Modify: `src/lib/ai/paper-search-helpers.ts`
- Create: `__tests__/paper-search-helpers-notes.test.ts`

**Step 1: Write failing tests for system notes content**

Create `__tests__/paper-search-helpers-notes.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import {
  PAPER_TOOLS_ONLY_NOTE,
  getResearchIncompleteNote,
  getFunctionToolsModeNote,
} from "@/lib/ai/paper-search-helpers"

describe("paper-search-helpers system notes", () => {
  describe("PAPER_TOOLS_ONLY_NOTE", () => {
    it("does NOT reference google_search", () => {
      expect(PAPER_TOOLS_ONLY_NOTE).not.toContain("google_search")
    })

    it("is written in English", () => {
      expect(PAPER_TOOLS_ONLY_NOTE).toContain("FUNCTION TOOLS MODE")
      expect(PAPER_TOOLS_ONLY_NOTE).toContain("Web search is NOT available")
      expect(PAPER_TOOLS_ONLY_NOTE).toContain("Do NOT promise to search")
    })

    it("lists real available tools", () => {
      expect(PAPER_TOOLS_ONLY_NOTE).toContain("updateStageData")
      expect(PAPER_TOOLS_ONLY_NOTE).toContain("submitStageForValidation")
      expect(PAPER_TOOLS_ONLY_NOTE).toContain("createArtifact")
      expect(PAPER_TOOLS_ONLY_NOTE).toContain("updateArtifact")
    })

    it("does NOT contain Indonesian instructions", () => {
      expect(PAPER_TOOLS_ONLY_NOTE).not.toContain("TIDAK TERSEDIA")
      expect(PAPER_TOOLS_ONLY_NOTE).not.toContain("JANGAN")
      expect(PAPER_TOOLS_ONLY_NOTE).not.toContain("TERLARANG")
    })
  })

  describe("getResearchIncompleteNote", () => {
    const note = getResearchIncompleteNote("gagasan", "Need 2 initial references")

    it("does NOT reference google_search", () => {
      expect(note).not.toContain("google_search")
    })

    it("is written in English", () => {
      expect(note).toContain("RESEARCH INCOMPLETE")
      expect(note).toContain("Express your intent to search")
    })

    it("includes stage name and requirement", () => {
      expect(note).toContain("GAGASAN")
      expect(note).toContain("Need 2 initial references")
    })

    it("does NOT contain Indonesian instructions", () => {
      expect(note).not.toContain("INSTRUKSI WAJIB")
      expect(note).not.toContain("Gunakan tool")
    })
  })

  describe("getFunctionToolsModeNote", () => {
    const note = getFunctionToolsModeNote("search completed, 3 sources found")

    it("is written in English", () => {
      expect(note).toContain("FUNCTION_TOOLS")
      expect(note).toContain("AVAILABLE")
      expect(note).toContain("TASK")
    })

    it("lists real tools", () => {
      expect(note).toContain("createArtifact")
      expect(note).toContain("updateStageData")
      expect(note).toContain("submitStageForValidation")
    })

    it("does NOT contain Indonesian", () => {
      expect(note).not.toContain("TERSEDIA")
      expect(note).not.toContain("TUGAS")
    })

    it("includes search info parameter", () => {
      expect(note).toContain("search completed, 3 sources found")
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/paper-search-helpers-notes.test.ts`
Expected: FAIL — system notes still reference `google_search` and use Indonesian

**Step 3: Update the 3 system notes in `paper-search-helpers.ts`**

Replace `PAPER_TOOLS_ONLY_NOTE` (line 264-278):

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

Replace `getResearchIncompleteNote` (line 284-298):

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

Replace `getFunctionToolsModeNote` (line 304-309):

```typescript
export const getFunctionToolsModeNote = (searchInfo: string): string => `
══════════════════════════════════════════════════
MODE: FUNCTION_TOOLS | ${searchInfo}
AVAILABLE: createArtifact, updateStageData, submitStageForValidation
TASK: Process results and continue workflow with user
══════════════════════════════════════════════════`
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/paper-search-helpers-notes.test.ts`
Expected: ALL tests PASS

**Step 5: Run full test suite to check for regressions**

Run: `npx vitest run`
Expected: ALL tests PASS (no existing tests depend on Indonesian wording of these notes)

**Step 6: Commit**

```bash
git add src/lib/ai/paper-search-helpers.ts __tests__/paper-search-helpers-notes.test.ts
git commit -m "feat: update paper-search-helpers system notes — remove google_search, convert to English

PAPER_TOOLS_ONLY_NOTE, getResearchIncompleteNote, getFunctionToolsModeNote
now use English per architecture constraint and reference orchestrator
web search mechanism instead of phantom google_search tool."
```

---

### Task 4: Create Migration Script for 14 Stage Skills in DB

**Files:**
- Create: `convex/migrations/updateStageSkillToolPolicy.ts`

**Step 1: Write the migration script**

The migration script must:
1. For each of 14 stages: fetch the active version
2. Replace the `## Tool Policy` section with `## Web Search` + `## Function Tools`
3. Create new version with status `active`, demote previous active to `published`
4. Update `allowedTools` on skill catalog to remove `google_search`
5. Log to `stageSkillAuditLogs`
6. Support dry-run mode (default) — log changes without writing

Key details:
- Use `internalMutation` (like `seedPembaruanAbstrakSkill.ts` pattern)
- Replacement is section-based: find `## Tool Policy` heading, find next `##` heading, replace everything between
- Use per-stage templates from design doc (ACTIVE vs PASSIVE, per-stage disallowed items)
- ACTIVE stages: gagasan, topik, pendahuluan, tinjauan_literatur, metodologi, diskusi
- PASSIVE stages: outline, abstrak, hasil, kesimpulan, pembaruan_abstrak, daftar_pustaka, lampiran, judul
- Guard: skip stages already migrated (check for `## Web Search` in content)

Per-stage additional Disallowed items for Function Tools:

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
| daftar_pustaka | Placeholder bibliography entries, manual compile without compileDaftarPustaka (mode: persist). NOTE: compileDaftarPustaka (mode: persist) IS allowed at this stage. |
| lampiran | Unnecessary appendix inflation |
| judul | Titles not grounded in approved content |

Web Search ACTIVE template:
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

Web Search PASSIVE template:
```
## Web Search
Policy: passive — only when user explicitly requests it.
Do not initiate search on your own. If user asks you to search, express your intent
clearly (e.g., "Saya akan mencari referensi tentang X"). The orchestrator will detect
and execute the search automatically in the next turn.
IMPORTANT: Web search and function tools cannot run in the same turn.
Do not fabricate references — if evidence is needed, ask user whether to search.
```

Function Tools base template:
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
[per-stage additional disallowed item]
```

For daftar_pustaka, add after Disallowed list:
```
NOTE: compileDaftarPustaka (mode: persist) IS allowed at this stage.
```

Section replacement algorithm:
1. Find `## Tool Policy` heading via regex `/^## Tool Policy\s*$/im`
2. Find the next `## ` heading after it
3. Replace everything from `## Tool Policy` to (but not including) next heading with `## Web Search` + `## Function Tools`

**Step 2: Verify migration script compiles**

Run convex dev server type checking or `npx tsc --noEmit`

**Step 3: Commit (before running)**

```bash
git add convex/migrations/updateStageSkillToolPolicy.ts
git commit -m "feat: add migration script to replace Tool Policy in 14 stage skills

Replaces ## Tool Policy with ## Web Search + ## Function Tools sections.
Removes google_search from allowedTools. Supports dry-run mode."
```

---

### Task 5: Run Migration — Dry Run + Execute

**Prerequisites:** Convex dev server running (`npm run convex:dev`)

**Step 1: Dry run**

```bash
npm run convex -- run migrations:updateStageSkillToolPolicy
```

Expected: Output shows `DRY_RUN`, lists all 14 stages with `WOULD UPDATE`, zero errors.

**Step 2: Review dry run output**

Verify:
- All 14 stages listed
- No `ERROR` entries
- No unexpected `SKIP` entries

**Step 3: Execute migration**

```bash
npm run convex -- run migrations:updateStageSkillToolPolicy --args '{"execute": true}'
```

Expected: Output shows `EXECUTED`, `updated: 14`, `errors: 0`.

**Step 4: Verify in Admin Panel**

Open Admin Panel -> Stage Skills. For each of the 14 skills:
- Active version should have `## Web Search` + `## Function Tools` (no `## Tool Policy`)
- `allowedTools` should NOT contain `google_search`
- Audit log should show `migrate_tool_policy` action

**Step 5: Verify validator accepts migrated content**

```bash
npx vitest run src/lib/ai/stage-skill-validator.test.ts
```

Expected: ALL tests PASS

---

### Task 6: Full Regression Test + Verify Zero google_search References

**Step 1: Run full test suite**

```bash
npm run test
```

Expected: ALL tests PASS

**Step 2: Verify zero `google_search` in active codepaths**

Search for remaining `google_search` references in modified files:
- `paper-search-helpers.ts`: Zero matches expected
- `stage-skill-validator.ts`: Only in legacy detection pattern (kept for backward compatibility)

**Step 3: Verify lint passes**

```bash
npm run lint
```

Expected: No new lint errors

**Step 4: Commit any remaining fixes**

If any tests or lint issues found, fix and commit.

---

### Task 7: Final Documentation Verification

The design doc has already been amended with the "Additional Changes Required" section during the pre-implementation audit. Verify no further doc changes are needed.

**Step 1: Verify design doc is current**

Read `docs/search-tool-skills/enforcement/stage-skill-tool-policy-redesign/design.md` and confirm:
- "Additional Changes Required (Amendment)" section exists with validator + stageSkills.ts entries
- File Changes Summary lists 3 modified + 1 created
- Update Mechanism includes `allowedTools` cleanup (step 4)
- `PAPER_TOOLS_ONLY_NOTE` template includes `updateArtifact`

**Step 2: Commit if any final adjustments needed**

```bash
git add docs/search-tool-skills/enforcement/stage-skill-tool-policy-redesign/
git commit -m "docs: finalize design doc and implementation plan after audit"
```

---

## Execution Order Summary

| Task | Description | Files | Dependencies |
|------|-------------|-------|-------------|
| 1 | Update validator for new sections | `stage-skill-validator.ts` + test | None |
| 2 | Remove `google_search` from `DEFAULT_ALLOWED_TOOLS` | `stageSkills.ts` + test | Task 1 (validator) |
| 3 | Update system notes in `paper-search-helpers.ts` | `paper-search-helpers.ts` + test | None (independent) |
| 4 | Create migration script | `updateStageSkillToolPolicy.ts` | Task 1 (validator must accept new format) |
| 5 | Run migration (dry-run + execute) | DB records | Task 4 |
| 6 | Full regression test | All | Tasks 1-5 |
| 7 | Documentation update | design.md | Task 6 |

**Parallelizable:** Tasks 1 and 3 can run in parallel (independent files).

**Total: 3 files modified, 3 files created (1 test + 1 migration + 1 test), 14 DB records updated via migration.**
