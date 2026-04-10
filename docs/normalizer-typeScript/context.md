# Context: TypeScript Source Normalizer

> **SUPERSEDED (2026-04-10):** Dokumen ini adalah catatan historis dari diskusi awal. Keputusan akhir ada di `design-doc.md` (lean version). Perbedaan utama: tidak ada schema migration, tidak ada 7 source strategies, tidak ada `normalizeSourceContent()` — diganti oleh satu fungsi `cleanForIngestion()`.

## Tujuan

Dokumen ini merangkum keputusan dan konteks diskusi tentang kebutuhan `TypeScript normalization layer` untuk ingestion content di makalahapp, khususnya pada jalur:

- `web-search content`
- `upload file text`

Fokus diskusi sengaja dipersempit ke konsolidasi normalizer TypeScript yang sudah ada. Pembahasan `just-bash` ditutup sebagai opsi yang tidak direkomendasikan untuk runtime production saat ini.

## Ringkasan Keputusan

### Keputusan utama

- Makalahapp **sudah punya fondasi normalizer TypeScript**, tetapi logiknya masih **tersebar dan parsial**.
- Makalahapp **belum punya satu ingestion normalization layer yang jelas** sebelum content masuk ke `chunking`, `embedding`, dan `RAG ingest`.
- Solusi terbaik saat ini adalah **mengonsolidasikan helper existing** ke satu layer baru, bukan menambah runtime/tool baru.
- `just-bash` **tidak direkomendasikan** untuk runtime production makalahapp saat ini karena berisiko menambah latency dan kompleksitas tanpa quality gain yang cukup jelas.

### Keputusan arsitektur

- Tambahkan satu modul baru: `src/lib/ingestion/source-normalizer.ts`
- Tambahkan kontrak tipe eksplisit untuk source normalization.
- Fase awal mencakup:
  - `web-search content`
  - `upload file text`
- Layer ini dipakai **hanya untuk ingestion RAG**, bukan untuk `exact-source context`.

### Keputusan data handling

- Simpan **dua bentuk content**:
  - `raw extracted text` untuk audit, debugging, dan fallback
  - `normalized text` untuk chunking, embedding, dan retrieval
- `normalized text` menjadi **satu-satunya jalur aktif** yang masuk ke RAG.
- `raw extracted text` tidak boleh ikut di-index ke RAG agar tidak menambah noise dan duplikasi.

## Kenapa Fokus ke TypeScript Normalizer

### Alasan utama

- Seluruh codebase makalahapp saat ini sudah bertumpu pada TypeScript.
- Helper normalization yang relevan sudah ada, jadi biaya implementasi lebih rendah.
- Runtime tambahan seperti `just-bash` berisiko:
  - menambah latency
  - menambah debugging surface
  - menambah observability burden
  - menambah kompleksitas pipeline

### Kesimpulan praktis

Untuk kondisi makalahapp sekarang, problem utamanya bukan kekurangan tool, melainkan **kurangnya boundary ingestion yang rapi**.

## Yang Sudah Ada di Codebase

Berikut fondasi yang sudah tersedia dan akan dikonsolidasikan:

- Normalisasi hasil sitasi/search provider:
  - `src/lib/citations/normalizer.ts`
- Cleanup dan validasi URL sitasi:
  - `src/lib/citations/apaWeb.ts`
  - `src/lib/citations/url-validation.ts`
- Parsing web content dasar via `Readability + Turndown`:
  - `src/lib/ai/web-search/content-fetcher.ts`
- Formatting XLSX menjadi markdown table:
  - `src/lib/file-extraction/xlsx-extractor.ts`
- Chunking text untuk RAG:
  - `src/lib/ai/chunking.ts`
- Upload file extraction:
  - `src/app/api/extract-file/route.ts`
  - `src/lib/file-extraction/pdf-extractor.ts`
  - `src/lib/file-extraction/docx-extractor.ts`
  - `src/lib/file-extraction/pptx-extractor.ts`
  - `src/lib/file-extraction/txt-extractor.ts`
  - `src/lib/file-extraction/image-ocr.ts`

## Yang Belum Ada

### Gap utama

- Belum ada satu abstraction semacam:
  - `normalizeSourceContent(input) -> normalizedText + metadata + artifacts`
- Belum ada strategy eksplisit per source type:
  - `html`
  - `pdf_text`
  - `docx_text`
  - `xlsx_markdown`
  - `plain_text`
- Belum ada satu tempat khusus untuk cleanup lanjutan:
  - boilerplate removal
  - dedup paragraph
  - heading repair
  - section trimming
  - source-quality normalization

### Dampak gap ini

- Sulit menentukan “teks final yang masuk embedding” dibentuk di mana.
- Sulit menambah cleanup baru tanpa menyebar util ke banyak file.
- Sulit mengukur dampak normalisasi terhadap kualitas retrieval.
- Sulit membedakan bug extractor vs bug normalizer.

## Boundary yang Disepakati

Boundary target setelah konsolidasi:

1. `fetch / extract`
2. `normalize`
3. `chunk`
4. `embed`
5. `ingest`

Secara praktis:

- `content-fetcher` dan file extractors tetap menghasilkan source content mentah
- `source-normalizer` mengubah content mentah menjadi content siap-ingest
- `chunkContent()` hanya menerima content yang sudah dinormalisasi
- `ingestToRag()` hanya menerima content yang sudah dinormalisasi

## Scope Fase 1

### In scope

- Web search content
- Upload file text
- Strategy normalization ringan dan aman
- Metadata normalization untuk observability dasar
- Pemisahan `raw` vs `normalized` content

### Out of scope

- Exact-source context
- Replacement besar-besaran pada citation normalizer
- Runtime baru seperti `just-bash`
- Cleanup agresif yang berisiko mengubah makna dokumen

## Prinsip Desain

- Reuse helper existing, jangan rewrite total.
- Cleanup harus ringan, deterministik, dan mudah dites.
- Jangan ubah meaning content.
- Exact-source harus tetap dekat ke source asli.
- Normalizer harus memperjelas boundary ingestion, bukan menambah beban arsitektur.

## File Terkait

- `docs/normalizer-typeScript/chat.txt`
- `src/lib/citations/normalizer.ts`
- `src/lib/citations/apaWeb.ts`
- `src/lib/citations/url-validation.ts`
- `src/lib/ai/web-search/content-fetcher.ts`
- `src/lib/ai/chunking.ts`
- `src/lib/ai/rag-ingest.ts`
- `src/app/api/extract-file/route.ts`
- `src/app/api/chat/route.ts`
- `src/lib/file-extraction/pdf-extractor.ts`
- `src/lib/file-extraction/docx-extractor.ts`
- `src/lib/file-extraction/pptx-extractor.ts`
- `src/lib/file-extraction/xlsx-extractor.ts`
- `src/lib/file-extraction/txt-extractor.ts`
- `convex/files.ts`
- `convex/schema.ts`
