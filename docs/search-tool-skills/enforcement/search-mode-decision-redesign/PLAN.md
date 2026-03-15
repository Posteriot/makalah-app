# Search Mode Decision Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify search mode decision for all paper stages under a single LLM router, eliminating regex-based intent detection that causes deadlocks and wrong decisions.

**Architecture:** Replace the dual-path (regex for ACTIVE, LLM for PASSIVE) with a single LLM router path for all stages. Keep only data-based/structural guardrails before the router. Pass research status and search history as context to the router prompt, not as hard gates.

**Tech Stack:** TypeScript, Vercel AI SDK (`generateText`, `Output.object`), Zod, Vitest

**Design doc:** `docs/search-tool-skills/enforcement/search-mode-decision-redesign/DESIGN.md`

---

### Task 1: Fix Deadlock Instruction in paper-mode-prompt.ts

**Files:**
- Modify: `src/lib/ai/paper-mode-prompt.ts:210`

**Step 1: Read and verify the deadlock line**

Verify line 210 contains: `"The orchestrator detects this intent and executes web search automatically in the next turn."`

**Step 2: Replace the deadlock instruction**

Replace line 210's content. The old text:
```
- To request web search: express your search intent clearly in your response (e.g., "Saya akan mencari referensi tentang X" or "Perlu mencari data pendukung untuk Y"). The orchestrator detects this intent and executes web search automatically in the next turn.
```

New text:
```
- To request web search: ASK the user to confirm the search. Example: "I need to search for references about X. Shall I proceed?" The user must send a message to trigger the search. Do NOT say "please wait" or promise the search will happen automatically.
```

Key changes:
- Removed "orchestrator detects automatically" (false — causes deadlock)
- Removed Indonesian examples (violates MODEL INSTRUCTION LANGUAGE POLICY)
- Added explicit "ASK the user" instruction (matches DB stage skill migration)
- Added "Do NOT say please wait" (prevents the exact deadlock symptom)

**Step 3: Run existing tests**

Run: `npx vitest run __tests__/paper-search-helpers-notes.test.ts`
Expected: All existing tests PASS (this file tests system notes, not prompt content)

**Step 4: Commit**

```bash
git add src/lib/ai/paper-mode-prompt.ts
git commit -m "fix: replace deadlock-causing search instruction in paper-mode-prompt"
```

---

### Task 2: Strengthen COMPOSE_PHASE_DIRECTIVE

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts:35-55`

**Step 1: Read current COMPOSE_PHASE_DIRECTIVE**

Verify it contains the "no tools available" section and the "DO NOT promise to search" list.

**Step 2: Add explicit save-on-next-turn instruction**

Add after the existing `DO NOT:` section:

```
IMPORTANT — TOOL CALLS:
- You have NO access to tools (updateStageData, createArtifact, submitStageForValidation) in this phase.
- Do NOT output JSON tool calls as text. This will NOT work — it will appear as raw text to the user.
- Present your synthesized findings to the user in this response.
- Saving data (updateStageData, createArtifact) happens in a SUBSEQUENT turn when tools are available.
- Simply present the results and discuss with the user. The save step comes next.
```

**Step 3: Run tests**

Run: `npx vitest run`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts
git commit -m "fix: strengthen compose directive to prevent raw JSON tool output"
```

---

### Task 3: Write Tests for Unified LLM Router

**Files:**
- Create: `__tests__/search-mode-decision.test.ts`

**Step 1: Write tests that encode the desired behavior**

These are test OUTLINES — the executor must flesh them out with real implementations
during this task. The comments describe WHAT to test, the executor writes HOW.

Test cases should cover:

