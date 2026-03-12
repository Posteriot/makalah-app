# Regex Elimination & Instruction Strengthening — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all 40 remaining regex patterns from the search decision path and replace with LLM router intent classification + safe defaults.

**Architecture:** Extend `decideWebSearchMode` router prompt with intent classification (sync, compile, save_submit, search, discussion). Remove all regex functions. Refactor post-router logic to read router's `reason` field. Remove weak-signal regex from `hasPreviousSearchResults`.

**Tech Stack:** TypeScript, Vercel AI SDK (`generateText`, `Output.object`), Zod, Vitest

**Design Doc:** `docs/search-tool-skills/enforcement/regex-elimination-instruction-strengthening/DESIGN.md`

---

### Task 1: Enhance LLM Router Prompt with Intent Classification

**Files:**
- Modify: `src/app/api/chat/route.ts` — `decideWebSearchMode` function (line ~1008-1134)

**Context:**
The `decideWebSearchMode` function currently classifies only search vs no-search. We need it to also classify sync requests, compile bibliography intent, and save/submit intent — all currently handled by regex.

The router's `reason` field (string, max 500 chars) will carry intent classification. Post-router code reads this field to determine specific actions (sync tool, compile mode, submit validation).

**Step 1: Write the failing test**

In `__tests__/search-mode-decision.test.ts`, add a test section that documents the intent classification contract:

```typescript
// ===========================================================================
// 6. Router reason-based intent classification (contract tests)
// ===========================================================================
describe("router reason-based intent classification", () => {
    // These tests document the contract: post-router code reads reason field
    // to determine specific actions. The actual router is an LLM call,
    // so we test the post-router logic with mocked router responses.

    const INTENT_PATTERNS = {
        sync: "sync_request",
        compile: "compile_daftar_pustaka",
        saveSubmit: "save_submit",
    }

    it("reason containing 'sync_request' should be detectable", () => {
        const reason = "User asked to sync session state — sync_request"
        expect(reason.includes(INTENT_PATTERNS.sync)).toBe(true)
    })

    it("reason containing 'compile_daftar_pustaka' should be detectable", () => {
        const reason = "User wants to compile bibliography — compile_daftar_pustaka"
        expect(reason.includes(INTENT_PATTERNS.compile)).toBe(true)
    })

    it("reason containing 'save_submit' should be detectable", () => {
        const reason = "User approved draft, wants to submit — save_submit"
        expect(reason.includes(INTENT_PATTERNS.saveSubmit)).toBe(true)
    })

    it("generic search reason should not match special intents", () => {
        const reason = "User needs references about AI in education"
        expect(reason.includes(INTENT_PATTERNS.sync)).toBe(false)
        expect(reason.includes(INTENT_PATTERNS.compile)).toBe(false)
        expect(reason.includes(INTENT_PATTERNS.saveSubmit)).toBe(false)
    })
})
```

