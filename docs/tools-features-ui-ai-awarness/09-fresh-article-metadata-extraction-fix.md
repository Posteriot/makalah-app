# Report 09: Fresh Article Metadata Extraction Fix

Date: 2026-04-09
Session: 2 (revised after Codex review)
Triggered by: Codex review of commit 7bb20ea2 (test-7 failure case)

---

## Failing Case Summary

From Codex test-7:
- User referenced a full article URL: `https://journal.unpas.ac.id/index.php/pendas/article/view/32777/16455`
- This is an OJS (Open Journal Systems) galley page — `/view/{articleId}/{galleyId}`
- Search/fetch/persist all succeeded (confirmed by runtime log)
- Article-level exact metadata (author, publishedAt, siteName) was missing from `inspectSourceDocument` result
- Model leaked siteName inferred from URL hostname despite exact metadata being unavailable
- SearchContext for the article was only 743 chars total

## Runtime Evidence (from `screenshots/stage-1/test-7/terminal-log-2.txt`)

| Event | Evidence | Line |
|-------|----------|------|
| Google Grounding | FAILED (503 high demand) | terminal-log-2.txt:16 |
| Perplexity fallback | Succeeded, 1 citation, 357 chars text | terminal-log-2.txt:68 |
| FetchWeb PRIMARY | ✓ 293ms route=html_standard | terminal-log-2.txt:75 |
| Fetch method | fetch=1, tavily=0 | terminal-log-2.txt:76 |
| SearchContext | 1 source, 1 verified, 743 chars total | terminal-log-2.txt:79 |
| Exact source persist | ✓ 735ms | terminal-log-2.txt:95 |

**Confirmed path:** Primary fetch (not Tavily). The HTML was fetched server-side at 293ms, classified as `html_standard`, parsed by Readability, and persisted. Tavily was never invoked.

## Root Cause Analysis

### 1. Why metadata (author, publishedAt, siteName) was missing

**Answer: the current extractor did not recover metadata for this article.**

The primary fetch path succeeded (`fetch=1, tavily=0`). The extraction function `extractStructuredMetadata` (`content-fetcher.ts:701-756`) ran against the fetched HTML but produced null for all three metadata fields.

The extraction pipeline tried:

| Field | Primary | Fallback selectors |
|-------|---------|-------------------|
| author | `article.byline` (Readability) | `meta[name="author"]`, `citation_author`, `article:author`, `og:author`, `dcterms.creator` |
| publishedAt | `article.publishedTime` (Readability) | `citation_date`, `citation_publication_date`, `article:published_time`, `dcterms.date`, `date`, `time[datetime]` |
| siteName | `article.siteName` (Readability) | `og:site_name`, `application-name` |

None of these selectors returned a value, so `buildMetadataBlock` (`content-fetcher.ts:758-773`) returned empty string — no metadata block was prepended to the content.

**Persistence path is verified clean:** `orchestrator.ts:180-185` uses conditional spread — only passes non-null strings. If extraction produces null, the field is absent from the upsert. No intermediate step drops metadata that was successfully extracted.

### 2. Why SearchContext was only 743 chars

The 743 chars is the total `context.length` logged at `search-results-context.ts:110`. For a single-source result:
- Header block ("## SEARCH RESULTS (COMPLETED)..."): ~200 chars
- Source entry formatting: ~100 chars
- Actual pageContent: **~450 chars**

The truncation cap is 12,000 chars (`MAX_CONTENT_CHARS`, line 54). The content was nowhere near this limit — the extracted content was genuinely thin from the source.

**Contrast with prior request (same test session):** The portal root search (terminal-log.txt:81) produced 18,813 chars from 3 sources. The article-specific request produced only 743 chars from 1 source — a 25x reduction.

### 3. Why the model leaked siteName from URL

The model saw `https://journal.unpas.ac.id/...`, had no siteName in SearchContext content or `inspectSourceDocument` result, and presented the domain-derived name as if it were verified metadata.

**Prior instruction coverage and gaps:**

