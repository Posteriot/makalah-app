# Implementation Plan: TypeScript Source Normalizer

## Ringkasan

Rencana ini memecah implementasi `TypeScript source normalizer` menjadi tahapan kecil yang aman, mudah diuji, dan tidak memaksa refactor besar sekaligus.

Target fase awal:

- web-search content
- upload file text
- raw vs normalized content separation
- integration ke RAG path

## Prinsip Eksekusi

- additive changes dulu
- backward-compatible reads
- cleanup konservatif
- observability disiapkan sejak awal
- exact-source path tidak disentuh dulu
- reuse helper TypeScript existing, jangan rewrite total
- citation URL normalization tetap berada di layer terpisah
- `raw` content tidak boleh ikut menjadi jalur indexing RAG

## Phase 0: Baseline dan Persiapan

### Tujuan

Memastikan titik integrasi dan dampak schema dipahami sebelum coding inti.

### Task

1. Petakan source type yang sudah aktif:
   - html/web content
   - txt
   - pdf
   - docx
   - xlsx
   - pptx
   - image OCR
2. Pastikan titik ingestion yang menuju RAG:
   - `src/lib/ai/web-search/orchestrator.ts`
   - `src/app/api/extract-file/route.ts`
3. Pastikan pembacaan attachment file yang existing masih mengandalkan `extractedText`.
4. Inventaris helper existing yang akan diorkestrasi, bukan diganti:
   - `src/lib/ai/web-search/content-fetcher.ts`
   - `src/lib/file-extraction/xlsx-extractor.ts`
   - `src/lib/ai/chunking.ts`
   - citation/url normalizer yang relevan untuk tetap dibiarkan di domainnya

### Output

- daftar source kind final
- daftar titik integrasi final

## Phase 1: Buat Kontrak dan Modul Dasar

### Tujuan

Membangun abstraction normalization layer tanpa mengubah flow business logic besar dulu.

### Task

1. Tambah file:
   - `src/lib/ingestion/source-normalizer.types.ts`
   - `src/lib/ingestion/source-normalizer.ts`
2. Definisikan:
   - `SourceKind`
   - `NormalizeSourceInput`
   - `NormalizeSourceOutput`
3. Implement helper umum:
   - trim whitespace
   - normalize blank lines
   - dedup paragraph identik berurutan
   - heading markdown cleanup ringan
4. Tambah `normalizerVersion` constant.

### Deliverable

- satu entry point `normalizeSourceContent()`
- unit tests dasar untuk helper umum

## Phase 2: Implement Strategy per Source Type

### Tujuan

Membuat normalization behavior eksplisit per source kind.

### Task

1. Tambah strategy internal untuk:
   - `html`
   - `plain_text`
   - `pdf_text`
   - `docx_text`
   - `xlsx_markdown`
   - `pptx_text`
   - `image_ocr`
2. Pastikan setiap strategy menghasilkan:
   - `normalizedText`
   - `appliedSteps`
   - `warnings` bila perlu
3. Hindari transform yang berpotensi mengubah meaning content.

### Deliverable

- strategy map yang eksplisit dan mudah diperluas
- tests per source kind dengan input-output snapshot kecil

## Phase 3: Integrasi ke Upload File Path

### Tujuan

Menjadikan upload file sebagai jalur pertama yang menyimpan raw + normalized content.

### Task

1. Ubah schema `files` di `convex/schema.ts` dengan field additive:
   - `rawExtractedText`
   - `normalizedText`
   - `normalizationMeta`
   - `normalizerVersion`
2. Update mutation di `convex/files.ts` agar bisa menerima field baru.
3. Update `src/app/api/extract-file/route.ts`:
   - extractor tetap menghasilkan `raw extracted text`
   - route memetakan file type ke `SourceKind`
   - panggil `normalizeSourceContent()`
   - simpan raw + normalized
   - kirim `normalizedText` ke `ingestToRag()`
   - pastikan `rawExtractedText` tidak pernah dikirim ke `ingestToRag()`
4. Pertahankan compatibility sementara dengan `extractedText` sampai semua consumer aman dimigrasikan.

