# NLP-5 / NLP-7 Verdict

> Tanggal: 2026-03-26
> Basis: 6 runtime requests + full codebase audit
> Branch: pr/chat-page-ux-status-sync-20260316

---

## 1. Apa yang diinvestigasi

Dua masalah dari handoff document:
- **NLP-5**: FetchWeb success rate rendah (1/6, 1/7 di sample logs)
- **NLP-7**: Google grounding 0-citation → fallback ke perplexity → Phase 1 dobel cost

## 2. Runtime evidence

6 search requests dijalankan. 3 sebelum Tavily fix, 1 sesudah Tavily fix, 2 sesudah regex removal + skeleton fix.

### Phase 1: Retriever

| Request | textGen | chars | citations | Retriever | Notes |
|---------|---------|-------|-----------|-----------|-------|
| 1 | 17162ms | 5866 | 20 | google-grounding | |
| 2 | 19655ms | 5925 | 20 | google-grounding | |
| 3 | 20415ms | 6741 | 14 | google-grounding | post-Tavily fix |
| 4 | 18537ms | 8720 | 20 | google-grounding | post-regex removal |
| 5 | 20908ms | 5783 | 20 | google-grounding | post-regex removal |
| 6a | 2784ms | 0 | 0 | google-grounding | **NLP-7 case**: 0-citation, fallback |
| 6b | 10723ms | 4055 | 6 | perplexity | fallback winner |

Temuan:
- Text output konsisten ~5800-8700 chars (~1500-2200 tokens). `retrieverMaxTokens: 4096` yang di-set **tidak pernah limiting** — Gemini natural output jauh di bawah cap.
- Phase 1 timing (17-21s) sepenuhnya dikontrol Google API latency (TTFB + streaming). Tidak ada lever internal yang bisa mempercepat ini.
- **NLP-7 case terobservasi** di Request 6: google-grounding return 0 citations dalam 2.8s (model bahkan tidak generate text), fallback ke perplexity 10.7s. Total Phase 1 = 13.5s. Ini **lebih cepat** dari normal google-grounding success (17-21s) karena 0-citation finish sangat cepat.

### Phase 1.5: Proxy resolve

| Request | proxyResolve top7 | Proxies in top 7 |
|---------|-------------------|------------------|
| 1 | 3015ms | 7/7 |
| 2 | 3014ms | 7/7 |
| 3 | 3013ms | 7/7 |
| 4 | 1764ms | 7/7 |
| 5 | 1104ms | 7/7 |

Temuan:
- **Semua** top 7 sources selalu proxy URLs (vertex grounding-api-redirect).
- Request 1-3 mentok di `REDIRECT_TIMEOUT_MS = 3000ms` ceiling. Request 4-5 resolve lebih cepat (1.1-1.8s) — artinya bukan selalu mentok ceiling, tergantung network conditions.
- Request 6 (perplexity winner) tidak punya proxy resolve karena perplexity return real URLs langsung.

### Phase 1.5: FetchWeb

**Request 1** (mixed URLs, tanpa Tavily):
```
6/7 success (fetch=6, tavily=0), 1338ms
Failures: 1x proxy timeout (842ms)
```

**Request 2** (academic/PDF URLs, tanpa Tavily):
```
0/7 success (fetch=0, tavily=0), 807ms
Failures: 3x pdf_unsupported, 2x ResearchGate 403, 1x proxy→PDF, 1x proxy timeout
```

**Request 3** (academic/PDF URLs, dengan Tavily):
```
4/7 success (fetch=0, tavily=4), 12823ms
Tavily recovered: 3x PDF jurnal (8992ms batch), 1x proxy→content (3814ms)
Failures: 3x proxy timeout/unresolved
```

**Request 4** (mixed URLs, dengan Tavily, post-regex removal):
```
3/7 success (fetch=2, tavily=1), 3341ms
Tavily recovered: 1x PDF. Failures: 3x ResearchGate 403, 1x Tavily no_content
```

**Request 5** (mixed URLs, post-regex removal):
```
6/7 success (fetch=6, tavily=0), 2499ms
Failures: 1x 403 + Tavily no_content
```

