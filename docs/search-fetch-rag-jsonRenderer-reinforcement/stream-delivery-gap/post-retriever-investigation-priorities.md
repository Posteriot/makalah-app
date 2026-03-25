# Post-Retriever Investigation Priorities

Tanggal: 2026-03-25

## Kesimpulan

Log investigasi menunjukkan:

- `sources_ready`, `metadata_ready`, dan `text_ready` selesai hampir bersamaan
- `extractSources()` hanya memakan `~1-3ms`
- belum ada bukti bahwa metadata atau sources bisa dipakai jauh lebih awal daripada `searchResult.text`

Artinya, lever `jangan tunggu searchResult.text` belum layak jadi prioritas. Bottleneck retriever saat ini lebih dekat ke provider-side latency.

## Prioritas Baru

| # | Prioritas | Kenapa sekarang | Ref |
|---|-----------|-----------------|-----|
| 1 | Observability correlation | `requestId` orchestrator sudah ditambahkan (commit `52797997`). Sisa: tag `requestId` di `route.ts` search decision logs (`[SearchDecision]`, `[SearchExecution]`, `[Context Budget]`) dan `persistExactSourceDocuments` internal logs (`orchestrator.ts:113-165`). `ResponseAborted` dan `ETIMEDOUT` juga belum bisa di-correlate ke request spesifik. | — |
| 2 | Kurangi call rate ke retriever | Karena bottleneck utama ada di provider, gain terbesar datang dari mengurangi frekuensi masuk ke Phase 1 lewat fast-path aman dan RAG reuse. NLP-1 (RAG pre-router) sudah selesai. | `next-latency-priorities.md` NLP-3 |
| 3 | FetchWeb / source quality hardening | Runtime menunjukkan success rate fetch bisa jatuh ke `1/6` atau `1/7` sementara batch tetap mentok `~5s`. | `next-latency-priorities.md` NLP-5 |
| 4 | Audit backend spike paper prompt | NLP-2 sudah overlap dengan benar; bottleneck berikutnya pindah ke spike `getSession`, `listArtifacts`, dan `getInvalidatedArtifacts`. | — |
| 5 | Audit fallback cost retriever chain | Saat `google-grounding` lambat lalu `0 citations`, fallback ke `perplexity` membuat Phase 1 jadi dobel mahal (~10s + ~10s). Belum tercakup di `next-latency-priorities.md` — layak ditambahkan. | — (baru) |
| 6 | Compose / TTFT audit | Masih relevan, tapi efeknya lebih kecil dibanding retriever, fetch, dan backend query spikes. | `next-latency-priorities.md` NLP-6 |

## Fokus Eksekusi

1. ~~Tambahkan `requestId` ke log orchestrator~~ — **Done** (commit `52797997`).
   Sisa: extend `requestId` ke `route.ts` search decision logs dan `persistExactSourceDocuments` internal logs.
2. Lanjutkan deterministic fast-path yang aman untuk mengurangi panggilan retriever (NLP-3).
3. Harden `FetchWeb` terhadap proxy URL, host `empty/null`, dan URL artikel vs PDF/download (NLP-5).
4. Audit latency query backend yang menyuplai `paperPrompt`.
5. Evaluasi fallback cost: apakah perlu early-exit atau timeout lebih ketat saat google-grounding return 0 citations sebelum fallback.

## Penutup

Pasca-investigasi ini, fokus optimasi sebaiknya bukan refactor dependency ke `searchResult.text`, melainkan:

- korelasi log
- pengurangan call rate ke retriever
- peningkatan kualitas FetchWeb
- audit spike backend
