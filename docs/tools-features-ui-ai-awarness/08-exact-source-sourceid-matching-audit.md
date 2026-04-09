# Audit Report: Exact Source SourceId Matching

Date: 2026-04-09
Branch: `tools-features-ui-ai-awarness`

---

## Corrected Diagnosis

The journal.unpas article WAS already stored in conversation sources. This was NOT a "new URL" as the search router claimed. The root cause is a **missing pre-router guardrail**, not a source identity mismatch or missing persistence.

## Root Cause

### Architecture gap in route.ts

The request flow has two independent decision paths:

1. **Exact source resolution** (`resolveExactSourceFollowup`, line 770): Runs first. Uses semantic classifier + structural matching to determine if user is asking about a stored source. Returns `force-inspect` when a unique match is found.

2. **Search router** (`decideWebSearchMode`, line 2329): Runs second. LLM-based router decides `enableWebSearch`. Gets `ragChunksAvailable` boolean but does NOT receive the `exactSourceResolution` result.

**The bug:** When `exactSourceResolution.mode === "force-inspect"` (source matched, model should use `inspectSourceDocument`), there was no pre-router guardrail to block the search router. The search router ran anyway, classified the request as needing "factual data from a new external source," and overrode the exact-source resolution with `enableWebSearch=true`.

Result: web search triggered for a URL already stored in the conversation. The model never called `inspectSourceDocument` because the orchestrator ran the search path instead of the compose path.

### Evidence from terminal log (test-7)

```
[SearchDecision] Unified router: User is asking for specific metadata (author, site name, publication date) from a new URL that has not been processed or stored in previous turns.
```

But:
```
[RAG Ingest] Skip — sourceId already exists: https://journal.unpas.ac.id/index.php/pendas/article/view/32777/16455
```

The source WAS stored. The search router was wrong.

## Files Inspected

| File | What was checked |
|------|-----------------|
| `src/app/api/chat/route.ts` | Search router flow, pre-router guardrails, exact source resolution usage |
| `src/lib/ai/exact-source-followup.ts` | Source matching logic, `resolveExactSourceFollowup` flow |
| `src/lib/ai/exact-source-guardrails.ts` | `buildExactSourceInspectionRouterNote`, `shouldIncludeRawSourcesContextForExactFollowup` |
| `convex/sourceDocuments.ts` | Source document persistence model |
| Terminal log test-7 | Runtime evidence of search router overriding stored source |

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `src/app/api/chat/route.ts` | Added `force-inspect` pre-router guardrail | Lines 2307-2314 |
| `src/app/api/chat/route.ts` | Added observability logging for `exactSourceResolution` | Line 776 |

## Exact Fix

### 1. Pre-router guardrail (lines 2307-2314)

Added as the FIRST check in the pre-router guardrail chain, before `forcePaperToolsMode` and first-message fast path:

```typescript
if (exactSourceResolution.mode === "force-inspect") {
    // Exact source follow-up already matched a unique stored source.
    // Block search — the model should use inspectSourceDocument instead.
    searchRequestedByPolicy = false
    activeStageSearchReason = "exact_source_force_inspect"
    console.log(`[SearchDecision] Exact source force-inspect: blocking search, matched sourceId=...`)
}
```

When `force-inspect` is active, the search router is skipped entirely. The compose path runs instead, where `buildDeterministicExactSourcePrepareStep` injects the force-inspect note that tells the model to call `inspectSourceDocument`.

### 2. Resolution observability (line 776)

Added logging:
```
[EXACT-SOURCE-RESOLUTION] mode=force-inspect reason=unique-source-match matchedSourceId=https://journal.unpas.ac.id/...
```

This ensures future debugging can confirm whether the resolution matched a source.

## Verification Evidence

### Static verification

1. **Guardrail placement:** First in the chain, before all other pre-router checks. `force-inspect` takes priority because if a unique source match exists, no search is needed.
2. **No behavior change for non-matching cases:** If `exactSourceResolution.mode` is `"none"` or `"clarify"`, the existing flow continues unchanged. Only `"force-inspect"` blocks search.
3. **Compose path already handles force-inspect:** `buildDeterministicExactSourcePrepareStep` at line 2824 already uses `exactSourceResolution` to inject source-specific instructions. The missing piece was preventing search from running first.

### Source identity matching (verified)

The `findExplicitMatches` function in `exact-source-followup.ts:100-105` compares the normalized user message against source candidates including:
- `normalizeText(source.originalUrl)` — the URL as first seen
- `normalizeText(source.resolvedUrl)` — the URL after redirects
- `normalizeText(source.sourceId)` — the stored source ID

When a user pastes a URL that matches a stored source, `matchesSourceReference` returns true (via the `.includes()` check at line 94 for URL-like candidates containing dots/slashes). No canonicalization mismatch was found for the journal.unpas URL pattern.

### Source persistence (verified)

- `sourceDocuments.upsertDocument` stores the source with `sourceId = URL`
- `sourceDocuments.listSourceSummariesByConversation` returns all stored sources for a conversation
- RAG ingest log "sourceId already exists" confirms the source was stored before this request

## Residual Limitations

1. **Instruction-layer rules still needed:** The `force-inspect` guardrail prevents unnecessary search, but the model still needs skill-level instructions (EXACT METADATA DISCIPLINE, EVIDENCE BREADTH HONESTY) to compose its response correctly after inspecting the source. These instruction-layer rules from earlier patches remain essential.

2. **Source must be persisted from a prior turn:** The `force-inspect` path only works when the source was stored in a previous turn's detached persistence task. If the user asks about a source in the same turn it was first found, the source won't be in `sourceDocuments` yet (persistence is detached/post-response). This is acceptable — first-turn source references go through normal search.

3. **Multi-source ambiguity:** If multiple stored sources match the user's reference, `resolveExactSourceFollowup` returns `"clarify"` instead of `"force-inspect"`. In that case, the search router still runs. This is correct behavior — ambiguous references should not block search.