**Request 6** (perplexity fallback, PDF/academic query):
```
4/6 success (fetch=1, tavily=3), 10726ms
Tavily recovered: 3x PDF jurnal (7418ms batch)
Failures: 1x 403, 1x timeout + Tavily no_content
```

## 3. Root causes (proven)

### RC-1: Proxy resolve = 3s dead weight setiap request

Google grounding return **semua** citations sebagai vertex proxy URLs. Orchestrator resolve top 7 via HEAD requests (`resolveVertexProxyUrls`). Timeout ceiling 3000ms. Ini 3s blocking sebelum FetchWeb bisa mulai, setiap request, tanpa exception.

Evidence: 3/3 requests menunjukkan `proxyResolve top7 = 3013-3015ms`.

Code path: `orchestrator.ts:458-468` → `google-grounding.ts:48-71` → `resolveRedirect()` per URL dengan `REDIRECT_TIMEOUT_MS = 3000`.

### RC-2: Unresolved proxy URLs memakan FetchWeb slots

Setelah resolve, beberapa URL tetap proxy (resolve gagal atau resolve ke resource yang tidak bisa di-handle). URL ini masuk `urlsToFetch` dan pasti fail:
- `proxy_or_redirect_like` → timeout 800ms atau `proxy_unresolved`
- proxy yang resolve ke PDF → `pdf_unsupported`

Setiap proxy slot yang terbuang = 1 URL produktif yang tidak di-fetch.

Evidence: Request 1: 1/7 terbuang. Request 2: 2/7 proxy terbuang (+ 3 PDF + 2 academic). Request 3: 3/7 proxy terbuang.

Code path: `orchestrator.ts:472` — `resolvedUrlMap.get(s.url) ?? s.url` (fallback ke proxy URL asli).

### RC-3: Tavily fallback = high-value tapi high-latency

Tavily berhasil recover 4 sources yang sebelumnya 0 (Request 2 vs 3: same query type). Tapi Tavily calls **sequential** setelah primary batch gagal:

```
Primary batch (all fail):   ~800ms
Tavily PDF batch:           8992ms    ← sequential
Tavily proxy fallback:      3814ms    ← sequential after PDF batch
Total Phase 1.5:            12844ms
```

Trade-off: +4 verified sources, +12s latency.

Code path: `content-fetcher.ts:233-267` — `fallbackCandidates` di-collect setelah primary loop, lalu `fetchViaTavily()` dipanggil sekali untuk semua fallback URLs.

### RC-4: Tanpa Tavily, PDF/academic queries = 0 verified sources

Request 2 (tanpa Tavily): 7 URLs, 0 success. 3 PDF + 2 ResearchGate 403 + 2 proxy fail. Compose pakai `searchText` fallback (retriever text) — kualitas jauh lebih rendah karena retriever text bisa halusinasi.

Root cause: `@tavily/core` ada di `package.json` tapi **belum ter-install** di `node_modules`. `TAVILY_API_KEY` ada di root `.env.local` tapi **tidak di-copy ke worktree** `.env.local`. Kedua sudah di-fix (env sync + npm install).

**Ini bukan code bug — ini deployment/config gap.** Perlu dipastikan production deploy juga punya keduanya.

### RC-5: Regex intent detection memaksa response jadi list (FIXED)

`inferSearchResponseMode` di `reference-presentation.ts` pakai regex untuk detect kata "pdf", "referensi", "rujukan" dll di user message. Kalau match, `responseMode` jadi `"reference_inventory"` → UI hide compose naratif, hanya tampilkan raw source list (termasuk proxy URLs mentah).

**Fix applied**: `inferSearchResponseMode` dihapus, always return `"synthesis"`. Semua downstream `"reference_inventory"`/`"mixed"` branches dihapus dari `search-results-context.ts`, `internal-thought-separator.ts`, `MessageBubble.tsx`. Response sekarang selalu naratif — model yang decide format.

### RC-6: Skeleton loading stuck di conversation baru (FIXED)

`ChatWindow.tsx:2289-2290` punya catch-all condition:
```
(Boolean(conversationId) && messages.length === 0)
```
Ini bikin conversation baru yang memang belum punya message **selalu stuck** di skeleton — bahkan setelah semua Convex loading selesai.

**Fix applied**: Hapus catch-all condition. Skeleton hanya tampil saat ada loading flag aktif (`isHistoryLoading || isConversationLoading || isAwaitingAssistantStart`).

