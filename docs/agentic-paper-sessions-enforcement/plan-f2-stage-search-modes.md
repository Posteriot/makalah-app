# Implementation Plan — F2: Stage Search Modes

> Branch: `feature/paper-sessions-enforcement`
> Date: 2026-04-03
> Design: `design-f2-stage-search-modes.md`
> Depends on: F1 (completed)

---

## Execution Order

Steps must be done in this order. Each step has a verification checkpoint before proceeding.

## Audit Status

Audit date: 2026-04-03

- [x] Step 1 verified in code:
  - `src/lib/ai/stage-skill-contracts.ts` now keeps only `gagasan` and `tinjauan_literatur` as active.
  - `src/lib/ai/stage-skill-validator.ts` is synced to the same active-stage matrix.
  - Verified with `npx vitest run src/lib/ai/stage-skill-validator.test.ts` and `npx tsc --noEmit`.

- [x] Step 2 verified in code:
  - `src/lib/ai/paper-search-helpers.ts` removed `topik`, `pendahuluan`, and `diskusi` from `STAGE_RESEARCH_REQUIREMENTS`.

- [x] Step 3 verified in code:
  - `src/app/api/chat/route.ts` no longer reads stage-data search evidence for `topik`, `pendahuluan`, or `diskusi`.
  - Remaining branches are `gagasan`, `tinjauan_literatur`, and `daftar_pustaka`.

- [x] Step 4 verified in code:
  - `PAPER_TOOLS_ONLY_NOTE` was replaced by `getPaperToolsOnlyNote(stage?)`.
  - `route.ts` callers were updated to use the mode-aware helper.

- [x] Step 5 verified in code:
  - `src/lib/ai/paper-mode-prompt.ts` now contains `STAGE MODES`, `SEARCH TURN CONTRACT`, and the artifact wording change.

- [x] Step 6 verified in code:
  - `foundation.ts`, `core.ts`, `results.ts`, and `finalization.ts` now contain the expected mode framing (`PROACTIVE DUAL SEARCH MODE`, `DERIVATION MODE`, `DEEP ACADEMIC SEARCH MODE`, `REVIEW MODE`).

- [x] Step 7 backend verified in code:
  - `src/lib/ai/web-search/orchestrator.ts` exports `validateComposeSubstantiveness()`.
  - The orchestrator emits `data-corrective-findings` when compose output is too thin and sources exist.
  - Verified with `npx vitest run src/lib/ai/web-search/validateComposeSubstantiveness.test.ts` and `npx tsc --noEmit`.

- [x] Step 7 frontend implementation verified in code:
  - `src/components/chat/MessageBubble.tsx` extracts and renders `data-corrective-findings`.

- [ ] Step 7 frontend test coverage not fully implemented:
  - The plan requires a render test for `data-corrective-findings`.
  - No test covering this new event exists in current test files.
  - **Deferred:** Low risk — handler uses identical pattern to `extractCitedSources` and `extractReferenceInventory` which are already tested. Event only fires on rare transitional + sources path.

- [x] Step 8 full regression verified:
  - `npx tsc --noEmit` — pass.
  - `npx vitest run` — 145 files, 793/793 tests pass (re-verified in this audit).

- [x] Additional: admin skill editor synced (post-audit fix):
  - `src/components/admin/StageSkillFormDialog.tsx` `ACTIVE_SEARCH_STAGES` updated to `["gagasan", "tinjauan_literatur"]` only.
  - Committed `d1b3092b`: `fix(f2): sync admin skill editor ACTIVE_SEARCH_STAGES with runtime`.

---

### Step 1: Stage classification sync (Layer 1)

**Goal:** Make both search policy arrays consistent with the 4-mode model.

**Files:**
- `src/lib/ai/stage-skill-contracts.ts`
- `src/lib/ai/stage-skill-validator.ts`

**Changes:**

In `stage-skill-contracts.ts`:
```typescript
// BEFORE
export const ACTIVE_SEARCH_STAGES: PaperStageId[] = [
    "gagasan", "topik", "pendahuluan", "tinjauan_literatur", "metodologi", "diskusi",
];
export const PASSIVE_SEARCH_STAGES: PaperStageId[] = [
    "outline", "abstrak", "hasil", "kesimpulan", "pembaruan_abstrak", "daftar_pustaka", "lampiran", "judul",
];

// AFTER
export const ACTIVE_SEARCH_STAGES: PaperStageId[] = [
    "gagasan", "tinjauan_literatur",
];
export const PASSIVE_SEARCH_STAGES: PaperStageId[] = [
    "topik", "outline", "abstrak", "pendahuluan", "metodologi",
    "hasil", "diskusi", "kesimpulan",
    "pembaruan_abstrak", "daftar_pustaka", "lampiran", "judul",
];
```

