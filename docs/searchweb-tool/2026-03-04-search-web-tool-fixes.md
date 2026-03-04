# Web Search Tool Pipeline Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 8 audit findings in the web search pipeline to restore correct search decisions, enforce admin config, and improve reference quality.

**Architecture:** All changes are server-side in 3 files: `route.ts` (decision logic + citation pipeline), `paper-search-helpers.ts` (pattern matching), `search-execution-mode.ts` (mode resolver). Zero schema changes, zero client changes.

**Tech Stack:** TypeScript, Vitest, Vercel AI SDK v5, Convex

**Design doc:** `docs/searchweb-tool/2026-03-04-search-web-tool-fixes-design.md`

---

### Task 1: Add `primaryEnabled` to `resolveSearchExecutionMode` (Fix 1.1)

**Files:**
- Modify: `src/lib/ai/search-execution-mode.ts:9-21`
- Test: `src/lib/ai/search-execution-mode.test.ts`

**Step 1: Update existing tests to pass `primaryEnabled: true`**

Every existing test call to `resolveSearchExecutionMode` needs the new required field. Add `primaryEnabled: true` to all 5 existing test cases to preserve current behavior.

```typescript
// src/lib/ai/search-execution-mode.test.ts
// In EVERY existing resolveSearchExecutionMode call, add:
//   primaryEnabled: true,
// Example — first test (line 9):
const mode = resolveSearchExecutionMode({
  searchRequired: true,
  primaryToolReady: true,
  primaryEnabled: true,      // ← ADD
  fallbackOnlineEnabled: true,
  fallbackProvider: "openrouter",
})
```

Apply to all 5 tests in the `resolveSearchExecutionMode` describe block.

**Step 2: Add new test — `primaryEnabled: false` skips primary, falls to fallback**

```typescript
// src/lib/ai/search-execution-mode.test.ts — inside describe("resolveSearchExecutionMode")
it("skips primary and falls to fallback when primaryEnabled is false", () => {
  const mode = resolveSearchExecutionMode({
    searchRequired: true,
    primaryToolReady: true,
    primaryEnabled: false,
    fallbackOnlineEnabled: true,
    fallbackProvider: "openrouter",
  })

  expect(mode).toBe("fallback_online_search")
})

it("returns blocked when primaryEnabled is false and no fallback", () => {
  const mode = resolveSearchExecutionMode({
    searchRequired: true,
    primaryToolReady: true,
    primaryEnabled: false,
    fallbackOnlineEnabled: false,
    fallbackProvider: "openrouter",
  })

  expect(mode).toBe("blocked_unavailable")
})
```

**Step 3: Run tests to verify they fail**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.claude/worktrees/search-web-tool && npx vitest run src/lib/ai/search-execution-mode.test.ts`
Expected: FAIL — `primaryEnabled` is not in the type signature yet.

**Step 4: Update `resolveSearchExecutionMode` implementation**

```typescript
// src/lib/ai/search-execution-mode.ts
export function resolveSearchExecutionMode(input: {
  searchRequired: boolean
  primaryToolReady: boolean
  primaryEnabled: boolean
  fallbackOnlineEnabled: boolean
  fallbackProvider: string
}): SearchExecutionMode {
  if (!input.searchRequired) return "off"
  if (input.primaryToolReady && input.primaryEnabled) return "primary_google_search"
  if (input.fallbackOnlineEnabled && input.fallbackProvider === "openrouter") {
    return "fallback_online_search"
  }
  return "blocked_unavailable"
}
```

**Step 5: Run tests to verify they pass**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.claude/worktrees/search-web-tool && npx vitest run src/lib/ai/search-execution-mode.test.ts`
Expected: ALL PASS (7 tests)

**Step 6: Update caller in `route.ts`**

```typescript
// src/app/api/chat/route.ts line 1888
// BEFORE:
const searchExecutionMode = resolveSearchExecutionMode({
    searchRequired: searchRequestedByPolicy,
    primaryToolReady: primaryGoogleSearchReady,
    fallbackOnlineEnabled: webSearchConfig.fallbackEnabled,
    fallbackProvider: modelNames.fallback.provider,
})

// AFTER — add primaryEnabled:
const searchExecutionMode = resolveSearchExecutionMode({
    searchRequired: searchRequestedByPolicy,
    primaryToolReady: primaryGoogleSearchReady,
    primaryEnabled: webSearchConfig.primaryEnabled,
    fallbackOnlineEnabled: webSearchConfig.fallbackEnabled,
    fallbackProvider: modelNames.fallback.provider,
})
```

**Step 7: Verify build**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.claude/worktrees/search-web-tool && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No TypeScript errors related to `resolveSearchExecutionMode`.