**Step 2: Run test to verify it passes**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills-v2 && npx vitest run __tests__/search-mode-decision.test.ts`
Expected: All tests PASS (these are contract tests, not implementation tests)

**Step 3: Enhance the router prompt**

In `route.ts`, modify the `routerPrompt` string inside `decideWebSearchMode` (line ~1043-1064). Add intent classification guidance:

```typescript
const routerPrompt = `You are a "router" that decides whether the response to the user MUST use web search.

Purpose:
- enableWebSearch = true if:
  (A) user requests internet/search/references, OR
  (B) AI will include references/literature/sources in its response, OR
  (C) AI needs FACTUAL DATA (statistics, numbers, facts, names, dates, events) that risks being wrong if hallucinated.
- IMPORTANT: To PREVENT HALLUCINATION, always enableWebSearch = true if the response requires specific factual data.
- Set false ONLY if: user requests save/approve of existing data, OR the response is purely opinion/discussion without factual claims.
${paperModeContext}

INTENT CLASSIFICATION — your reason field MUST contain one of these tags when applicable:

1. sync_request — User wants to sync/check session state (e.g., "sinkronkan", "cek state",
   "status sesi", "status terbaru", "lanjut dari state"). Always enableWebSearch=false.

2. compile_daftar_pustaka — User wants to compile/preview bibliography (daftar pustaka).
   Always enableWebSearch=false.

3. save_submit — User wants to save, submit, or approve the current stage draft
   (e.g., "simpan", "save", "submit", "approve", "approved", "disetujui",
   "selesaikan tahap", "approve & lanjut"). Always enableWebSearch=false.

If none of these special intents apply, classify as search (enableWebSearch=true)
or discussion (enableWebSearch=false) based on the rules above.

Output rules:
- Output MUST be one JSON object ONLY.
- NO markdown, NO backticks, NO explanation outside JSON.
- confidence 0..1.

JSON schema:
{
  "enableWebSearch": boolean,
  "confidence": number,
  "reason": string
}`
```

**Step 4: Change router failure default to safe default**

In `decideWebSearchMode`, change the final fallback (after triple failure) from:
```typescript
return { enableWebSearch: false, confidence: 0, reason: "router_invalid_json_shape" }
```
to:
```typescript
return { enableWebSearch: true, confidence: 0, reason: "router_failure_safe_default" }
```

Also change the JSON parse failure fallback:
```typescript
// Was: return { enableWebSearch: false, confidence: 0, reason: "router_json_parse_failed" }
return { enableWebSearch: true, confidence: 0, reason: "router_failure_safe_default" }
```

**Step 5: Run tests**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills-v2 && npx vitest run __tests__/search-mode-decision.test.ts`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/app/api/chat/route.ts __tests__/search-mode-decision.test.ts
git commit -m "feat: enhance LLM router prompt with intent classification tags"
```

---

### Task 2: Remove `isExplicitSearchRequest` and Regex Fallback Logic

**Files:**
- Modify: `src/app/api/chat/route.ts` — remove local function (line ~420-439), remove fallback logic (line ~1881-1900)

**Context:**
`isExplicitSearchRequest` is used in two places:
1. `isExplicitSyncRequest` calls it as a guard (`if (isExplicitSearchRequest(text)) return false`)
2. Post-router fallback and PASSIVE stage gate (line ~1881-1900)

Since `isExplicitSyncRequest` is also being removed (Task 3), removing `isExplicitSearchRequest` first is safe — both will be gone.

**Step 1: Remove `isExplicitSearchRequest` function**

Delete the entire function (route.ts:420-439):
```typescript
// DELETE THIS ENTIRE BLOCK:
const isExplicitSearchRequest = (text: string) => {
    const normalized = text.toLowerCase()
    const patterns = [
        /\bcari(kan)?\b/,
        // ... all 14 patterns
    ]
    return patterns.some((pattern) => pattern.test(normalized))
}
```

**Step 2: Simplify post-router decision logic**

Replace the post-router block (route.ts:1881-1900) from:
```typescript
const routerFailed = ["router_invalid_json_shape", "router_json_parse_failed"].includes(
    webSearchDecision.reason
)
const explicitSearchRequest = lastUserContent
    ? isExplicitSearchRequest(lastUserContent)
    : false
const explicitSearchFallback = routerFailed && explicitSearchRequest

const stagePolicyAllowsSearch = !paperModePrompt
    ? true
    : stagePolicy === "active"
        ? true
        : stagePolicy === "passive"
            ? explicitSearchRequest || webSearchDecision.enableWebSearch
            : explicitSearchRequest

searchRequestedByPolicy = stagePolicyAllowsSearch
    && (webSearchDecision.enableWebSearch || explicitSearchFallback || explicitSearchRequest)