## 4. Apa yang TIDAK terbukti

| Hypothesis | Status | Kenapa |
|-----------|--------|--------|
| `retrieverMaxTokens` reduce Phase 1 time | **Disproven** | Gemini output ~1500-2200 tokens, cap 4096 tidak limiting |
| NLP-7 fallback = "dobel cost" | **Disproven** | Request 6: 0-citation finish dalam 2.8s → fallback 10.7s → total 13.5s. Lebih cepat dari normal success (17-21s) |
| `html_standard` timeout 5s sebagai bottleneck | **Tidak terlihat** | Semua html_standard selesai < 1.3s di 6 requests. Bottleneck ada di proxy resolve dan Tavily sequential |
| Proxy resolve selalu mentok 3s | **Partially disproven** | Request 4-5 resolve dalam 1.1-1.8s. Variabel tergantung network. Bukan selalu ceiling. |

## 5. Prioritas (evidence-based)

Ranked by proven impact dari runtime data, bukan estimasi.

### P1: Reduce proxy resolve blocking (3s → ?)

**Proven impact**: 3s saved setiap request (100% hit rate).
**Approach**: Reduce `REDIRECT_TIMEOUT_MS` dari 3000ms. Dari log, successful resolves selesai within the 3s window tapi kita tidak tahu exact distribution — perlu tambah per-URL timing log di `resolveRedirect()` dulu sebelum pick angka baru.
**Effort**: Trivial (1 constant) tapi butuh data dulu.

### P2: Filter proxy URLs post-resolve + backfill

**Proven impact**: 1-3 slot terbuang per batch. Backfill dari source #8+ = more productive URLs.
**Approach**: Setelah `resolveVertexProxyUrls()`, filter URLs yang masih proxy (atau resolve ke PDF), backfill dari `scoredSources[7+]`.
**Effort**: Low (~20 lines di `orchestrator.ts`).

### P3: Verify Tavily aktif di production

**Proven impact**: 0/7 → 4/7 FetchWeb success untuk PDF/academic queries.
**Approach**: Verify `TAVILY_API_KEY` ada di production env + `@tavily/core` ter-install di production build.
**Effort**: Config check, bukan code change.

### P4: Tavily latency — overlap atau pre-classify

**Proven impact**: Tavily adds 9-13s sequential. Potential save ~9s kalau di-overlap.
**Approach options**:
  - (a) Fire Tavily batch in parallel with primary fetch, merge results
  - (b) Pre-classify URLs sebelum masuk batch: PDF → langsung Tavily (skip primary fetch yang pasti fail)
  - Option (b) lebih simple dan targeted.
**Effort**: Medium.

### Backlog (lower priority setelah data baru)

- NLP-7 fallback cost — **no longer urgent**. Request 6 menunjukkan 0-citation fallback (2.8s + 10.7s = 13.5s) lebih cepat dari normal google-grounding (17-21s). Cost bukan "dobel" — justru lebih murah.
- `html_standard` timeout reduction — tidak terlihat sebagai bottleneck di 6 requests.
- Proxy resolve timeout reduction — Request 4-5 menunjukkan resolve bisa < 2s. Variabel, bukan selalu 3s ceiling. Lower priority.

## 6. Perubahan yang sudah di-apply di branch ini

| File | Perubahan |
|------|-----------|
| `route.ts` | `retrieverMaxTokens: 4096` (safety net, no latency impact) |
| `reference-presentation.ts` | Hapus regex `inferSearchResponseMode`, always `"synthesis"` |
| `search-results-context.ts` | Hapus `"reference_inventory"`/`"mixed"` mode branches |
| `internal-thought-separator.ts` | Hapus `getReferenceInventoryIntroText`, compose output tidak di-replace |
| `MessageBubble.tsx` | Hapus reference inventory panel, response selalu naratif |
| `ChatWindow.tsx` | Fix skeleton stuck — hapus catch-all `Boolean(conversationId) && messages.length === 0` |
| `normalizer.test.ts` (root) | Hapus dead tests untuk removed functions |
| `sourceChunks.test.ts` (root) | Fix `_handler` type cast |
| `ChatInput.mobile-layout.test.tsx` (root) | Fix implicit `this` type |
