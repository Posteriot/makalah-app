# Vercel AI Gateway & Google Gemini

Makalah AI menggunakan **Vercel AI Gateway** sebagai infrastruktur utama untuk berkomunikasi dengan model-model AI dari Google (lini Gemini). Integrasi ini memberikan lapisan *resilience*, pemantauan, dan optimasi biaya melalui satu *endpoint* terpadu.

## 1. Arsitektur Primary Provider

Dalam modul `src/lib/ai/streaming.ts`, Vercel AI Gateway didefinisikan sebagai *Primary Provider*. Konfigurasi ini memungkinkan sistem untuk melakukan *failover* secara otomatis ke *provider* cadangan jika terjadi kendala pada infrastruktur utama.

- **Library**: `@ai-sdk/gateway`
- **Konfigurasi Kunci**: `AI_GATEWAY_API_KEY` (atau `VERCEL_AI_GATEWAY_API_KEY`) digunakan untuk mengautentikasi permintaan ke *gateway*.
- **Prefix Handling**: Sistem secara otomatis menambahkan prefix `google/` jika model yang dipilih adalah lini Gemini tetapi tidak memiliki prefix provider (contoh: `gemini-1.5-flash` menjadi `google/gemini-1.5-flash`).

## 2. Google Search Grounding

Fitur utama yang diaktifkan melalui integrasi ini adalah **Google Search Grounding**, yang memungkinkan Gemini memberikan jawaban berdasarkan data penelusuran Google Search secara *realtime*.

- **Tool Calling**: Diaktifkan melalui `google_search: google.tools.googleSearch({})` pada `google-grounding.ts`.
- **Metadata Extraction**: Makalah AI mengekstrak data sitasi langsung dari `providerMetadata` yang dikembalikan oleh Google API via AI SDK.
- **Normalization**: Menggunakan `normalizeGoogleGrounding` untuk mengubah *output* mentah Google menjadi format `NormalizedCitation` yang seragam di seluruh aplikasi.

## 3. Mekanisme Deferred Resolution

Salah satu tantangan teknis dalam menggunakan Google Grounding adalah penggunaan URL proxy Vertex AI (`vertexaisearch.cloud.google.com`). Jika resolusi dilakukan secara sinkron, hal ini dapat menambah latensi signifikan (~8.8 detik).

Makalah AI menerapkan **Deferred Resolution** di `src/lib/ai/web-search/orchestrator.ts`:
1. **Identifikasi**: Mencari URL yang merupakan proxy Vertex AI menggunakan fungsi `isVertexProxyUrl`.
2. **Paralelisasi**: Resolusi URL dilakukan secara paralel dalam *batch* (konkurensi 10) menggunakan `resolveVertexProxyUrls`.
3. **Lazy Fetching**: Resolusi akhir ditunda hingga fase *fetch content* atau *compose*, memastikan aliran token AI awal tetap cepat.

## 4. Transparent Reasoning & Thinking Budget

Untuk model Gemini yang mendukung fitur *reasoning* (seperti seri 2.0), Makalah AI menyuntikkan konfigurasi `thinkingConfig` secara dinamis:

- **Thinking Budget**: Alokasi token untuk proses "berpikir" dikontrol melalui `clampThinkingBudget`.
- **Profile-Based Budgeting**: 
    - **Narrative Profile**: Budget penuh sesuai pengaturan admin untuk penulisan draf yang mendalam.
    - **Tool-Heavy Profile**: Budget dibatasi (cap 96 token) saat AI sedang aktif memanggil banyak *tools* untuk menjaga efisiensi biaya dan latensi.
- **Include Thoughts**: Jika mode *Transparent Reasoning* diaktifkan, proses berpikir AI akan dikirimkan ke UI melalui *pipeline* khusus agar User dapat melihat langkah logika AI.

---
**Rujukan Kode:**
- [src/lib/ai/streaming.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/streaming.ts): Implementasi `createGateway` dan `thinkingConfig`.
- [src/lib/ai/web-search/retrievers/google-grounding.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/web-search/retrievers/google-grounding.ts): Implementasi `google_search` tool dan resolusi URL proxy.
- [src/lib/ai/web-search/orchestrator.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/web-search/orchestrator.ts): Logika orkestrasi resolusi URL secara paralel.
- [docs/references/ai-gateway/ai-gateway.md](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/docs/what-is-makalah/references/ai-gateway/ai-gateway.md): Dokumentasi referensi Vercel AI Gateway.