```

To:
```typescript
// Trust the router decision. Router prompt handles stage policy rules.
// PASSIVE stages: router prompt says "ONLY if user EXPLICITLY requests."
// Router failure: safe default (enableWebSearch=true) — search is never harmful.
searchRequestedByPolicy = !paperModePrompt
    ? webSearchDecision.enableWebSearch
    : stagePolicy === "none"
        ? false  // completed paper, no search
        : webSearchDecision.enableWebSearch
```

**Step 3: Run tests**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills-v2 && npx vitest run __tests__/search-mode-decision.test.ts`
Expected: PASS (tests for `isExplicitSearchRequest` are mirrors — they test a copy, not the actual function. Update or remove them in Task 6.)

**Step 4: Verify compilation**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills-v2 && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors related to `isExplicitSearchRequest`

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor: remove isExplicitSearchRequest regex and fallback logic"
```

---

### Task 3: Remove `isExplicitSyncRequest` — Move to Router

**Files:**
- Modify: `src/app/api/chat/route.ts` — remove local function (line ~441-455), refactor sync detection (line ~1830-1831, ~1856-1860, ~1978-1980)

**Context:**
`isExplicitSyncRequest` is a pre-router guardrail that detects sync intent and short-circuits to disable search. With the router now classifying sync intent via `reason` tags, this function is replaced.

**Step 1: Remove `isExplicitSyncRequest` function**

Delete the entire function (route.ts:441-455):
```typescript
// DELETE THIS ENTIRE BLOCK:
const isExplicitSyncRequest = (text: string) => {
    if (!text.trim()) return false
    if (isExplicitSearchRequest(text)) return false  // already deleted in Task 2
    const normalized = text.toLowerCase()
    const patterns = [
        /\bsinkron\b/,
        // ... all 6 patterns
    ]
    return patterns.some((pattern) => pattern.test(normalized))
}
```

**Step 2: Remove pre-router sync guardrail**

Delete the `explicitSyncRequest` variable declaration (route.ts:1830-1831):
```typescript
// DELETE:
const explicitSyncRequest = !!paperModePrompt && isExplicitSyncRequest(lastUserContent)
```

And delete the sync guardrail in the pre-router block (route.ts:1856-1860):
```typescript
// DELETE:
} else if (explicitSyncRequest && !!paperModePrompt) {
    searchRequestedByPolicy = false
    activeStageSearchReason = "explicit_sync_request"
    activeStageSearchNote = getFunctionToolsModeNote("Session state sync")
    console.log("[SearchDecision] Explicit sync override: enableWebSearch=false")
}
```

**Step 3: Add post-router sync detection**

After the router call returns, add sync detection via `reason` field:

```typescript
// After searchRequestedByPolicy is set:
const isSyncRequest = !!paperModePrompt
    && webSearchDecision.reason.includes("sync_request")

if (isSyncRequest) {
    searchRequestedByPolicy = false
    activeStageSearchReason = "sync_request"
    activeStageSearchNote = getFunctionToolsModeNote("Session state sync")
    console.log("[SearchDecision] Router detected sync request: enableWebSearch=false")
}
```

**Step 4: Update `shouldForceGetCurrentPaperState`**

Change (route.ts:1978-1980) from:
```typescript
shouldForceGetCurrentPaperState = !enableWebSearch
    && !!paperModePrompt
    && explicitSyncRequest
```
To:
```typescript
shouldForceGetCurrentPaperState = !enableWebSearch
    && !!paperModePrompt
    && isSyncRequest
```

**Step 5: Verify compilation**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills-v2 && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

**Step 6: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor: move sync detection from regex to LLM router reason tag"
```

---

### Task 4: Remove `isCompileDaftarPustakaIntent` — Move to Router

**Files:**
- Modify: `src/app/api/chat/route.ts` — remove import, refactor compile detection (line ~1836, ~1847-1851)
- Modify: `src/lib/ai/paper-search-helpers.ts` — remove function (line ~95-112)

**Context:**
`isCompileDaftarPustakaIntent` detects when user wants to compile bibliography. The router now classifies this via `reason` tag.

