# Compose Directive Injection — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix compose model "hanging" by injecting a compose-phase directive that tells Gemini to synthesize search results immediately instead of generating search promises.

**Architecture:** Two changes to the orchestrator's compose context assembly: (1) a new `COMPOSE_PHASE_DIRECTIVE` constant injected as a system message between SKILL.md instructions and search results, (2) exclusion of `paperWorkflowReminder` from compose context. Plus one minor change to strengthen `buildSearchResultsContext()` language. No regex, no string filtering, no new source files (1 test file added).

**Tech Stack:** TypeScript, AI SDK v5 (`streamText`), Vitest

**Design doc:** `docs/search-tool-skills/enforcement/compose-directive-injection/design.md`

---

### Task 1: Add COMPOSE_PHASE_DIRECTIVE + inject into compose context

> Tasks 1 and 2 from the original plan are merged because they modify the same file.
> Splitting them would create an intermediate state where the constant is unused (ESLint `no-unused-vars` error).

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts:1-22` (add constant after imports)
- Modify: `src/lib/ai/web-search/orchestrator.ts:149-165` (compose message assembly)

**Step 1: Add the directive constant**

Add after existing imports (after line 21), before the `executeWebSearch` function:

```typescript
/**
 * Compose Phase Directive — injected into compose context to prevent
 * the model from generating search promises instead of synthesizing results.
 *
 * Addresses:
 * - RC-1: No compose-only directive (model doesn't know it's in compose phase)
 * - RC-2: Tool references from systemPrompt/paperModePrompt without tools available
 * - RC-3: Dialog-first instruction conflict
 * - RC-4: Conversation pattern continuation
 *
 * Must be in English per architecture constraint (model instructions in English).
 */
const COMPOSE_PHASE_DIRECTIVE = `
═══════════════════════════════════════════════════════════════════
COMPOSE PHASE — SEARCH ALREADY COMPLETED
═══════════════════════════════════════════════════════════════════

You are in the COMPOSE phase of a two-pass search flow.
Web search has ALREADY been executed. The search results are provided below.

YOUR TASK:
- Synthesize the search results into a comprehensive, well-cited response
- Present your analysis and findings IMMEDIATELY in this response
- Follow the SKILL.md composition guidelines (RESPONSE COMPOSITION, REFERENCE INTEGRITY)

DO NOT:
- Promise to search ("beri aku waktu", "saya akan mencari", "izinkan saya mencari")
- Announce that you will perform a search
- Ask for permission to search
- Reference or attempt to use tools (no tools are available in this phase)

OVERRIDE — the following instructions from other system messages DO NOT APPLY here:
- Any "dialog first" / "tanya dulu sebelum generate" instructions — present results NOW
- Any "web search mandatory" instructions — search is ALREADY DONE
- Any tool usage instructions (startPaperSession, updateStageData, createArtifact, google_search) — NO tools available
- Any "call startPaperSession IMMEDIATELY" instructions — not applicable

The search results below are your source material. Use them.
═══════════════════════════════════════════════════════════════════
`.trim()
```

**Step 2: Modify compose message assembly**

Replace the current `composeSystemMessages` block (lines 150-165):

```typescript
// CURRENT CODE (lines 150-165):
const composeSystemMessages: Array<{ role: "system"; content: string }> = [
    { role: "system", content: config.systemPrompt },
    ...(config.paperModePrompt
      ? [{ role: "system" as const, content: config.paperModePrompt }]
      : []),
    ...(config.paperWorkflowReminder
      ? [{ role: "system" as const, content: config.paperWorkflowReminder }]
      : []),
    ...(skillInstructions
      ? [{ role: "system" as const, content: skillInstructions }]
      : []),
    { role: "system", content: searchResultsContext },
    ...(config.fileContext
      ? [{ role: "system" as const, content: `File Context:\n\n${config.fileContext}` }]
      : []),
  ]
```

Replace with:

```typescript
// Build compose system messages
// NOTE: paperWorkflowReminder is EXCLUDED — it instructs "call startPaperSession
// IMMEDIATELY" which is irrelevant and harmful in compose phase (no tools available).
// COMPOSE_PHASE_DIRECTIVE overrides conflicting instructions from systemPrompt and
// paperModePrompt (tool references, dialog-first, web-search-mandatory).
const composeSystemMessages: Array<{ role: "system"; content: string }> = [
    { role: "system", content: config.systemPrompt },
    ...(config.paperModePrompt
      ? [{ role: "system" as const, content: config.paperModePrompt }]
      : []),
    // paperWorkflowReminder intentionally excluded from compose phase
    ...(skillInstructions
      ? [{ role: "system" as const, content: skillInstructions }]
      : []),
    { role: "system", content: COMPOSE_PHASE_DIRECTIVE },
    { role: "system", content: searchResultsContext },
    ...(config.fileContext
      ? [{ role: "system" as const, content: `File Context:\n\n${config.fileContext}` }]
      : []),
  ]
