# Search Anti-Hallucination: Propagate Source Content + Information Sufficiency Skill

**Date:** 2026-03-15
**Status:** Approved
**Branch:** search-tool-skills-v2

## Problem

The compose model in the web search pipeline hallucinates when source information is shallow. Evidence from production: a query "Siapa Erik Supit?" produced fabricated biography details inferred from URL patterns and page titles, not from actual page content.

Root causes identified through code analysis:

1. **Data loss in pipeline:** Google Grounding returns `groundingSupports[].segment.text` (actual page content snippets). The citation normalizer captures this as `NormalizedCitation.citedText`. But `orchestrator.ts:162-166` drops it in the `scoredSources` mapping — it never reaches the compose model. `SearchSource` interface in `search-results-context.ts` has no slot for content.

2. **No insufficiency guidance:** SKILL.md has no instruction for handling situations where available sources lack substantive content. The compose model defaults to speculating from URL semantics, titles, and training knowledge rather than declaring gaps.

## Scope

Two layers, implemented together:

- **Layer 1:** Propagate existing `citedText` data to compose context (code change)
- **Layer 2:** Add INFORMATION SUFFICIENCY section to SKILL.md (skill change)

Out of scope:
- External content extraction (Jina Reader tested — 60% failure rate on Indonesian URLs, 20-32s latency, domain blocks on major sites)
- Tavily as alternative retriever (separate future investigation)
- Frontend changes
- Retriever modifications

## Layer 1: Propagate `citedText` to Compose Context

### Current State

```
Google Grounding → groundingSupports[].segment.text
    → normalizer captures as NormalizedCitation.citedText  ✓
    → orchestrator scoredSources mapping DROPS citedText   ✗
    → buildSearchResultsContext() has no citedText slot    ✗
    → compose model never sees source content snippets     ✗
```

### Changes

**`src/lib/ai/search-results-context.ts`**

Add `citedText?: string` to `SearchSource` interface.

Update `buildSearchResultsContext()` source list rendering:
- With citedText: `1. <title> — <url>\n   Snippet: <citedText>`
- Without citedText: `1. <title> — <url>` (unchanged, backward-compatible)

**`src/lib/ai/web-search/orchestrator.ts`**

Two changes required:

1. Update `scoredSources` mapping at line 162-166 to propagate `citedText`:

```typescript
const scoredSources = sources.map((c) => ({
  url: c.url,
  title: c.title || c.url,
  ...(typeof c.publishedAt === "number" ? { publishedAt: c.publishedAt } : {}),
  ...(c.citedText ? { citedText: c.citedText } : {}),
}))
```

2. Update `buildSearchResultsContext()` call site at line 189 — currently strips `citedText` again:

```typescript
// BEFORE (drops citedText):
scoredSources.map((s) => ({ url: s.url, title: s.title })),

// AFTER (propagates citedText):
scoredSources.map((s) => ({
  url: s.url,
  title: s.title,
  ...(s.citedText ? { citedText: s.citedText } : {}),
})),
```

### What Does NOT Change

- `NormalizedCitation` type — already has `citedText` field
- Citation normalizer — already captures `citedText` from Google Grounding
- Retriever implementations — untouched
- Frontend — no changes

## Layer 2: SKILL.md Information Sufficiency

### New Section: `## INFORMATION SUFFICIENCY`

Added after `## REFERENCE INTEGRITY`, before `## STAGE CONTEXT`.

Content (English, per language policy):

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

### Skill Loader

`src/lib/ai/skills/web-search-quality/index.ts` — `getInstructions()` uses a **whitelist pattern**: it explicitly calls `parsed.sections.get("SECTION NAME")` for each included section. The new section will NOT be auto-discovered.

Required change — add after the `REFERENCE INTEGRITY` block (line 122-125) and before the stage context block (line 127):

```typescript
const informationSufficiency = parsed.sections.get("INFORMATION SUFFICIENCY")
if (informationSufficiency) {
  parts.push(`## INFORMATION SUFFICIENCY\n\n${informationSufficiency}`)
}
```

## Data Flow After Changes

```
Retriever (Phase 1)
    │
    ├── searchText (retriever synthesis — unchanged)
    ├── sources[] with citedText (Google Grounding)
    │   or sources[] without citedText (Perplexity, Grok)
    │
    ▼
orchestrator.ts — scoredSources mapping
    │
    ├── url, title, publishedAt (existing)
    ├── citedText (NEW — propagated if present)
    │
    ▼
buildSearchResultsContext()
    │
    ├── Source list WITH snippets (when available)
    ├── Search findings: <searchText> (unchanged)
    │
    ▼
Compose model receives:
    ├── COMPOSE_PHASE_DIRECTIVE          (unchanged)
    ├── searchResultsContext             (enriched with snippets)
    ├── systemPrompt                     (unchanged)
    ├── SKILL.md                         (+ INFORMATION SUFFICIENCY)
    └── fileContext                      (unchanged)
```

## Scenarios

**A: Google Grounding + data-rich query**
Sources have `citedText` snippets. `searchText` is rich. Model synthesizes normally with better grounding from snippets.

**B: Perplexity/Grok + data-rich query**
No `citedText` (provider doesn't support it). But `searchText` is rich. Model synthesizes normally using searchText.

**C: Any retriever + shallow data (the hallucination case)**
`citedText` empty or thin. `searchText` shallow. INFORMATION SUFFICIENCY kicks in: model declares limitations instead of fabricating.

## Token Budget

Context window: 128K tokens default. Current compose phase uses ~4,100-6,250 tokens (fixed components). Adding `citedText` snippets for 10 sources adds ~500-1,000 tokens. INFORMATION SUFFICIENCY section adds ~200 tokens. Total impact: <1,500 tokens — negligible.

## Files Changed

| File | Change | Layer |
|------|--------|-------|
| `src/lib/ai/search-results-context.ts` | Add `citedText` to `SearchSource`, render snippets | L1 |
| `src/lib/ai/web-search/orchestrator.ts` | Propagate `citedText` in `scoredSources` | L1 |
| `src/lib/ai/skills/web-search-quality/SKILL.md` | Add `## INFORMATION SUFFICIENCY` section | L2 |
| `src/lib/ai/skills/web-search-quality/index.ts` | Add `INFORMATION SUFFICIENCY` to whitelist in `getInstructions()` | L2 |

## Risks

- **Model becomes too conservative:** INFORMATION SUFFICIENCY could make the model refuse to answer too often. Mitigation: tune wording after testing — the instruction says "partial answer with honest gaps is better," not "refuse to answer."
- **`citedText` quality varies:** Google Grounding snippets may be short or decontextualized. Mitigation: snippets are supplementary to `searchText`, not a replacement.

## Future Work (Out of Scope)

- **Tavily as retriever:** Returns `content` + `raw_content` in one API call. Needs cost/reliability evaluation for Indonesian sources. Would be added as a new retriever in the chain, not replacing existing ones.
- **Other content extraction APIs:** Jina Reader tested and found unreliable for Indonesian URLs. Alternative services (Firecrawl, Exa) not yet evaluated.
