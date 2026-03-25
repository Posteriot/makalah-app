# stream-delivery-gap — Next Latency Priorities

> Tanggal: 2026-03-25 (updated after NLP-1/NLP-2 execution + retriever audit)
> Status: P1 selesai, NLP-1 selesai, NLP-2 selesai.
> Bottleneck sekarang: search pipeline, terutama retriever call rate dan retriever blocking behavior.
> Baseline log (pre-NLP): POST /api/chat 200 in 52s, EXECUTE SETTLE=40905ms
> Post-NLP log: follow-up requests 14-17s (router skipped), search requests ~45-49s

---

## Konteks setelah P1

Stream-delivery-gap fix menghilangkan ~3.2s blocking dari
`persistExactSourceDocuments`. Sisa gap ~700ms dari `await config.onFinish`
tetap awaited (safe baseline, durability preserved). Bottleneck sekarang
pindah ke search pipeline dan overhead sebelum orchestrator search benar-benar
mulai.

Breakdown sisa latency dari log terakhir (52s total):

| Fase | Durasi | % total | Lokasi |
|------|--------|---------|--------|
| Before-orchestrator lifecycle (auth, paper prompt, router, request setup) | ~11s | 21% | `route.ts`, `paper-mode-prompt.ts` |
| Phase 1 google-grounding | 23,493ms | 45% | `orchestrator.ts:220-243` |
| Phase 1.5 proxy resolve + fetch | ~5,400ms | 10% | `orchestrator.ts:350-380` |
| Phase 2 compose (incl. firstToken 4,443ms) | 11,269ms | 22% | `orchestrator.ts:500-511` |
| onFinish (residual, awaited) | 706ms | 1% | `orchestrator.ts:758` |

---

## Urutan prioritas

### NLP-1: RAG override ke pre-router

**Status: SELESAI** (commit `142ca71f`)

RAG override dipindahkan dari post-router ke pre-router di `route.ts:1963`.
`wantsNewSearch` di-precompute di line 1945 menggunakan `normalizedLastUserContentLower`.
Post-router RAG override block dihapus (redundant).

Hasil tes: 4 follow-up request berhasil skip router, 1 explicit new-search
request jatuh ke router. Kedua jalur verified.

Impact terukur: ~2.3-2.5s saved per follow-up request yang match condition.

### NLP-2: Paper prompt parallelization

**Status: SELESAI** (commit `3992429e`)

Tiga sequential Convex queries setelah `getSession` diubah ke
`Promise.allSettled`. `resolveStageInstructions` fallback ke hardcoded
on failure. Return value fields di-extract dari settled results.

Hasil tes: `parallelBatch` typical ~600-700ms (= query terlambat),
`paperPrompt.total` turun ke ~1.1-1.2s pada request sehat.

Impact terukur: ~700ms saved per paper-mode request (estimasi awal 900ms,
aktual lebih rendah karena query terlambat mendominasi).

### NLP-3: Riset deterministic pre-detection untuk intent router

**Status: riset dulu, belum siap implementasi**

Tiga intent di `route.ts:2012-2036` sekarang dideteksi via LLM router output
(`webSearchDecision.intentType`):
- `sync_request`
- `compile_daftar_pustaka`
- `save_submit`

Memajukan mereka ke pre-router butuh **intent detector deterministic baru**
(regex/keyword/heuristic), bukan sekadar pindah code ke atas. Ini karena
`intentType` adalah output LLM, bukan property yang sudah tersedia sebelum
router jalan.

Riset yang dibutuhkan:
- Kumpulkan sample messages per intent dari log/data
- Evaluasi apakah regex/keyword cukup akurat vs butuh LLM judgment
- Ukur false-positive rate kalau pakai heuristic
- Tentukan fallback: kalau heuristic ragu, tetap jatuh ke LLM router

Impact potensial: ~2.5s per request yang match, tapi scope belum jelas.

### NLP-4: Retriever latency — lever-lever internal

**Status: investigasi aktif, beberapa lever siap tes**

