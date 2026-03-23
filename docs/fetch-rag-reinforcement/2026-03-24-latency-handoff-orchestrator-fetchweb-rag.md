# Handoff Latensi Search Orchestrator, FetchWeb, dan RAG

Dokumen ini berisi catatan faktual dari log terminal yang diberikan pada 24 Maret 2026. Dokumen ini tidak memuat saran, opini, asumsi, atau keputusan desain.

## Identitas Sesi

- Timestamp pencatatan: `2026-03-24 05:15:03 WIB`
- Worktree: `.worktrees/chat-page-ux-design-enforcement`
- Branch aktif: `pr/chat-page-ux-status-sync-20260316`
- HEAD saat dokumen dibuat: `0f6268ff24be45f01123093c1d1779c554bc8d1a`
- Dev server:
  - Next.js `16.1.6 (Turbopack)`
  - Local `http://localhost:3000`
- Node runtime yang terlihat di log:
  - `v18.20.8`
  - lalu beralih ke `v22.20.0`

## Ringkasan Fakta yang Terlihat di Log

Ada dua run search utama yang terlihat lengkap di log:

1. Run A
   - Conversation: `j576e3ybksb34mpwmegrzrkdnh83fje1`
   - Search mode: `google-grounding`
   - Search result:
     - `20` citations
     - `7` verified sources
   - Total request:
     - `POST /api/chat 200 in 43s`
   - Orchestrator:
     - `[⏱ LATENCY] ORCHESTRATOR TOTAL=29781ms`
   - Exact source persist:
     - `[⏱ LATENCY] Exact source persist ALL DONE total=3183ms sources=7`
   - RAG ingest:
     - `[⏱ LATENCY] RAG ingest ALL DONE total=16119ms sources=7`

2. Run B
   - Conversation: `j570gf37hh1j1g9zey8455tmb583f3e0`
   - Search mode: `google-grounding`
   - Search result:
     - `20` citations
     - `6` verified sources
   - Total request:
     - `POST /api/chat 200 in 43s`
   - Orchestrator:
     - `[⏱ LATENCY] ORCHESTRATOR TOTAL=30721ms`
   - Exact source persist:
     - `[⏱ LATENCY] Exact source persist ALL DONE total=3229ms sources=6`
   - RAG ingest:
     - `[⏱ LATENCY] RAG ingest ALL DONE total=15415ms sources=6`

## Run A: Breakdown Factual

### Request Awal dan Search Decision

- `[Context Budget] 5,583 tokens estimated`
- `[⏱ LATENCY] searchRouter=3240ms decision=SEARCH intent=search confidence=1`
- `[SearchExecution] mode=google-grounding, searchRequired=true, chain=[google-grounding,perplexity]`

### Phase 1: Retriever

- `[⏱ LATENCY] Phase1 retriever="google-grounding" textGen=15140ms extractSources=4ms total=15144ms citations=20 text=4944chars`
- `[⏱ LATENCY] Phase1 TOTAL=15145ms tried=google-grounding winner=google-grounding`

### Phase 1.5: Proxy Resolve dan FetchWeb

- `[⏱ LATENCY] Phase1.5 proxyResolve top7=1010ms proxies=7`
- `[Orchestrator] Phase 1.5: fetching content for 7 URLs...`
- FetchWeb per URL:
  - `[1/7] ✓ 1810ms` `news.detik.com/...` `2537 chars`
  - `[2/7] ✓ 1807ms` `www.ipb.ac.id/...` `3674 chars`
  - `[3/7] ✓ 1805ms` `www.detik.com/...` `3527 chars`
  - `[4/7] ✓ 1803ms` `s2dikdas.fip.unesa.ac.id/...` `5155 chars`
  - `[5/7] ✓ 1800ms` `jatimnow.com/...` `3229 chars`
  - `[6/7] ✓ 1798ms` `oxfordlearning.com/...` `7494 chars`
  - `[7/7] ✓ 1796ms` `www.cnbcindonesia.com/...` `3322 chars`
- Batch FetchWeb:
  - `[⏱ LATENCY] FetchWeb PRIMARY batch=1812ms`
  - `[FetchWeb] Done: 7/7 succeeded (fetch=7, tavily=0)`
  - `[Orchestrator] Phase 1.5 done in 1813ms`
  - `[⏱ LATENCY] Phase1.5 FetchWeb total=1836ms enriched=7/20 urls=7`

### Search Context dan Compose

- `[SearchContext] Built context: 20 sources (7 verified), 39375 chars total`
- `[⏱ LATENCY] Phase2 contextBuild=2ms sysMsgCount=5 totalMsgCount=8`
- `[⏱ LATENCY] proxyResolve (parallel) 3806ms for 13 URLs`
- `[⏱ LATENCY] Phase2 firstToken=4848ms (time-to-first-text from compose start)`
- `[⏱ LATENCY] Phase2 composeTotal=11221ms textChunks=4195 composedChars=4195`
- `[⏱ LATENCY] onFinish(DB writes)=553ms`
- `[⏱ LATENCY] ORCHESTRATOR TOTAL=29781ms (Phase1=29781ms includes all)`