**Step 8: Commit**

```bash
git add src/lib/ai/search-execution-mode.ts src/lib/ai/search-execution-mode.test.ts src/app/api/chat/route.ts
git commit -m "fix(search): enforce primaryEnabled config in search execution mode"
```

---

### Task 2: Fix `searchAlreadyDone` stage-scoping for paper mode (Fix 2.1)

**Files:**
- Modify: `src/app/api/chat/route.ts:1759`

**Step 1: Apply the fix**

```typescript
// src/app/api/chat/route.ts line 1759
// BEFORE:
const searchAlreadyDone = hasPreviousSearchResults(modelMessages, paperSession) || hasRecentSourcesInDb

// AFTER:
const searchAlreadyDone = hasPreviousSearchResults(modelMessages, paperSession)
    || (!paperSession && hasRecentSourcesInDb)
```

**Step 2: Verify build**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.claude/worktrees/search-web-tool && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No TypeScript errors.

**Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "fix(search): exclude conversation-level sources from searchAlreadyDone in paper mode"
```

---

### Task 3: Align `getSearchEvidenceFromStageData` with minCount thresholds (Fix 2.3)

**Files:**
- Modify: `src/app/api/chat/route.ts:818-855` (the `getSearchEvidenceFromStageData` function)

**Step 1: Add import**

At the top of the file where other paper-search-helpers imports exist, ensure `STAGE_RESEARCH_REQUIREMENTS` is imported:

```typescript
// Check existing imports from paper-search-helpers — add STAGE_RESEARCH_REQUIREMENTS if not already imported
import {
    // ... existing imports ...
    STAGE_RESEARCH_REQUIREMENTS,
} from "@/lib/ai/paper-search-helpers"
```

Find the exact import line by searching for `from "@/lib/ai/paper-search-helpers"` and add to it.

**Step 2: Update all 6 switch cases**

Replace each `> 0` check with `>= minCount` using `STAGE_RESEARCH_REQUIREMENTS`:

```typescript
// src/app/api/chat/route.ts — inside getSearchEvidenceFromStageData
case "gagasan": {
    const data = stageData.gagasan as { referensiAwal?: unknown[] } | undefined
    const minCount = STAGE_RESEARCH_REQUIREMENTS.gagasan?.minCount ?? 1
    return Array.isArray(data?.referensiAwal) && data.referensiAwal.length >= minCount
}
case "topik": {
    const data = stageData.topik as { referensiPendukung?: unknown[] } | undefined
    const minCount = STAGE_RESEARCH_REQUIREMENTS.topik?.minCount ?? 1
    return Array.isArray(data?.referensiPendukung) && data.referensiPendukung.length >= minCount
}
case "tinjauan_literatur": {
    const data = stageData.tinjauan_literatur as { referensi?: unknown[] } | undefined
    const minCount = STAGE_RESEARCH_REQUIREMENTS.tinjauan_literatur?.minCount ?? 1
    return Array.isArray(data?.referensi) && data.referensi.length >= minCount
}
case "pendahuluan": {
    const data = stageData.pendahuluan as { sitasiAPA?: unknown[] } | undefined
    const minCount = STAGE_RESEARCH_REQUIREMENTS.pendahuluan?.minCount ?? 1
    return Array.isArray(data?.sitasiAPA) && data.sitasiAPA.length >= minCount
}
case "diskusi": {
    const data = stageData.diskusi as { sitasiTambahan?: unknown[] } | undefined
    const minCount = STAGE_RESEARCH_REQUIREMENTS.diskusi?.minCount ?? 1
    return Array.isArray(data?.sitasiTambahan) && data.sitasiTambahan.length >= minCount
}
case "daftar_pustaka": {
    const data = stageData.daftar_pustaka as { entries?: unknown[] } | undefined
    // No STAGE_RESEARCH_REQUIREMENTS entry — defaults to 1 (preserves current behavior)
    return Array.isArray(data?.entries) && data.entries.length >= 1
}
```

**Step 3: Verify build**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.claude/worktrees/search-web-tool && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No TypeScript errors.

**Step 4: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "fix(search): align stageData evidence threshold with STAGE_RESEARCH_REQUIREMENTS minCount"
```

---

### Task 4: Combine `searchAlreadyDone` with `incomplete` check (Fix 2.2)

**Files:**
- Modify: `src/app/api/chat/route.ts:1804-1814`

**Step 1: Apply the fix**

Replace the Priority 1 block:

```typescript
// src/app/api/chat/route.ts — the decision logic block
// FIND this block (lines 1804-1814):
if (searchAlreadyDone) {
    // Priority 1: Search already done - only enable if user EXPLICITLY wants MORE
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

// REPLACE WITH:
if (searchAlreadyDone && !incomplete) {
    // Priority 1a: Search done AND research complete → only enable if user explicitly wants more
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
    // Priority 1b: Search done BUT research still incomplete → auto-enable search
    searchRequestedByPolicy = true
    activeStageSearchReason = "search_done_but_research_incomplete"
    activeStageSearchNote = getResearchIncompleteNote(currentStage as string, requirement!)
}
```

**Step 2: Verify build**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.claude/worktrees/search-web-tool && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No TypeScript errors.

**Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "fix(search): allow auto-search when research incomplete despite searchAlreadyDone"
```

---

### Task 5: Remove false positive patterns from `hasPreviousSearchResults` (Fix 2.5)

**Files:**
- Modify: `src/app/api/chat/route.ts:920-975` (the `hasPreviousSearchResults` function)

**Step 1: Fix the `stageEvidence === false` branch (lines 940-956)**

```typescript
// FIND (lines 940-956):
if (stageEvidence === false) {
    const recentAssistantMsgs = msgs
        .filter((m): m is { role: string; content?: string } =>
            typeof m === "object" && m !== null && "role" in m && (m as { role: string }).role === "assistant"
        )
        .slice(-3)

    for (const msg of recentAssistantMsgs) {
        const content = typeof msg.content === "string" ? msg.content : ""
        // Check for citations / search evidence in recent messages
        if (/\[\d+(?:,\s*\d+)*\]/.test(content)) return true
        if (/berdasarkan hasil pencarian/i.test(content)) return true
        if (/menurut .+\(\d{4}\)/i.test(content)) return true
        if (/saya telah melakukan pencarian/i.test(content)) return true
        if (/rangkuman temuan/i.test(content)) return true
    }
    return false
}

// REPLACE WITH:
if (stageEvidence === false) {
    const recentAssistantMsgs = msgs
        .filter((m): m is { role: string; content?: string; sources?: unknown } =>
            typeof m === "object" && m !== null && "role" in m && (m as { role: string }).role === "assistant"
        )
        .slice(-3)

    for (const msg of recentAssistantMsgs) {
        const content = typeof msg.content === "string" ? msg.content : ""
        // Strong signal: message has actual sources data from web search
        const hasSources = "sources" in msg
            && Array.isArray((msg as { sources?: unknown }).sources)
            && ((msg as { sources: unknown[] }).sources).length > 0
        if (hasSources) return true
        // Weak signal: only trust explicit AI search-done phrases
        // (removed: [N] pattern and APA citation pattern — high false positive rate)
        if (/saya telah melakukan pencarian/i.test(content)) return true
        if (/berdasarkan hasil pencarian/i.test(content)) return true
        if (/rangkuman temuan/i.test(content)) return true
    }
    return false
}
```

**Step 2: Fix the PASSIVE branch (lines 959-974)**

```typescript
// FIND (lines 959-974):
// PASSIVE/unknown stage (stageEvidence === null) → check more messages as fallback
const recentAssistantMsgs = msgs
    .filter((m): m is { role: string; content?: string } =>
        typeof m === "object" && m !== null && "role" in m && (m as { role: string }).role === "assistant"
    )
    .slice(-3) // Check last 3 assistant messages

for (const msg of recentAssistantMsgs) {
    const content = typeof msg.content === "string" ? msg.content : ""
    // Check for inline citation markers [1], [2], [1,2], [1,2,3], etc.
    if (/\[\d+(?:,\s*\d+)*\]/.test(content)) return true
    // Check for common patterns indicating search was done
    if (/berdasarkan hasil pencarian/i.test(content)) return true
    if (/menurut .+\(\d{4}\)/i.test(content)) return true // APA citation pattern
}
return false

// REPLACE WITH:
// PASSIVE/unknown stage (stageEvidence === null) → check more messages as fallback
const recentAssistantMsgs = msgs
    .filter((m): m is { role: string; content?: string; sources?: unknown } =>
        typeof m === "object" && m !== null && "role" in m && (m as { role: string }).role === "assistant"
    )
    .slice(-3)

for (const msg of recentAssistantMsgs) {
    const content = typeof msg.content === "string" ? msg.content : ""
    // Strong signal: message has actual sources data from web search
    const hasSources = "sources" in msg
        && Array.isArray((msg as { sources?: unknown }).sources)
        && ((msg as { sources: unknown[] }).sources).length > 0
    if (hasSources) return true
    // Weak signal: explicit AI search-done phrases only
    if (/berdasarkan hasil pencarian/i.test(content)) return true
    if (/saya telah melakukan pencarian/i.test(content)) return true
    if (/rangkuman temuan/i.test(content)) return true
}
return false
```

**Step 3: Fix comment mismatch at line 924-925**

```typescript
// FIND (lines 924-925):
//    - This catches "search done but not yet saved" scenario
//    - Limited to 1 turn to avoid false positives from old stage citations

