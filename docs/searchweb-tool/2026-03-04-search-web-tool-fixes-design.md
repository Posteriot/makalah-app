# Design Doc: Web Search Tool Pipeline Fixes

**Date:** 2026-03-04
**Branch:** `search-web-tool`
**Scope:** 8 fixes across 3 server-side files
**Status:** Approved

---

## Context

Audit terhadap 4 area web search pipeline menghasilkan 22 temuan. 8 dipilih untuk di-fix berdasarkan dampak ke user experience dan feasibility. Semua perubahan ada di server-side logic — zero perubahan di Admin Panel UI, Convex backend mutations, atau client components.

**Referensi:** `docs/searchweb-tool/AUDIT-REPORT.md`

---

## Files Affected

| File | Edit Areas |
|------|-----------|
| `src/app/api/chat/route.ts` | 6 areas: line 1759, 828–851, 1804–1814, 940–973, 2593, 3424–3428 + hoist 2 helper functions |
| `src/lib/ai/paper-search-helpers.ts` | 1 area: lines 183–199 (`isExplicitMoreSearchRequest`) |
| `src/lib/ai/search-execution-mode.ts` | 1 area: add `primaryEnabled` parameter |
| `src/lib/ai/search-execution-mode.test.ts` | Update existing tests + add new test case |

---

## Section 1: Search Decision Logic

### Fix 2.1 — `hasRecentSourcesInDb` tidak stage-scoped

**Problem:** `hasRecentSourcesInDb` (line 676) queries `api.messages.getRecentSources` at conversation level. Sources dari stage `gagasan` persist dan set `searchAlreadyDone = true` saat user sudah pindah ke `tinjauan_literatur`.

**Solution:** Exclude `hasRecentSourcesInDb` dari `searchAlreadyDone` computation saat paper session aktif. `hasPreviousSearchResults` sudah stage-aware via `getSearchEvidenceFromStageData`.

```typescript
// route.ts line 1759
// BEFORE:
const searchAlreadyDone = hasPreviousSearchResults(modelMessages, paperSession) || hasRecentSourcesInDb

// AFTER:
const searchAlreadyDone = hasPreviousSearchResults(modelMessages, paperSession)
    || (!paperSession && hasRecentSourcesInDb)
```

**Rationale:** Paling simple, non-breaking. `hasRecentSourcesInDb` tetap berguna untuk non-paper chat (artifact sources context). Tidak perlu modify Convex query.

---

### Fix 2.2 — `searchAlreadyDone` bypass `isStageResearchIncomplete`

**Problem:** Priority 1 (`searchAlreadyDone`, line 1804) completely blocks Priority 5 (`isStageResearchIncomplete`, line 1833). Setelah 1 referensi tersimpan, auto-search mati meskipun stage butuh 5.

**Solution:** Combine `searchAlreadyDone` dengan `incomplete` check. Kalau search done TAPI research masih incomplete, tetap enable search.

```typescript
// route.ts lines 1804–1814
// BEFORE:
if (searchAlreadyDone) {
    const wantsMoreSearch = isExplicitMoreSearchRequest(lastUserContent)
    if (wantsMoreSearch) {
        searchRequestedByPolicy = true
        activeStageSearchReason = "user_wants_more_search"
    } else {
        searchRequestedByPolicy = false
        activeStageSearchReason = "search_already_done"
        activeStageSearchNote = getFunctionToolsModeNote("Search selesai")
    }
}

// AFTER:
if (searchAlreadyDone && !incomplete) {
    // Search done AND research complete → only enable if user explicitly wants more
    const wantsMoreSearch = isExplicitMoreSearchRequest(lastUserContent)
    if (wantsMoreSearch) {
        searchRequestedByPolicy = true
        activeStageSearchReason = "user_wants_more_search"
    } else {
        searchRequestedByPolicy = false
        activeStageSearchReason = "search_already_done"
        activeStageSearchNote = getFunctionToolsModeNote("Search selesai")
    }
} else if (searchAlreadyDone && incomplete) {
    // Search done BUT research still incomplete → auto-enable search
    searchRequestedByPolicy = true
    activeStageSearchReason = "search_done_but_research_incomplete"
    activeStageSearchNote = getResearchIncompleteNote(currentStage as string, requirement!)
}
```

**Rationale:** `searchAlreadyDone` tetap respected saat research complete. Tapi kalau incomplete, system harus proactively search. Ini sesuai paper workflow "Dialog-First Principles" — web search di AWAL untuk eksplorasi literatur.

---

### Fix 2.3 — stageData evidence `> 0` vs minCount mismatch

**Problem:** `getSearchEvidenceFromStageData` (lines 828–851) return `true` pada count `> 0`, tapi `isStageResearchIncomplete` butuh `>= minCount` (2/3/5 tergantung stage).

**Solution:** Align threshold dengan `STAGE_RESEARCH_REQUIREMENTS` minCount. Import requirements dan gunakan per-stage minCount.

