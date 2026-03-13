# Priority Search Targeting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add priority source guidance to both retriever and compose phases so authoritative sources (academic DBs, Indonesian universities, reputable media) appear more frequently in search results.

**Architecture:** Dual-layer natural language guidance. Layer 1 extends the existing retriever user message hint with priority source names. Layer 2 adds a new PRIORITY SOURCES section to SKILL.md and enriches stage context subsections. No code filters, no API changes, no new pipeline steps.

**Tech Stack:** TypeScript, Vitest, SKILL.md (natural language instructions)

**Design doc:** `docs/search-tool-skills/enforcement/priority-sources/design-priority-search-targeting.md`

---

## Task 1: Test Layer 1 — Search System Prompt Priority Hints

**Files:**
- Create: `__tests__/search-system-prompt.test.ts`

**Step 1: Write the tests**

```typescript
import { describe, it, expect } from "vitest"
import {
  getSearchSystemPrompt,
  augmentUserMessageForSearch,
} from "@/lib/ai/search-system-prompt"

describe("getSearchSystemPrompt", () => {
  it("returns a non-empty system prompt", () => {
    const prompt = getSearchSystemPrompt()
    expect(prompt).toBeTruthy()
    expect(prompt).toContain("research assistant")
  })
})

describe("augmentUserMessageForSearch", () => {
  it("appends search hints to the last user message", () => {
    const messages = [
      { role: "system", content: "system prompt" },
      { role: "user", content: "What is AI?" },
    ]
    const result = augmentUserMessageForSearch(messages)
    expect(result[1].content).toContain("What is AI?")
    expect(result[1].content).toContain("Search broadly")
  })

  it("includes priority source hints for academic databases", () => {
    const messages = [{ role: "user", content: "test query" }]
    const result = augmentUserMessageForSearch(messages)
    const content = result[0].content as string
    expect(content).toContain("Google Scholar")
    expect(content).toContain("Scopus")
    expect(content).toContain("SINTA")
    expect(content).toContain("Garuda")
    expect(content).toContain("ResearchGate")
  })

  it("includes priority source hints for Indonesian universities", () => {
    const messages = [{ role: "user", content: "test query" }]
    const result = augmentUserMessageForSearch(messages)
    const content = result[0].content as string
    expect(content).toContain("UI")
    expect(content).toContain("UGM")
    expect(content).toContain("ITB")
    expect(content).toContain("UIN")
    expect(content).toContain("Unair")
  })

  it("includes priority source hints for Indonesian media", () => {
    const messages = [{ role: "user", content: "test query" }]
    const result = augmentUserMessageForSearch(messages)
    const content = result[0].content as string
    expect(content).toContain("Kompas")
    expect(content).toContain("Tempo")
    expect(content).toContain("Republika")
  })

  it("includes non-exclusion clause", () => {
    const messages = [{ role: "user", content: "test query" }]
    const result = augmentUserMessageForSearch(messages)
    const content = result[0].content as string
    expect(content).toContain("do not exclude other credible sources")
  })

  it("does not mutate original messages array", () => {
    const messages = [{ role: "user", content: "original" }]
    const result = augmentUserMessageForSearch(messages)
    expect(messages[0].content).toBe("original")
    expect(result[0].content).not.toBe("original")
  })

  it("modifies only the last user message when multiple exist", () => {
    const messages = [
      { role: "user", content: "first question" },
      { role: "assistant", content: "response" },
      { role: "user", content: "second question" },
    ]
    const result = augmentUserMessageForSearch(messages)
    expect(result[0].content).toBe("first question")
    expect(result[2].content).toContain("second question")
    expect(result[2].content).toContain("Google Scholar")
  })

  it("returns messages unchanged if no user message exists", () => {
    const messages = [{ role: "system", content: "sys" }]
    const result = augmentUserMessageForSearch(messages)
    expect(result).toEqual(messages)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/search-system-prompt.test.ts`

Expected: Tests for priority source names (Google Scholar, Scopus, SINTA, Kompas, etc.) FAIL because the current hint string does not contain them. Tests for basic behavior (non-empty prompt, append to last user message, no mutation) PASS.

**Step 3: Commit tests (mix of passing and failing)**

Tests that PASS now (basic behavior): `returns a non-empty system prompt`, `appends search hints to the last user message`, `does not mutate original messages array`, `modifies only the last user message when multiple exist`, `returns messages unchanged if no user message exists`.

Tests that FAIL now (priority sources not yet in hint): `includes priority source hints for academic databases`, `includes priority source hints for Indonesian universities`, `includes priority source hints for Indonesian media`, `includes non-exclusion clause`.

```bash
git add __tests__/search-system-prompt.test.ts
git commit -m "test: add search-system-prompt tests with priority source assertions"
```

---

## Task 2: Implement Layer 1 — Extend Retriever Hint String

