# Design Doc: TypeScript Source Normalizer

## Ringkasan

Dokumen ini menjabarkan desain teknis untuk `TypeScript source normalizer` yang akan menjadi boundary resmi antara `fetch/extract` dan `chunking/RAG ingest`.

Tujuan utamanya bukan mengganti logic existing, tetapi mengonsolidasikan logic normalization yang saat ini tersebar ke dalam satu layer ingestion yang jelas, ringan, dan bisa diobservasi.

Dokumen ini mengikuti keputusan di `context.md`:

- fokus ke konsolidasi helper TypeScript yang sudah ada
- tidak menambahkan runtime baru seperti `just-bash`
- hanya dipakai untuk ingestion RAG
- menjaga exact-source tetap dekat ke source asli

## Problem Statement

Saat ini jalur ingestion content di makalahapp masih terdistribusi:

- web source diparse di `src/lib/ai/web-search/content-fetcher.ts`
- upload source diekstrak di `src/app/api/extract-file/route.ts`
- file formatter tertentu hidup di extractor masing-masing
- chunking langsung menerima string content yang datang dari banyak tempat

Masalah yang muncul:

- tidak ada satu kontrak normalization yang konsisten
- tidak ada strategy per source type yang eksplisit
- tidak ada metadata normalization yang bisa dipakai untuk observability
- file upload hanya menyimpan `extractedText`, belum bisa memisahkan `raw` vs `normalized`

Pada saat yang sama, fondasi normalizer TypeScript sebenarnya sudah ada, tetapi tersebar:

- citation/search normalization di `src/lib/citations/normalizer.ts`
- URL cleanup/validation di `src/lib/citations/apaWeb.ts` dan `src/lib/citations/url-validation.ts`
- web parsing dasar di `src/lib/ai/web-search/content-fetcher.ts`
- XLSX formatting di `src/lib/file-extraction/xlsx-extractor.ts`
- chunking di `src/lib/ai/chunking.ts`

Jadi kebutuhan saat ini bukan membuat kemampuan baru dari nol, tetapi memberi boundary ingestion yang lebih jelas.

## Goals

- Menyediakan satu `normalization layer` resmi untuk ingestion RAG.
- Mendukung dua jalur awal:
  - web-search content
  - upload file text
- Menetapkan strategy eksplisit per source type.
- Memisahkan `raw content` dan `normalized content`.
- Menjaga overhead runtime tetap ringan.

## Non-Goals

- Tidak dipakai untuk `exact-source context`.
- Tidak mengganti seluruh citation normalizer yang sudah ada.
- Tidak memasukkan citation URL normalization ke dalam text normalization layer.
- Tidak menambahkan runtime/tool baru seperti `just-bash`.
- Tidak melakukan semantic rewriting konten.

## Proposed Architecture

### Target flow

```text
fetch / extract
  -> normalizeSourceContent()
  -> chunkContent()
  -> embedTexts()
  -> ingestToRag()
```

### Layer responsibilities

#### 1. Extract / Fetch layer

Tanggung jawab:

- mengambil content dari source
- menghasilkan `raw content`
- tidak bertanggung jawab untuk cleanup ingestion yang kompleks

Implementasi existing:

- `src/lib/ai/web-search/content-fetcher.ts`
- `src/app/api/extract-file/route.ts`
- `src/lib/file-extraction/*`

#### 2. Normalization layer

Tanggung jawab:

- menerima `raw content`
- menerapkan cleanup sesuai `sourceKind`
- menghasilkan:
  - `normalizedText`
  - `normalizationMeta`
  - `derivedArtifacts?`

Modul baru:

- `src/lib/ingestion/source-normalizer.ts`
- `src/lib/ingestion/source-normalizer.types.ts`

#### 3. Chunking / Embedding / Ingest layer

Tanggung jawab:

- hanya bekerja dengan `normalizedText`
- tidak lagi menerima string mentah dari berbagai jalur

Implementasi existing:

- `src/lib/ai/chunking.ts`
- `src/lib/ai/rag-ingest.ts`

## API Contract

### Type definitions

```ts
export type SourceKind =
  | "html"
  | "pdf_text"
  | "docx_text"
  | "xlsx_markdown"
  | "pptx_text"
  | "plain_text"
  | "image_ocr"

export interface NormalizeSourceInput {
  sourceKind: SourceKind
  rawContent: string
  sourceUrl?: string
  title?: string
  metadata?: Record<string, unknown>
}

export interface NormalizeSourceOutput {
  normalizedText: string
  normalizationMeta: {
    sourceKind: SourceKind
    originalLength: number
    normalizedLength: number
    appliedSteps: string[]
    warnings?: string[]
    normalizerVersion: string
  }
  derivedArtifacts?: {
    references?: Array<{ url: string; title?: string }>
    sections?: Array<{ heading?: string; length: number }>
  }
}
```

### Main function

```ts
export function normalizeSourceContent(
  input: NormalizeSourceInput
): NormalizeSourceOutput
```

## Source Strategies

### `html`

Input source:

- hasil `Readability + Turndown`
- bisa berasal dari `web-search content`

Cleanup aman:

- trim whitespace global
- collapse blank lines berlebih
- dedup paragraph identik berurutan
- heading markdown repair
- trim boilerplate ringan yang jelas non-konten

Catatan:

- cleanup harus konservatif
- jangan menghapus section yang belum bisa dibuktikan sebagai boilerplate

### `pdf_text`

Input source:

- text hasil extractor PDF

Cleanup aman:

- normalize whitespace
- collapse broken line wraps
- dedup repeated header/footer sederhana
- rapikan paragraph separation

Catatan:

- jangan gabung paragraf secara agresif
- jangan ubah urutan kalimat

### `docx_text`

Input source:

- text hasil extractor DOCX

Cleanup aman:

- normalize blank lines
- rapikan paragraph spacing
- heading-ish line normalization ringan

### `xlsx_markdown`

Input source:

- markdown hasil formatter XLSX existing

Cleanup aman:

- trim whitespace
- normalize jarak antar sheet
- pertahankan struktur table markdown

### `pptx_text`

Input source:

- text hasil extractor PPTX

Cleanup aman:

- normalize spacing
- rapikan slide separator jika ada

### `plain_text`

Input source:

- TXT atau source text polos lain

Cleanup aman:

- trim
- normalize newline
- dedup paragraph identik berurutan

### `image_ocr`

Input source:

- hasil OCR image

Cleanup aman:

- trim
- normalize whitespace
- paragraph cleanup minimal

## Data Persistence Changes

### Existing state

Table `files` saat ini hanya menyimpan:

- `extractedText`
- `extractionStatus`
- `extractionError`

### Proposed changes

Tambahkan field berikut ke `files`:

- `rawExtractedText?: string`
- `normalizedText?: string`
- `normalizationMeta?: { ... }`
- `normalizerVersion?: string`

### Rationale

- `rawExtractedText` dipakai untuk audit dan debugging
- `normalizedText` dipakai untuk chunking dan RAG
- `normalizationMeta` dipakai untuk observability dan diagnosis
- `rawExtractedText` tidak boleh ikut masuk index RAG agar tidak menambah noise dan duplikasi

## Integration Points

### 1. Web-search content path

Lokasi:

- `src/lib/ai/web-search/content-fetcher.ts`
- `src/lib/ai/web-search/orchestrator.ts`

Proposed integration:

- setelah `FetchedContent.fullContent` atau `pageContent` siap
- sebelum `ingestToRag()`

Perilaku:

- simpan raw web content di memory scope request
- kirim ke `normalizeSourceContent({ sourceKind: "html", ... })`
- hasil `normalizedText` yang di-ingest ke RAG
- raw web content tidak ikut di-index ke RAG
- exact-source persistence tetap menggunakan content yang dekat ke source asli

### 2. Upload file path

Lokasi:

- `src/app/api/extract-file/route.ts`

Proposed integration:

- extractor menghasilkan `extractedText` mentah
- route memanggil `normalizeSourceContent()` sesuai file type
- Convex menyimpan raw + normalized
- `ingestToRag()` menerima `normalizedText`
- `rawExtractedText` disimpan untuk audit/debug/fallback, bukan untuk indexing

### 3. Chat attachment rendering

Lokasi:

- `src/app/api/chat/route.ts`

Open design choice:

- tetap pakai `extractedText` lama untuk file context sementara
- atau migrasi bertahap ke `normalizedText`

Rekomendasi:

- fase awal tetap kompatibel dulu
- setelah schema stabil, file context bisa pindah ke `normalizedText`

## Observability

Observability di desain ini berfungsi untuk membedakan tiga sumber masalah:

- extractor menghasilkan text mentah yang buruk
- normalizer terlalu agresif atau terlalu lemah
- chunking/retrieval memberi hasil buruk walau normalized text sudah baik

### Minimal telemetry yang perlu ada

- `sourceKind`
- `originalLength`
- `normalizedLength`
- `appliedSteps`
- `warnings`
- `normalizerVersion`

### Tujuan observability

- tahu apakah normalizer terlalu agresif
- tahu apakah normalizer memberi value nyata
- membedakan bug extractor vs bug normalizer

## Tradeoffs

### Kenapa desain ini baik

- reuse logic existing
- low-risk untuk runtime
- jelas boundary-nya
- gampang diuji
- mudah diperluas nanti

### Keterbatasan desain

- fase awal belum menyentuh exact-source path
- rules cleanup masih konservatif
- butuh perubahan schema untuk file upload path

## Risks

### Risk 1: over-normalization

Dampak:

- konten penting hilang
- retrieval quality turun

Mitigasi:

- simpan `rawExtractedText`
- cleanup konservatif
- test snapshot per source type

### Risk 2: schema migration complexity

Dampak:

- perubahan data model `files`

Mitigasi:

- additive migration
- backward-compatible reads

### Risk 3: inconsistent ingestion behavior

Dampak:

- sebagian source lewat normalizer, sebagian tidak

Mitigasi:

- centralize entry point
- pastikan semua path ingestion menuju normalizer yang sama

## Related Files

- `src/lib/ai/web-search/content-fetcher.ts`
- `src/lib/ai/web-search/orchestrator.ts`
- `src/lib/ai/chunking.ts`
- `src/lib/ai/rag-ingest.ts`
- `src/app/api/extract-file/route.ts`
- `src/app/api/chat/route.ts`
- `src/lib/file-extraction/pdf-extractor.ts`
- `src/lib/file-extraction/docx-extractor.ts`
- `src/lib/file-extraction/pptx-extractor.ts`
- `src/lib/file-extraction/txt-extractor.ts`
- `src/lib/file-extraction/xlsx-extractor.ts`
- `src/lib/file-extraction/image-ocr.ts`
- `convex/files.ts`
- `convex/schema.ts`