```typescript
import { describe, it, expect, vi } from "vitest"

// We test two things:
// 1. Pre-router guardrails (deterministic — can test directly)
// 2. Router prompt context assembly (verify strings appear in prompt)
// The actual LLM decision is NOT testable in unit tests — that's integration.

describe("search mode decision - unified router", () => {

  describe("pre-router guardrails (deterministic)", () => {
    it("compileDaftarPustakaIntent → always disables search", () => {
      // Test isCompileDaftarPustakaIntent("compile daftar pustaka") returns true
      // This function lives in paper-search-helpers.ts — test it directly
    })

    it("forcePaperToolsMode (no session) → always disables search", () => {
      // Test: paperWorkflowReminder truthy + paperModePrompt falsy = no search
      // This is a boolean condition in route.ts, test via the condition logic
    })

    it("explicitSyncRequest → always disables search", () => {
      // Test isExplicitSyncRequest("sinkronkan") returns true
      // Test isExplicitSyncRequest("cari referensi") returns false (search overrides sync)
    })
  })

  describe("research status context (data-based)", () => {
    it("stage with insufficient references → reports incomplete", () => {
      // Test isStageResearchIncomplete with stageData having 0 referensiAwal for gagasan
      // Expected: { incomplete: true, requirement: "Butuh minimal 2 ..." }
    })

    it("stage with sufficient references → reports complete", () => {
      // Test isStageResearchIncomplete with stageData having 3 referensiAwal for gagasan
      // Expected: { incomplete: false }
    })

    it("stage without research requirements → reports complete", () => {
      // Test isStageResearchIncomplete for "outline" (PASSIVE, no requirements)
      // Expected: { incomplete: false }
    })
  })

  describe("critical regression: deadlock scenario", () => {
    it("isUserConfirmation hard gate no longer exists in router", () => {
      // Verify that decideWebSearchMode function signature does NOT include
      // isUserConfirmation parameter. This is a structural test.
      // After Task 4, check the function type.
    })

    it("searchAlreadyDone hard gate no longer exists in router", () => {
      // Verify that decideWebSearchMode does NOT have early-return for
      // searchAlreadyDone. Check function body does not contain
      // "search_already_done_prefer_paper_tools" as a reason string.
    })
  })

  describe("isExplicitSearchRequest fallback (route.ts local)", () => {
    it("detects explicit search keywords", () => {
      // Test the local isExplicitSearchRequest function
      // "cari referensi" → true
      // "search for data" → true
      // "lanjut" → false
      // "simpan" → false
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/search-mode-decision.test.ts`
Expected: Tests FAIL or SKIP (implementation not done yet, some functions not yet refactored)

**Step 3: Commit test file**

```bash
git add __tests__/search-mode-decision.test.ts
git commit -m "test: add search mode decision tests for unified router"
```

---

### Task 4: Unify Search Mode Decision (Router Enhancement + Decision Block Rewrite)

**IMPORTANT: This is an atomic task.** The router function signature change and the call site
rewrite MUST happen together. Changing the signature alone breaks compilation at call sites.

**Files:**
- Modify: `src/app/api/chat/route.ts` — both `decideWebSearchMode` (line 1039-1174) AND the search decision block (lines 1878-1994)

#### Part A: Enhance `decideWebSearchMode` function

**Step 1: Update function signature**

Change the options type. Remove `isUserConfirmation` and `searchAlreadyDone`. Add new params:

```typescript
const decideWebSearchMode = async (options: {
    model: unknown
    recentMessages: unknown[]
    isPaperMode: boolean
    currentStage: PaperStageId | "completed" | undefined | null
    stagePolicy: "active" | "passive" | "none"
    previousSearchDone: boolean
    previousSearchSourceCount?: number
    researchStatus?: { incomplete: boolean; requirement?: string }
}): Promise<{ enableWebSearch: boolean; confidence: number; reason: string }> => {
```

**Step 2: Remove the two hard guardrails inside the function**

Remove these blocks (lines 1048-1065):

```typescript
// REMOVE: isUserConfirmation hard return
if (options.isUserConfirmation && options.isPaperMode) {
    return { enableWebSearch: false, confidence: 0.95, reason: "user_confirmation_prefer_paper_tools" }
}

// REMOVE: searchAlreadyDone hard return
if (options.searchAlreadyDone && options.isPaperMode) {
    return { enableWebSearch: false, confidence: 0.9, reason: "search_already_done_prefer_paper_tools" }
}
```

**Step 3: Enhance the paperModeContext in the router prompt**

Replace the current `paperModeContext` string with enriched context:

```typescript
const paperModeContext = options.isPaperMode
    ? `

IMPORTANT CONTEXT - PAPER MODE ACTIVE:
Current stage: ${options.currentStage ?? "unknown"}
Stage policy: ${options.stagePolicy.toUpperCase()}
Research status: ${options.researchStatus?.incomplete
    ? `INCOMPLETE — ${options.researchStatus.requirement}`
    : "complete (sufficient references exist)"}