**Files:**
- Modify: `src/lib/ai/search-system-prompt.ts:27` (the hint string in `augmentUserMessageForSearch`)

**Step 1: Extend the hint string**

Replace the existing hint string at line 27:

```typescript
content: `${result[i].content}\n\n[Search broadly. Cite at least 10 sources from many different domains. Include both domestic and international sources. Do not over-rely on any single domain. When relevant, prioritize including sources from: academic databases (Google Scholar, Scopus, ResearchGate, SINTA, Garuda), Indonesian university repositories (UI, UGM, ITB, UIN, Unair), and reputable Indonesian media (Kompas, Tempo, Republika). These are preferred sources — do not exclude other credible sources.]`,
```

No signature, parameter, or logic changes. String extension only.

**Step 2: Run tests to verify they pass**

Run: `npx vitest run __tests__/search-system-prompt.test.ts`

Expected: ALL tests PASS.

**Step 3: Run full test suite to verify no regressions**

Run: `npx vitest run`

Expected: All 520+ tests pass.

**Step 4: Commit**

```bash
git add src/lib/ai/search-system-prompt.ts
git commit -m "feat: add priority source hints to search retriever user message"
```

---

## Task 3: Implement Layer 2A — Add PRIORITY SOURCES Section to SKILL.md

**Files:**
- Modify: `src/lib/ai/skills/web-search-quality/SKILL.md` (insert new section between `## BLOCKED DOMAINS` and `## RESEARCH SOURCE STRATEGY`)

**Step 1: Add the new section**

Insert after the `## BLOCKED DOMAINS` section (after line 19) and before `## RESEARCH SOURCE STRATEGY` (currently line 21):

```markdown
## PRIORITY SOURCES

The following source categories are preferred when available in search results.
This is guidance, not a hard requirement — do not exclude other credible sources,
and do not force these sources if they are not relevant to the query.

### Academic & Research Databases
Google Scholar, Scopus, ResearchGate, SINTA (sinta.kemdikbud.go.id),
Garuda (garuda.kemdikbud.go.id) — prioritize for empirical data,
peer-reviewed findings, and literature mapping.

### Indonesian University Repositories
UI (lib.ui.ac.id), UGM (etd.repository.ugm.ac.id),
ITB (digilib.itb.ac.id), UIN, Unair — prioritize for
Indonesian-context research, theses, and local empirical studies.

### Reputable Indonesian Media
Kompas, Tempo, Republika — prioritize for current events,
policy analysis, and Indonesian socio-cultural context.

### How to Apply
- When multiple sources cover the same claim, prefer priority sources
  over generic or lesser-known sources.
- Priority sources that provide PRIMARY DATA are stronger than
  priority sources that only aggregate.
- If NO priority sources appear in search results, proceed normally
  with available sources — do not mention their absence to the user.
- In paper mode, weight academic sources higher; in chat mode,
  weight media and current-event sources appropriately.
```

**Step 2: Verify SKILL.md parses correctly**

Run: `npx vitest run __tests__/skills/web-search-quality-index.test.ts`

Expected: All existing tests PASS (parser handles new section without issues).

**Step 3: Commit**

```bash
git add src/lib/ai/skills/web-search-quality/SKILL.md
git commit -m "feat: add PRIORITY SOURCES section to web-search-quality SKILL.md"
```

---

## Task 4: Implement Layer 2B — Enrich STAGE CONTEXT Subsections in SKILL.md

**Files:**
- Modify: `src/lib/ai/skills/web-search-quality/SKILL.md` (append to each `### stage` subsection within `## STAGE CONTEXT`)

**Step 1: Add priority source references to each active stage and default**

Append one sentence to each of these subsections in `## STAGE CONTEXT`:

**`### gagasan`** — append:
```
Leverage priority academic databases and reputable media to map the research landscape broadly.
```

**`### topik`** — append:
```
Use priority academic databases and university repositories to assess where the literature is dense vs sparse.
```

**`### tinjauan_literatur`** — append:
```
Heavily leverage priority academic databases (Scopus, Google Scholar, SINTA) and Indonesian university repositories for comprehensive literature coverage.
```

**`### pendahuluan`** — append:
```
Use priority academic databases for theoretical grounding and reputable media for establishing real-world problem significance.
```

**`### metodologi`** — append:
```
Use priority academic databases to find methodological precedent and similar study designs.
```

**`### diskusi`** — append:
```
Cross-reference findings using priority academic databases and reputable media for contextual analysis.
```

**`### default`** — append:
```
When priority sources are available in search results, prefer them over generic sources while maintaining source diversity.
```

Do NOT touch the 8 passive stage subsections — they are not listed in STAGE CONTEXT and fall back to `### default`.

**Step 2: Verify SKILL.md still parses correctly**

Run: `npx vitest run __tests__/skills/web-search-quality-index.test.ts`

