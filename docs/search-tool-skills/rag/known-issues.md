# RAG Pipeline — Known Issues

**Date:** 2026-03-17
**Status:** Both issues resolved

---

## Issue 1: Search Router Overrides RAG Tools — RESOLVED

**Symptom:** User asks follow-up about a previously cited source. Instead of using RAG tools, the search router triggered a NEW web search with wrong results.

**Root cause:** The search decision router always preferred `enableWebSearch: true` for safety. No mechanism to detect "user is asking about previously cited sources."

**Fix (commit `5faa4dc8`):** Three-layer RAG-aware search decision override:
1. Pre-router: query `sourceChunks.hasChunks(conversationId)`
2. Router prompt: inject RAG availability context
3. Post-router deterministic guard: if `ragChunksAvailable + searchAlreadyDone + no explicit new-search trigger` → force `enableWebSearch = false`

Explicit new-search triggers ("cari lagi", "tambah sumber", "search again") bypass the override.

**Verified:** Terminal shows `[SearchDecision] RAG override: chunks available, no explicit new-search trigger → enableWebSearch=false` and model correctly uses RAG tools for follow-up questions.

---

## Issue 2: Readability Strips Author/Metadata — RESOLVED

**Symptom:** Model couldn't identify article author because readability stripped the byline from extracted content.

**Root cause:** `@mozilla/readability` extracts `article.content` (main body) but strips metadata elements (bylines, meta tags). The pipeline only used `article.content`.

**Fix (commit `43544b36`):** Extract metadata from readability fields (`article.byline`, `article.publishedTime`, `article.siteName`) AND HTML meta tags (`citation_author`, `og:author`, `article:author`, `citation_date`, etc.). Prepend as markdown metadata block:

```
**Author:** Candra Kusuma Wardana, S.E., MBA
**Published:** 2025-01-15
**Source:** Suara Muhammadiyah

[article content follows...]
```

Metadata is in the first chunk and searchable via RAG.
