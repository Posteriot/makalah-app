# Fix Report: Search Fallback Unhandled Rejection

Date: 2026-04-09
Branch: `tools-features-ui-ai-awarness`

---

## Root Cause

In `src/lib/ai/web-search/orchestrator.ts`, two observability probes (`sourcesProbe` and `metadataProbe`) are created at lines 308/320 to track when sources and provider metadata resolve. These probes re-throw errors in their `.catch()` handlers (lines 315, 328).

When the primary retriever (e.g., google-grounding) fails with a 503, execution jumps to the `catch (retrieverError)` block at line 384. At this point, the probes have already been created as promises but `Promise.allSettled([sourcesProbe, metadataProbe])` at line 362 was never reached. The probes reject independently, and Node.js treats them as unhandled rejections.

The fallback retriever (perplexity) then succeeds — the user gets a normal response with citations. But the terminal still shows `unhandledRejection` errors from the abandoned probes of the failed retriever.

**Timeline of the bug:**
1. google-grounding starts → probes created (lines 308, 320)
2. google-grounding 503 → `searchResult.text` rejects (line 332)
3. Execution jumps to catch block (line 384) — probes never consumed
4. Probes reject independently → Node emits `unhandledRejection`
5. Fallback perplexity succeeds → user sees normal response
6. Terminal shows `sources_failed`, `metadata_failed`, `unhandledRejection`

## File Changed

`src/lib/ai/web-search/orchestrator.ts` — lines 305-329

## Exact Fix

Changed probe `.catch()` handlers from re-throwing the error to returning a status object. Probes are observability-only — they must never reject.

**Before:**
```typescript
.catch((err: unknown) => {
  sourcesReadyAt = Date.now() - retrieverStart
  console.log(`[⏱ RETRIEVER][${reqId}] sources_failed ...`)
  throw err  // ← causes unhandled rejection if not consumed
})
```

**After:**
```typescript
.catch((err: unknown) => {
  sourcesReadyAt = Date.now() - retrieverStart
  console.log(`[⏱ RETRIEVER][${reqId}] sources_failed ...`)
  return { ok: false as const, error: err instanceof Error ? err.message : String(err) }
})
```

Same change applied to both `sourcesProbe` and `metadataProbe`. The `.then()` handlers also wrap their return in `{ ok: true, value }` for type consistency.

## Before/After Behavior

| Scenario | Before | After |
|----------|--------|-------|
| Primary retriever succeeds | ✅ Normal — probes resolve, allSettled consumes them | ✅ Identical — probes resolve with `{ ok: true }` |
| Primary retriever fails, fallback succeeds | ⚠️ unhandledRejection in terminal, but user sees normal response | ✅ No unhandledRejection — probes resolve with `{ ok: false }`, telemetry logs preserved |
| All retrievers fail | ⚠️ unhandledRejection + error response | ✅ No unhandledRejection — clean error response |

**What did NOT change:**
- Fallback behavior (google → perplexity chain) — untouched
- Source extraction via `retriever.extractSources()` — untouched
- Provider policy / router policy — untouched
- User-facing output — untouched
- Telemetry logging (sources_failed, metadata_failed) — still logged

## Runtime Verification

**Scenario:** Reproduction script (`scripts/verify-probe-fix.mjs`) that simulates the exact async pattern from orchestrator.ts — a streamText result where `.text`, `.sources`, and `.providerMetadata` all reject (503), and the main try/catch catches the text rejection before `Promise.allSettled` can consume the probes.

**Method:** Script runs both OLD pattern (throw in .catch) and NEW pattern (return status in .catch) sequentially, with a `process.on("unhandledRejection")` listener counting events.

**Terminal output:**
```
Probe unhandledRejection reproduction test
==========================================

=== OLD PATTERN (throw in .catch) ===
  text_failed: 503 Service Unavailable: high demand
  (jumped to catch — allSettled never reached)
  sources_failed: 503 sources unavailable
  metadata_failed: 503 metadata unavailable
  ⚠️  unhandledRejection #1: Error: 503 sources unavailable
  ⚠️  unhandledRejection #2: Error: 503 metadata unavailable
  Result: 2 unhandledRejection(s)

=== NEW PATTERN (return status in .catch) ===
  text_failed: 503 Service Unavailable: high demand
  (jumped to catch — allSettled never reached)
  sources_failed: 503 sources unavailable
  metadata_failed: 503 metadata unavailable
  Result: 0 unhandledRejection(s)

=== SUMMARY ===
  OLD pattern: 2 unhandledRejection(s) ❌ BUG CONFIRMED
  NEW pattern: 0 unhandledRejection(s) ✅ FIX VERIFIED
```

**Results:**
- OLD pattern: 2 unhandledRejections (bug confirmed)
- NEW pattern: 0 unhandledRejections (fix verified)
- Telemetry logging (`sources_failed`, `metadata_failed`) preserved in both patterns
- Fallback flow not affected — the catch block is reached in both patterns, allowing the retriever loop to continue to the next retriever

**Reproduction script location:** `scripts/verify-probe-fix.mjs`

## Static Verification Evidence

1. **TypeScript compilation:** `npx tsc --noEmit` shows zero errors from `orchestrator.ts` (only pre-existing module resolution errors from path aliases).
2. **No downstream consumers of probe values:** `sourcesProbe` and `metadataProbe` are only referenced at definition (lines 308, 320) and in `Promise.allSettled` (line 362). No code reads their resolved values — actual sources come from `retriever.extractSources()` at line 354.
3. **Telemetry preserved:** `sourcesReadyAt` and `metadataReadyAt` timestamps are still set in both `.then()` and `.catch()` paths, so the summary log at line 364 still reports correct timing.
4. **allSettled still works:** Since probes now always resolve, `Promise.allSettled` at line 362 behaves identically — it was already treating both fulfilled and rejected as settled.
