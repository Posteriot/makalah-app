# Report 13: Exact Metadata Source of Truth Contract and Final Fix

Date: 2026-04-09
Session: 2
Triggered by: Codex — inconsistent metadata between fresh search and exact inspect paths

---

## Problem Statement

Two runtime paths produced contradictory metadata results for the same article:

| Path | URL inspected | author | publishedAt | siteName |
|------|--------------|--------|-------------|----------|
| test-4 (fresh search) | `/view/32777` (article abstract page) | ✓ recovered | ✓ recovered | ✓ recovered |
| test-6 (exact inspect) | `/view/32777/16455` (galley page) | ❌ unavailable | ❌ unavailable | ❌ unavailable |

Both behaviors were internally explainable but together created an inconsistent product experience. The system had the metadata but could not serve it for the exact URL the user provided.

## Runtime Evidence Comparison

### Fresh search path (test-4)

1. User asked for metadata about the article
2. Search found `https://journal.unpas.ac.id/index.php/pendas/article/view/32777`
3. FetchWeb extracted metadata via `extractStructuredMetadata` (Readability + meta tags)
4. Author, publishedAt, siteName persisted to sourceDocuments
5. Model presented metadata correctly

### Exact inspect path (test-6)

1. User provided galley URL: `.../view/32777/16455`
2. URL specificity tiebreaker selected the galley source (longer URL = higher specificity)
3. Galley source had NO metadata (page lacks meta tags)
4. Article source (`.../view/32777`) existed with metadata but was not selected
5. Model reported "unavailable" for all metadata fields

### Root cause of inconsistency

The URL specificity tiebreaker was designed to prefer the most specific URL match. For the galley URL `/view/32777/16455`:
- Galley source: specificity = 62 chars (exact match, no metadata)
- Article source: specificity = 56 chars (prefix match, HAS metadata)

The galley source won by specificity. The metadata-bearing article source was ignored.

## Final Product Contract Decision

### Chosen contract: **Option B — Canonical Article Metadata**

When the user asks for exact metadata about a URL, the system resolves the URL to the best available metadata source among stored sources that represent the same article.