Previous search: ${options.previousSearchDone
    ? `done (${options.previousSearchSourceCount ?? "unknown"} sources found)`
    : "not done yet"}

Stage policy rules (MUST follow):
- ACTIVE policy: enable search if the conversation needs factual data, references, or the user/AI
  expressed intent to search. Even if the user sends a short confirmation like "ya" or "ok",
  consider what the AI previously proposed — if AI asked "shall I search?", the confirmation
  means YES to search.
- PASSIVE policy: enable search ONLY if the user EXPLICITLY requests it (e.g., "cari referensi",
  "search for..."). Do NOT enable for general discussion.
- If previous search is done AND research is complete, prefer enableWebSearch=false
  UNLESS the user explicitly asks for MORE references/data.
- If research is INCOMPLETE and no search has been done, strongly prefer enableWebSearch=true.`
    : ""
```

#### Part B: Replace the search decision block

**Step 4: Rewrite the decision block (lines 1878-1994)**

Replace the dual-path logic with a unified flow:

```typescript
// ════════════════════════════════════════════════════════════════
// Search Mode Decision — Unified LLM Router
// Pre-router guardrails (structural/data) → LLM router → post-decision notes
// ════════════════════════════════════════════════════════════════
let activeStageSearchReason = ""
let activeStageSearchNote = ""
let searchRequestedByPolicy = false

// --- Pre-router guardrails (deterministic, structural) ---
if (compileDaftarPustakaIntent && !!paperModePrompt) {
    searchRequestedByPolicy = false
    activeStageSearchReason = "compile_daftar_pustaka_intent"
    activeStageSearchNote = getFunctionToolsModeNote("Compile bibliography")
    console.log("[SearchDecision] Compile intent override: enableWebSearch=false")
} else if (forcePaperToolsMode) {
    searchRequestedByPolicy = false
    activeStageSearchReason = "force_paper_tools_mode"
    console.log("[SearchDecision] Force paper tools: no session yet")
} else if (explicitSyncRequest && !!paperModePrompt) {
    searchRequestedByPolicy = false
    activeStageSearchReason = "explicit_sync_request"
    activeStageSearchNote = getFunctionToolsModeNote("Session state sync")
    console.log("[SearchDecision] Explicit sync override: enableWebSearch=false")
} else {
    // --- Unified LLM router for ALL stages (ACTIVE + PASSIVE + chat) ---
    const { incomplete, requirement } = paperSession
        ? isStageResearchIncomplete(
            paperSession.stageData as Record<string, unknown> | undefined,
            currentStage as PaperStageId
          )
        : { incomplete: false, requirement: undefined }

    const webSearchDecision = await decideWebSearchMode({
        model,
        recentMessages: recentForRouter,
        isPaperMode: !!paperModePrompt,
        currentStage,
        stagePolicy,
        previousSearchDone: searchAlreadyDone,
        previousSearchSourceCount: undefined, // TODO: extract from stageData if needed
        researchStatus: { incomplete, requirement },
    })

    const routerFailed = ["router_invalid_json_shape", "router_json_parse_failed"].includes(
        webSearchDecision.reason
    )
    const explicitSearchRequest = lastUserContent
        ? isExplicitSearchRequest(lastUserContent)
        : false
    const explicitSearchFallback = routerFailed && explicitSearchRequest

    // For PASSIVE stages, trust the router (prompt says "ONLY if explicit request")
    // plus keep explicitSearchRequest as fallback.
    // For ACTIVE stages, trust the router fully.
    // For chat mode (non-paper), no restriction.
    const stagePolicyAllowsSearch = !paperModePrompt
        ? true
        : stagePolicy === "active"
            ? true
            : stagePolicy === "passive"
                ? explicitSearchRequest || webSearchDecision.enableWebSearch
                : explicitSearchRequest

    searchRequestedByPolicy = stagePolicyAllowsSearch
        && (webSearchDecision.enableWebSearch || explicitSearchFallback || explicitSearchRequest)

    activeStageSearchReason = webSearchDecision.reason

    // Post-decision: inject appropriate system note
    if (!searchRequestedByPolicy && !!paperModePrompt) {
        if (incomplete) {
            activeStageSearchNote = getResearchIncompleteNote(
                currentStage as string,
                requirement ?? ""
            )
        } else if (searchAlreadyDone) {
            activeStageSearchNote = getFunctionToolsModeNote("Search completed")
        } else {
            activeStageSearchNote = PAPER_TOOLS_ONLY_NOTE
        }
    }

    console.log(
        `[SearchDecision] Unified router: ${activeStageSearchReason}, ` +
        `confidence: ${webSearchDecision.confidence}, ` +
        `searchAlreadyDone: ${searchAlreadyDone}, ` +
        `searchRequestedByPolicy: ${searchRequestedByPolicy}`
    )
}
```

