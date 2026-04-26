# Integrasi Vercel AI SDK

Dokumen ini memaparkan "Fakta Kode" mengenai implementasi Vercel AI SDK (v3/v4/v5) dalam *codebase* Makalah AI. Pendekatan yang digunakan jauh melampaui instalasi standar, menerapkan pola modifikasi *stream*, arsitektur *provider* dinamis, telemetri *tool-call* yang ketat, hingga penanganan *structured data* dan *embeddings*. 

Referensi SDK utama berdasarkan direktori lokal: `references/aisdk`.

## 1. Arsitektur Provider Dinamis

Makalah AI menggunakan *Dynamic Provider Configuration* (`src/lib/ai/streaming.ts`). Konfigurasi *model* dan kunci API (API Key) tidak statis di dalam kode, melainkan dikontrol penuh melalui *database* (sebagai *Single Source of Truth*). 

- **Vercel AI Gateway (`@ai-sdk/gateway`)**: Berfungsi sebagai jembatan utama yang memberikan lapisan keamanan dan *proxy* untuk *primary model* (biasanya lini Google Gemini). 
- **OpenRouter (`@openrouter/ai-sdk-provider`)**: Bertindak sebagai lapisan *fallback* (atau *primary* jika diubah dari admin). Makalah AI secara pintar memodifikasi *model string* saat *web search* diaktifkan. Misalnya, apabila parameter *web search* dikirim, sistem menambahkan *suffix* `:online` (contoh: `openai/gpt-4o:online`) pada pengiriman ke OpenRouter.

## 2. Generate Text dan Data Terstruktur (Non-Streaming)

Tidak semua interaksi menggunakan *streaming*. Untuk operasi di latar belakang (*background operations*), Makalah AI sangat bergantung pada utilitas `generateText` dan spesifikasi `Output`:
- **Klasifikasi & Keputusan**: Modul seperti `src/lib/ai/classifiers/classify.ts` menggunakan `generateText` dengan skema `Output` (Zod/JSON Schema terstruktur) untuk memastikan balasan LLM bersifat *type-safe* saat melakukan klasifikasi *intent* revisi atau *search response mode*.
- **Pemrosesan Utilitas**: Fungsi seperti pembuatan judul (`title-generator.ts`), ekstraksi teks dari gambar (`image-ocr.ts`), kompresi memori konteks (`context-compaction.ts`), dan refrasa (penghalus) tulisan robotik (`src/app/api/refrasa/route.ts`) berjalan secara *non-streaming* untuk menjamin konsistensi skema struktur data sebelum dikembalikan ke sistem.

## 3. Tool Registry & Native Function Calling

Untuk menghubungkan *cognitive parameter* LLM dengan mutasi *database*, Makalah AI menggunakan fungsi `tool` bawaan dari Vercel AI SDK (`src/lib/ai/paper-tools.ts` dan `src/lib/chat-harness/executor/build-tool-registry.ts`).
- Seluruh daftar *tools* (seperti `createArtifact`, `updateArtifact`, dll.) di-declare secara *strongly-typed* menggunakan validasi Zod.
- Ini terintegrasi mulus dengan properti parameter `tools` pada `streamText`, memberikan LLM kapabilitas *agentic* tanpa sistem *parsing* JSON eksternal yang *brittle*.

## 4. Advanced Streaming Pipeline (Filter Lapis)

Inti dari orkestrasi respons obrolan kepada User berada pada modul `build-step-stream.ts`. Alih-alih meneruskan `streamText` langsung ke *client*, Makalah AI membedah *ReadableStream* dan memasukkannya ke dalam rangkaian `TransformStream` (Pipeline):

1. **`pipeThinkTagStrip`**: Mengintersep kemunculan *tag* `<think>` dari LLM (terutama model berteknologi *reasoning*), mencegah isi pemikiran ini masuk ke UI utama, serta me-rute ulang teks tersebut sebagai sinyal `reasoning-delta`.
2. **`pipePlanCapture`**: Menangkap instruksi atau *plan* yang secara spesifik dimasukkan ke dalam teks LLM untuk kebutuhan internal tanpa menampilkannya ke klien.
3. **`pipeYamlRender`**: Mengubah *output* terstruktur (Yaml yang *streamed*) menjadi instruksi *update* reaktif pada komponen di UI (contohnya dalam pembentukan *Choice Card*).
4. **`pipeUITextCoalesce`**: Melakukan *re-coalescing* teks (*chunk*) yang terpecah menjadi tingkat "kata" (berbasis *whitespace*) agar tulisan muncul berurutan layaknya diketik manusia tanpa patah-patah (*stutter*).

