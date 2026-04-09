# Report 10: Exact Source URL Variant Matching and Site Name Formatting Fix

Date: 2026-04-09
Session: 2
Triggered by: Codex review — test-7 follow-up showing ambiguous source match and siteName formatting contamination

---

## Bug A: Exact-source URL variant matching

### Failing case

- User referenced galley URL: `https://journal.unpas.ac.id/index.php/pendas/article/view/32777/16455`
- Stored exact source (from earlier search): `https://journal.unpas.ac.id/index.php/pendas/article/view/32777`
- Also stored from prior portal search: `https://journal.unpas.ac.id/`
- Runtime log: `[EXACT-SOURCE-RESOLUTION] mode=clarify reason=ambiguous-source-match`
- System fell back to fresh search instead of reusing stored source

### Root cause

`findExplicitMatches` (`exact-source-followup.ts:100-105`) returned ALL sources where `matchesSourceReference` was true, without discriminating by specificity.

`buildSourceCandidates` (line 63-73) includes `extractDomainLabel` which produces the bare domain `journal.unpas.ac.id` for every source on that domain. When the user's message contained the galley URL:

1. **Portal root source** matched — candidate `journal.unpas.ac.id` is a substring of the galley URL
2. **Article source** matched — candidate `journal.unpas.ac.id/index.php/pendas/article/view/32777` is a prefix of the galley URL

Two matches → `ambiguous-source-match` (line 211-213) → `mode: "clarify"` → router chose fresh search.

The portal root match was a **false positive** caused by domain-level matching being too broad.

### Fix implemented

Added URL specificity tiebreaker in `findExplicitMatches` (`exact-source-followup.ts`):

```typescript
function urlSpecificity(source: ExactSourceSummary, message: string): number {
  let best = 0
  for (const url of [source.sourceId, source.originalUrl, source.resolvedUrl]) {
    const normalized = normalizeText(url)
    if (normalized && message.includes(normalized) && normalized.length > best) {
      best = normalized.length
    }
  }
  return best
}
```

When multiple sources match, `findExplicitMatches` now keeps only the source(s) with the highest URL specificity (longest URL overlap with the user's message). This is deterministic — purely based on string length, not heuristic or regex-based NLP.

For the OJS case:
- Portal root specificity: `journal.unpas.ac.id/` = 23 chars
- Article source specificity: `journal.unpas.ac.id/index.php/pendas/article/view/32777` = 56 chars
- Article source wins → single match → `mode: "force-inspect"` → no fresh search needed

### Why this is safe

1. **Deterministic** — string length comparison, no heuristics
2. **Narrowly scoped** — only activates when multiple matches already exist (single matches are unchanged)
3. **Reduced false disambiguation risk** — equal-specificity matches still fall back to `clarify`; however, longest-URL-overlap encodes an assumption about intended source, so the risk is reduced, not eliminated
4. **Handles general case** — not OJS-specific; works for any URL hierarchy where portal root and article URLs share the same domain

### Test added

`exact-source-followup.test.ts`: "disambiguates by URL specificity when galley URL matches both portal root and article source" — verifies that the article source is selected over the portal root when user mentions galley URL.

---

## Bug B: siteName formatting contamination

### Failing case

Model output for siteName when unavailable:
```
Site Name: tidak tersedia (namun dari URL terlihat journal.unpas.ac.id)
```

The domain commentary was appended to the same metadata field, violating the intent of "unavailable means unavailable."

### Root cause

Prior instruction said: "domain may appear only as URL, not as verified site name." The model read "may appear" as permission to mention the domain alongside the unavailable statement.

### Fix implemented

**`exact-source-guardrails.ts`** — EXACT_SOURCE_INSPECTION_RULES updated to:
```
If siteName is not returned by inspectSourceDocument, say the site name is unavailable — full stop.
Do NOT append domain, hostname, URL commentary, or parenthetical explanation to the same metadata field.
If the user explicitly asks about the URL/domain separately, answer outside the metadata field block.
```

**5 skill files** — EXACT METADATA DISCIPLINE updated from:
```
domain may appear only as URL, not as verified site name
```
to:
```
When a metadata field is unavailable, state only "tidak tersedia" or equivalent —
do NOT append domain, hostname, URL commentary, or parenthetical explanation on
the same metadata line.
```

---

## Files changed

| File | Change | Type |
|------|--------|------|
| `src/lib/ai/exact-source-followup.ts` | Added `urlSpecificity` function and tiebreaker in `findExplicitMatches` | Code |
| `src/lib/ai/exact-source-followup.test.ts` | Added OJS galley URL disambiguation test | Code |
| `src/lib/ai/exact-source-guardrails.ts` | Strengthened siteName unavailable formatting rule | Instruction |
| `01-gagasan-skill.md` | Replaced "domain may appear" with strict no-append rule | Instruction |
| `05-pendahuluan-skill.md` | Same | Instruction |
| `06-tinjauan-literatur-skill.md` | Same | Instruction |
| `09-diskusi-skill.md` | Same | Instruction |
| `12-daftar-pustaka-skill.md` | Same | Instruction |

## Verification evidence

- TypeScript: `npx tsc --noEmit` — clean
- Tests: 28/28 pass (10 exact-source-followup + 12 chat-exact-source-guardrails + 6 paper-tools.inspect-source)
- New test specifically validates the OJS galley URL disambiguation

## Fix types

| Fix | Type | Deterministic? |
|-----|------|----------------|
| URL specificity tiebreaker | Code | Yes — string length comparison |
| siteName formatting rule | Instruction | No — probabilistic (model behavior) |

## Residual limitations

1. **URL specificity tiebreaker requires prefix containment.** If a galley URL was structurally unrelated to the stored article URL (different path, not prefix), the tiebreaker would not help. This handles OJS (`/view/{id}` vs `/view/{id}/{galleyId}`) and similar hierarchical URL patterns, but not arbitrary URL aliases.

2. **siteName formatting is still instruction-level.** The model may still occasionally append domain commentary despite the stricter rule. The instruction is now more explicit ("full stop", "do NOT append"), but remains probabilistic.

3. **Runtime behavior not yet retested.** This report documents code and instruction changes. The user must retest with the actual OJS article to confirm runtime behavior matches expectations.
