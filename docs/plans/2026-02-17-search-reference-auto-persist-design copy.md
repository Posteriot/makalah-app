# Search Reference Auto-Persist Design

**Date:** 2026-02-17
**Branch:** fix/paper-workflow-resilience
**Status:** Approved

## Problem

AI hallucinates citations when drafting paper sections. Root cause: google_search results (URL + title) are stored in message `sources` but NOT in `stageData`. The sanitizer strips tool messages between turns, and `stageData` (which IS injected into every turn via paper-mode-prompt) lacks reference data.

### Verified Data Loss Flow

```
Turn 1 (Web Search Mode):
  tools = { google_search } only
  AI calls google_search → gets 4 real references (URL, title, snippet)
  AI writes summary with accurate URLs
  saveAssistantMessage(text, sources) → text + sources saved to messages table
  BUT: stageData has NO reference data

Turn 2 (Function Tools Mode):
  Client sends messages from useChat state
  Server: convertToModelMessages → sanitizer drops tool messages (line 367-402)
  AI asked to draft paper section → needs references
  Available: only AI's own summary text from Turn 1 (no structured data)
  AI "remembers" vaguely → FABRICATES citations
```

### Why stageData is the Right Target

`paper-mode-prompt.ts` already injects `stageData` into every turn as system prompt context. If references exist in stageData, AI has them in every subsequent turn automatically.

## Solution: Finish Handler Auto-Persist

After web search completes and `saveAssistantMessage()` runs, auto-persist search results to stageData via a new Convex mutation.

### Design Decisions

1. **Server-side auto-persist** — deterministic, not dependent on AI behavior
2. **New `webSearchReferences` field** in all 13 stage schemas — uniform, simple schema
3. **Dual-write for gagasan/topik** — also append to native `referensiAwal`/`referensiPendukung` fields (compatible schema)
4. **Append-only with URL dedup** — never overwrite, merge by URL
5. **Non-blocking** — failure doesn't break the response stream
6. **Engine-agnostic** — persists `{url, title, publishedAt}` regardless of search source

### Why Not Extract Authors Server-Side

google_search grounding chunks only return `{uri, title}`. Author metadata is NOT available from the API. Options like agent-browser or cheerio-based fetching were evaluated and rejected:
- agent-browser: 6-30s latency, 200MB Chromium dependency, unreliable author data
- cheerio fetch: 1-3s latency, unreliable (most Indonesian sites lack og:author)
- Conclusion: Fix data persistence first (Layer 1), improve data quality later (Layer 2)

### Future: Alternative Search Engines (Phase 2)

Perplexity API could provide better citation metadata. This design is engine-agnostic — `appendSearchReferences` accepts any `{url, title, publishedAt}` regardless of source. Switching/adding search engines is a separate concern.

## Schema Changes

### New Field: `webSearchReferences`

Added to ALL 13 stage validators in `convex/paperSessions/types.ts`:

```ts
webSearchReferences: v.optional(v.array(v.object({
    url: v.string(),
    title: v.string(),
    publishedAt: v.optional(v.number()),
}))),
```

Also added to 6 inline stage definitions in `convex/schema.ts`.

### Stage-to-Reference Field Mapping

| Stage | webSearchReferences | Also append to native field |
|-------|--------------------|-----------------------------|
| gagasan | Yes | referensiAwal |
| topik | Yes | referensiPendukung |
| outline | Yes | — |
| abstrak | Yes | — |
| pendahuluan | Yes | — (sitasiAPA has required fields) |
| tinjauan_literatur | Yes | — (referensi has required fields) |
| metodologi | Yes | — |
| hasil | Yes | — |
| diskusi | Yes | — (sitasiTambahan has required fields) |
| kesimpulan | Yes | — |
| daftar_pustaka | Yes | — (entries has required fields) |
| lampiran | Yes | — |
| judul | Yes | — |

Native fields for pendahuluan/tinjauan_literatur/diskusi/daftar_pustaka have required fields (inTextCitation, fullReference, isFromPhase1) that raw search data cannot provide. AI remains responsible for constructing proper citations using persisted URL+title data.

## New Mutation: `appendSearchReferences`

```ts
// convex/paperSessions.ts
appendSearchReferences: mutation({
    args: {
        sessionId: v.id("paperSessions"),
        references: v.array(v.object({
            url: v.string(),
            title: v.string(),
            publishedAt: v.optional(v.number()),
        })),
    },
    handler: async (ctx, { sessionId, references }) => {
        // 1. Get session and current stage
        // 2. Append to webSearchReferences with URL dedup
        // 3. For gagasan/topik: also append to native reference fields
        // 4. Patch stageData
    }
});
```

Dedup logic: compare by normalized URL (strip UTM params, trailing slash, hash).

## Route Handler Integration

### Primary Path (Gateway + google_search)

Location: `src/app/api/chat/route.ts`, after `saveAssistantMessage()` in web search finish handler (~line 1708).

```ts
if (paperSession && persistedSources && persistedSources.length > 0) {
    try {
        await fetchMutation(api.paperSessions.appendSearchReferences, {
            sessionId: paperSession._id,
            references: persistedSources.map(s => ({
                url: s.url,
                title: s.title,
                ...(typeof s.publishedAt === "number" ? { publishedAt: s.publishedAt } : {}),
            })),
        }, convexOptions);
    } catch (err) {
        console.error("[Paper] Failed to auto-persist search references:", err);
    }
}
```

### Fallback Path (OpenRouter :online)

Same pattern in the fallback web search handler.

### Error/Abort Path Fix

Currently, error/abort paths (line 1746-1754) do NOT call `saveAssistantMessage`. Fix: call `saveAssistantMessage` in abort path if `streamedText` has content. This prevents message loss on stream interruption.

## Prompt Injection Enhancement

### `formatStageData()` Update

In `src/lib/ai/paper-stages/index.ts`, update to format `webSearchReferences` prominently:

```
📚 REFERENSI WEB SEARCH TERSIMPAN (WAJIB gunakan, JANGAN fabricate):
1. "Judul Artikel" — https://example.com/article
2. "Judul Lain" — https://example.com/other

⚠️ SEMUA sitasi in-text HARUS merujuk ke referensi di atas. Jika butuh referensi tambahan, MINTA user untuk search dulu.
```

## Files to Modify

| File | Change |
|------|--------|
| `convex/paperSessions/types.ts` | Add `webSearchReferences` to all 13 stage validators |
| `convex/schema.ts` | Add `webSearchReferences` to 6 inline stage definitions |
| `convex/paperSessions.ts` | Add `appendSearchReferences` mutation + dedup helper |
| `src/app/api/chat/route.ts` | Auto-persist in finish handler (primary + fallback) + abort path fix |
| `src/lib/ai/paper-mode-prompt.ts` | Format webSearchReferences in prompt injection |
| `src/lib/ai/paper-stages/index.ts` | Update `formatStageData()` to include webSearchReferences |

## Testing Plan

1. **Unit test:** `appendSearchReferences` mutation — dedup, append-only, dual-write for gagasan/topik
2. **Integration test:** Web search in paper mode → verify stageData updated with references
3. **Manual test:** Full paper workflow — search → draft → verify no hallucinated citations
4. **Regression:** Existing updateStageData still works, no double-write conflicts
