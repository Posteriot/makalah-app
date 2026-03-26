# stream-delivery-gap — Verdict

> Tanggal analisis: 2026-03-25
> Branch: pr/chat-page-ux-status-sync-20260316
> Log session: conversationId=j5791tx0z3pbe34tmn42fcttt183hd45

---

## Kalimat Verdict

Masalah utama ada pada architectural boundary violation: concern delivery
stream, persistence, dan background enrichment dicampur dalam satu finish
handler sequential, sehingga stream completion tertahan oleh kerja
server-side yang tidak perlu berada di jalur delivery.

Urutan pipeline (search → fetch → compose → yaml transform) tidak kacau.
Yang rusak adalah coupling di finish boundary.

---

## Root Cause — stream-finish blocking

- **finish event ditahan oleh persistence yang di-await di jalur delivery.**
  `await config.onFinish(...)` di `orchestrator.ts:752`,
  `await persistExactSourceDocuments(...)` di `orchestrator.ts:781`,
  `writer.write(chunk)` untuk finish baru di `orchestrator.ts:829`.

- **persistExactSourceDocuments serial dan mahal.**
  Loop per source dengan `await fetchMutation(...)` satu-satu di
  `orchestrator.ts:128`. Dari log: 6 source, total 3,275ms.

- **onFinish memuat persistence kritikal yang ikut memblok completion.**
  `await saveAssistantMessage(...)` di `route.ts:2268`.
  `saveAssistantMessage` didefinisikan di `route.ts:1360`, DB write via
  `await retryMutation(...)` di `route.ts:1378`. Dari log: 1,060ms.

- **Concern delivery, persistence, dan enrichment dicampur di satu finish
  handler sequential.** Secara arsitektural ini boundary violation, bukan
  sekadar latency kebetulan.

- **Comment misleading memperparah diagnosis.**
  `orchestrator.ts:774` bilang `"fire-and-forget, isolated"` tapi exact
  persist faktanya `await` (blocking). Hanya RAG ingest yang betulan
  fire-and-forget (`void (async () => {...})()` di `orchestrator.ts:787`).

- **Ini keputusan implementasi repo, bukan keterbatasan AI SDK.**
  `createUIMessageStream` (AI SDK `ai/dist/index.js:8140-8199`) tidak punya
  opini tentang kapan finish chunk ditulis — developer yang memilih
  menaruh persistence sebelum `writer.write(finish)`.

### Dampak terukur dari log

| Fase di dalam finish handler        | Durasi   | Blocking finish? |
|--------------------------------------|----------|------------------|
| `await config.onFinish` (DB write)   | 1,060ms  | Ya               |
| `await persistExactSourceDocuments`  | 3,275ms  | Ya               |
| `void` RAG ingest (fire-and-forget)  | —        | Tidak            |
| **Total delay sebelum finish event** | **4,335ms** | —             |

---

## Non-Root Cause

- **Urutan utama pipeline bukan masalah.** Search → FetchWeb → Compose →
  YAML transform sudah sequential dan rapi. Phase 1 di `orchestrator.ts:186`
  (sebelum stream creation di `:331`), Phase 1.5 di `:343`, compose di `:500`.

- **pipeYamlRender bukan fase tambahan sesudah respons.** Itu inline
  TransformStream yang pipe dari compose output di `orchestrator.ts:881`.
  Pass-through untuk non-text chunks termasuk `finish` (yaml transform
  default case: `controller.enqueue(chunk)` di `@json-render/yaml`).

- **RAG ingest bukan penyebab stream completion telat.** Dia background
  fire-and-forget di `orchestrator.ts:787`, jadi dia nyedot resource setelah
  response, tapi bukan yang menahan finish event.

- **FetchWeb bukan penyebab boundary violation.** Dia menahan compose start
  (`await fetchPageContent(...)` di `orchestrator.ts:375`), tapi itu by
  design — FetchWeb ada di dalam stream execute supaya Vercel streaming
  timeout tidak berlaku (first byte `start` event sudah dikirim di `:336`).
  Masalah utamanya muncul sesudah compose selesai, bukan di sini.

- **Schema validation client-side bukan masalah.** Custom `data-*` events
  bukan indikasi penyebab issue ini. Custom `data-*` events punya catch-all
  schema di `ai/dist/index.js:5139-5147` (`z.strictObject` dengan
  `type: z.custom(v => v.startsWith("data-"))`).

- **`parseJsonEventStream` handling `[DONE]` bukan masalah.**
  AI SDK server memang mengirim `data: [DONE]\n\n` saat SSE flush
  (`ai/src/ui-message-stream/json-to-sse-transform-stream.ts:12-14`), dan
  parser client memang skip marker itu
  (`ai/node_modules/@ai-sdk/provider-utils/src/parse-json-event-stream.ts:23-29`).
  Jadi `[DONE]` sendiri bukan indikasi masalah; stream selesai ketika upstream
  stream berakhir dan koneksi ditutup.

