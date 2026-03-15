# Search Anti-Hallucination Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce compose model hallucination by propagating existing source content snippets and adding information sufficiency skill instructions.

**Architecture:** Two layers — Layer 1 propagates `citedText` data that already exists in `NormalizedCitation` but gets dropped before reaching the compose model. Layer 2 adds an INFORMATION SUFFICIENCY section to SKILL.md teaching the compose model to declare gaps instead of fabricating.

**Tech Stack:** TypeScript, Vitest, Vercel AI SDK, Gemini (compose model)

**Spec:** `docs/superpowers/specs/2026-03-15-search-anti-hallucination-design.md`

---

## File Structure

| File | Role | Change Type |
|------|------|-------------|
| `src/lib/ai/search-results-context.ts` | Builds the source list + search findings context for compose | Modify |
| `src/lib/ai/web-search/orchestrator.ts` | Two-pass search flow — Phase 1 retrieve, Phase 2 compose | Modify |
| `src/lib/ai/skills/web-search-quality/SKILL.md` | Natural language skill instructions for compose model | Modify |
| `src/lib/ai/skills/web-search-quality/index.ts` | Skill loader — parses SKILL.md sections via whitelist | Modify |
| `__tests__/search-results-context.test.ts` | Unit tests for `buildSearchResultsContext()` | Modify |

---

## Chunk 1: Layer 1 — Propagate citedText

### Task 1: Update `SearchSource` interface and `buildSearchResultsContext()` rendering

**Files:**
- Modify: `src/lib/ai/search-results-context.ts`
- Modify: `__tests__/search-results-context.test.ts`

- [ ] **Step 1: Write failing tests for citedText in source list**

Add these tests to `__tests__/search-results-context.test.ts`:

```typescript
it("renders snippet when citedText is provided", () => {
  const result = buildSearchResultsContext(
    [{ url: "https://a.com", title: "Source A", citedText: "Key finding from page" }],
    ""
  )
  expect(result).toContain("1. Source A — https://a.com")
  expect(result).toContain("   Snippet: Key finding from page")
})

it("omits snippet line when citedText is absent", () => {
  const result = buildSearchResultsContext(
    [{ url: "https://a.com", title: "Source A" }],
    ""
  )
  expect(result).toContain("1. Source A — https://a.com")
  expect(result).not.toContain("Snippet:")
})

it("renders mixed sources with and without citedText", () => {
  const result = buildSearchResultsContext(
    [
      { url: "https://a.com", title: "Source A", citedText: "Snippet A" },
      { url: "https://b.com", title: "Source B" },
      { url: "https://c.com", title: "Source C", citedText: "Snippet C" },
    ],
    ""
  )
  expect(result).toContain("1. Source A — https://a.com\n   Snippet: Snippet A")
  expect(result).toContain("2. Source B — https://b.com")
  expect(result).not.toContain("2. Source B — https://b.com\n   Snippet:")
  expect(result).toContain("3. Source C — https://c.com\n   Snippet: Snippet C")
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/search-results-context.test.ts`
Expected: FAIL — `citedText` not in `SearchSource` interface, no snippet rendering

- [ ] **Step 3: Implement SearchSource interface change and rendering**

In `src/lib/ai/search-results-context.ts`:

Add `citedText?: string` to `SearchSource` interface:

```typescript
interface SearchSource {
  url: string
  title: string
  tier?: string
  score?: number
  citedText?: string
}
```

Update the `.map()` in `buildSearchResultsContext()` to render snippets:

```typescript
const sourceList = sources
  .map((s, i) => {
    const tierLabel = s.tier ? ` (${s.tier})` : ""
    const snippet = s.citedText ? `\n   Snippet: ${s.citedText}` : ""
    return `${i + 1}. ${s.title} — ${s.url}${tierLabel}${snippet}`
  })
  .join("\n")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/search-results-context.test.ts`