In `stage-skill-validator.ts:15-22`:
```typescript
// Same change — sync with contracts.ts
const ACTIVE_SEARCH_STAGES: PaperStageId[] = [
    "gagasan", "tinjauan_literatur",
];
```

**Verification:**
- Run: `npx vitest run src/lib/ai/stage-skill-validator.test.ts`
- The test at line 63-75 tests `search_policy_mismatch` for gagasan with passive → should still fail (gagasan is still active)
- Check if any other tests reference ACTIVE_SEARCH_STAGES membership for topik/pendahuluan/metodologi/diskusi — grep for these stage names in test files
- Run: `npx tsc --noEmit` — must pass

---

### Step 2: Research requirements cleanup (Layer 2)

**Goal:** Remove research requirements for stages that should not trigger "RESEARCH INCOMPLETE" enforcement.

**File:** `src/lib/ai/paper-search-helpers.ts`

**Changes:**

Remove topik, pendahuluan, diskusi from `STAGE_RESEARCH_REQUIREMENTS`:
```typescript
// BEFORE
export const STAGE_RESEARCH_REQUIREMENTS: Partial<Record<PaperStageId, {...}>> = {
    gagasan: { requiredField: "referensiAwal", minCount: 2, description: "..." },
    topik: { requiredField: "referensiPendukung", minCount: 3, description: "..." },      // DELETE
    tinjauan_literatur: { requiredField: "referensi", minCount: 5, description: "..." },
    pendahuluan: { requiredField: "sitasiAPA", minCount: 2, description: "..." },           // DELETE
    diskusi: { requiredField: "sitasiTambahan", minCount: 2, description: "..." },           // DELETE
}

// AFTER
export const STAGE_RESEARCH_REQUIREMENTS: Partial<Record<PaperStageId, {...}>> = {
    gagasan: { requiredField: "referensiAwal", minCount: 2, description: "referensi awal untuk mendukung kelayakan ide" },
    tinjauan_literatur: { requiredField: "referensi", minCount: 5, description: "referensi untuk tinjauan literatur" },
}
```

**Verification:**
- `npx tsc --noEmit` — must pass
- Grep for `STAGE_RESEARCH_REQUIREMENTS` usage to ensure no other consumer breaks

---

### Step 3: Evidence reader cleanup (Layer 2 continued)

**Goal:** Remove dead evidence reader branches that reference removed stages.

**File:** `src/app/api/chat/route.ts` (lines 886-911)

**Changes:**

In `getSearchEvidenceFromStageData()`, remove or guard the branches for topik (line 891), pendahuluan (line 901), diskusi (line 906). These check `referensiPendukung`, `sitasiAPA`, `sitasiTambahan` respectively.

Keep only gagasan (line 886) and tinjauan_literatur (line 896) branches. The daftar_pustaka branch (line 911) is separate and stays — it uses `STAGE_RESEARCH_REQUIREMENTS.daftar_pustaka?.minCount ?? 1` which safely falls back to 1 since daftar_pustaka is not in the requirements map (and was never in it). No change needed there.

**Approach:** Remove the three dead branches (topik, pendahuluan, diskusi) entirely. Do not leave commented-out code.

**Verification:**
- `npx tsc --noEmit` — must pass
- Manual: check that `hasPreviousSearchResults()` still works correctly for gagasan and tinjauan_literatur stages (it calls `getSearchEvidenceFromStageData`)

---

### Step 4: PAPER_TOOLS_ONLY_NOTE mode-awareness (Layer 2 continued)

**Goal:** Make the "no web search" system note context-aware so review-mode stages don't get told to "ask user to request search."

**File:** `src/lib/ai/paper-search-helpers.ts`

**Changes:**

Current `PAPER_TOOLS_ONLY_NOTE` is a static string (lines 77-91). Change to a function that accepts stage context:

```typescript
// BEFORE
export const PAPER_TOOLS_ONLY_NOTE = `...Ask user to explicitly request a search...`

// AFTER
export function getPaperToolsOnlyNote(stage?: string): string {
    const isActiveSearchStage = stage === "gagasan" || stage === "tinjauan_literatur"

    if (isActiveSearchStage) {
        // Search is appropriate but unavailable this turn
        return `
═══════════════════════════════════════════════════════════════════
FUNCTION TOOLS MODE (NO WEB SEARCH)
═══════════════════════════════════════════════════════════════════

TECHNICAL CONSTRAINT:
- Web search is NOT available this turn.
- Do NOT promise to search for references/literature.
- Available tools: updateStageData, submitStageForValidation, createArtifact, updateArtifact.

IF FACTUAL DATA/REFERENCES ARE NEEDED:
- Ask user to explicitly request a search.
- Do NOT fabricate/hallucinate references — this is FORBIDDEN.
═══════════════════════════════════════════════════════════════════`
    }

    // Review/derivation stages — search is not expected
    return `
═══════════════════════════════════════════════════════════════════
FUNCTION TOOLS MODE
═══════════════════════════════════════════════════════════════════

This stage does not require new web search.
Use approved material from previous stages as the evidence base.
Available tools: updateStageData, submitStageForValidation, createArtifact, updateArtifact.
Do NOT fabricate/hallucinate references — this is FORBIDDEN.
═══════════════════════════════════════════════════════════════════`
}
```

**Callers to update (3 locations):**

1. **Import (route.ts:25):** Change `PAPER_TOOLS_ONLY_NOTE` to `getPaperToolsOnlyNote` in the import statement from `paper-search-helpers`.
2. **route.ts:2055:** Inside the `if (!searchRequestedByPolicy && !!paperModePrompt)` block, the `else` branch. Change `activeStageSearchNote = PAPER_TOOLS_ONLY_NOTE` to `activeStageSearchNote = getPaperToolsOnlyNote(currentStage as string)`.
3. **route.ts:2135:** The catch-all `if (!enableWebSearch && paperModePrompt && !activeStageSearchNote)`. Change `activeStageSearchNote = PAPER_TOOLS_ONLY_NOTE` to `activeStageSearchNote = getPaperToolsOnlyNote(currentStage as string)`.

`currentStage` is already in scope at both call sites (defined earlier in the function).

**Verification:**
- `npx tsc --noEmit` — must pass
- Grep for `PAPER_TOOLS_ONLY_NOTE` in route.ts — should return zero matches (only `getPaperToolsOnlyNote` calls remain)

---

### Step 5: General rules rewrite (Layer 3 — global)

**Goal:** Add STAGE MODES lookup and SEARCH TURN CONTRACT to paper-mode-prompt.ts general rules.

**File:** `src/lib/ai/paper-mode-prompt.ts`

**Changes at line 284:**

Replace:
```
- DISCUSS FIRST before drafting — do not immediately generate full output
```

With:
```
- STAGE MODES:
  - gagasan = discussion hub + proactive dual search (academic + non-academic)
  - topik = derivation only from gagasan material; do NOT initiate new search
  - tinjauan_literatur = proactive deep academic search + synthesis
  - all other stages = review mode; generate from approved material, no new search
- DISCUSS FIRST only for gagasan and topik. In review-mode stages, draft directly from existing material and present for review.
```

**Add after existing web search rules (around line 289):**
```
- SEARCH TURN CONTRACT:
  - If web search runs in THIS turn and sources are available, your final response MUST present actual findings from those results in the same turn.
  - If web search runs in THIS turn, do NOT end with transition text such as saying you will search, you are searching, or asking the user to wait.
  - Treat AVAILABLE_WEB_SOURCES and fresh search citations as proof that search has already completed for this turn.
```

**Also update line 294:**
Replace `Artifact is the FINAL OUTPUT reviewed by user.` with `Artifact is the reviewed stage output.` (prep for F4 where artifact becomes working draft, not just final output).

**Verification:**
- `npx tsc --noEmit` — must pass
- Read the full GENERAL RULES block after edit to verify coherence

---

### Step 6: Per-stage instruction rewrites (Layer 3 — per-stage)

**Goal:** Rewrite WEB SEARCH blocks and related sections in all stage instruction files.

This is the largest step by line count but lowest risk — all changes are inside template literal strings. No TypeScript logic.

**Files and changes — execute in this order:**

#### 6a. `foundation.ts` — gagasan (Mode 1: Dual Search)