---

## Breakdown per Dimensi Latency

### 1. time-to-first-token

**Root cause:**

- searchRouter mahal (~2.6 detik dari log `searchRouter=2610ms`).
  Jalur di `route.ts:1966`.
- retriever Phase 1 adalah bottleneck terbesar. google-grounding butuh
  ~17.7 detik dari log (`Phase1 retriever="google-grounding" total=17665ms`).
  Orchestrator menunggu full hasil retriever via `await searchResult.text`
  di `orchestrator.ts:228-233` (Promise.race dengan timeout).
- FetchWeb untuk top 7 source blocking sebelum compose start. Walau di
  dalam stream execute, dia tetap menahan `startComposeStream(...)` karena
  `await fetchPageContent(...)` di `orchestrator.ts:375`.
  Dari log: batch=2215ms.
- Compose model sendiri butuh ~3.7 detik untuk first token setelah compose
  dimulai. Dari log: `Phase2 firstToken=3653ms`. Start di `orchestrator.ts:510`.

**Bukan root cause time-to-first-token:**
persistExactSourceDocuments, onFinish, RAG ingest, pipeYamlRender.
Semua terjadi setelah compose sudah berjalan atau selesai.

### 2. time-to-stream-finish

**Root cause:**

- `await config.onFinish(...)` di `orchestrator.ts:752`. Dari log: 1,060ms.
- `saveAssistantMessage` di dalam onFinish adalah DB write yang nyata,
  bukan kerja ringan. Definisi di `route.ts:1360`, DB write via
  `await retryMutation(...)` di `route.ts:1378`.
- `await persistExactSourceDocuments(...)` blocking dan serial di
  `orchestrator.ts:781`. Dari log: 3,275ms untuk 6 sources.
- `writer.write(chunk)` untuk finish baru terjadi sesudah semua itu di
  `orchestrator.ts:829`.

**Bukan root cause time-to-stream-finish:**
Urutan search/fetch/compose itu sendiri, RAG ingest (fire-and-forget),
AI SDK limitation. Masalah finish ini murni dari struktur handler repo.

### 3. post-response resource drain

**Root cause:**

- RAG ingest jalan background untuk semua fetched source, tiap source
  mahal karena chunk → embed → store. Pipeline di `rag-ingest.ts`:
  chunk (`:43`), embed (`:53`), store (`:69`).
- RAG dikerjakan sequential per source di background loop orchestrator
  (`orchestrator.ts:787`). Satu request berat bisa pegang
  CPU/network/embedding slot cukup lama.
- Dari log: total RAG ingest 15,842ms untuk 6 sources. Source terbesar
  (haibunda.com, 10 chunks, 7236 chars) butuh 3,128ms.

**Bukan root cause post-response resource drain:**
finish chunk delay, saveAssistantMessage, pipeYamlRender.
Itu menahan stream close, tapi bukan penyedot resource utama setelah
response selesai.

---

## Contributing Factors (bukan root cause, tapi memperberat dampak)

### CF-1: Tidak ada client-side recovery

- `ChatWindow.tsx:1550-1560`: interval timer jalan selamanya selama
  `useChat` status === `"streaming"`, cap di 92%, tanpa timeout.
- AI SDK `consumeStream` (`ai/dist/index.js:5934-5950`): while loop
  tanpa timeout — kalau `reader.read()` tidak pernah return `done: true`,
  loop tidak pernah break.
- Ini tidak menyebabkan stuck, tapi menyebabkan **tidak ada recovery**
  kalau stuck terjadi (karena alasan apapun — buffering, network drop,
  browser sleep).

### CF-2: safeEnqueue silent error suppression (zero observability)

- AI SDK `createUIMessageStream` (`ai/dist/index.js:8140-8144`):
  `controller.enqueue(data)` dibungkus try-catch kosong (`catch (error) {}`).
- Kalau enqueue atau close gagal di downstream, AI SDK bisa menelan error itu
  secara silent. `controller.close()` juga dibungkus try-catch kosong
  (`ai/dist/index.js:8195-8199`).
- **Dampak**: ada risiko server dan client tidak punya sinyal yang sama
  tentang apakah response selesai terkirim. Tidak ada warning dan tidak ada
  metric bawaan dari titik ini. Masalah delivery downstream jadi sulit
  terlihat dari server-side logs saja.
- Ini tidak bisa di-fix di level repo (AI SDK internal), tapi bisa
  dimitigasi dengan server-side stream-close logging atau client-side
  delivery confirmation.

---

## Ringkasan Paling Tajam

| Dimensi                    | Bottleneck                                          |
|----------------------------|-----------------------------------------------------|
| time-to-first-token        | router + retriever + fetch + compose first-token     |
| time-to-stream-finish      | onFinish + exact source persist blocking finish path |
| post-response resource drain | background RAG ingest (embed + store per source)   |
