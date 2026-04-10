# Design Doc: Ingestion Text Cleanup (Lean)

## Ringkasan

Tambahkan satu fungsi chokepoint `cleanForIngestion(text, sourceType)` yang dipanggil tepat sebelum `ingestToRag()` di kedua path (upload file dan web-search). Tujuannya bukan arsitektur baru, tapi memastikan ada satu tempat untuk membersihkan text sebelum chunking dan embedding.

Dokumen ini menggantikan design doc sebelumnya yang terlalu besar scope-nya. Keputusan lean ini didasarkan pada verifikasi langsung terhadap codebase per 2026-04-10.

## Problem Statement

Saat ini dua jalur ingestion mengirim content langsung ke `ingestToRag()` tanpa post-processing:

1. **Upload file** (`extract-file/route.ts:261`): `extractedText` langsung masuk `ingestToRag()`
2. **Web search** (`orchestrator.ts:1114`): `fetched.fullContent` langsung masuk `ingestToRag()`

Tidak ada satu tempat pun untuk menerapkan cleanup sebelum content masuk chunking dan embedding.

### Dampak nyata di 100K user

- PDF extraction (`pdf-parse`) menghasilkan text dengan broken line wraps, repeated headers/footers per page, dan whitespace inconsistency. Ini noise yang masuk embedding.
- DOCX extraction (`mammoth`) menghasilkan raw text tanpa paragraph normalization.
- Web content sudah melalui Readability+Turndown (HTML->Markdown), jadi relatif bersih. Tapi bisa punya excessive blank lines dari Turndown output.
- Chunker (`chunking.ts`) splits berdasarkan `\n\s*\n+` dan heading regex. Noisy whitespace bisa menghasilkan chunk boundaries yang suboptimal.

### Yang bukan masalah

- Exact-source path sudah terpisah clean — pakai `documentText` dan `paragraphs` di orchestrator, bukan `fullContent`. Tidak perlu disentuh.
- Citation/URL normalization sudah punya domain sendiri di `src/lib/citations/`. Tidak boleh dicampur.
- File extractors sendiri sudah berfungsi baik. Yang kurang adalah post-processing antara extract dan ingest.

## Goals

- Satu chokepoint function antara extract dan ingest.
- Cleanup konservatif yang tidak mengubah meaning content.
- Bisa diuji dengan snapshot tests.
- Tidak perlu schema migration.
- Tidak perlu abstraksi per source type yang elaborate.

## Non-Goals

- Tidak menyentuh exact-source path.
- Tidak mengganti citation normalizer.
- Tidak menambah schema fields (rawExtractedText, normalizedText, normalizationMeta).
- Tidak membuat strategy pattern per source type.
- Tidak membuat derived artifacts.
- Tidak menambah runtime baru.

## Proposed Design

### Satu file, satu fungsi

```
src/lib/ingestion/clean-for-ingestion.ts
```

```ts
type IngestionSourceType = "web" | "upload"

function cleanForIngestion(text: string, sourceType: IngestionSourceType): string
```

Pure function. Synchronous. Stateless. Returns cleaned string.

### Cleanup operations

Semua source types mendapat cleanup dasar yang sama:

1. **Normalize newlines**: `\r\n` -> `\n`
2. **Collapse excessive blank lines**: 3+ blank lines -> 2 blank lines
3. **Dedup identical consecutive paragraphs**: split on `\n\n`, compare trimmed, hapus duplikat berurutan. Ini address repeated headers/footers dari PDF extraction.
4. **Trim**: leading/trailing whitespace (terakhir, setelah dedup selesai dengan paragraph boundaries utuh)

Tidak ada cleanup tambahan per source type di fase ini. Kalau nanti ada evidence bahwa source type tertentu butuh treatment khusus, bisa ditambah di fungsi yang sama tanpa perlu abstraksi baru.

### Kenapa tidak per-source-type strategies

Verifikasi terhadap codebase menunjukkan:

| Source | State saat extract | Apakah butuh strategy terpisah? |
|---|---|---|
| Web (HTML) | Sudah melalui Readability+Turndown. Bersih. | Tidak |
| PDF | `pdf-parse` raw output. Trim saja. | Dedup paragraphs cukup |
| DOCX | `mammoth` raw text. Trim saja. | Tidak |
| XLSX | Sudah formatted sebagai markdown tables | Tidak |
| PPTX | Raw text, biasanya bersih per slide | Tidak |
| TXT | Plain text, trim saja | Tidak |
| Image OCR | OCR output, biasanya pendek | Tidak |