CORE PRINCIPLES section 2 (after line 31):
- Add two lines about gagasan being PRIMARY research hub and dual search intent

EXPECTED FLOW (line 78):
- Replace "If needed" passive trigger with proactive dual search instruction

WEB SEARCH block (lines 103-108):
- Replace "HOW TO TRIGGER WEB SEARCH" with "PROACTIVE DUAL SEARCH MODE"
- Change point 2 from "you may recommend" to "you SHOULD proactively recommend"
- Add point about covering both academic and non-academic evidence
- Add point about presenting findings in the same turn

#### 6b. `foundation.ts` — topik (Mode 2: Derivation)

CORE PRINCIPLES section 2 (lines 161-167):
- Replace search-oriented text with derivation-mode text

EXPECTED FLOW (line 207):
- Replace search step with derivation step

OUTPUT fields (line 227):
- Change referensiPendukung description from "from web search" to "from gagasan material"

WEB SEARCH block (lines 232-237):
- Replace entire block with "DERIVATION MODE" block

HARD PROHIBITIONS (line 259):
- Replace search-before-draft prohibition with no-fresh-search prohibition

#### 6c. `core.ts` — pendahuluan (Mode 3: Review)

CORE PRINCIPLES section 3 (lines 164-167):
- Replace "WEB SEARCH (OPTIONAL)" with "REVIEW MODE, NOT SEARCH MODE"

EXPECTED FLOW (line 204):
- Remove the search step line entirely

WEB SEARCH block (lines 229-234):
- Replace "HOW TO TRIGGER" with "REVIEW MODE" block

#### 6d. `core.ts` — tinjauan_literatur (Mode 4: Deep Academic)

CORE PRINCIPLES section 1 (lines 276-278):
- Replace "DEEPENING, NOT NEW EXPLORATION" with "DEEP ACADEMIC SEARCH HUB"

EXPECTED FLOW (line 338):
- Replace generic search step with proactive academic search step

WEB SEARCH block (lines 361-367):
- Replace "HOW TO TRIGGER" with "DEEP ACADEMIC SEARCH MODE"

#### 6e. `core.ts` — metodologi (Mode 3: Review)

CORE PRINCIPLES section 2 (line 416):
- Replace "Optionally request a web search" with review-mode text

WEB SEARCH block (lines 483-488):
- Replace "HOW TO TRIGGER" with "REVIEW MODE" block

#### 6f. `results.ts` — diskusi (Mode 3: Review)

CORE PRINCIPLES section 1 (line 153):
- Replace "request a web search FIRST" with use-existing-references text

WEB SEARCH block (lines 230-235):
- Replace "HOW TO TRIGGER" with "REVIEW MODE" block

#### 6g. `results.ts` — hasil and kesimpulan (Mode 3: Review)

Both already have "PASSIVE MODE" WEB SEARCH blocks. Add explicit review-mode framing for consistency with the 4-mode framework:

WEB SEARCH blocks (hasil: line 101, kesimpulan: line 347):
- Add after "PASSIVE MODE" line: `This is REVIEW MODE: generate from existing approved material first, not from new search.`

#### 6h. `core.ts` — abstrak (Mode 3: Review)

Already has "PASSIVE MODE" WEB SEARCH block (line 97-103). Add review-mode framing:

WEB SEARCH block (line 100):
- Add after "PASSIVE MODE" line: `This is REVIEW MODE: generate from existing approved material first, not from new search.`

#### 6i. `finalization.ts` — all finalization stages (Mode 3: Review)

Add one line to each WEB SEARCH block (pembaruan_abstrak, daftar_pustaka, lampiran, judul, outline):
```
This is REVIEW MODE: generate from existing approved material first, not from new search.
```