// REPLACE WITH:
//    - This catches "search done but not yet saved" scenario
//    - Checks last 3 assistant messages for sources field or explicit search-done phrases
```

**Step 4: Verify build**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.claude/worktrees/search-web-tool && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No TypeScript errors.

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "fix(search): replace false-positive text patterns with sources field check in hasPreviousSearchResults"
```

---

### Task 6: Expand `isExplicitMoreSearchRequest` patterns (Fix 2.4)

**Files:**
- Modify: `src/lib/ai/paper-search-helpers.ts:183-199`

**Step 1: Add new patterns to the array**

```typescript
// src/lib/ai/paper-search-helpers.ts — inside isExplicitMoreSearchRequest
// FIND the moreSearchPatterns array (lines 185-197):
const moreSearchPatterns = [
    // "cari lagi", "carikan lagi"
    /\bcari(kan)?\s+(lagi|tambahan|lebih)\b/,
    // "cari referensi/sumber/literatur lagi"
    /\bcari(kan)?\s+(referensi|sumber|literatur|data)\s*(lagi|tambahan|lebih)?\b/,
    // "tambah referensi/sumber"
    /\btambah(kan)?\s+(referensi|sumber|literatur|data)\b/,
    // "search more", "search again"
    /\bsearch\s+(more|again|lagi)\b/,
    // Explicit command: "cari tentang X", "carikan X"
    /\bcari(kan)?\s+tentang\b/,
    /\bcari(kan)?\s+\w{3,}/,  // "cari [topic]" with at least 3 chars
]

// REPLACE WITH (expanded):
const moreSearchPatterns = [
    // "cari lagi", "carikan lagi"
    /\bcari(kan)?\s+(lagi|tambahan|lebih)\b/,
    // "cari referensi/sumber/literatur lagi"
    /\bcari(kan)?\s+(referensi|sumber|literatur|data)\s*(lagi|tambahan|lebih)?\b/,
    // "tambah referensi/sumber"
    /\btambah(kan)?\s+(referensi|sumber|literatur|data)\b/,
    // "search more", "search again"
    /\bsearch\s+(more|again|lagi)\b/,
    // Explicit command: "cari tentang X", "carikan X"
    /\bcari(kan)?\s+tentang\b/,
    /\bcari(kan)?\s+\w{3,}/,  // "cari [topic]" with at least 3 chars
    // "butuh/perlu lebih banyak sumber/referensi"
    /\b(butuh|perlu)\s+(lebih\s+banyak\s+)?(sumber|referensi|literatur)\b/,
    // "perlu referensi tambahan"
    /\b(perlu|butuh)\s+referensi\s+tambahan\b/,
    // "cek literatur/referensi/sumber"
    /\bcek\s+(literatur|referensi|sumber)\b/,
    // "temukan sumber/referensi"
    /\b(temukan|find)\s+(sumber|referensi)\b/,
    // "gali lebih lanjut"
    /\bgali\s+(lebih|lanjut)\b/,
]
```

**Step 2: Verify build**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.claude/worktrees/search-web-tool && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No TypeScript errors.

**Step 3: Commit**

```bash
git add src/lib/ai/paper-search-helpers.ts
git commit -m "fix(search): expand isExplicitMoreSearchRequest to cover common Indonesian re-search expressions"
```

---

### Task 7: Fix empty title in grounding chunk path (Fix 4.1)

**Files:**
- Modify: `src/app/api/chat/route.ts:2593`

**Step 1: Apply the fix**

```typescript
// src/app/api/chat/route.ts line 2593
// FIND:
const title = typeof chunk.web?.title === "string" ? chunk.web.title : normalizedUrl

// REPLACE WITH:
const title = (typeof chunk.web?.title === "string" && chunk.web.title.trim()) || normalizedUrl
```

**Step 2: Verify build**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.claude/worktrees/search-web-tool && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No TypeScript errors.

**Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "fix(citations): fallback to URL when grounding chunk title is empty string"
```

---

### Task 8: Apply `isLowValueCitationUrl` filter to fallback path (Fix 4.3)

**Files:**
- Modify: `src/app/api/chat/route.ts` — hoist helpers + add filter to fallback path

This is the most involved task. Two sub-steps:

**Step 1: Hoist `isVertexProxyUrl` and `isLowValueCitationUrl` from inner scope to route handler scope**

Currently defined at lines ~2448–2478 (deep inside primary stream's `onFinish` callback). Move them to just after the `try {` at line 1743, before any stream logic. Keep exact same function bodies — only change is scope.

```typescript
// src/app/api/chat/route.ts
// After line 1743 (try {), before line 1744 (const model = ...):
// INSERT these two helper functions (cut from lines 2448-2478):

const isVertexProxyUrl = (raw: string) => {
    try {
        const u = new URL(raw)
        const host = u.hostname.toLowerCase()
        return host === "vertexaisearch.cloud.google.com" || host.startsWith("vertexaisearch.cloud.google.")
    } catch {
        return false
    }
}

const isLowValueCitationUrl = (raw: string) => {
    try {
        const u = new URL(raw)
        const host = u.hostname.toLowerCase()
        const path = u.pathname || "/"
        const trimmedPath = path.replace(/\/+$/, "") || "/"
        const segments = trimmedPath.split("/").filter(Boolean)

        if (path === "/" || path === "") return true
        if (/(^|\/)(tag|tags|topik|topic|search)(\/|$)/i.test(path)) return true
        if (segments.length === 1) {
            const only = segments[0].toLowerCase()
            if (["berita", "news", "artikel", "articles", "posts", "post"].includes(only)) return true
        }
        if ((host === "google.com" || host === "www.google.com") && path === "/search") return true

        return false
    } catch {
        return false
    }
}
```

Then **delete** the same function definitions from their original location (~lines 2448–2478). The references at lines 2640–2670 will still work since they're in the same scope.

**Step 2: Apply filter to fallback path**

```typescript
// src/app/api/chat/route.ts — fallback path, after normalizedCitations (around line 3420)
// FIND (lines 3424-3428):
const persistedSources = normalizedCitations.map((citation) => ({
    url: citation.url,
    title: citation.title,
    ...(citation.publishedAt ? { publishedAt: citation.publishedAt } : {}),
}))

// REPLACE WITH:
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

**Step 3: Update downstream references to use `filteredCitations`**

The `fallbackCitationAnchors` (line ~3429) and `hasAnyCitations` (line ~3420) must use `filteredCitations`:

```typescript
// FIND (line 3420):
const hasAnyCitations = normalizedCitations.length > 0

// This line stays as-is for sourceCount tracking, BUT add a new variable after filteredCitations:
const hasAnyCitations = filteredCitations.length > 0
```

Wait — `hasAnyCitations` is defined BEFORE `filteredCitations` in the current code. So reorder: move `hasAnyCitations` to after `filteredCitations`, or compute it from filteredCitations.

Specifically:
```typescript
// BEFORE (lines 3420-3428):
const hasAnyCitations = normalizedCitations.length > 0
sourceCount = Math.max(sourceCount, normalizedCitations.length)
closeSearchStatus(hasAnyCitations ? "done" : "off")

const persistedSources = normalizedCitations.map(...)

// AFTER:
sourceCount = Math.max(sourceCount, normalizedCitations.length)

const filteredCitations = (() => {
    // ... filter logic as above ...
})()
const hasAnyCitations = filteredCitations.length > 0
closeSearchStatus(hasAnyCitations ? "done" : "off")

const persistedSources = filteredCitations.map((citation) => ({
    url: citation.url,
    title: citation.title,
    ...(citation.publishedAt ? { publishedAt: citation.publishedAt } : {}),
}))
```

Also update `fallbackCitationAnchors`:
```typescript
// FIND:
const fallbackCitationAnchors = normalizedCitations.map((citation, idx) => ({

// REPLACE:
const fallbackCitationAnchors = filteredCitations.map((citation, idx) => ({
```

**Step 4: Verify build**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.claude/worktrees/search-web-tool && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No TypeScript errors.

**Step 5: Run all tests**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.claude/worktrees/search-web-tool && npx vitest run`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "fix(citations): apply isLowValueCitationUrl filter to OpenRouter fallback path"
```

---

### Task 9: Final verification

**Step 1: Run full test suite**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.claude/worktrees/search-web-tool && npx vitest run`
Expected: All tests pass.

**Step 2: Run lint**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.claude/worktrees/search-web-tool && npm run lint`
Expected: No errors.

**Step 3: Run TypeScript build check**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.claude/worktrees/search-web-tool && npx tsc --noEmit`
Expected: No errors.

**Step 4: Verify git log**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.claude/worktrees/search-web-tool && git log --oneline -10`
Expected: 8 commits, one per fix (Tasks 1-8), all on `search-web-tool` branch.