google-grounding makan 10-23s (45% total di search request). Bulk dari
latency ini adalah Google API + model inference — tidak bisa dipaksa cepat.
Tapi framing "di luar kontrol kita" terlalu absolut. Ada beberapa lever
internal yang masih dalam kontrol tanpa ganti retriever:

**Lever 4a: Audit dependency ke `searchResult.text` (impact potensial: 2-5s)**

Di `orchestrator.ts:228`, orchestrator menunggu `await searchResult.text`
(full text generation) sebelum proceed ke Phase 1.5. Tapi `extractSources`
di line 242 mengambil dari `providerMetadata` (grounding chunks), bukan
dari `text`. Dua data path ini terpisah.

Pertanyaan kunci: apakah `providerMetadata` tersedia lebih awal dari `text`?
Kalau ya, Phase 1.5 (FetchWeb) bisa mulai lebih cepat — overlap dengan
sisa text generation.

Status: butuh tes empiris. Code menunjukkan dua path terpisah, tapi belum
terbukti secara runtime apakah metadata ready lebih awal.

**Lever 4b: Set `retrieverMaxTokens` (impact potensial: 1-3s)**

`retrieverMaxTokens` di `orchestrator.ts:217` **tidak di-set** dari
`route.ts`. Model generate text tanpa cap, padahal text retriever di-drop
kalau Phase 1.5 berhasil fetch page content. Comment di code sendiri bilang:
"Retriever can use lower maxTokens than compose — its text output gets
dropped when page content is available."

Arah: set `retrieverMaxTokens` ke 2048-4096. Warning dari code: "don't set
too low or Gemini skips tool calls" — perlu tes threshold minimum yang aman.

Status: siap tes. Tinggal pass config dari `route.ts` ke `executeWebSearch`.

**Lever 4c: Audit payload search messages (impact potensial: 500ms-1s)**

`searchMessages` dibangun dari `getSearchSystemPrompt()` (~800 chars) +
`augmentUserMessageForSearch()` (~400 chars) + seluruh conversation history
(tidak di-truncate via `sanitizeMessagesForSearch`). Di multi-turn
conversations, history bisa substansial.

Arah: audit apakah seluruh history diperlukan untuk retriever, atau cukup
N pesan terakhir + system prompt.

**Lever 4d: Tambah observability retriever**

**Status: SEBAGIAN SELESAI**

Retriever timeline probes sudah ditambahkan (commit `bd68e35d`):
- `sources_ready`, `metadata_ready`, `text_ready` timestamps
- `extract_start`/`extract_done` timing
- Summary line per retriever

`requestId` (`reqId`) sudah ditambahkan ke semua log orchestrator (commit
`52797997`).

Hasil probe NLP-4a: `sources`, `metadata`, dan `text` resolve pada
milidetik yang sama. **Lever 4a confirmed dead end** — AI SDK buffers
semua Promise sampai stream complete.

Sisa yang belum di-tag: `route.ts` search decision logs (`[SearchDecision]`,
`[SearchExecution]`, `[Context Budget]`) dan `persistExactSourceDocuments`
internal logs (`orchestrator.ts:113-165`).

**Yang BUKAN lever internal:**

- Latency dasar Google API (inherent, di luar kontrol)
- Variance 10s vs 23s (API variability, bukan code)
- Ganti retriever default (prematur tanpa audit kualitas — google-grounding
  menghasilkan grounding metadata yang relatif kaya, 20 citations)

### NLP-5: Proxy resolve hardening

**Status: hygiene fix, impact kecil**

Dari log: 1 dari 7 URL gagal fetch karena proxy URL yang tidak ter-resolve
(`vertexaisearch.cloud.google.com/grounding-api-redirect/...`).

Sistem sudah mencoba resolve di `orchestrator.ts:356-368`, tapi kalau
resolve gagal, URL proxy tetap masuk batch fetch dan return empty content.

Impact wall-clock: minimal (fetch parallel, 1 slot terbuang dari 7).
Tapi ini noise yang buang resource dan bikin log kotor.