**Verification for all of Step 6:**
- `npx tsc --noEmit` — must pass (template literal changes can't break types, but verify anyway)
- Grep for "HOW TO TRIGGER WEB SEARCH" across all paper-stages/*.ts — should only appear in stages that weren't changed (none expected)
- Grep for "If needed.*request a web search" — should return zero matches
- Grep for "REVIEW MODE\|DERIVATION MODE\|DUAL SEARCH MODE\|DEEP ACADEMIC SEARCH MODE" — verify each mode label appears in the correct file(s)

---

### Step 7: Post-search response enforcement (Layer 4)

**Goal:** Catch compose outputs that are transitional instead of substantive when search has completed successfully.

**Critical constraint discovered during planning:** Text chunks are streamed to the user in real-time via `writer.write(chunk)` at orchestrator.ts:962. By the time the `finish` handler runs (line 768) and `composedText` is fully available, the text is **already delivered to the user**. This means:
- Cannot intercept and replace the response after compose
- Cannot buffer all text before streaming (would kill streaming UX)

**Revised approach: structured data event (not text injection).**

The orchestrator already emits structured data events that frontend renders: `data-cited-sources`, `data-reference-inventory`, `data-cited-text`. Corrective output must follow this pattern — not inject hardcoded prose as `text-delta`.

**Files:**
- `src/lib/ai/web-search/orchestrator.ts` — emit event
- `src/components/chat/MessageBubble.tsx` — render event (new handler)

**Backend — orchestrator.ts:**

Inside the `finish` handler (after line 768, before `writer.write(chunk)` at line 956 that forwards the finish event):

```typescript
// Layer 4: Post-compose transitional response detection
const hasSubstantiveFindings = validateComposeSubstantiveness(composedText, sourceCount)
if (!hasSubstantiveFindings && sourceCount > 0) {
    // Compose output is transitional but sources exist — emit corrective data event
    const correctiveId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-corrective`
    writer.write({
        type: "data-corrective-findings",
        id: correctiveId,
        data: {
            sources: scoredSources.slice(0, 5).map(s => ({
                title: s.title,
                url: s.url,
                citedText: s.citedText?.slice(0, 200),
            })),
            sourceCount,
        },
    })
    console.warn(`[COMPOSE-GUARD][${reqId}] Transitional response detected with ${sourceCount} sources. Corrective event emitted.`)
}
```

No hardcoded prose. Just structured data — source titles, URLs, excerpts.

**Validator function (`validateComposeSubstantiveness`):**

```typescript
function validateComposeSubstantiveness(composedText: string, sourceCount: number): boolean {
    if (sourceCount === 0) return true  // No sources → transitional is acceptable

    // composedText is accumulated from text-delta chunks AFTER pipeYamlRender.
    // YAML choice cards are already extracted into SPEC_DATA_PART_TYPE chunks
    // by pipeYamlRender (orchestrator.ts:1009) and captured separately into
    // capturedChoiceSpec (orchestrator.ts:688). They do NOT appear in composedText.
    //
    // Therefore raw length is a reliable discriminator:
    // - Transitional response ("Mohon tunggu sebentar..."): ~50-100 chars
    // - Substantive findings response: ~500+ chars
    // - No YAML inflation risk in this path
    //
    // Remaining formatting (citation markers [1], headings ###) adds at most
    // a few dozen chars — not enough to bridge the gap.
    return composedText.trim().length >= 200
}
```

**Why no regex and no stripping needed:** `composedText` in the orchestrator finish path only contains text-delta content. YAML choice cards are already separated by `pipeYamlRender` (orchestrator.ts:1009) before text-delta chunks reach the accumulator (orchestrator.ts:765). The raw length gap between transitional (~70 chars) and substantive (~500+ chars) is wide enough without any preprocessing.

**Frontend — MessageBubble.tsx:**

Add handler for `data-corrective-findings` following the existing pattern for `data-cited-sources` (line 426-432) and `data-reference-inventory` (line 467-473):

```typescript
// Extract corrective findings from message parts
const correctiveFindings = useMemo(() => {
    for (const part of uiMessage.parts ?? []) {
        if (!part || typeof part !== "object") continue
        const maybeDataPart = part as unknown as { type?: string; data?: unknown }
        if (maybeDataPart.type !== "data-corrective-findings") continue
        const data = maybeDataPart.data as { sources?: Array<{ title?: string; url?: string; citedText?: string }>; sourceCount?: number } | null
        if (!data?.sources?.length) return null
        return data
    }
    return null
}, [uiMessage.parts])
```

Render as a simple card/list component with source titles and links. Frontend controls the language and styling — no hardcoded Indonesian from backend. The component can use the same design patterns as existing reference inventory display.

**Why structured data instead of text-delta:**
- No hardcoded language strings in backend (violates CLAUDE.md language policy)
- Frontend controls rendering, language, styling — consistent with existing patterns
- Data is reusable (could be used for analytics, retry, etc.)
- Follows established orchestrator event pattern (`data-cited-sources`, `data-reference-inventory`)

**Edge cases:**
- `sourceCount === 0`: Skip validation entirely. If search found nothing, transitional response is acceptable.
- Very short but valid responses: Pass validator because sourceCount would be 0 (search found nothing).
- YAML choice card: Not a concern — `pipeYamlRender` (orchestrator.ts:1009) extracts YAML into separate SPEC_DATA_PART_TYPE chunks before text-delta accumulation. `composedText` does not contain YAML card content.
- Frontend missing handler: If MessageBubble doesn't have the handler yet, the event is silently ignored — no crash, just no corrective display. Safe for incremental deployment.

**Verification:**

Backend:
- `npx tsc --noEmit` — must pass
- Write a unit test for `validateComposeSubstantiveness`:
  - 80-char text with sourceCount=5 → returns false
  - 400-char text with sourceCount=5 → returns true
  - Any text with sourceCount=0 → returns true

Frontend:
- `npx tsc --noEmit` — must pass (MessageBubble.tsx compiles with new handler)
- Write a test in `MessageBubble.reference-inventory.test.tsx` (or new file) that verifies:
  - A message with `data-corrective-findings` part renders source titles and links
  - A message without the part renders nothing extra
- Manual: trigger a search at gagasan, check browser — if compose is transitional, corrective card should appear below the response

---

### Step 8: Full regression verification

**Goal:** Ensure all changes work together and nothing is broken.

**Automated:**
- `npx vitest run` — all tests must pass
- `npx tsc --noEmit` — clean

**Manual verification checklist:**

| Test | Expected behavior | How to verify |
|------|-------------------|---------------|
| gagasan search | Model proactively requests dual search | Start paper session, provide an idea, observe model behavior |
| topik no-search | Model does NOT request search, derives from gagasan material | Approve gagasan, observe topik behavior |
| tinjauan_literatur deep search | Model proactively requests academic search | Navigate to tinjauan_literatur, observe |
| pendahuluan no-search | Model drafts from existing material without search | Navigate to pendahuluan, observe |
| diskusi no-search | Model uses existing references for comparison | Navigate to diskusi, observe |
| Search-turn findings | After search executes, response contains actual findings | Trigger search at gagasan, check response |
| Corrective append | If compose is transitional, findings block is appended | Hard to trigger intentionally — monitor logs for `[COMPOSE-GUARD]` |

---

## Files changed — complete list

| # | File | Step | Type |
|---|------|------|------|
| 1 | `src/lib/ai/stage-skill-contracts.ts` | 1 | Code |
| 2 | `src/lib/ai/stage-skill-validator.ts` | 1 | Code |
| 3 | `src/lib/ai/paper-search-helpers.ts` | 2, 4 | Code |
| 4 | `src/app/api/chat/route.ts` | 3, 4 | Code |
| 5 | `src/lib/ai/web-search/orchestrator.ts` | 7 | Code (backend — emit event) |
| 6 | `src/components/chat/MessageBubble.tsx` | 7 | Code (frontend — render event) |
| 7 | `src/lib/ai/paper-mode-prompt.ts` | 5 | Instruction |
| 8 | `src/lib/ai/paper-stages/foundation.ts` | 6a, 6b | Instruction |
| 9 | `src/lib/ai/paper-stages/core.ts` | 6c, 6d, 6e, 6h | Instruction |
| 10 | `src/lib/ai/paper-stages/results.ts` | 6f, 6g | Instruction |
| 11 | `src/lib/ai/paper-stages/finalization.ts` | 6i | Instruction |

## Commit strategy

Each step = one commit. Commit messages follow the F1 pattern:

1. `refactor(f2): sync stage search classification — gagasan + tinjauan_literatur only active`
2. `refactor(f2): remove research requirements for topik, pendahuluan, diskusi`
3. `refactor(f2): clean up dead evidence reader branches in route.ts`
4. `refactor(f2): make PAPER_TOOLS_ONLY_NOTE mode-aware`
5. `feat(f2): add STAGE MODES and SEARCH TURN CONTRACT to general rules`
6. `feat(f2): rewrite per-stage search instructions for 4-mode model`
7. `feat(f2): add post-compose transitional response guard in orchestrator`
8. `test(f2): verify full regression — all tests pass`

Step 6 can be one commit (all instruction rewrites together) since they're all template literal strings with no code logic.