| Existing rule | Coverage | Gap |
|---|---|---|
| EXACT METADATA DISCIPLINE: "Do NOT infer from URL shape" | Generic | Model interpreted as slug/path parsing, not hostname→brand |
| EXACT_SOURCE_INSPECTION_RULES: "Do not infer article titles from URLs" | Title only | siteName not mentioned |
| paper-mode-prompt.ts: "STRICTLY FORBIDDEN to use DOMAIN/WEBSITE name as author" | Author in APA citations | siteName is a different field |
| web-search-quality SKILL.md: "NEVER embed website names...as text" | Inline prose | Not metadata presentation |

**Gap:** No rule explicitly prohibited presenting hostname/domain as verified siteName metadata.

## What Is Proven

1. **Primary fetch path was used** — runtime log confirms `fetch=1, tavily=0` (terminal-log-2.txt:76). Tavily was not involved.
2. **The current extractor did not produce metadata** — all three fields (author, publishedAt, siteName) were null after extraction. Evidence: they were absent from persistence (the persist log at line 95 shows success but no metadata-related capping warnings), and `inspectSourceDocument` later reported them as unavailable.
3. **Persistence path does not drop metadata** — conditional spread at `orchestrator.ts:180-185` only omits fields that are already null. Verified by code tracing.
4. **Content was thin** — 743 chars total SearchContext for 1 source. The extraction succeeded (passed the 50-char minimum) but produced approximately 450 chars of usable content.
5. **siteName-from-URL instruction gap existed** — no prior rule explicitly addressed domain→siteName inference.

## What Remains Unproven

1. **Whether the HTML actually contained meta tags** — the extractor tried 5-6 selectors per field and found nothing, but we have not inspected the actual HTML served by `https://journal.unpas.ac.id/index.php/pendas/article/view/32777/16455`. It is possible that:
   - The HTML genuinely lacks metadata tags (plausible for an OJS galley page vs. abstract page)
   - The HTML has metadata in a format our selectors don't cover
   - Readability misidentified the content area and the metadata-bearing elements were excluded from parsing
2. **Why content was only ~450 chars** — we know the extraction produced thin content, but we have not verified whether the served HTML has more content that the extractor failed to reach (JS-rendered sections, iframe-embedded content, non-standard DOM structure).
3. **Whether the OJS abstract page (`/view/32777`) would have produced rich metadata** — OJS abstract pages typically carry `citation_author`, `citation_date`, `citation_title` meta tags, but we have not tested this specific URL variant.

## Files Inspected

| File | Purpose |
|------|---------|
| `screenshots/stage-1/test-7/terminal-log-2.txt` | Runtime log for failing request |
| `screenshots/stage-1/test-7/terminal-log.txt` | Runtime log for prior portal request (context) |
| `src/lib/ai/web-search/content-fetcher.ts` | Metadata extraction, content truncation, Tavily fallback |
| `src/lib/ai/web-search/orchestrator.ts` | enrichedSources building, persistence, SearchContext composition |
| `src/lib/ai/search-results-context.ts` | SearchContext format and `SearchSource` interface |
| `src/lib/ai/paper-tools.ts` | `inspectSourceDocument` tool implementation |
| `src/lib/ai/exact-source-guardrails.ts` | `EXACT_SOURCE_INSPECTION_RULES`, force-inspect routing |
| `src/lib/ai/paper-mode-prompt.ts` | In-text citation rules |
| `src/lib/ai/skills/web-search-quality/SKILL.md` | No-inline-domain-references rule |
| `convex/schema.ts` | sourceDocuments table schema |
| `convex/sourceDocuments.ts` | upsertDocument mutation |
| `.references/system-prompt-skills-active/updated-4/*.md` | 5 skill files with EXACT METADATA DISCIPLINE |

## Files Changed

| File | Change | Type |
|------|--------|------|
| `src/lib/ai/exact-source-guardrails.ts` | Added explicit siteName-from-URL prohibition to EXACT_SOURCE_INSPECTION_RULES | Instruction |
| `01-gagasan-skill.md` | Strengthened EXACT METADATA DISCIPLINE with siteName-domain example | Instruction |
| `05-pendahuluan-skill.md` | Same strengthening | Instruction |
| `06-tinjauan-literatur-skill.md` | Same strengthening | Instruction |
| `09-diskusi-skill.md` | Same strengthening | Instruction |
| `12-daftar-pustaka-skill.md` | Same strengthening | Instruction |