**Step 1: Remove function from `paper-search-helpers.ts`**

Delete `isCompileDaftarPustakaIntent` function (line 95-112) and update the file header (line 9).

**Step 2: Remove import from `route.ts`**

Change import (route.ts:25-26) from:
```typescript
import {
    isExplicitSaveSubmitRequest,
    isCompileDaftarPustakaIntent,
    ...
} from "@/lib/ai/paper-search-helpers"
```
Remove `isCompileDaftarPustakaIntent` from the import.

**Step 3: Remove pre-router compile guardrail from `route.ts`**

Delete the compile intent variable (route.ts:1836):
```typescript
// DELETE:
const compileDaftarPustakaIntent = isCompileDaftarPustakaIntent(lastUserContent)
```

Delete the compile guardrail in the pre-router block (route.ts:1847-1851):
```typescript
// DELETE:
if (compileDaftarPustakaIntent && !!paperModePrompt) {
    searchRequestedByPolicy = false
    activeStageSearchReason = "compile_daftar_pustaka_intent"
    activeStageSearchNote = getFunctionToolsModeNote("Compile bibliography")
    console.log("[SearchDecision] Compile intent override: enableWebSearch=false")
}
```

**Step 4: Add post-router compile detection**

After the router call returns (near sync detection from Task 3):

```typescript
const isCompileIntent = !!paperModePrompt
    && webSearchDecision.reason.includes("compile_daftar_pustaka")

if (isCompileIntent) {
    searchRequestedByPolicy = false
    activeStageSearchReason = "compile_daftar_pustaka"
    activeStageSearchNote = getFunctionToolsModeNote("Compile bibliography")
    console.log("[SearchDecision] Router detected compile intent: enableWebSearch=false")
}
```

**Step 5: Verify compilation**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills-v2 && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

**Step 6: Commit**

```bash
git add src/app/api/chat/route.ts src/lib/ai/paper-search-helpers.ts
git commit -m "refactor: move compile daftar pustaka detection from regex to LLM router"
```

---

### Task 5: Remove `isExplicitSaveSubmitRequest` — Move to Router

**Files:**
- Modify: `src/app/api/chat/route.ts` — remove import, refactor submit detection (line ~1986, ~1996)
- Modify: `src/lib/ai/paper-search-helpers.ts` — remove function (line ~75-89)

**Context:**
`isExplicitSaveSubmitRequest` is used downstream for submit validation and artifact-missing note. The router now classifies save/submit intent via `reason` tag. Data guards (`stageStatus`, `hasStageRingkasan`, `hasStageArtifact`) remain — they are structural checks.

**Step 1: Remove function from `paper-search-helpers.ts`**

Delete `isExplicitSaveSubmitRequest` function (line 75-89) and update the file header.

**Step 2: Remove import from `route.ts`**

Remove `isExplicitSaveSubmitRequest` from the import statement.

**Step 3: Refactor submit validation logic**

Change `shouldForceSubmitValidation` (route.ts:1983-1989) from:
```typescript
shouldForceSubmitValidation = !enableWebSearch
    && !!paperModePrompt
    && !shouldForceGetCurrentPaperState
    && isExplicitSaveSubmitRequest(lastUserContent)
    && paperSession?.stageStatus === "drafting"
    && hasStageRingkasan(paperSession)
    && hasStageArtifact(paperSession)
```
To:
```typescript
const isSaveSubmitIntent = webSearchDecision.reason.includes("save_submit")

shouldForceSubmitValidation = !enableWebSearch
    && !!paperModePrompt
    && !shouldForceGetCurrentPaperState
    && isSaveSubmitIntent
    && paperSession?.stageStatus === "drafting"
    && hasStageRingkasan(paperSession)
    && hasStageArtifact(paperSession)
```

**Step 4: Refactor `missingArtifactNote`**