Di sisi UI/Frontend (`src/components/chat/ChatWindow.tsx`), Makalah AI menggunakan `DefaultChatTransport` dan tipe `UIMessage` untuk meng-consume dan menstabilkan *stream data state* yang sudah disortir ini ke dalam lapisan antarmuka React.

## 5. Embeddings (Vector Data)

Makalah AI menggunakan modul inti `embed` dan `embedMany` bawaan AI SDK (`src/lib/ai/embedding.ts`) untuk mengkalkulasi matriks dan *vector space* yang esensial dalam pencarian semantik (*semantic search*) dan komparasi referensi artikel/jurnal.

## 6. Observability & Telemetri Tingkat Tinggi

Dalam eksekusi fungsi `streamText`, disematkan *callback* eksperimental dari AI SDK untuk melacak metrik di luar jangkauan biasa (*tool boundary instrumentation*):
- `experimental_onStepStart` & `onStepFinish`
- `experimental_onToolCallStart` & `experimental_onToolCallFinish`

*Hook* ini mengekstrak jeda waktu (dalam milidetik) yang dihabiskan saat model sedang "berpikir" pasca memanggil *tool*, waktu eksekusi *tool* itu sendiri, serta jarak temporal antara akhir eksekusi *tool* hingga token teks pertama dikembalikan kepada *user*. Ini merupakan garda depan untuk menganalisis performa AI dalam laporan audit.

## 7. Transparent Reasoning

Integrasi AI SDK ini memanfaatkan kapabilitas spesifik *provider options* secara eksplisit. Khusus untuk model Gemini dari Google, objek `thinkingConfig` disuntikkan secara dinamis saat inisiasi aliran `streamText`:
```typescript
google: {
  thinkingConfig: {
    thinkingBudget: budget, // Dinamis tergantung apakah mode 'tool-heavy' atau 'narrative'
    includeThoughts: true   // Menjadikan alur pikir model terbuka untuk pipeline
  }
}
```
Pendekatan kontrol alokasi *budget* ini memastikan agar kedalaman kalkulasi logis (*reasoning*) AI tidak mengurangi porsi token yang disediakan untuk memproduksi kualitas penulisan naratif dari tiap draf.

## 8. Rujukan Kode (Audit Trail)

Semua pernyataan dalam dokumen ini telah melalui proses Audit Forensik dengan membaca langsung implementasi kode aktual (bukan sekadar komentar) pada *file* berikut:
- **Arsitektur Provider**: `src/lib/ai/streaming.ts` (Logika injeksi kunci dan `createGateway` & `createOpenRouter`).
- **Non-Streaming**: `src/app/api/refrasa/route.ts` dan `src/lib/ai/classifiers/classify.ts` (Pemanggilan terstruktur `generateText` & parameter `Output`).
- **Tool Registry Native**: `src/lib/ai/paper-tools.ts` dan `src/lib/chat-harness/executor/build-tool-registry.ts` (Deklarasi objek `tool()` dengan skema Zod).
- **Streaming Pipeline**: `src/lib/chat-harness/executor/build-step-stream.ts` (Eksekusi aktual `pipeThinkTagStrip`, `pipePlanCapture`, `pipeYamlRender`, dan `pipeUITextCoalesce` secara sekuensial).
- **Embeddings**: `src/lib/ai/embedding.ts` (Pemanggilan `embed` & `embedMany`).
- **Telemetri & Observability**: `src/lib/chat-harness/executor/build-step-stream.ts` (Injeksi argumen `experimental_onStepStart`, `experimental_onToolCallFinish`, dll. pada opsi konfigurasi `streamText`).
- **Transparent Reasoning**: `src/lib/ai/streaming.ts` (Pembentukan objek argumen `thinkingConfig` di dalam konfigurasi Google).