### Deliverable

- upload file path sudah melewati normalizer
- RAG ingest upload memakai `normalizedText`

## Phase 4: Integrasi ke Web Search Path

### Tujuan

Menyatukan web source ingestion ke normalization layer yang sama.

### Task

1. Di `src/lib/ai/web-search/orchestrator.ts`, identifikasi titik sebelum `ingestToRag()`.
2. Gunakan `normalizeSourceContent({ sourceKind: "html", ... })` pada content yang akan diingest.
3. Pastikan:
   - exact-source persistence tetap memakai content yang dekat ke raw source
   - normalized content hanya dipakai untuk RAG ingest
   - raw web content tidak ikut di-index ke RAG
4. Tambahkan logging ringan untuk web normalization.

### Deliverable

- web-search RAG ingest memakai normalized content
- exact-source path tetap aman

## Phase 5: Backward Compatibility dan Consumer Cleanup

### Tujuan

Meredakan transisi schema tanpa mematahkan feature existing.

### Task

1. Audit pembaca field file content, terutama:
   - `src/app/api/chat/route.ts`
2. Tentukan policy sementara:
   - fallback ke `extractedText` jika `normalizedText` belum ada
3. Setelah migration stabil, putuskan apakah `fileContext` di chat akan memakai `normalizedText`.

### Deliverable

- seluruh pembaca field file content tetap aman selama transisi

## Phase 6: Observability

### Tujuan

Membuat efek normalizer bisa diukur.

### Task

1. Simpan metadata minimal:
   - `originalLength`
   - `normalizedLength`
   - `appliedSteps`
   - `warnings`
   - `sourceKind`
   - `normalizerVersion`
2. Tambahkan log yang cukup untuk diagnosis:
   - source id
   - source kind
   - before/after length
3. Jika perlu, expose nanti ke AI Ops sebagai tahap lanjutan.

### Deliverable

- normalizer punya jejak diagnosis dasar

## Testing Plan

### Unit tests

- helper normalization umum
- strategy per source kind
- no-op behavior pada content yang sudah bersih
- dedup paragraph behavior
- heading cleanup behavior

### Integration tests

- upload file route:
  - extractor -> normalize -> save -> ingest
- web search path:
  - fetched content -> normalize -> ingest

### Regression checks

- chunk count tidak melonjak aneh
- content length tidak turun drastis tanpa alasan
- exact-source path tidak berubah behavior
- raw content tidak pernah ikut ke jalur indexing
- citation/url normalizer tidak tertarik masuk ke text normalization layer

## Rollout Strategy

### Tahap rollout

1. Landing schema + normalizer module
2. Aktifkan di upload path
3. Verifikasi behavior
4. Aktifkan di web-search path
5. Evaluasi apakah consumer lain perlu pindah ke `normalizedText`

### Kenapa urutan ini

- upload path lebih lokal dan lebih mudah didiagnosis
- web-search path lebih sensitif karena terkait retrieval online

## Open Questions

- Apakah `files.extractedText` akan dipertahankan sebagai alias compatibility atau nanti dihapus?
- Apakah `normalizedText` juga akan dipakai untuk file context injection di chat?
- Apakah raw content besar perlu disimpan penuh atau capped dengan metadata?

## Definition of Done

Sebuah implementasi dianggap selesai kalau:

- semua ingestion path target melewati `normalizeSourceContent()`
- upload file menyimpan `raw` dan `normalized` content
- RAG ingest memakai `normalizedText`
- exact-source tetap tidak memakai normalized text
- raw content tidak ikut di-index ke RAG
- tests dasar dan integration checks lulus
- observability minimal tersedia

## File Terkait

- `docs/normalizer-typeScript/context.md`
- `docs/normalizer-typeScript/design-doc.md`
- `src/lib/ingestion/source-normalizer.ts`
- `src/lib/ingestion/source-normalizer.types.ts`
- `src/lib/ai/web-search/orchestrator.ts`
- `src/app/api/extract-file/route.ts`
- `src/lib/ai/rag-ingest.ts`
- `convex/schema.ts`
- `convex/files.ts`