Expected: All existing tests PASS.

**Step 3: Commit**

```bash
git add src/lib/ai/skills/web-search-quality/SKILL.md
git commit -m "feat: enrich stage context with priority source references"
```

---

## Task 5: Test Layer 2C — PRIORITY SOURCES Section Loading in index.ts

**Files:**
- Modify: `__tests__/skills/web-search-quality-index.test.ts` (add assertions)

**Step 1: Add test assertions for PRIORITY SOURCES loading**

Add these tests to the existing `describe("web-search-quality skill")` block:

```typescript
it("includes PRIORITY SOURCES section in chat mode instructions", () => {
  const result = webSearchQualitySkill.getInstructions({
    isPaperMode: false,
    currentStage: null,
    hasRecentSources: true,
    availableSources: [{ url: "https://arxiv.org/abs/123", title: "Test" }],
  })
  expect(result).not.toBeNull()
  expect(result).toContain("PRIORITY SOURCES")
  expect(result).toContain("Google Scholar")
  expect(result).toContain("SINTA")
  expect(result).toContain("Kompas")
})

it("includes PRIORITY SOURCES section in paper mode instructions", () => {
  const result = webSearchQualitySkill.getInstructions({
    isPaperMode: true,
    currentStage: "tinjauan_literatur",
    hasRecentSources: true,
    availableSources: [{ url: "https://arxiv.org/abs/123", title: "Test" }],
  })
  expect(result).not.toBeNull()
  expect(result).toContain("PRIORITY SOURCES")
  expect(result).toContain("Google Scholar")
})

it("includes priority source references in active stage guidance", () => {
  const result = webSearchQualitySkill.getInstructions({
    isPaperMode: true,
    currentStage: "tinjauan_literatur",
    hasRecentSources: true,
    availableSources: [{ url: "https://arxiv.org/abs/123", title: "Test" }],
  })
  expect(result).not.toBeNull()
  expect(result).toContain("Heavily leverage priority academic databases")
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/skills/web-search-quality-index.test.ts`

Expected: New tests for "PRIORITY SOURCES" section FAIL because `getInstructions()` does not yet load this section.

**Step 3: Commit failing tests**

```bash
git add __tests__/skills/web-search-quality-index.test.ts
git commit -m "test: add assertions for PRIORITY SOURCES section loading"
```

---

## Task 6: Implement Layer 2C — Load PRIORITY SOURCES in getInstructions()

**Files:**
- Modify: `src/lib/ai/skills/web-search-quality/index.ts:104-110` (add section loading before `researchStrategy`)

**Step 1: Add PRIORITY SOURCES loading**

Insert after `const parts: string[] = []` (line 105) and before the `researchStrategy` loading (line 107):

```typescript
const prioritySources = parsed.sections.get("PRIORITY SOURCES")
if (prioritySources) {
  parts.push(`## PRIORITY SOURCES\n\n${prioritySources}`)
}
```

**Step 2: Clear the SKILL.md parse cache**

The `parseSkillMd()` function caches parsed results. Since we modified SKILL.md in Tasks 3-4, the cache from previous test runs may be stale. Vitest runs each test file in isolation, so this should not be an issue — but verify by running the full skill test suite.

**Step 3: Run tests to verify they pass**

Run: `npx vitest run __tests__/skills/web-search-quality-index.test.ts`

Expected: ALL tests PASS including the new PRIORITY SOURCES assertions.

**Step 4: Run full test suite**

Run: `npx vitest run`

Expected: All 520+ tests pass with zero regressions.

**Step 5: Commit**

```bash
git add src/lib/ai/skills/web-search-quality/index.ts
git commit -m "feat: load PRIORITY SOURCES section in skill getInstructions()"
```

---

## Task 7: Final Verification

**Files:** None (verification only)

**Step 1: Run full test suite**

Run: `npx vitest run`

Expected: All tests pass.

**Step 2: Verify the priority source flow end-to-end by reading final state**

Check these files match design doc expectations:

1. `src/lib/ai/search-system-prompt.ts` — hint string contains all priority source names
2. `src/lib/ai/skills/web-search-quality/SKILL.md` — has `## PRIORITY SOURCES` section between BLOCKED DOMAINS and RESEARCH SOURCE STRATEGY; all 6 active stages + default enriched
3. `src/lib/ai/skills/web-search-quality/index.ts` — `getInstructions()` loads PRIORITY SOURCES before RESEARCH SOURCE STRATEGY

**Step 3: Verify no out-of-scope changes**

Confirm these files are NOT modified:
- `src/lib/ai/web-search/orchestrator.ts`
- `src/lib/ai/web-search/types.ts`
- `src/lib/ai/web-search/retrievers/perplexity.ts`
- `src/lib/ai/web-search/retrievers/grok.ts`
- `src/lib/ai/web-search/retrievers/google-grounding.ts`