Arah: filter URL yang masih proxy setelah resolve attempt — jangan masukkan
ke batch fetch.

### NLP-7: Audit fallback cost retriever chain

**Status: investigasi**

Saat google-grounding return 0 citations (model tidak call search tool),
orchestrator treats it as failure dan falls through ke perplexity. Phase 1
jadi dobel: ~10s + ~10s = ~20s.

Dari log: ini terjadi di 1 dari 3 search request yang di-test. Saat
google-grounding gagal, total Phase 1 naik dari ~18-22s ke ~20s (karena
perplexity juga ~10s).

Pertanyaan:
- Apakah google-grounding 0-citation failure bisa dideteksi lebih awal
  (sebelum menunggu full text ~10s)?
- Apakah timeout retriever pertama bisa diperketat untuk case ini?
- Apakah ada pattern di input yang predict 0-citation failure?

Ref: `post-retriever-investigation-priorities.md` item 5

### NLP-6: Compose TTFT audit

**Status: terakhir, diminishing returns**

`Phase2 firstToken=4443ms` dominan model inference latency. Yang bisa
ditekan di level repo:
- Audit context size yang masuk compose model
- Evaluasi overhead `CHOICE_YAML_SYSTEM_PROMPT` (`orchestrator.ts:455`)
  yang ditambahkan saat `isDraftingStage`
- Cek apakah semua system messages di compose context wajib ada

Gains: probably ratusan ms, bukan detik.

---

## Bukan prioritas sekarang

| Item | Alasan |
|------|--------|
| Ganti default retriever | Prematur tanpa audit kualitas output. Ganti retriever adalah langkah TERAKHIR setelah lever 4a-4d habis. |
| Detach `saveAssistantMessage` (P2) | Product tradeoff, 706ms, jauh lebih kecil dari retriever |
| Stream-delivery-gap lanjutan | P1 sudah selesai, sisa gap intentional |

---

## Urutan kerja yang direkomendasikan setelah NLP-1/NLP-2

1. ~~**Audit `searchResult.text` dependency** (NLP-4a)~~ — **Dead end.**
   Probe menunjukkan `sources`, `metadata`, `text` resolve bersamaan.
   AI SDK buffers semua Promise sampai stream complete.
2. **Kurangi call rate ke retriever** (NLP-3) — setiap request yang skip
   retriever = hemat 10-23s penuh. Lanjutkan riset intent pre-detection.
3. **Audit payload/token search** (NLP-4b + 4c) — set `retrieverMaxTokens`,
   evaluasi truncation search messages.
4. **Audit fallback cost** (NLP-7) — google-grounding 0-citation failure
   menyebabkan Phase 1 dobel (~20s). Evaluasi early-exit atau timeout ketat.
5. **Baru setelah semua lever habis**, evaluasi retriever alternatif lewat
   audit kualitas, bukan cuma latency.

---

## Ringkasan

| # | Target | Impact | Status |
|---|--------|--------|--------|
| NLP-1 | RAG override ke pre-router | ~2.5s, lintas mode | **Selesai** |
| NLP-2 | Paper prompt parallel | ~700ms, paper-mode | **Selesai** |
| NLP-3 | Deterministic intent pre-detection | ~2.5s, riset dulu | Riset |
| NLP-4a | Audit `searchResult.text` dependency | — | **Dead end** (probe: semua resolve bersamaan) |
| NLP-4b | Set `retrieverMaxTokens` | 1-3s potensial | Siap tes |
| NLP-4c | Audit search payload size | 500ms-1s potensial | Investigasi |
| NLP-4d | Retriever observability | — | **Sebagian selesai** (probe + reqId done, sisa: route.ts logs) |
| NLP-5 | Proxy resolve hardening | Kecil, hygiene | Quick fix |
| NLP-7 | Audit fallback cost retriever chain | ~10s saat 0-citation failure | Investigasi |
| NLP-6 | Compose TTFT audit | Ratusan ms | Terakhir |