**Definition of "same article":** Source A is a canonical authority for Source B when A's URL is a **strict prefix** of B's URL. This enforces structural article relationship (e.g., `/view/32777` is prefix of `/view/32777/16455`) and excludes unrelated sources (e.g., portal root `journal.unpas.ac.id/` is NOT treated as article authority even though it's a domain prefix).

**Resolution rule:** If the best URL-specific match has no article-level metadata, but a strict URL prefix source has article-level metadata, use the prefix source as canonical authority.

**Article-level metadata** = author or publishedAt (or both). siteName alone is NOT sufficient — it does not represent article-level authorship or publication metadata. A portal root with only siteName cannot serve as canonical authority for an article.

### Why this is the best choice

1. **Product intent.** When a user pastes `/view/32777/16455` and asks "siapa penulisnya?", they want the article's author. Returning "unavailable" when the system HAS the metadata from the article page is a product failure.

2. **Data already exists.** The search path found and stored the canonical article source with full metadata. The system knows the answer — it just needs to use the right source.

3. **Deterministic.** The canonicalization is based on strict URL prefix relationship + article-level metadata presence. No NLP, no regex on content, no heuristic.

4. **Auditable.** The canonical resolution is logged: `[EXACT-SOURCE] Canonical metadata resolution: /view/32777/16455 → /view/32777 (article-level prefix authority)`. The reviewer can see which source was used and why.

5. **Consistent.** The same article always resolves to the same metadata, whether the user provides the galley URL, article URL, or any other URL variant.

### When canonicalization does NOT happen

- If the exact URL match has article-level metadata (author or publishedAt) → use it directly
- If no strict prefix source has article-level metadata → report unavailable (honest)
- If a portal root has siteName only but no author/publishedAt → NOT used as canonical authority
- If there's only one match → use it (no ambiguity to resolve)

## Exact Files Changed

### Code

| File | Change |
|------|--------|
| `src/lib/ai/exact-source-followup.ts` | Added `hasExactMetadata` helper. Added canonical metadata resolution in `findExplicitMatches`: when URL-specific winner has no metadata, fall back to metadata-bearing prefix match. Logs canonicalization. |
| `src/lib/ai/exact-source-followup.test.ts` | Added 2 tests: (1) canonical resolution prefers metadata-bearing prefix over exact galley match, (2) keeps galley match when it has metadata. |
| `src/lib/ai/exact-source-guardrails.ts` | Generalized metadata field leakage rule from siteName-only to ALL fields (title, author, publishedAt, siteName). Updated both `EXACT_SOURCE_INSPECTION_RULES` and `STRICT METADATA OUTPUT` in force-inspect note. |

### Instruction

| File | Change |
|------|--------|
| `01-gagasan-skill.md` | EXACT METADATA DISCIPLINE: generalized from siteName-specific to all-field no-domain/URL leakage |
| `05-pendahuluan-skill.md` | Same |
| `06-tinjauan-literatur-skill.md` | Same |
| `09-diskusi-skill.md` | Same |
| `12-daftar-pustaka-skill.md` | Same |

## Implementation Summary

### Canonical metadata resolution (`exact-source-followup.ts`)

Two guard functions enforce the contract:

```typescript
function isArticleLevelMetadata(source: ExactSourceSummary): boolean {
  // Require author or publishedAt — siteName alone is not article authority
  return !!(source.author || source.publishedAt)
}

function isUrlPrefixOf(prefixSource: ExactSourceSummary, ofSource: ExactSourceSummary): boolean {
  // Strict URL prefix relationship — not just domain match
  const prefixUrls = [prefixSource.sourceId, prefixSource.originalUrl, prefixSource.resolvedUrl]
    .map(normalizeText).filter(Boolean)
  const ofUrls = [ofSource.sourceId, ofSource.originalUrl, ofSource.resolvedUrl]
    .map(normalizeText).filter(Boolean)
  return prefixUrls.some((prefix) =>
    ofUrls.some((url) => url.startsWith(prefix) && url.length > prefix.length)
  )
}
```

In `findExplicitMatches`, after URL specificity tiebreaker selects a winner:

```typescript
if (winner && !isArticleLevelMetadata(winner)) {
  const canonicalCandidates = scored
    .filter((s) =>
      s.source !== winner &&
      isArticleLevelMetadata(s.source) &&
      isUrlPrefixOf(s.source, winner)  // strict prefix, not just "also matched"
    )
    .sort((a, b) => b.specificity - a.specificity)
  if (canonicalCandidates.length > 0) {
    console.log(`[EXACT-SOURCE] Canonical metadata resolution: ... → ... (article-level prefix authority)`)
    return [canonicalCandidates[0].source]
  }
}
```

Properties:
- Only activates when URL-specific winner lacks article-level metadata (author or publishedAt)
- Candidate must be a strict URL prefix of the winner (structural same-article relationship)
- Candidate must have article-level metadata (author or publishedAt) — siteName alone disqualified
- Portal root with only siteName cannot serve as canonical authority
- Deterministic: URL prefix + metadata presence
- Logged for auditability

### Generalized metadata field leakage (`exact-source-guardrails.ts`)

Previous: siteName-specific rules
Now: ALL metadata fields covered by the same rule:

```
Do not infer any exact metadata field (title, author, published date, site name)
from URLs, slugs, domain names, hostnames, citation labels, or prior prose.
When ANY exact metadata field is unavailable from the tool result, state only that
it is unavailable. Do not append domain, hostname, URL, link, or any commentary
to that field.
```

## Runtime Observability

When canonical resolution happens, these logs appear:

1. `[EXACT-SOURCE] Canonical metadata resolution: .../view/32777/16455 → .../view/32777 (metadata-bearing prefix)` — in `findExplicitMatches`
2. `[EXACT-SOURCE-RESOLUTION] mode=force-inspect ... matchedSourceId=.../view/32777` — in route.ts
3. `[EXACT-SOURCE] inspectSourceDocument START ... sourceId=.../view/32777` — in tool execution
4. `[EXACT-SOURCE] inspectSourceDocument END ... success=true` — in tool execution

When NO canonicalization happens (exact match has metadata):

1. No canonical resolution log
2. `[EXACT-SOURCE-RESOLUTION] mode=force-inspect ... matchedSourceId={exact URL}` — direct match
3. `inspectSourceDocument START/END` with the exact URL

## Verification Evidence

- TypeScript: `npx tsc --noEmit` — clean
- Tests: **32/32 pass** (14 exact-source-followup + 12 guardrails + 6 inspect)
  - New: "canonical metadata resolution: prefers metadata-bearing prefix source over exact galley match"
  - New: "keeps exact galley match when it has metadata"
  - New: "does NOT canonicalize to portal root with siteName only"
  - New: "canonicalizes to article with author/date, not to portal root with siteName only"
- Skills deployed to dev DB wary-ferret-59 (14/14 pass)
- Runtime NOT yet retested — user must rerun and verify:
  - Canonical resolution log appears
  - `inspectSourceDocument START/END` logs appear
  - Metadata fields from tool result (not prior context)
  - Unavailable fields show clean "tidak tersedia" without domain commentary

## Residual Limitations

1. **Canonical resolution requires the article-level source to be stored.** If the search path never fetched the article page (`/view/32777`), there's nothing to canonicalize to. The system can only use what's been previously stored.

2. **URL prefix matching is structural, not semantic.** If two sources represent the same article but their URLs are not prefix-related (e.g., different URL schemes, redirects to different domains), canonicalization does not happen.

3. **Metadata field leakage rules remain probabilistic.** The instruction layer tells the model not to append domain commentary to unavailable fields. With the force-inspect execution guarantee (report 12) + canonical resolution (this report), the model should now receive actual metadata from the tool. But if a field is genuinely unavailable even from the canonical source, the model's text response is still governed by instruction.

4. **`isArticleLevelMetadata` requires author or publishedAt.** A source with only `title`, `siteName`, or `documentKind` is not considered article-level authority. This is by design — siteName alone (e.g., portal root) should not serve as canonical authority for article metadata requests.
