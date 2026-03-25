# stream-delivery-gap — Next Latency Priorities

> Tanggal: 2026-03-25
> Status: stream-delivery-gap P1 selesai (persist detached, ~3.2s saved).
> Bottleneck sekarang bukan lagi finish-path blocking, tapi search pipeline.
> Baseline log: POST /api/chat 200 in 52s, EXECUTE SETTLE=40905ms

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

**Status: siap implementasi**

Saat ini `ragChunksAvailable && searchAlreadyDone && !wantsNewSearch`
dideteksi **setelah** LLM router (`route.ts:2041-2055`). Logic ini pure
deterministic — regex + state check, tidak butuh output LLM. Tapi karena
posisinya post-router, user tetap bayar ~2.5s router sebelum override
berlaku.

Arah: pindahkan block ini ke pre-router, sebelum `decideWebSearchMode()`
di `route.ts:1967`. Kalau condition terpenuhi, skip router entirely.

Impact: ~2.5s saved per request yang match condition ini (lintas mode,
bukan paper-mode only).

Catatan: `wantsNewSearch` regex di line 2048 harus tetap sama —
jangan ubah behavior detection.

### NLP-2: Paper prompt parallelization

**Status: siap implementasi (low risk)**

Empat Convex query di `paper-mode-prompt.ts` jalan sequential:

| Query | Durasi | Butuh session? | Independent? |
|-------|--------|----------------|-------------|
| `getSession` | 510ms | — | Harus duluan |
| `resolveStageInstructions` | 458ms | Ya | Independent dari 2 lainnya |
| `listArtifacts` | 442ms | Ya | Independent |
| `getInvalidatedArtifacts` | 475ms | Ya | Independent |

Tiga query terakhir bisa parallel setelah `getSession` selesai.
Estimasi tambahan setelah `getSession`: 1,375ms → ~475ms.
Total `paperPrompt.total` kira-kira bisa turun dari ~1,891ms ke ~985ms.
**Hemat ~900ms**.

Catatan implementasi:
- `resolveStageInstructions` (`paper-mode-prompt.ts:128`) tidak dibungkus
  try/catch lokal (beda dengan `listArtifacts` dan `getInvalidatedArtifacts`
  yang sudah punya try/catch sendiri).
- Jangan pakai `Promise.all` polos — pakai `Promise.allSettled` atau wrapper
  per branch supaya error di satu query tidak cancel yang lain.
- Scope: paper-mode only (tidak berlaku untuk chat biasa).

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

### NLP-4: Investigasi biaya retriever google-grounding

**Status: investigasi, bukan implementasi**

google-grounding makan 23,493ms (45% total). Sebelum mempertimbangkan ganti
retriever, investigasi dulu:

- Apakah 23.5s itu normal untuk google-grounding, atau ada overhead?
- `await searchResult.text` di `orchestrator.ts:228` menunggu full text
  generation. Apakah source metadata (grounding chunks) tersedia lebih
  awal dari full text? Kalau ya, bisa lanjut ke Phase 1.5 lebih cepat.
- Apakah search messages terlalu besar (context/token overhead)?
- Apakah `retrieverMaxTokens` (`orchestrator.ts:217`) sudah optimal?

Jangan ganti default retriever tanpa audit kualitas — google-grounding
menghasilkan grounding metadata yang relatif kaya (20 citations dengan
inline grounding dari `retrievers/google-grounding.ts`).

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
| Ganti default retriever | Prematur tanpa audit kualitas output |
| Detach `saveAssistantMessage` (P2) | Product tradeoff, 706ms, jauh lebih kecil dari retriever |
| Stream-delivery-gap lanjutan | P1 sudah selesai, sisa gap intentional |

---

## Ringkasan

| # | Target | Impact | Status |
|---|--------|--------|--------|
| NLP-1 | RAG override ke pre-router | ~2.5s, lintas mode | Siap |
| NLP-2 | Paper prompt parallel | ~900ms, paper-mode | Siap |
| NLP-3 | Deterministic intent pre-detection | ~2.5s, riset dulu | Riset |
| NLP-4 | Retriever cost investigation | Terbesar tapi scope terluas | Investigasi |
| NLP-5 | Proxy resolve hardening | Kecil, hygiene | Quick fix |
| NLP-6 | Compose TTFT audit | Ratusan ms | Terakhir |