```

**Step 3: Verify no lint errors**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills-v2 && npx eslint src/lib/ai/web-search/orchestrator.ts --no-error-on-unmatched-pattern`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts
git commit -m "feat: add COMPOSE_PHASE_DIRECTIVE, inject into compose context, exclude paperWorkflowReminder"
```

---

### Task 2: Strengthen buildSearchResultsContext language

**Files:**
- Modify: `src/lib/ai/search-results-context.ts:27-32`

**Step 1: Write the failing test**

Create test file `__tests__/search-results-context.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { buildSearchResultsContext } from "@/lib/ai/search-results-context"

describe("buildSearchResultsContext", () => {
  it("uses imperative language indicating search is completed", () => {
    const result = buildSearchResultsContext(
      [{ url: "https://example.com", title: "Example" }],
      "Some search text"
    )
    expect(result).toContain("SEARCH RESULTS (COMPLETED)")
    expect(result).toContain("Web search has been executed")
    expect(result).toContain("MUST synthesize these sources")
    // Must NOT contain old passive language
    expect(result).not.toContain("You have the following sources from web search")
  })

  it("returns no-sources message when sources array is empty", () => {
    const result = buildSearchResultsContext([], "")
    expect(result).toContain("No sources found")
  })

  it("includes source list with numbered entries", () => {
    const result = buildSearchResultsContext(
      [
        { url: "https://a.com", title: "Source A" },
        { url: "https://b.com", title: "Source B" },
      ],
      ""
    )
    expect(result).toContain("1. Source A — https://a.com")
    expect(result).toContain("2. Source B — https://b.com")
  })

  it("includes search findings when provided", () => {
    const result = buildSearchResultsContext(
      [{ url: "https://a.com", title: "A" }],
      "Raw search text here"
    )
    expect(result).toContain("Search findings")
    expect(result).toContain("Raw search text here")
    expect(result).toContain("do NOT copy verbatim")
  })

  it("omits search findings section when searchText is empty", () => {
    const result = buildSearchResultsContext(
      [{ url: "https://a.com", title: "A" }],
      ""
    )
    expect(result).not.toContain("Search findings")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills-v2 && npx vitest run __tests__/search-results-context.test.ts`
Expected: FAIL — `"SEARCH RESULTS (COMPLETED)"` not found (current code says `"## SEARCH RESULTS"`)

**Step 3: Update buildSearchResultsContext**

In `src/lib/ai/search-results-context.ts`, replace lines 27-32:

```typescript
// CURRENT (lines 27-32):
  return `## SEARCH RESULTS
You have the following sources from web search.
Use ONLY these sources for citations. Do not fabricate or guess URLs.

Sources:
${sourceList}${searchFindings}`
```

Replace with:

```typescript
  return `## SEARCH RESULTS (COMPLETED)
Web search has been executed. The following sources were retrieved.
You MUST synthesize these sources in your response. Do not fabricate or guess URLs.

Sources:
${sourceList}${searchFindings}`
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills-v2 && npx vitest run __tests__/search-results-context.test.ts`
Expected: PASS — all 5 tests green

**Step 5: Commit**

```bash
git add src/lib/ai/search-results-context.ts __tests__/search-results-context.test.ts
git commit -m "feat: strengthen search results context language to imperative

Defense-in-depth: searchResultsContext now says 'COMPLETED' and 'MUST synthesize'
instead of passive 'You have the following sources'."
```

---

### Task 3: Run full lint + existing tests

**Files:**
- No file changes — verification only

**Step 1: Run ESLint on modified files**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills-v2 && npx eslint src/lib/ai/web-search/orchestrator.ts src/lib/ai/search-results-context.ts --no-error-on-unmatched-pattern`
Expected: No errors

**Step 2: Run all tests**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/search-tool-skills-v2 && npx vitest run`
Expected: All tests pass (including new search-results-context tests)

**Step 3: Commit (only if lint autofix changed anything)**

If lint --fix changes anything:
```bash
git add -u
git commit -m "chore: lint fixes"
```

---

### Task 4: Manual verification checklist

No code changes. Verify the implementation matches design doc success criteria.

**Checklist:**

1. [ ] `COMPOSE_PHASE_DIRECTIVE` is in English (architecture constraint)
2. [ ] Directive says search is DONE — addresses RC-1
3. [ ] Directive says DO NOT promise to search — addresses RC-1
4. [ ] Directive says NO tools available — addresses RC-2
5. [ ] Directive overrides dialog-first — addresses RC-3
6. [ ] Directive overrides web-search-mandatory — addresses RC-2
7. [ ] Directive overrides tool usage instructions — addresses RC-2
8. [ ] `paperWorkflowReminder` excluded from compose — addresses RC-2
9. [ ] `paperModePrompt` passed as-is (no filtering/regex) — respects constraint
10. [ ] `searchResultsContext` uses imperative language — defense-in-depth
11. [ ] Directive positioned AFTER skillInstructions, BEFORE searchResultsContext
12. [ ] `SKILL.md` NOT modified — compose directive handles mode awareness only
13. [ ] `getPaperModeSystemPrompt()` NOT modified — works for non-compose contexts
14. [ ] No new files created (only 2 files modified + 1 test file)
15. [ ] No regex used in solution