## Fix Type

**Instruction-layer only. No minimal code fix identified yet from this audit.**

What the instruction-layer fix addresses:
- siteName-from-URL leakage — explicit prohibition added to `EXACT_SOURCE_INSPECTION_RULES` and 5 skill files' EXACT METADATA DISCIPLINE

What the instruction-layer fix does NOT address:
- Why the extractor did not recover metadata from this specific article's HTML
- Why the extracted content was only ~450 chars
- Whether a code-level signal (e.g., surfacing `exactMetadataAvailable` or injecting a compose-time "no-inference" note for fresh articles with missing metadata) would provide more deterministic protection

Potential scoped code-level alternatives not yet evaluated:
1. **Surface `exactMetadataAvailable` in SearchContext** — the field exists in `FetchedContent` but is unused downstream (`search-results-context.ts:1-8` has no metadata availability signal). Surfacing it could cue the model deterministically.
2. **Inject compose-time system note for fresh articles with missing metadata** — when metadata fields are null after extraction, inject an explicit "metadata not available for this source — do not infer from URL" note into the compose context.

These alternatives are noted for potential future evaluation, not dismissed.

## Verification Evidence

### Instruction changes verified

EXACT_SOURCE_INSPECTION_RULES (`exact-source-guardrails.ts`) now contains:
```
- Do not infer site name from URL hostname, domain, or branding cues. If siteName is not returned by inspectSourceDocument, say the site name is unavailable. You may mention the domain/hostname only as a URL reference, never as verified site name metadata.
```

EXACT METADATA DISCIPLINE in 5 skill files now contains:
```
Specifically: do not derive siteName from hostname or domain (e.g., do not present "Kompas" as siteName because URL contains kompas.com — domain may appear only as URL, not as verified site name).
```

### Build and test verification

- TypeScript: `npx tsc --noEmit` — clean, no errors
- Tests: 18/18 pass (`chat-exact-source-guardrails.test.ts` + `paper-tools.inspect-source.test.ts`)

### Data flow verification

| Stage | File:Line | Metadata handling | Evidence |
|-------|-----------|-------------------|----------|
| Extract | content-fetcher.ts:701-756 | Readability + meta tag selectors | ✓ Code read |
| Build content | content-fetcher.ts:624-625 | Prepended as markdown block (when non-null) | ✓ Code read |
| pageContent | content-fetcher.ts:361 | `truncate(content)` — metadata in text | ✓ Code read |
| enrichedSources | orchestrator.ts:532-538 | Only `pageContent` spread, NOT structured metadata | ✓ Code read |
| SearchContext | search-results-context.ts:1-8, 77-89 | No metadata fields in interface or format | ✓ Code read |
| Persist | orchestrator.ts:180-185 | Conditional spread, no-drop verified | ✓ Code read |
| DB schema | schema.ts:236-259 | `v.optional(v.string())` for all three | ✓ Code read |
| Inspect tool | paper-tools.ts:598-602 | Returns stored fields with availability flags | ✓ Code read |

## Residual Limitations

1. **Instruction fixes are probabilistic.** The model may still occasionally infer siteName from URL despite the strengthened rules. This is inherent to instruction-based control.

2. **Root cause for this specific article is unresolved.** We know the extractor did not recover metadata, but we have not verified whether the HTML contains metadata in a format our selectors don't cover, or whether the thin content is due to page structure issues.

3. **`exactMetadataAvailable` is unused downstream.** The field is tracked in `FetchedContent` but never consumed by SearchContext, enrichedSources, or any compose-time path. This is a design gap that could be addressed with a scoped code change.

4. **SearchContext does not carry structured metadata.** The `SearchSource` interface only has `url`, `title`, `citedText`, `pageContent`. Metadata appears in pageContent text only when extraction succeeds — there is no deterministic signal for its presence or absence.

5. **Tavily fallback always drops metadata.** When primary fetch fails and Tavily succeeds, metadata is null by design (Tavily API returns plain text). Not the cause in test-7, but remains a general limitation.

6. **OJS galley vs. abstract page hypothesis untested.** The URL pattern suggests a galley page which may have fewer meta tags than the abstract page. This is architecturally relevant for academic article URLs but unverified for this specific URL.
