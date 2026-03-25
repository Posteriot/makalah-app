# Handoff: NLP-5 (FetchWeb Hardening) + NLP-7 (Retriever Fallback Cost)

> Gunakan dokumen ini sebagai initial prompt saat buka branch baru.

---

## Konteks

Branch `pr/chat-page-ux-status-sync-20260316` telah menyelesaikan:

- **Stream-delivery-gap P1**: detach `persistExactSourceDocuments` dari finish path (~3.2s saved)
- **NLP-1**: RAG override pre-router (kemudian di-revert karena regex intent detection — diganti full LLM router)
- **NLP-2**: Paper prompt parallelization (~700ms saved)
- **Regex cleanup**: semua regex-based intent detection dihapus dari search decision path
- **Prompt fix**: model tidak lagi minta konfirmasi kalau user sudah explicitly minta search
- **Observability**: retriever timeline probes + requestId tagging di seluruh orchestrator

## Masalah yang belum diselesaikan

### NLP-5: FetchWeb success rate rendah

**Evidence dari runtime logs:**

| Request | Success rate | Total batch time |
|---------|-------------|------------------|
| Sample 1 | 7/7 | 1733ms |
| Sample 2 | 2/5 | 5008ms |
| Sample 3 | 5/7 | 5017ms |
| Sample 4 | 1/6 | 5016ms |
| Sample 5 | 3/7 | 5017ms |
| Sample 6 | 1/7 | 5033ms |
| Sample 7 | 3/6 | 5056ms |

Batch selalu mentok ~5s (timeout). Sumber kegagalan yang teramati:
- Vertex proxy URLs yang tidak ter-resolve (`vertexaisearch.cloud.google.com/grounding-api-redirect/...`) — seharusnya sudah di-filter sebelum masuk batch fetch
- Academic journal/repository URLs yang return empty (PDF downloads, paywalled content)
- News sites yang block scraping

**File kunci:**
- `src/lib/ai/web-search/content-fetcher.ts` — FetchWeb implementation
- `src/lib/ai/web-search/orchestrator.ts:400-470` — Phase 1.5 fetch logic
- `src/lib/ai/web-search/retrievers/google-grounding.ts` — proxy URL resolution

**Arah perbaikan:**
- Filter URL yang masih vertex proxy setelah resolve attempt — jangan masukkan ke batch fetch
- Detect dan skip URL patterns yang known-fail (PDF direct download, paywalled journals)
- Evaluasi Tavily sebagai fallback untuk URLs yang gagal di primary fetch
- Pertimbangkan reduce timeout dari 5s ke 3s — kalau URL tidak respond dalam 3s, kualitasnya biasanya rendah juga

### NLP-7: Google grounding flaky — 0 citations fallback dobel cost

**Evidence dari runtime logs:**

| Request | google-grounding | Fallback | Total Phase 1 |
|---------|-----------------|----------|---------------|
| Normal | 18-26s, 20 citations | — | 18-26s |
| Flaky | 7-10s, 0 citations | perplexity 10-14s | 20-21s |

Saat google-grounding return 0 citations (model tidak call search tool atau grounding metadata kosong), orchestrator treat sebagai failure dan fallback ke perplexity. Total Phase 1 jadi dobel.

**File kunci:**
- `src/lib/ai/web-search/orchestrator.ts:204-320` — retriever chain loop
- `src/lib/ai/web-search/orchestrator.ts:300-305` — 0 citations = failure logic
- `src/lib/ai/web-search/retrievers/google-grounding.ts` — extractSources logic

**Pertanyaan yang perlu dijawab:**
- Apakah 0-citation dari google-grounding bisa dideteksi lebih awal (sebelum menunggu full text ~7-10s)?
- Dari retriever probes: `sources`, `metadata`, `text` resolve bersamaan — jadi early detection dari stream side tidak mungkin. Tapi apakah ada pattern di input messages yang predict 0-citation?
- Apakah timeout retriever pertama bisa diperketat khusus untuk case 0-citation (misalnya: kalau metadata.keys=none setelah 5s, skip langsung)?
- Apakah perplexity sebaiknya jadi primary untuk certain query patterns?

## Dokumen pendukung (sudah ada di branch)

Semua di `docs/search-fetch-rag-jsonRenderer-reinforcement/stream-delivery-gap/`:

| Dokumen | Isi |
|---------|-----|
| `verdict.md` | Root cause analysis stream-delivery-gap |
| `priority-map.md` | Prioritized fix list dengan safe/tradeoff boundary |
| `implementation-plan.md` | P1 execution plan (completed) |
| `nlp1-nlp2-implementation-plan.md` | NLP-1 + NLP-2 plan (completed, NLP-1 later reverted regex) |
| `next-latency-priorities.md` | Full priority list NLP-1 through NLP-7 dengan status |
| `post-retriever-investigation-priorities.md` | Post-probe priorities |
| `nlp1-nlp2-runtime-verdict.md` | Runtime test results |
| `evidence-of-improvement.md` | Log evidence stream-delivery-gap improvement |

## Prinsip yang HARUS dipatuhi

1. **TIDAK ADA regex untuk intent detection dari user message.** Intent detection adalah tugas LLM router. Regex tidak bisa scale ke variasi bahasa (Indonesian, Javanese, English, slang). Ini sudah terbukti menyebabkan regresi di branch ini.

2. **Tools harus simple executors.** Jangan tambah filtering, scoring, atau quality judgment ke tool pipelines. Tools retrieve data — itu saja. Quality judgment di skill instructions atau LLM reasoning.

3. **Verify sebelum claim success.** Selalu test runtime behavior, bukan cuma typecheck. Bug behavior (seperti model minta konfirmasi padahal user sudah minta search) tidak tertangkap typecheck.

4. **Jangan meremehkan masalah.** Kalau user report issue, investigasi serius. Jangan dismiss dengan "itu expected behavior" tanpa bukti.
