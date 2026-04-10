# Implementation Plan: Ingestion Text Cleanup

## Ringkasan

Plan ini mengimplementasikan `cleanForIngestion()` — satu fungsi chokepoint antara extract dan ingest. Scope sengaja kecil: satu file baru, dua baris integrasi, tidak ada schema migration.

Mengacu pada: `docs/normalizer-typeScript/design-doc.md` (lean version, 2026-04-10).

## Prinsip Eksekusi

- Tidak ada schema migration.
- Tidak ada abstraksi per source type.
- Cleanup konservatif — jangan ubah meaning content.
- Exact-source path tidak disentuh.
- Citation/URL normalization tetap di domain sendiri.
- Test dulu, integrasi belakangan.

## Step 1: Implement `cleanForIngestion()`

### File baru

`src/lib/ingestion/clean-for-ingestion.ts`

### Signature

```ts
type IngestionSourceType = "web" | "upload"

export function cleanForIngestion(text: string, sourceType: IngestionSourceType): string
```

### Cleanup operations (semua source types)

1. Normalize newlines: `\r\n` -> `\n`
2. Collapse excessive blank lines: 3+ blank lines -> 2 blank lines
3. Dedup identical consecutive paragraphs (split on `\n\n`, compare trimmed, remove consecutive duplicates)
4. Trim leading/trailing whitespace

### Logging

```ts
if (cleaned.length !== text.length) {
  console.log(`[Ingestion Cleanup] source=${sourceType} before=${text.length} after=${cleaned.length} diff=${text.length - cleaned.length}`)
}
```

### Edge cases

- Empty string / whitespace-only -> return `""`
- Already clean text -> return unchanged (no-op)
- `sourceType` parameter reserved untuk future per-type logic, tapi di fase ini tidak mempengaruhi behavior

### Deliverable

- `src/lib/ingestion/clean-for-ingestion.ts` implemented

## Step 2: Unit Tests

### File baru

`src/lib/ingestion/clean-for-ingestion.test.ts`

### Test cases

| Test | Input | Expected |
|---|---|---|
| No-op on clean text | `"Hello world\n\nParagraph two"` | Identical output |
| CRLF normalization | `"Line one\r\nLine two"` | `"Line one\nLine two"` |
| Collapse blank lines | `"A\n\n\n\n\nB"` | `"A\n\nB"` |
| Dedup consecutive paragraphs | `"Para A\n\nPara A\n\nPara B"` | `"Para A\n\nPara B"` |
| Preserve non-consecutive duplicates | `"A\n\nB\n\nA"` | Identical output |
| Trim whitespace | `"  \n text \n  "` | `"text"` |
| Empty input | `""` | `""` |
| Whitespace-only | `"   \n\n  "` | `""` |
| Markdown headings preserved | `"# Title\n\nText"` | Identical output |
| Markdown tables preserved | `"| A | B |\n| --- | --- |\n| 1 | 2 |"` | Identical output |
| Code blocks preserved | `` "```\ncode\n```" `` | Identical output |
| Mixed: CRLF + blank lines + dedup | Complex input | All operations applied |

### Deliverable

- `src/lib/ingestion/clean-for-ingestion.test.ts` — all tests green

## Step 3: Integrate Upload Path

### File edit

`src/app/api/extract-file/route.ts`

### Change

Di sekitar line 259-268, ubah `content: extractedText` menjadi `content: cleanForIngestion(extractedText, "upload")`.

Tambah import di atas file:
```ts
import { cleanForIngestion } from "@/lib/ingestion/clean-for-ingestion"
```

### Verification

- Existing extraction flow tetap berfungsi.
- `extractedText` yang disimpan ke Convex (`updateExtractionResult`) tetap raw — tidak terpengaruh.
- Hanya content yang dikirim ke `ingestToRag()` yang dibersihkan.

### Deliverable

- Upload path memanggil `cleanForIngestion()` sebelum `ingestToRag()`

## Step 4: Integrate Web Search Path

### File edit

`src/lib/ai/web-search/orchestrator.ts`

### Change

Di sekitar line 1114-1118, ubah `content: fetched.fullContent` menjadi `content: cleanForIngestion(fetched.fullContent, "web")`.

Tambah import di atas file:
```ts
import { cleanForIngestion } from "@/lib/ingestion/clean-for-ingestion"
```

### Verification

- Exact-source persist (`persistExactSources`) tetap memakai `documentText` dan `paragraphs` — tidak terpengaruh.
- `pageContent` untuk compose context tidak terpengaruh.
- Hanya content yang dikirim ke `ingestToRag()` yang dibersihkan.

### Deliverable

- Web search path memanggil `cleanForIngestion()` sebelum `ingestToRag()`

## Step 5: Smoke Test End-to-End

### Checks

1. Upload file (PDF) -> verify text masuk RAG, retrieval tetap berfungsi.
2. Upload file (DOCX) -> verify text masuk RAG.
3. Web search -> verify content di-ingest, exact-source tidak berubah.
4. Verify log `[Ingestion Cleanup]` muncul dengan `before`/`after` yang masuk akal.
5. Verify chunk count tidak berubah drastis dibanding sebelum cleanup.
6. Existing test suites tetap pass — tidak ada regresi di luar scope cleanup.

### Deliverable

- Confidence bahwa integrasi aman di kedua path.

## Rollout

Tidak perlu staged rollout — perubahan ini additive dan low-risk:
- Fungsi pure, stateless, synchronous.
- Kalau ada bug, rollback = revert 2 baris import + call.
- Tidak ada schema migration yang perlu dirollback.

## File Summary

| File | Action |
|---|---|
| `src/lib/ingestion/clean-for-ingestion.ts` | Baru |
| `src/lib/ingestion/clean-for-ingestion.test.ts` | Baru |
| `src/app/api/extract-file/route.ts` | Edit (1 import + 1 line change) |
| `src/lib/ai/web-search/orchestrator.ts` | Edit (1 import + 1 line change) |
| `src/lib/ai/rag-ingest.ts` | Tidak berubah |
| `src/lib/ai/chunking.ts` | Tidak berubah |
| `convex/schema.ts` | Tidak berubah |
| `convex/files.ts` | Tidak berubah |

## Definition of Done

- `cleanForIngestion()` implemented dan tested.
- Kedua path ingestion memanggil fungsi ini sebelum `ingestToRag()`.
- Exact-source path tidak terpengaruh.
- Unit tests pass.
- Tidak ada schema migration.
- Log cleanup muncul di runtime.