Semua bisa ditangani oleh 4 operasi cleanup yang sama. Strategy pattern jadi premature abstraction.

## Integration Points

### 1. Upload file path

Lokasi: `src/app/api/extract-file/route.ts:259-266`

Sekarang:
```ts
void ingestToRag({
  content: extractedText,
  ...
})
```

Setelah:
```ts
import { cleanForIngestion } from "@/lib/ingestion/clean-for-ingestion"

void ingestToRag({
  content: cleanForIngestion(extractedText, "upload"),
  ...
})
```

Satu baris berubah. Tidak ada perubahan lain di route.

### 2. Web search path

Lokasi: `src/lib/ai/web-search/orchestrator.ts:1114-1118`

Sekarang:
```ts
await ingestToRag({
  content: fetched.fullContent,
  ...
})
```

Setelah:
```ts
import { cleanForIngestion } from "@/lib/ingestion/clean-for-ingestion"

await ingestToRag({
  content: cleanForIngestion(fetched.fullContent, "web"),
  ...
})
```

Satu baris berubah. Exact-source persist (`documentText`, `paragraphs`) tidak terpengaruh karena dihandle terpisah di `persistExactSources()`.

### 3. Schema

**Tidak ada perubahan schema.** `extractedText` di table `files` tetap menyimpan raw extraction output. Normalization diterapkan on-the-fly sebelum ingest. Alasan:

- Cleanup-nya konservatif (trim, collapse whitespace, dedup) — diff antara raw dan cleaned minimal.
- Doubles storage per file di 100K user base bukan trade-off yang worth it untuk cleanup level ini.
- Kalau nanti butuh audit, `extractedText` sudah menjadi de facto raw text.

## Observability

Minimal logging di fungsi cleanup:

```ts
const originalLength = text.length
const cleaned = /* ... */
if (cleaned.length !== originalLength) {
  console.log(`[Ingestion Cleanup] source=${sourceType} before=${originalLength} after=${cleaned.length} diff=${originalLength - cleaned.length}`)
}
```

Tidak perlu metadata yang disimpan ke database. Log ini cukup untuk mendeteksi apakah cleanup terlalu agresif atau tidak berdampak sama sekali.

## Testing Plan

### Unit tests (`clean-for-ingestion.test.ts`)

- Input bersih -> output identik (no-op behavior)
- `\r\n` normalization
- Excessive blank lines collapsed
- Identical consecutive paragraphs deduped
- Non-identical paragraphs preserved
- Empty/whitespace-only input -> empty string
- Markdown structure (headings, tables, code blocks) preserved

### Regression checks

- Chunk count tidak berubah drastis setelah cleanup diterapkan
- Existing test suites tetap pass
- Exact-source path tidak terpengaruh

## Risks

### Risk 1: Dedup terlalu agresif

Paragraf yang memang legitimately repeated (e.g., refrain di puisi, repeated disclaimer) bisa terhapus.

Mitigasi: Hanya dedup **consecutive** identical paragraphs, bukan global dedup. Legitimate repetition jarang terjadi secara berurutan di dokumen akademis/bisnis yang jadi target utama makalahapp.

### Risk 2: Cleanup tidak berdampak

Mungkin saja cleanup minimal ini tidak measurably improve retrieval quality.

Mitigasi: Ini acceptable outcome. Cost implementasinya sangat rendah (satu file, satu fungsi, dua baris integrasi). Dan chokepoint yang dibuat tetap valuable sebagai tempat untuk menambah logic nanti kalau ada evidence.

## Definition of Done

- `cleanForIngestion()` implemented dan tested
- Kedua path ingestion (upload, web-search) memanggil fungsi ini sebelum `ingestToRag()`
- Exact-source path tidak terpengaruh
- Unit tests pass
- Tidak ada schema migration

## File Terkait

- `src/lib/ingestion/clean-for-ingestion.ts` (baru)
- `src/lib/ingestion/clean-for-ingestion.test.ts` (baru)
- `src/app/api/extract-file/route.ts` (edit 1 baris)
- `src/lib/ai/web-search/orchestrator.ts` (edit 1 baris)
- `src/lib/ai/rag-ingest.ts` (tidak berubah)
- `src/lib/ai/chunking.ts` (tidak berubah)
- `convex/schema.ts` (tidak berubah)