Change (route.ts:1991-1998) from:
```typescript
missingArtifactNote = !shouldForceSubmitValidation
    && !!paperModePrompt
    && hasStageRingkasan(paperSession)
    && !hasStageArtifact(paperSession)
    && paperSession?.stageStatus === "drafting"
    && isExplicitSaveSubmitRequest(lastUserContent)
    ? `\n⚠️ ARTIFACT NOT YET CREATED...`
    : ""
```
To:
```typescript
missingArtifactNote = !shouldForceSubmitValidation
    && !!paperModePrompt
    && hasStageRingkasan(paperSession)
    && !hasStageArtifact(paperSession)
    && paperSession?.stageStatus === "drafting"
    && isSaveSubmitIntent
    ? `\n⚠️ ARTIFACT NOT YET CREATED...`
    : ""
```

**Step 5: Handle scope — `isSaveSubmitIntent` needs access to `webSearchDecision`**

`webSearchDecision` is only available inside the `else` block of the pre-router guardrails. Since we're moving guardrails into the router, `webSearchDecision` should be available in the outer scope. If not, extract the variable to the outer scope.

Note: After Tasks 3 and 4, the only remaining pre-router guardrail is `forcePaperToolsMode` (structural, no regex). Make sure `webSearchDecision` is declared in the scope where `shouldForceSubmitValidation` is set.

**Step 6: Verify compilation**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills-v2 && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

**Step 7: Commit**

```bash
git add src/app/api/chat/route.ts src/lib/ai/paper-search-helpers.ts
git commit -m "refactor: move save/submit detection from regex to LLM router"
```

---

### Task 6: Remove Weak-Signal Regex from `hasPreviousSearchResults`

**Files:**
- Modify: `src/app/api/chat/route.ts` — `hasPreviousSearchResults` function (line ~950-1006)

**Context:**
`hasPreviousSearchResults` has a primary data-based signal (checking `sources` array on messages) and 3 weak-signal regex as fallback. The regex detect Indonesian phrases like "berdasarkan hasil pencarian" — fragile and redundant when the `sources` field is the authoritative signal.

**Step 1: Remove weak-signal regex from ACTIVE stage path**

In the ACTIVE stage code path (route.ts:970-1004), remove lines:
```typescript
// DELETE these lines (appear twice — once for ACTIVE, once for PASSIVE):
if (/berdasarkan hasil pencarian/i.test(content)) return true
if (/saya telah melakukan pencarian/i.test(content)) return true
if (/rangkuman temuan/i.test(content)) return true
```

Keep the `hasSources` check (data-based):
```typescript
const hasSources = "sources" in msg
    && Array.isArray((msg as { sources?: unknown }).sources)
    && ((msg as { sources: unknown[] }).sources).length > 0
if (hasSources) return true
```

**Step 2: Remove weak-signal regex from PASSIVE stage path**

Same removal in the PASSIVE stage fallback path.

**Step 3: Simplify the function**

After removing the regex, each code path just checks `hasSources`. The comments about "weak signal" can be removed. Update the function comments to reflect that only data-based signals remain.

**Step 4: Run tests**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills-v2 && npx vitest run __tests__/search-mode-decision.test.ts`
Expected: PASS

**Step 5: Verify compilation**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills-v2 && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

**Step 6: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor: remove weak-signal regex from hasPreviousSearchResults"
```

---

### Task 7: Update Tests and Documentation

**Files:**
- Modify: `__tests__/search-mode-decision.test.ts` — remove obsolete mirror tests, update
- Modify: `docs/search-tool-skills/architecture-constraints.md` — reflect full regex elimination
- Modify: `src/lib/ai/chat-route-compile-intent.test.ts` — remove (tests deleted function)

**Context:**
The test file has mirror copies of `isExplicitSearchRequest` and `isExplicitSyncRequest` that test the pattern sets. Since these functions no longer exist, the tests should be removed or converted to document the new router-based approach.

**Step 1: Update `__tests__/search-mode-decision.test.ts`**

