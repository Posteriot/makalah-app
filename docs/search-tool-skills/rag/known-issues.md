# RAG Pipeline — Known Issues (Blocking)

**Date:** 2026-03-16
**Status:** Must fix before RAG is usable

These two issues prevent RAG tools from functioning as designed. Both must be resolved before further testing.

---

## Issue 1: Search Router Overrides RAG Tools

**Symptom:** User asks follow-up about a previously cited source ("Siapa penulis artikel dari Suara Muhammadiyah yang kau kutip itu?"). Instead of using `quoteFromSource` RAG tool to retrieve stored chunks, the search router triggers a NEW web search — which finds different articles and gives wrong answers.

**Evidence from terminal:**
```
[SearchDecision] searchAlreadyDone: true, searchRequestedByPolicy: true
```

The router knows search was already done but `searchRequestedByPolicy: true` overrides. A new web search runs, compose phase fires (with NO tools available), and the model answers from new (wrong) sources instead of stored chunks.

**Root cause:** The search decision router in `route.ts` does not account for RAG tool availability. When the user's question is about previously cited sources, the correct path is the normal chat path (with tools), not the web search path (without tools).

**Fix direction:**
- The search decision logic needs a new signal: "user is asking about previously cited sources"
- When detected, skip web search → let normal chat path handle it → model calls `quoteFromSource` or `searchAcrossSources`
- This may involve: checking if the user's message references sources from previous turns, and if RAG chunks exist for this conversation

**Files to investigate:**
- `src/app/api/chat/route.ts` — search decision logic, `searchRequestedByPolicy`
- `src/lib/ai/search-mode-decision.ts` — if search routing logic lives here
- The unified router prompt/logic that decides `searchRequired`

---

## Issue 2: Readability Strips Author/Metadata from Extracted Content

**Symptom:** Article "Dilema Penggunaan AI di Perguruan Tinggi" by Candra Kusuma Wardana was fetched (7489 chars) and chunked (5 chunks). But the model couldn't identify the author — the byline was likely stripped by readability during HTML extraction.

**Evidence:** The actual page shows "Oleh: Candra Kusuma Wardana, S.E., MBA, Dosen Program Studi Manajemen, Universitas Muhammadiyah Surakarta" as a byline. This is typically in a `<div class="author">` or `<span class="byline">` element that readability considers non-article content and strips.

**Root cause:** `@mozilla/readability` is designed to extract the main article body. Metadata like author, publication date, and institution are often in separate HTML elements (bylines, meta tags, header sections) that readability removes.

**What readability DOES extract:** `article.byline`, `article.publishedTime`, `article.siteName` — but these are separate fields from `article.content`. The current pipeline only uses `article.content` for markdown conversion.

**Fix direction:**
- After `Readability.parse()`, also extract `article.byline`, `article.publishedTime`, `article.excerpt`
- Prepend these as a metadata block to the markdown before chunking:
  ```
  **Author:** Candra Kusuma Wardana, S.E., MBA
  **Published:** 2025-01-15
  **Site:** Suara Muhammadiyah

  [article content follows...]
  ```
- This ensures author/date are in the first chunk and searchable via RAG
- Also extract from `<meta>` tags: `citation_author`, `citation_date`, `og:author`, `article:author`

**Files to modify:**
- `src/lib/ai/web-search/content-fetcher.ts` — `fetchAndParse()` function, after `reader.parse()`

---

## Priority

**Issue 2 is simpler and can be fixed independently.** It's a content-fetcher enhancement — extract metadata and prepend to markdown.

**Issue 1 is architectural.** It requires changes to the search decision router, which affects the entire chat flow. Needs careful investigation of how `searchRequestedByPolicy` works and how to add a "RAG-available" signal.

**Recommended order:** Fix Issue 2 first (quick, isolated), then investigate Issue 1 (complex, needs exploration).
