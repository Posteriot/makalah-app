Verifikasi NLP-5: FetchWeb Hardening

  Claim 1: "Vertex proxy URLs yang tidak ter-resolve masuk batch fetch"

  AKURAT, tapi mekanismenya lebih nuanced dari yang ditulis di handoff.

  Evidence dari kode:
  - google-grounding.ts:40-42 — resolveRedirect() memang return original
  URL on failure (return url di catch block)
  - orchestrator.ts:454-469 — top 7 sources di-resolve via
  resolveVertexProxyUrls(). Kalau resolve gagal, URL proxy tetap di
  top7Sources, dan resolvedUrlMap tidak di-set untuk URL itu (karena
  resolved[i].url !== top7Sources[i].url false)
  - orchestrator.ts:472 — urlsToFetch pakai resolvedUrlMap.get(s.url) ??
  s.url. Kalau tidak ada di map → URL proxy asli yang masuk
  fetchPageContent()

  Tapi ada layer kedua yang handoff miss: content-fetcher.ts:563-577 —
  fetchAndParse() punya explicit detection untuk proxy yang gagal resolve:
  if (routeKind === "proxy_or_redirect_like" &&
  isProxyLikeUrl(resolvedUrl)) {
    return makeFetchFailure(url, routeKind, "proxy_unresolved", ...)
  }
  Jadi proxy URL yang gagal resolve akan fail fast dengan timeout 800ms
  (PROXY_OR_REDIRECT_TIMEOUT_MS), bukan mentok 5s. Tapi tetap memakan 1
  slot dari 7.

  Claim 2: "Batch selalu mentok ~5s (timeout)"

  SEBAGIAN AKURAT.

  Evidence:
  - content-fetcher.ts:57 — DEFAULT_TIMEOUT_MS = 5000
  - content-fetcher.ts:58-60 — Per-route timeouts: html_standard = 5000ms,
  academic_wall_risk = 2000ms, proxy_or_redirect_like = 800ms
  - orchestrator.ts:478 — timeoutMs: 5_000 di-pass ke fetchPageContent
  - content-fetcher.ts:148-160 — Semua primary candidates di-fetch via
  Promise.all

  Kalau ada 1+ URL html_standard yang slow, Promise.all memang tunggu
  sampai 5s. Tapi claim "batch selalu mentok ~5s" oversimplified — batch
  resolve secepat URL paling lambat, yang bisa lebih cepat kalau semua URL
  responsive.

  Claim 3: "Tavily fallback explicitly skip proxy_or_redirect_like"

  AKURAT.

  Evidence langsung di content-fetcher.ts:187-192:
  const shouldTavilyFallback =
    hasTavily
    && (
      candidate.routeKind !== "proxy_or_redirect_like"
      || primaryResult.failureReason === "pdf_unsupported"
    )
  Proxy URL yang gagal → no Tavily fallback. Ini design decision yang
  explicit.

  Claim 4: "File kunci: orchestrator.ts:400-470"

  SALAH line numbers. Phase 1.5 fetch logic ada di orchestrator.ts:444-481
  (setelah gue baca actual file). Line 400 masih di skill context building.
   Tidak kritis tapi perlu dicatat untuk referensi.

  ---
  Verifikasi NLP-7: Google Grounding Flaky

  Claim 1: "0 citations = failure logic di orchestrator.ts:300-305"

  SALAH line numbers. Actual location: orchestrator.ts:347-352:
  if (sources.length === 0) {
    console.warn(`...returned 0 citations — treating as failure, trying
  next`)
    continue
  }

  Claim 2: "Orchestrator treat 0 citations sebagai failure dan fallback ke
  perplexity"

  AKURAT.

  Evidence: orchestrator.ts:251-363 — sequential for loop over
  config.retrieverChain. Kalau sources.length === 0, continue ke next
  retriever. Registry confirms chain bisa berisi google-grounding +
  perplexity + grok.

  Claim 3: "0-citation terjadi setelah full text ~7-10s"

  AKURAT.

  Evidence: orchestrator.ts:309-317 — searchResult.text di-await dulu (with
   60s timeout), baru extractSources() dipanggil (line 327). Jadi kalau
  google-grounding generate text tanpa call search tool, orchestrator
  tunggu full text selesai, extract sources, temukan 0, baru skip.

  Claim 4: "Early detection dari stream side tidak mungkin"

  AKURAT, confirmed by NLP-4a probe results.

  Evidence dari next-latency-priorities.md:141-143:
  ▎ Hasil probe NLP-4a: sources, metadata, dan text resolve pada milidetik
  yang sama. Lever 4a confirmed dead end — AI SDK buffers semua Promise
  sampai stream complete.

  Claim 5: "retrieverMaxTokens belum di-set dari route.ts"

  AKURAT.

  Evidence: grep retrieverMaxTokens route.ts → no matches. Config interface
   punya field (types.ts:70), orchestrator supports it
  (orchestrator.ts:264), tapi route.ts tidak pass value ini ke
  executeWebSearch().

  ---
  Verifikasi dokumen pendukung

  Claim: "Semua regex-based intent detection dihapus dari search decision
  path"

  AKURAT. Regex intent detection sudah dihapus. Comments explicitly state
  the design decision.

  ---
  Ringkasan Verifikasi

  ┌─────────────────────────┬────────┬─────────────────────────────────┐
  │          Claim          │ Status │             Detail              │
  ├─────────────────────────┼────────┼─────────────────────────────────┤
  │ Proxy URLs lolos ke     │        │ resolveRedirect() return        │
  │ batch fetch             │ Akurat │ original on fail → masuk        │
  │                         │        │ urlsToFetch                     │
  ├─────────────────────────┼────────┼─────────────────────────────────┤
  │                         │        │ Ada fast-fail 800ms di          │
  │ Proxy URLs mentok 5s    │ Salah  │ fetchAndParse() untuk           │
  │                         │        │ proxy_unresolved                │
  ├─────────────────────────┼────────┼─────────────────────────────────┤
  │ Tavily skip proxy       │ Akurat │ Explicit exclusion di line 190  │
  │ routes                  │        │                                 │
  ├─────────────────────────┼────────┼─────────────────────────────────┤
  │ DEFAULT_TIMEOUT_MS =    │ Akurat │ Confirmed di code               │
  │ 5000                    │        │                                 │
  ├─────────────────────────┼────────┼─────────────────────────────────┤
  │ Handoff line numbers    │ Salah  │ Phase 1.5 = line 444-481,       │
  │ (orchestrator)          │        │ 0-citation logic = line 347-352 │
  ├─────────────────────────┼────────┼─────────────────────────────────┤
  │ 0 citations →           │ Akurat │ continue in for loop            │
  │ sequential fallback     │        │                                 │
  ├─────────────────────────┼────────┼─────────────────────────────────┤
  │ Full text awaited       │        │ await searchResult.text (line   │
  │ before source extract   │ Akurat │ 309) before extractSources()    │
  │                         │        │ (line 327)                      │
  ├─────────────────────────┼────────┼─────────────────────────────────┤
  │ Early detection         │ Akurat │ NLP-4a probe confirmed          │
  │ impossible              │        │                                 │
  ├─────────────────────────┼────────┼─────────────────────────────────┤
  │ retrieverMaxTokens not  │ Akurat │ Not passed from route.ts        │
  │ set                     │        │                                 │
  ├─────────────────────────┼────────┼─────────────────────────────────┤
  │ Regex intent detection  │ Akurat │ No regex in search decision     │
  │ removed                 │        │ path                            │
  ├─────────────────────────┼────────┼─────────────────────────────────┤
  │ Retriever chain =       │ Akurat │ for loop with continue/break    │
  │ sequential              │        │                                 │
  ├─────────────────────────┼────────┼─────────────────────────────────┤
  │ Available retrievers    │ Akurat │ google-grounding, perplexity,   │
  │                         │        │ grok in registry                │
  └─────────────────────────┴────────┴─────────────────────────────────┘

  Koreksi penting terhadap handoff:

  1. Proxy URLs bukan bottleneck 5s — fetchAndParse() sudah punya
  proxy_unresolved fast-fail (800ms), jadi proxy yang gagal resolve bukan
  penyebab "batch mentok 5s". Yang mentok 5s itu html_standard URLs yang
  slow respond.
  2. Line numbers outdated — handoff bilang orchestrator.ts:400-470 dan
  :300-305, actual positions berbeda. Ini minor tapi perlu diperbaiki kalau
   dokumen mau dipakai referensi.
  3. Impact NLP-5 mungkin lebih kecil dari yang tertulis — karena proxy
  already fast-fail, gain dari "filter proxy sebelum batch" cuma ~800ms per
   proxy URL (bukan 5s). Real gain lebih ke mengganti slot yang terbuang
  dengan URL lain yang productive daripada save wall-clock time.


                  ---

 ---
  NLP-5: FetchWeb Hardening — Analisis Faktual

  Apa yang sebenarnya terjadi (verified flow)

  google-grounding returns ~20 citations (proxy URLs)
      ↓
  orchestrator takes top 7 → resolveVertexProxyUrls() [HEAD requests, 3s
  timeout each]
      ↓
  Some resolve OK, some fail → failed ones keep original proxy URL
      ↓
  urlsToFetch = mix of real URLs + unresolved proxy URLs
      ↓
  fetchPageContent(urlsToFetch, {timeoutMs: 5000})
      ↓
  fetchAndParse() per URL:
    - proxy_or_redirect_like → 800ms timeout, fast-fail with
  "proxy_unresolved"
    - html_standard → 5000ms timeout
    - academic_wall_risk → 2000ms timeout
    - pdf_or_download → Tavily (if key exists)
      ↓
  Failed html_standard with Tavily key → Tavily fallback batch
  Failed proxy_or_redirect_like → NO Tavily fallback (explicit exclusion)

  Dimana loss terjadi

  Dari evidence table di handoff (success rates 1/6, 1/7, 3/7) dan verified
   code:

  Loss point 1: Unresolved proxy URLs occupy slots (minor)
  - Impact: 800ms per proxy slot, bukan 5s (fast-fail ada)
  - Tapi: slot yang terbuang = 1 URL yang seharusnya bisa productive

  Loss point 2: html_standard URLs yang slow/fail (major)
  - Ini yang bikin batch mentok ~5s. URL yang respond tapi return login
  page, paywall, atau empty content
  - readability_empty dan content_too_short tetap consume full 5s timeout
  kalau server lambat respond

  Loss point 3: No Tavily fallback untuk resolved proxy URLs yang gagal
  fetch (medium)
  - Kalau proxy resolve ke real URL → routeKind tetap
  proxy_or_redirect_like (karena classification pakai URL awal di
  orchestrator.ts:105)

  classifyFetchRoute dipanggil di content-fetcher.ts:105 dan
  :125 pada URL yang sudah resolved (karena orchestrator pass resolved URLs
   di urlsToFetch).

  Jadi kalau proxy resolve ke https://en.wikipedia.org/... →
  classifyFetchRoute return html_standard, bukan proxy_or_redirect_like.
  Ini berarti:
  - Resolved proxy URLs get proper treatment (5s timeout, Tavily fallback
  eligible)
  - Unresolved proxy URLs (masih vertexaisearch.cloud.google.com) →
  proxy_or_redirect_like → 800ms fast-fail → no Tavily fallback

  Loss point 3 revisi: Tavily fallback exclusion hanya affect
  unresolved proxy URLs, bukan resolved ones. Ini less impactful dari yang
  initially thought.

  Rekomendasi NLP-5 (ranked by verified impact)

  1. Filter unresolved proxy URLs sebelum masuk urlsToFetch + backfill
  dengan source #8-13

  Sekarang: 7 slots, beberapa terbuang untuk proxy URLs yang pasti fail.
  Sesudah: Filter proxy, tambah source berikutnya dari scoredSources untuk
  isi slot.

  // pseudocode
  const resolved = top7Sources.map(s => resolvedUrlMap.get(s.url) ?? s.url)
  const filteredPairs = resolved
    .map((url, i) => ({url, originalIndex: i}))
    .filter(({url}) => !isVertexProxyUrl(url))  // drop still-proxy

  // backfill from source #8+
  let backfillIdx = 7
  while (filteredPairs.length < 7 && backfillIdx < scoredSources.length) {
    const candidate = scoredSources[backfillIdx]
    const resolvedUrl = resolvedUrlMap.get(candidate.url) ?? candidate.url
    if (!isVertexProxyUrl(resolvedUrl)) {
      filteredPairs.push({url: resolvedUrl, originalIndex: backfillIdx})
    }
    backfillIdx++
  }

  Impact: +1-2 productive sources per batch (slot recovery), ~0ms
  wall-clock save.
  Complexity: Low. Perubahan di orchestrator.ts saja.

  2. Reduce html_standard timeout dari 5s ke 3.5s

  Rationale dari evidence:
  - Batch mentok ~5s = ada html_standard URL yang mentok timeout
  - URL yang respond > 3.5s biasanya return low-quality content (heavy
  pages, bot detection delays)
  - academic_wall_risk sudah 2s, proxy_or_redirect_like sudah 800ms — 5s
  untuk html_standard disproportionately generous

  Ini perlu diubah di dua tempat:
  - content-fetcher.ts:58 — HTML_STANDARD_TIMEOUT_MS
  - orchestrator.ts:478 — timeoutMs: 5_000 (ini override semua per-route
  timeouts via Math.min)

  Math.min(baseTimeoutMs, HTML_STANDARD_TIMEOUT_MS) → Math.min(5000, 5000)
  = 5000ms. Kedua value sama. Kalau mau reduce, cukup ubah
  HTML_STANDARD_TIMEOUT_MS ke 3500.

  Impact: ~1.5s saved di worst case (batch bottleneck).
  Risk: Some slow-but-legitimate sites bisa gagal. Mitigasi: Tavily
  fallback sudah ada untuk html_standard failures.

  3. Allow Tavily fallback untuk proxy_or_redirect_like yang gagal

  Hapus exclusion di content-fetcher.ts:190. Unresolved proxy yang fail →
  Tavily bisa coba extract content dari URL asli.

  Tapi ini questionable — Tavily probably juga gagal fetch vertex proxy
  URL. Skip ini dulu, focus ke #1 (slot recovery) yang proven benefit.

  ---
  NLP-7: Retriever Fallback Cost — Analisis Faktual

  Apa yang sebenarnya terjadi (verified flow)

  for (retriever in retrieverChain) {         // sequential loop
      streamText() → await searchResult.text   // 7-23s for
  google-grounding
      extractSources()                         // ~1-3ms
      if (sources.length === 0) continue       // ← HERE: wasted 7-10s, try
   next
      break                                    // success
  }
  // If google-grounding returns 0 → perplexity runs → another 10-14s
  // Total Phase 1: 17-24s instead of 7-14s

  Kenapa ini terjadi

  google-grounding.ts:92-126 — extractSources() pakai
  normalizeGoogleGrounding(metadata). Kalau Gemini tidak call google_search
   tool (karena query terlalu abstrak, atau model decides it can answer
  from knowledge), groundingSupports kosong → 0 citations → orchestrator
  treat as failure.

  Possible levers (verified against code)

  Lever A: Set retrieverMaxTokens (NLP-4b) — cross-cutting benefit

  Verified: orchestrator.ts:262-264 supports it, route.ts doesn't pass it.

  Kalau Gemini generate 8000 tokens text tapi kita cuma butuh sources-nya,
  text itu wasted output. Cap ke 2048-4096 bisa:
  - Reduce google-grounding time dari ~10-23s ke ~7-15s (less output =
  finish faster)
  - Detect 0-citation lebih cepat (stream finish sooner)
  - Benefit both success AND failure cases

  Risk: Comment di code warns "don't set too low or Gemini skips tool
  calls". Perlu tes empiris untuk threshold aman. Suggest 4096 sebagai
  starting point — cukup buat Gemini generate tool call + brief summary.

  Lever B: Parallel retriever race

  Sekarang: sequential loop. Google-grounding dulu, kalau fail →
  perplexity.
  Alternative: jalankan keduanya bersamaan, pakai yang pertama return >0
  citations.

  Tapi ini punya trade-offs:
  - Pro: Eliminate ~10s latency di failure case
  - Con: Cost dobel per request (selalu panggil 2 providers). Sekarang
  success case cuma panggil 1.
  - Con: Complexity — perlu cancel losing retriever, handle race conditions

  Lever C: Collect data untuk predictive routing

  Tambah structured log yang capture:
  - Query characteristics saat 0-citation terjadi (length, language, topic
  type)
  - Build dataset untuk future heuristic: "query type X → skip
  google-grounding, go direct to perplexity"

  Ini zero-risk, low-effort, enable future optimization.

  ---
  Rekomendasi awal (pre-runtime, sekarang outdated — lihat verdict.md)

  Priority: 1
  Item: Set retrieverMaxTokens: 4096 di route.ts
  Expected Impact: 2-5s saved per search (both success + failure)
  Effort: Trivial — 1 line di route.ts
  Risk: Low — perlu runtime test
  ────────────────────────────────────────
  Priority: 2
  Item: Filter unresolved proxy + backfill slots di orchestrator
  Expected Impact: +1-2 productive sources per batch
  Effort: Low — ~20 lines di orchestrator.ts
  Risk: None
  ────────────────────────────────────────
  Priority: 3
  Item: Reduce HTML_STANDARD_TIMEOUT_MS → 3500
  Expected Impact: ~1.5s saved worst case
  Effort: Trivial — 1 constant change
  Risk: Low — Tavily catches failures
  ────────────────────────────────────────
  Priority: 4
  Item: Add 0-citation structured logging
  Expected Impact: Enable future predictive routing
  Effort: Low — ~10 lines logging
  Risk: None
  ────────────────────────────────────────
  Priority: 5
  Item: Parallel retriever race
  Expected Impact: ~10s saved di failure case
  Effort: Medium — architecture change
  Risk: Cost increase