### Stutter Selama Compose

- `gap=224ms`
- `gap=216ms`
- `gap=304ms`
- `gap=359ms`
- `gap=303ms`
- `gap=300ms`
- `gap=261ms`
- `gap=294ms`
- `gap=299ms`
- `gap=499ms`
- `gap=246ms`
- Ringkasan:
  - `maxGap=499ms`
  - `gapsOver200ms=11`
  - `reasoningInterruptions=1`
  - `totalReasoningChunks=2`
  - `isDrafting=true`

### Exact Source Persist

- `[⏱ LATENCY] Exact source persist starting (awaited): 7 sources`
- Per source:
  - `[1/7] ... 549ms`
  - `[2/7] ... 421ms`
  - `[3/7] ... 429ms`
  - `[4/7] ... 487ms`
  - `[5/7] ... 432ms`
  - `[6/7] ... 437ms`
  - `[7/7] ... 424ms`
- Total:
  - `[⏱ LATENCY] Exact source persist ALL DONE total=3183ms sources=7`

### RAG Ingest

- `[⏱ LATENCY] RAG ingest starting (fire-and-forget): 7 sources`
- Per source:
  - `news.detik.com/...` `chunks=2 chunk=1ms embed=1648ms store=465ms total=2114ms contentChars=2537`
  - `www.ipb.ac.id/...` `chunks=2 chunk=1ms embed=1306ms store=487ms total=1794ms contentChars=3674`
  - `www.detik.com/...` `chunks=4 chunk=0ms embed=1472ms store=560ms total=2032ms contentChars=3527`
  - `s2dikdas.fip.unesa.ac.id/...` `chunks=3 chunk=0ms embed=1234ms store=489ms total=1723ms contentChars=5155`
  - `jatimnow.com/...` `chunks=2 chunk=0ms embed=1210ms store=481ms total=1691ms contentChars=3229`
  - `oxfordlearning.com/...` `chunks=6 chunk=0ms embed=1736ms store=702ms total=2438ms contentChars=7494`
  - `www.cnbcindonesia.com/...` `chunks=2 chunk=0ms embed=1034ms store=467ms total=1501ms contentChars=3322`
- Total:
  - `[⏱ LATENCY] RAG ingest ALL DONE total=16119ms sources=7`

## Run B: Breakdown Factual

### Request Awal dan Search Decision

- `[Context Budget] 5,711 tokens estimated`
- `[⏱ LATENCY] searchRouter=2399ms decision=SEARCH intent=search confidence=0.9`
- `[SearchExecution] mode=google-grounding, searchRequired=true, chain=[google-grounding,perplexity]`

### Phase 1: Retriever

- `[⏱ LATENCY] Phase1 retriever="google-grounding" textGen=15751ms extractSources=3ms total=15754ms citations=20 text=6359chars`
- `[⏱ LATENCY] Phase1 TOTAL=15755ms tried=google-grounding winner=google-grounding`

### Phase 1.5: Proxy Resolve dan FetchWeb

- `[⏱ LATENCY] Phase1.5 proxyResolve top7=975ms proxies=7`
- `[Orchestrator] Phase 1.5: fetching content for 7 URLs...`
- FetchWeb per URL:
  - `[1/7] ✓ 1744ms` `kumparan.com/...` `5420 chars`
  - `[2/7] ✓ 1741ms` `informasi.com/...` `3419 chars`
  - `[3/7] ✗ 1739ms` `metrodaily.jawapos.com/...` `empty/null content`
  - `[4/7] ✓ 1738ms` `jatimnow.com/...` `3229 chars`
  - `[5/7] ✓ 1736ms` `www.ipb.ac.id/...` `3674 chars`
  - `[6/7] ✓ 1734ms` `www.detik.com/...` `3527 chars`
  - `[7/7] ✓ 1733ms` `www.tempo.co/...` `4199 chars`
- Batch FetchWeb:
  - `[⏱ LATENCY] FetchWeb PRIMARY batch=1746ms`
  - `[FetchWeb] Done: 6/7 succeeded (fetch=6, tavily=0)`
  - `[Orchestrator] Phase 1.5 done in 1747ms`
  - `[⏱ LATENCY] Phase1.5 FetchWeb total=1778ms enriched=6/20 urls=7`

### Search Context dan Compose

- `[SearchContext] Built context: 20 sources (6 verified), 34284 chars total`
- `[⏱ LATENCY] Phase2 contextBuild=2ms sysMsgCount=5 totalMsgCount=8`
- `[⏱ LATENCY] Phase2 firstToken=3646ms (time-to-first-text from compose start)`
- `[⏱ LATENCY] proxyResolve (parallel) 3971ms for 13 URLs`
- `[⏱ LATENCY] Phase2 composeTotal=11045ms textChunks=5504 composedChars=5504`
- `[⏱ LATENCY] onFinish(DB writes)=1154ms`
- `[⏱ LATENCY] ORCHESTRATOR TOTAL=30721ms (Phase1=30721ms includes all)`