Key changes from current code:
- Removed the entire `stagePolicy === "active"` branch with its 3-layer regex logic
- Removed the separate `stagePolicy !== "active"` branch
- Single `decideWebSearchMode` call for all paths
- `explicitSyncRequest` moved to pre-router guardrails (was post-decision override)
- System note injection based on data, not regex results

#### Part C: Clean up imports and local functions

**Step 5: Update imports from paper-search-helpers**

The import statement at route.ts:23-30 imports several functions. Remove:
- `aiIndicatedSearchIntent`
- `aiIndicatedSaveIntent`
- `isExplicitSaveSubmitRequest`
- `isExplicitMoreSearchRequest`
- `isUserConfirmation` (was used in deleted ACTIVE block)

Keep:
- `isStageResearchIncomplete`
- `isCompileDaftarPustakaIntent`
- `PAPER_TOOLS_ONLY_NOTE`
- `getResearchIncompleteNote`
- `getFunctionToolsModeNote`

**Step 6: Check `getLastAssistantMessage` usage**

After removing the ACTIVE stage block, `getLastAssistantMessage` (imported from paper-search-helpers)
was only used to feed `aiIndicatedSearchIntent` and `aiIndicatedSaveIntent`. Search route.ts for
any other usage. If none found, remove from imports. (The function stays in paper-search-helpers.ts
as a utility, just not imported here anymore.)

**Step 7: Check `isUserConfirmationMessage` usage (local function, route.ts:1014-1037)**

This local function was called to produce `isUserConfirmation` passed to `decideWebSearchMode`.
Since we removed that parameter, check if `isUserConfirmationMessage` is used anywhere else in
route.ts. If not, remove the function entirely.

**Step 8: Run tests**

Run: `npx vitest run`
Expected: All tests pass. Type-check: `npx tsc --noEmit` — no errors.

**Step 9: Manual verification scenarios**

Test these scenarios mentally against the new code:
1. AI: "Shall I search?" → User: "ya" → Router sees conversation → enableWebSearch=true ✅
2. User: "simpan" → Router sees save intent → enableWebSearch=false ✅
3. searchAlreadyDone + research complete + user: "ok" → Router sees context → enableWebSearch=false ✅
4. searchAlreadyDone + user: "cari lagi tentang X" → Router sees explicit request → enableWebSearch=true ✅
5. PASSIVE stage + user: "lanjut" → Router sees passive policy → enableWebSearch=false ✅
6. PASSIVE stage + user: "cari referensi" → Router sees explicit request → enableWebSearch=true ✅

**Step 10: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor: unify search mode decision under LLM router for all stages