Expected: ALL PASS (existing tests + new tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/search-results-context.ts __tests__/search-results-context.test.ts
git commit -m "feat(search): add citedText to SearchSource and render snippets in compose context"
```

---

### Task 2: Propagate citedText through orchestrator

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts:162-166` (scoredSources mapping)
- Modify: `src/lib/ai/web-search/orchestrator.ts:189` (buildSearchResultsContext call site)

- [ ] **Step 1: Update scoredSources mapping to include citedText**

In `src/lib/ai/web-search/orchestrator.ts`, change the `scoredSources` mapping at line 162-166 from:

```typescript
const scoredSources = sources.map((c) => ({
  url: c.url,
  title: c.title || c.url,
  ...(typeof c.publishedAt === "number" ? { publishedAt: c.publishedAt } : {}),
}))
```

To:

```typescript
const scoredSources = sources.map((c) => ({
  url: c.url,
  title: c.title || c.url,
  ...(typeof c.publishedAt === "number" ? { publishedAt: c.publishedAt } : {}),
  ...(c.citedText ? { citedText: c.citedText } : {}),
}))
```

- [ ] **Step 2: Update buildSearchResultsContext call site to pass citedText**

In `src/lib/ai/web-search/orchestrator.ts`, change the `buildSearchResultsContext()` call at line 188-191 from:

```typescript
searchResultsContext = buildSearchResultsContext(
  scoredSources.map((s) => ({ url: s.url, title: s.title })),
  cleanSearchText,
)
```

To:

```typescript
searchResultsContext = buildSearchResultsContext(
  scoredSources.map((s) => ({
    url: s.url,
    title: s.title,
    ...(s.citedText ? { citedText: s.citedText } : {}),
  })),
  cleanSearchText,
)
```

- [ ] **Step 3: Run existing tests to verify no regression**

Run: `npx vitest run __tests__/search-results-context.test.ts __tests__/citation-normalizer.test.ts`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts
git commit -m "feat(search): propagate citedText through orchestrator to compose context"
```

---

## Chunk 2: Layer 2 — SKILL.md Information Sufficiency

### Task 3: Add INFORMATION SUFFICIENCY section to SKILL.md

**Files:**
- Modify: `src/lib/ai/skills/web-search-quality/SKILL.md`

- [ ] **Step 1: Add the new section**

In `src/lib/ai/skills/web-search-quality/SKILL.md`, add the following section after `## REFERENCE INTEGRITY` (after line 136, before `## STAGE CONTEXT` at line 138):

```markdown
## INFORMATION SUFFICIENCY

### Evidence-Based Synthesis Only
Every factual claim in the response must trace to explicit content in the search
findings or source snippets — not inferred from URL structure, domain names,
page titles, or training data.

Title and URL are identifiers, not evidence. They tell you WHERE information
lives, not WHAT the information says.

### Declare Insufficiency When Needed
When available sources lack substantive content to answer the query, state what
was found, what remains unverified, and suggest how the user can refine.

A partial answer with honest gaps is always better than a complete-sounding
answer built on inference.

### No Gap-Filling
Do not supplement thin search results with plausible details from training
knowledge unless explicitly marked as "from general knowledge, not from
search results."

Do not combine fragments from multiple sources into a unified narrative when
there is no evidence the fragments relate to the same entity or context.
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai/skills/web-search-quality/SKILL.md
git commit -m "feat(skill): add INFORMATION SUFFICIENCY section to web-search-quality SKILL.md"
```

---

### Task 4: Register new section in skill loader whitelist

**Files:**
- Modify: `src/lib/ai/skills/web-search-quality/index.ts:122-127`

- [ ] **Step 1: Add INFORMATION SUFFICIENCY to the whitelist**

In `src/lib/ai/skills/web-search-quality/index.ts`, add the following block after the `REFERENCE INTEGRITY` block (after line 125) and before the stage context block (line 127):

```typescript
const informationSufficiency = parsed.sections.get("INFORMATION SUFFICIENCY")
if (informationSufficiency) {
  parts.push(`## INFORMATION SUFFICIENCY\n\n${informationSufficiency}`)
}
```

- [ ] **Step 2: Verify the section is loaded — quick manual check**

Add a temporary `console.log` at the end of `getInstructions()` before the return:

```typescript
console.log("[Skill] sections loaded:", parts.map(p => p.split("\n")[0]))
```

Run the app, trigger a search, check server logs for:
```
[Skill] sections loaded: ["## PRIORITY SOURCES", "## RESEARCH SOURCE STRATEGY", "## RESPONSE COMPOSITION", "## REFERENCE INTEGRITY", "## INFORMATION SUFFICIENCY", "## STAGE CONTEXT"]
```

Remove the `console.log` after verification.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/skills/web-search-quality/index.ts
git commit -m "feat(skill): register INFORMATION SUFFICIENCY in skill loader whitelist"
```

---

## Chunk 3: Update Documentation

### Task 5: Update enforcement doc to reflect citedText propagation

**Files:**
- Modify: `docs/search-tool-skills/enforcement/README.md`

- [ ] **Step 1: Update the Blocklist Strategy section**

In the Blocklist Strategy table (around line 299-306), the `citedText` lifecycle is described as dying in the pipeline. Update to reflect that `citedText` is now propagated to compose context.

Find the `SearchSource` / source list documentation and update to note:
- `citedText` is now propagated from `NormalizedCitation` through `scoredSources` to `buildSearchResultsContext()`
- Source list format now includes optional `Snippet:` lines

- [ ] **Step 2: Update Skill System section**

In the Skill System section, add `INFORMATION SUFFICIENCY` to the table listing SKILL.md sections (around line 289-295):

```
| **INFORMATION SUFFICIENCY** | Prevents hallucination from thin sources — evidence-based synthesis, insufficiency declaration, no gap-filling | Yes |
```

- [ ] **Step 3: Commit**

```bash
git add docs/search-tool-skills/enforcement/README.md
git commit -m "docs: update enforcement doc for citedText propagation and INFORMATION SUFFICIENCY"
```

---

## Verification

After all tasks complete:

- [ ] **Run full test suite**

```bash
npx vitest run __tests__/search-results-context.test.ts __tests__/citation-normalizer.test.ts
```

Expected: ALL PASS

- [ ] **Manual integration test**

1. Start the app locally
2. Trigger a web search query using Google Grounding retriever
3. Check server logs to verify:
   - `citedText` appears in `scoredSources` (add temporary log if needed)
   - `INFORMATION SUFFICIENCY` appears in skill sections loaded
4. Check the compose context includes `Snippet:` lines in source list
5. Test a shallow-data query (e.g., biographical query about an uncommon name) to verify the model declares gaps instead of fabricating