### Stutter Selama Compose

- `gap=289ms`
- `gap=322ms`
- `gap=236ms`
- `gap=226ms`
- `gap=285ms`
- `gap=210ms`
- `gap=373ms`
- `gap=274ms`
- `gap=215ms`
- `gap=296ms`
- `gap=393ms`
- Ringkasan:
  - `maxGap=393ms`
  - `gapsOver200ms=11`
  - `reasoningInterruptions=1`
  - `totalReasoningChunks=2`
  - `isDrafting=true`

### Exact Source Persist

- `[⏱ LATENCY] Exact source persist starting (awaited): 6 sources`
- Per source:
  - `[1/6] ... 546ms`
  - `[2/6] ... 865ms`
  - `[3/6] ... 419ms`
  - `[4/6] ... 416ms`
  - `[5/6] ... 565ms`
  - `[6/6] ... 414ms`
- Total:
  - `[⏱ LATENCY] Exact source persist ALL DONE total=3229ms sources=6`

### RAG Ingest

- `[⏱ LATENCY] RAG ingest starting (fire-and-forget): 6 sources`
- Per source:
  - `kumparan.com/...` `chunks=9 chunk=1ms embed=2571ms store=798ms total=3370ms contentChars=5420`
  - `informasi.com/...` `chunks=3 chunk=0ms embed=1298ms store=468ms total=1766ms contentChars=3419`
  - `jatimnow.com/...` `chunks=2 chunk=0ms embed=1249ms store=450ms total=1699ms contentChars=3229`
  - `www.ipb.ac.id/...` `chunks=2 chunk=0ms embed=1687ms store=462ms total=2149ms contentChars=3674`
  - `www.detik.com/...` `chunks=4 chunk=0ms embed=994ms store=512ms total=1506ms contentChars=3527`
  - `www.tempo.co/...` `chunks=3 chunk=1ms embed=1572ms store=478ms total=2051ms contentChars=4199`
- Total:
  - `[⏱ LATENCY] RAG ingest ALL DONE total=15415ms sources=6`

## Request Follow-up Non-Search yang Tercatat

Setelah run search selesai, ada beberapa follow-up request dengan `mode=off` dan `searchRequired=false`:

1. Request follow-up 1
   - `[Context Budget] 8,112 tokens estimated`
   - `[⏱ LATENCY] searchRouter=3635ms decision=NO-SEARCH intent=discussion confidence=0.9`
   - `POST /api/chat 200 in 15.4s`

2. Request follow-up 2
   - `[Context Budget] 12,022 tokens estimated`
   - `[⏱ LATENCY] searchRouter=3302ms decision=NO-SEARCH intent=discussion confidence=1`
   - `POST /api/chat 200 in 14.3s`

3. Request follow-up 3
   - `[Context Budget] 8,306 tokens estimated`
   - `[⏱ LATENCY] searchRouter=3427ms decision=NO-SEARCH intent=discussion confidence=0.9`
   - `POST /api/chat 200 in 13.5s`

4. Request follow-up 4
   - `[Context Budget] 12,475 tokens estimated`
   - `[⏱ LATENCY] searchRouter=3499ms decision=NO-SEARCH intent=discussion confidence=0.9`
   - `POST /api/chat 200 in 15.2s`

## Fakta Tambahan yang Tercatat

- `Exact source persist` tercatat sebagai `awaited`.
- `RAG ingest` tercatat sebagai `fire-and-forget`.
- Pada Run A:
  - `appendSearchReferences` menulis `19 refs`
  - retriever menghasilkan `20 citations`
  - verified sources setelah fetch: `7`
- Pada Run B:
  - `appendSearchReferences` menulis `19 refs`
  - retriever menghasilkan `20 citations`
  - verified sources setelah fetch: `6`
- Pada kedua run search utama, `POST /api/chat` tercatat `200 in 43s`.
- Pada kedua run search utama, `Phase1 retriever="google-grounding"` berada di rentang sekitar `15.1s` sampai `15.8s`.
- Pada kedua run search utama, `Phase2 composeTotal` berada di rentang sekitar `11.0s` sampai `11.2s`.
- Pada kedua run search utama, `RAG ingest ALL DONE` berada di rentang sekitar `15.4s` sampai `16.1s`.
- Pada kedua run search utama, `Exact source persist ALL DONE` berada di rentang sekitar `3.1s` sampai `3.2s`.

## File yang Terkait Secara Langsung dengan Area yang Disebut di Log

- [src/lib/ai/web-search/orchestrator.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/web-search/orchestrator.ts)
- [src/lib/ai/web-search/content-fetcher.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/web-search/content-fetcher.ts)
- [src/lib/ai/rag-ingest.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/rag-ingest.ts)
- [convex/sourceDocuments.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/convex/sourceDocuments.ts)
- [src/app/api/chat/route.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/app/api/chat/route.ts)

## Batas Dokumen

Dokumen ini hanya mencatat apa yang terlihat pada log terminal yang diberikan dan identitas worktree saat dokumen ditulis.