- Remove regex-based 3-layer protection for ACTIVE stages
- Remove hard guardrails (isUserConfirmation, searchAlreadyDone) from router
- Enhance router prompt with research status and search history context
- Keep structural pre-router guardrails (compileDaftarPustaka, forcePaperTools, explicitSync)
- Clean up unused imports and local functions"
```

---

### Task 5: Clean Up paper-search-helpers.ts

**Files:**
- Modify: `src/lib/ai/paper-search-helpers.ts`
- Modify: `__tests__/paper-search-helpers-notes.test.ts` (if needed)

**Step 1: Remove unused functions**

Remove these functions (no longer imported anywhere after Task 4):
- `aiIndicatedSearchIntent` (lines 76-100)
- `aiIndicatedSaveIntent` (lines 125-143)
- `isExplicitSaveSubmitRequest` (lines 105-119)
- `isExplicitMoreSearchRequest` (lines 183-209)

**Step 2: Check `getLastAssistantMessage` usage**

If Task 4 Step 6 confirmed it's no longer imported in route.ts, search the ENTIRE codebase
for any remaining imports. If zero imports found, remove the function from this file too.
If used elsewhere, keep.

**Step 3: Check `isUserConfirmation` usage**

After Task 4 removed the ACTIVE block and its import, search the ENTIRE codebase for any
remaining imports of `isUserConfirmation` from this file. If zero imports found, this function
is dead code. Remove it. (The handoff says "keep for UI/UX" but if nothing imports it,
it's dead code. Can be re-added when a UI/UX use case emerges.)

**Step 4: Verify no other imports of removed functions exist**

Search the codebase for any remaining imports of the removed functions. If found, update those files too.

**Step 5: Keep these functions (confirmed used)**

- `isStageResearchIncomplete` — used as context source in Task 4
- `isCompileDaftarPustakaIntent` — pre-router guardrail
- `PAPER_TOOLS_ONLY_NOTE` — system note injection
- `getResearchIncompleteNote` — system note injection
- `getFunctionToolsModeNote` — system note injection
- `STAGE_RESEARCH_REQUIREMENTS` — data source for `isStageResearchIncomplete`

**Step 6: Update file header comment**

Replace the current header:
```typescript
/**
 * Paper Search Decision Helpers
 *
 * Deterministic helpers for search decision in paper workflow.
 * These bypass the non-deterministic LLM router for ACTIVE stages.
 *
 * 3-Layer Protection:
 * 1. Task-based: Check stageData completion (referensi fields)
 * 2. Intent-based: Check AI's previous promise to search
 * 3. Language-based: Check explicit save/submit patterns
 */
```

With:
```typescript
/**
 * Paper Search Helpers
 *
 * Data-based helpers and system notes for the paper workflow search system.
 * Search mode decisions are made by the LLM router (decideWebSearchMode in route.ts).
 * This file provides:
 * - Research completeness checks (data-based, used as LLM router context)
 * - System notes injected based on search mode decisions
 * - Utility functions (isCompileDaftarPustakaIntent)
 */
```

**Step 7: Run tests**

Run: `npx vitest run`
Expected: All tests pass.

**Step 8: Commit**

```bash
git add src/lib/ai/paper-search-helpers.ts __tests__/paper-search-helpers-notes.test.ts
git commit -m "refactor: remove unused regex functions from paper-search-helpers"
```

---

### Task 6: Update Architecture Docs

**Files:**
- Modify: `docs/search-tool-skills/architecture-constraints.md`
- Modify: `docs/search-tool-skills/README.md` (if applicable)

**Step 1: Update architecture-constraints.md**

In the "Paper Stage Architecture" section (lines 101-118), update to reflect:
- Search mode decisions now unified under LLM router
- Regex-based 3-layer protection removed
- `isStageResearchIncomplete` kept as context source, not hard gate

**Step 2: Update Workflow Control row in Separation of Concerns table**

Change from:
```
| Workflow Control | WHEN tools are available and what mode is active | route.ts, paper-search-helpers.ts, search-execution-mode.ts |
```
To:
```
| Workflow Control | WHEN tools are available and what mode is active | route.ts (LLM router + structural guardrails), paper-search-helpers.ts (system notes + data checks) |
```

**Step 3: Commit**

```bash
git add docs/search-tool-skills/
git commit -m "docs: update architecture docs for unified LLM router"
```

---

### Task 7: Integration Verification

**No files to modify — verification only.**

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 3: Lint check**

Run: `npx eslint src/app/api/chat/route.ts src/lib/ai/paper-search-helpers.ts src/lib/ai/paper-mode-prompt.ts src/lib/ai/web-search/orchestrator.ts`
Expected: No lint errors (or only pre-existing ones).

**Step 4: Verify no remaining references to removed functions**

Search for: `aiIndicatedSearchIntent`, `aiIndicatedSaveIntent`, `isExplicitSaveSubmitRequest`, `isExplicitMoreSearchRequest`
Expected: Zero matches outside of test files, docs, and git history.

**Step 5: Review console.log output format**

Verify all `[SearchDecision]` log lines are consistent and include enough context for debugging.

**Step 6: Commit any fixes**

If any issues found, fix and commit.