```typescript
// route.ts — getSearchEvidenceFromStageData
// BEFORE (e.g. line 830):
case "gagasan": {
    const data = stageData.gagasan as { referensiAwal?: unknown[] } | undefined
    return Array.isArray(data?.referensiAwal) && data?.referensiAwal.length > 0
}

// AFTER:
case "gagasan": {
    const data = stageData.gagasan as { referensiAwal?: unknown[] } | undefined
    const minCount = STAGE_RESEARCH_REQUIREMENTS.gagasan?.minCount ?? 1
    return Array.isArray(data?.referensiAwal) && data.referensiAwal.length >= minCount
}
```

Apply to all 6 cases: `gagasan`, `topik`, `tinjauan_literatur`, `pendahuluan`, `diskusi`, `daftar_pustaka` (daftar_pustaka has no STAGE_RESEARCH_REQUIREMENTS entry, so minCount defaults to 1 — preserving current behavior).

**Rationale:** `getSearchEvidenceFromStageData` dan `isStageResearchIncomplete` harus agree on thresholds. Currently they contradict each other, creating a compound bug with Fix 2.2.

---

### Fix 2.5 — False positive dari APA-style text dan `[N]` pattern

**Problem:** Lines 940–973 — regex `/menurut .+\(\d{4}\)/` dan `/\[\d+\]/` fire dari AI knowledge responses tanpa actual web search.

**Solution:** Replace unreliable text patterns with `sources` field check. Keep only high-confidence phrases.

```typescript
// route.ts — hasPreviousSearchResults, stageEvidence === false branch (lines 940–956)
// BEFORE:
for (const msg of recentAssistantMsgs) {
    const content = typeof msg.content === "string" ? msg.content : ""
    if (/\[\d+(?:,\s*\d+)*\]/.test(content)) return true
    if (/berdasarkan hasil pencarian/i.test(content)) return true
    if (/menurut .+\(\d{4}\)/i.test(content)) return true
    if (/saya telah melakukan pencarian/i.test(content)) return true
    if (/rangkuman temuan/i.test(content)) return true
}

// AFTER:
for (const msg of recentAssistantMsgs) {
    const content = typeof msg.content === "string" ? msg.content : ""
    // Strong signal: message has actual sources data from web search
    const hasSources = "sources" in msg
        && Array.isArray((msg as { sources?: unknown }).sources)
        && ((msg as { sources: unknown[] }).sources).length > 0
    if (hasSources) return true
    // Weak signal: only trust explicit AI search-done phrases
    if (/saya telah melakukan pencarian/i.test(content)) return true
    if (/berdasarkan hasil pencarian/i.test(content)) return true
    if (/rangkuman temuan/i.test(content)) return true
}
```

Same change for PASSIVE branch (lines 960–973): drop `[N]` and APA patterns, add `sources` field check.

Also fix comment at line 924: "Limited to 1 turn" → "Check last 3 assistant messages".

**Rationale:** `sources` field is the authoritative signal — it's only present when actual web search was performed. Text patterns are heuristic with high false-positive rate.

---

### Fix 2.4 — `isExplicitMoreSearchRequest` terlalu sempit

**Problem:** Lines 183–199 — escape hatch dari `searchAlreadyDone` misses common Indonesian expressions.

**Solution:** Expand pattern list:

```typescript
// paper-search-helpers.ts — isExplicitMoreSearchRequest
// ADD these patterns:
/\b(butuh|perlu)\s+(lebih\s+banyak\s+)?(sumber|referensi|literatur)\b/,  // "butuh lebih banyak sumber"
/\b(perlu|butuh)\s+referensi\s+tambahan\b/,                                // "perlu referensi tambahan"
/\bcek\s+(literatur|referensi|sumber)\b/,                                   // "cek literatur"
/\b(temukan|find)\s+(sumber|referensi)\b/,                                  // "temukan sumber"
/\bgali\s+(lebih|lanjut)\b/,                                                // "gali lebih lanjut"
```

**Rationale:** Complementary to Fix 2.2. Even after Fix 2.2 enables auto-search for incomplete stages, `isExplicitMoreSearchRequest` is still the escape hatch for completed stages where user wants additional research. Belt and suspenders.

---

## Section 2: Tool Availability

### Fix 1.1 — `primaryEnabled` config dead code

**Problem:** `webSearchConfig.primaryEnabled` fetched at line 736 but never enforced. Admin Panel toggle has no effect.

**Solution:** Add `primaryEnabled` parameter to `resolveSearchExecutionMode` and enforce it.

```typescript
// search-execution-mode.ts
export function resolveSearchExecutionMode(input: {
  searchRequired: boolean
  primaryToolReady: boolean
  primaryEnabled: boolean          // NEW
  fallbackOnlineEnabled: boolean
  fallbackProvider: string
}): SearchExecutionMode {
  if (!input.searchRequired) return "off"
  if (input.primaryToolReady && input.primaryEnabled) return "primary_google_search"  // ENFORCE
  if (input.fallbackOnlineEnabled && input.fallbackProvider === "openrouter") {
    return "fallback_online_search"
  }
  return "blocked_unavailable"
}
```