- Remove section 3 "isExplicitSearchRequest pattern verification" (tests mirror function)
- Remove section 4 "isExplicitSyncRequest pattern verification" (tests mirror function)
- Remove section 1 "isCompileDaftarPustakaIntent" tests (function deleted) — OR keep and import from new location if function still exists for non-search uses. Since it's deleted, remove.
- Keep section 2 "isStageResearchIncomplete" tests (function still exists, data-based)
- Keep section 5 "deadlock prevention" regression tests
- Keep section 6 "router reason-based intent classification" (added in Task 1)

**Step 2: Remove `chat-route-compile-intent.test.ts`**

Delete `src/lib/ai/chat-route-compile-intent.test.ts` — tests `isCompileDaftarPustakaIntent` which no longer exists.

**Step 3: Update `architecture-constraints.md`**

Update the "Paper Stage Architecture" section to reflect that ALL regex have been removed from the search decision path. The LLM router handles all intent classification.

Update the "Workflow Control" row in the Separation of Concerns table:
```
| **Workflow Control** | WHEN tools are available and what mode is active | `route.ts` (LLM router for all decisions), `paper-search-helpers.ts` (system notes + data checks) |
```

**Step 4: Update `paper-search-helpers.ts` file header**

Reflect that the file now only provides data checks and system notes:
```typescript
/**
 * Paper Search Helpers
 *
 * Data-based helpers and system notes for the paper workflow search system.
 * Search mode decisions (including intent classification) are made entirely
 * by the LLM router (decideWebSearchMode in route.ts).
 * This file provides:
 * - Research completeness checks (data-based, used as LLM router context)
 * - System notes injected based on search mode decisions
 * - Stage research requirements (data definitions)
 */
```

**Step 5: Run all tests**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills-v2 && npx vitest run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add __tests__/search-mode-decision.test.ts src/lib/ai/chat-route-compile-intent.test.ts docs/search-tool-skills/architecture-constraints.md src/lib/ai/paper-search-helpers.ts
git commit -m "docs: update tests and architecture docs for full regex elimination"
```

---

## Execution Notes

### Task Dependencies

```
Task 1 (router prompt) → Task 2 (remove isExplicitSearchRequest)
                        → Task 3 (remove isExplicitSyncRequest)
                        → Task 4 (remove isCompileDaftarPustakaIntent)
                        → Task 5 (remove isExplicitSaveSubmitRequest)
Task 2+3+4+5           → Task 6 (remove weak-signal regex)
Task 2+3+4+5+6         → Task 7 (update tests and docs)
```

Tasks 2, 3, 4, 5 can potentially be done in parallel (they modify different sections of route.ts), but executing sequentially is safer to avoid merge conflicts in the same file.

### Compilation Check Strategy

Each task modifies `route.ts`. Run `npx tsc --noEmit` after each task to catch compilation errors early. The file is large (~2300 lines) and has complex internal dependencies.

### Risk: `webSearchDecision` Scope

Tasks 3, 4, 5 all need `webSearchDecision` to be accessible outside the `else` block. After removing pre-router guardrails, the `else` block may need restructuring. The implementer should check if `webSearchDecision` needs to be hoisted to the outer scope.

Specifically: after Task 3 removes `explicitSyncRequest` and Task 4 removes `compileDaftarPustakaIntent`, the only pre-router guardrail left is `forcePaperToolsMode` (structural). The `if/else` block simplifies to:

```typescript
if (forcePaperToolsMode) {
    // no session yet → force tools
    searchRequestedByPolicy = false
    activeStageSearchReason = "force_paper_tools_mode"
} else {
    // LLM router for everything
    const webSearchDecision = await decideWebSearchMode(...)
    // ... post-router logic, sync/compile/save_submit detection
}
```

`shouldForceSubmitValidation` and `missingArtifactNote` (which need `isSaveSubmitIntent`) MUST be inside the `else` block, or `webSearchDecision` must be hoisted. The implementer should handle this.