Caller in `route.ts` line 1888:
```typescript
const searchExecutionMode = resolveSearchExecutionMode({
    searchRequired: searchRequestedByPolicy,
    primaryToolReady: primaryGoogleSearchReady,
    primaryEnabled: webSearchConfig.primaryEnabled,  // NEW
    fallbackOnlineEnabled: webSearchConfig.fallbackEnabled,
    fallbackProvider: modelNames.fallback.provider,
})
```

Test updates in `search-execution-mode.test.ts`:
- All existing test cases: add `primaryEnabled: true` to preserve current behavior
- New test case: `primaryEnabled: false` + `primaryToolReady: true` → should return `"fallback_online_search"` (not `"primary_google_search"`)

**Rationale:** `resolveSearchExecutionMode` is the single responsibility point for mode decisions. All config flags should be evaluated there, not scattered across `route.ts`.

---

## Section 3: Reference Persistence Quality

### Fix 4.1 — Empty title tersimpan di grounding chunk path

**Problem:** Line 2593 — `typeof "" === "string"` → `true`, empty string title stored instead of URL fallback.

**Solution:**
```typescript
// route.ts line 2593
// BEFORE:
const title = typeof chunk.web?.title === "string" ? chunk.web.title : normalizedUrl

// AFTER:
const title = (typeof chunk.web?.title === "string" && chunk.web.title.trim()) || normalizedUrl
```

**Rationale:** Consistent with `normalizeResultSource` at line 2418 which already uses `rawTitle.trim() || normalizedUrl`. One-line fix, zero risk.

---

### Fix 4.3 — `isLowValueCitationUrl` not applied in fallback path

**Problem:** Primary path (lines 2665–2671) filters low-value URLs. Fallback path (lines 3424–3428) does not.

**Solution:**

**Step 1:** Hoist `isLowValueCitationUrl` and `isVertexProxyUrl` from inner scope (lines 2448–2478, inside primary stream block) to route handler scope (before both stream blocks). No logic change, just scope change.

**Step 2:** Apply same filter logic to fallback path:

```typescript
// route.ts — fallback path, after normalizedCitations
// BEFORE (lines 3424–3428):
const persistedSources = normalizedCitations.map((citation) => ({
    url: citation.url,
    title: citation.title,
    ...(citation.publishedAt ? { publishedAt: citation.publishedAt } : {}),
}))

// AFTER:
const filteredCitations = (() => {
    const hasHighValue = normalizedCitations.some(
        c => !isVertexProxyUrl(c.url) && !isLowValueCitationUrl(c.url)
    )
    if (hasHighValue) {
        return normalizedCitations.filter(
            c => !isVertexProxyUrl(c.url) && !isLowValueCitationUrl(c.url)
        )
    }
    const hasNonProxy = normalizedCitations.some(c => !isVertexProxyUrl(c.url))
    if (hasNonProxy) return normalizedCitations.filter(c => !isVertexProxyUrl(c.url))
    return normalizedCitations
})()
const persistedSources = filteredCitations.map((citation) => ({
    url: citation.url,
    title: citation.title,
    ...(citation.publishedAt ? { publishedAt: citation.publishedAt } : {}),
}))
```

**Also update downstream:** `fallbackCitationAnchors` and `hasAnyCitations` must use `filteredCitations` instead of `normalizedCitations` to keep source indices consistent.

**Rationale:** Filter parity between primary and fallback paths. Fallback is not a rare event — it activates on any Gateway failure. Quality should not degrade based on which provider served the response.

---

## Explicitly NOT Changed

| Item | Reason |
|------|--------|
| Admin Panel UI | Toggles already exist and work correctly |
| `convex/paperSessions.ts` (`appendSearchReferences`) | No mutation-level changes needed; filtering happens before call |
| Client components (`MessageBubble.tsx`, `ChatWindow.tsx`) | Citation rendering issues are downstream symptoms of upstream data problems |
| `convex/messages.ts` (`getRecentSources`) | No query modification needed; exclusion handled in `route.ts` logic |
| Schema changes | No new fields, no migrations |

---

## Risk Assessment

| Fix | Risk | Mitigation |
|-----|------|-----------|
| 2.1 | Non-paper chat behavior unchanged? | Guard `!paperSession` preserves existing `hasRecentSourcesInDb` behavior for regular chat |
| 2.2 | Infinite search loop if incomplete never resolves? | `getSearchEvidenceFromStageData` will eventually return `true` as refs accumulate via `appendSearchReferences` |
| 2.3 | `daftar_pustaka` stage has no `STAGE_RESEARCH_REQUIREMENTS` entry | Defaults to `minCount: 1`, preserving current `> 0` behavior |
| 2.5 | Removing `[N]` pattern may miss legitimate search-done signals? | `sources` field check is strictly more reliable. Only risk: messages where search was done but `saveAssistantMessage` failed to persist sources — mitigated by keeping "saya telah melakukan pencarian" phrase check |
| 1.1 | Existing tests break? | Add `primaryEnabled: true` to all existing test cases — no behavior change for current tests |
| 4.3 | `filteredCitations` changes array indices affecting `fallbackCitationAnchors`? | Anchors rebuilt from `filteredCitations` so indices stay consistent |
