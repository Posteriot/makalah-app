# Attachment Embeddings Design

RAG-based file attachment system menggunakan Gemini Embedding + Vision extraction untuk menggantikan brute-force context stuffing.

**Branch**: `attachment-embeddings`
**Date**: 2026-03-11
**Status**: Approved

---

## 1. Problem Statement & Goals

### Problem

Saat ini, attachment handling Makalah itu "brute force":

1. **Truncation diam-diam** — Paper mode limit 6.000 char/file dan 20.000 total. File di atas ~3 halaman kehilangan data tanpa notifikasi ke user maupun AI
2. **Token waste** — Seluruh teks file di-dump ke context window meskipun cuma 10% yang relevan dengan pertanyaan user. Boros biaya dan makan context space
3. **Konten visual hilang** — pdf-parse nggak bisa baca diagram, grafik, tabel visual, atau scanned PDF. Informasi ini hilang total dari AI
4. **Nggak scalable** — Upload 5+ file sekaligus = beberapa file di-skip karena total char limit

### Goals

| # | Goal | Metric |
|---|------|--------|
| G1 | **Nol data loss** — Semua konten file (teks + visual) ter-capture dan searchable | Tidak ada truncation, scanned PDF bisa dibaca |
| G2 | **Presisi retrieval** — AI hanya dapat bagian file yang relevan dengan pertanyaan | Konteks yang di-inject <= top-K chunks, bukan seluruh file |
| G3 | **Backward compatible** — File kecil tetap pakai context stuffing, nggak ada regresi | File < 10K tokens behavior-nya sama seperti sekarang |
| G4 | **Upgrade-friendly** — Arsitektur siap swap ke multimodal embedding atau knowledge base tanpa rewrite | Embedding model configurable, storage model-agnostic |

### Non-Goals (Out of Scope)

- Knowledge base / perpustakaan pribadi lintas conversation (Fase 2 nanti)
- Real-time re-embedding saat file berubah (files di Makalah immutable setelah upload)
- UI baru untuk browsing/searching file content (enhancement terpisah)

---

## 2. Arsitektur High-Level

### Pipeline Overview

Dua pipeline yang berjalan di waktu berbeda:

```
INGESTION (saat upload, sekali per file)
------------------------------------------------------
Upload file -> Convex storage
    |
[Existing] Text extraction (pdf-parse, mammoth, dll)
    |
[NEW] Vision extraction (Gemini Flash per halaman PDF/gambar)
    |
[NEW] Chunking (512 tokens, 10% overlap)
    |
[NEW] Embedding (gemini-embedding-001 via @ai-sdk/google)
    |
[NEW] Store chunks + vectors di Convex (vector index)


RETRIEVAL (saat user kirim pesan, tiap chat turn)
------------------------------------------------------
User message masuk
    |
[NEW] Hitung total extractedText dari attached files
    |
[NEW] Decision: context stuff atau RAG?
    |
    +-- < 10K tokens -> Context stuffing (existing behavior, zero change)
    |
    +-- >= 10K tokens -> RAG path:
        +-- Embed user query (taskType: RETRIEVAL_QUERY)
        +-- Vector search di Convex (top 5-8 chunks)
        +-- Inject relevant chunks ke context
        +-- AI jawab berdasarkan chunks, bukan seluruh file
```

### Komponen Baru

| Komponen | Lokasi | Tanggung Jawab |
|----------|--------|----------------|
| **Vision Extractor** | `src/lib/file-extraction/vision-extractor.ts` | Kirim halaman PDF/gambar ke Gemini Flash, dapat deskripsi teks konten visual |
| **Chunker** | `src/lib/embedding/chunker.ts` | Split teks (extracted + vision) jadi chunks 512 token dengan overlap |
| **Embedder** | `src/lib/embedding/embedder.ts` | Wrapper `embed()`/`embedMany()` dari Vercel AI SDK + `@ai-sdk/google` |
| **Chunk Store** | `convex/fileChunks.ts` | Convex table + vector index untuk chunks |
| **Retriever** | `src/lib/embedding/retriever.ts` | Query embedding -> vector search -> return relevant chunks |
| **Routing Logic** | di `src/app/api/chat/route.ts` | Decision: context stuff vs RAG berdasarkan total token count |

### Yang TIDAK Berubah

- `FileUploadButton.tsx` — UI upload tetap sama
- `files` table — schema cuma ditambah satu field optional (`embeddingStatus`), field existing nggak diubah, `extractedText` tetap ada
- File kecil behavior — di bawah threshold, flow 100% sama seperti sekarang
- Image multimodal path — gambar standalone tetap dikirim sebagai data URL ke AI
- **Text extraction tetap berjalan** — Vision extraction itu **ADDITIVE**, bukan pengganti. pdf-parse/mammoth tetap jalan seperti biasa, hasil vision ditambahkan sebagai chunk terpisah (`source: "vision"`)

### Dependency Baru

Semua pakai yang udah terinstall, kecuali satu:
- `@ai-sdk/google` — udah ada (v3.0.34)
- `ai` package — udah ada (`embed`, `embedMany`)
- `GOOGLE_GENERATIVE_AI_API_KEY` — udah ada di `.env.local`
- Convex vector search — native, nggak perlu package

**Satu dependency baru:**
- `pdf-to-img` — untuk render halaman PDF jadi gambar (input vision extraction)

---

## 3. Schema & Data Model

### Tabel Baru: `fileChunks`

```typescript
fileChunks: defineTable({
  fileId: v.id("files"),
  conversationId: v.optional(v.id("conversations")),
  userId: v.id("users"),

  // Content
  content: v.string(),
  source: v.union(
    v.literal("text"),
    v.literal("vision"),
  ),

  // Positional metadata
  pageNumber: v.optional(v.number()),
  chunkIndex: v.number(),

  // Embedding
  embedding: v.array(v.float64()),

  // Timestamps
  createdAt: v.number(),
})
  .index("by_file", ["fileId"])
  .index("by_conversation", ["conversationId"])
  .index("by_user", ["userId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["conversationId", "fileId", "userId"],
  })
```

### Kenapa 768 Dimensi, Bukan 3072

| Dimensi | MTEB Score | Storage per chunk | Alasan |
|---------|------------|-------------------|--------|
| 3072 | 68.16 | ~24 KB | Overkill untuk use case ini |
| **768** | **67.99** | **~6 KB** | **Cuma 0.17 poin lebih rendah, 4x lebih hemat** |
| 256 | 66.19 | ~2 KB | Mulai turun signifikan |

768 itu sweet spot. Hampir sama akurat dengan 3072, tapi 4x lebih kecil. Convex menyimpan vector sebagai `float64[]` (bukan float32), jadi setiap dimensi makan 8 bytes.

**Upgrade path**: Kalau nanti mau upgrade ke 1536 atau 3072, cukup re-embed dan update `dimensions` di vector index.

### Perubahan di `files` Table

Tambah satu field optional:

```typescript
embeddingStatus: v.optional(v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed"),
)),
```

Tracking apakah file sudah di-chunk + di-embed. `undefined` (file lama) = belum pernah di-embed, treated sama seperti sekarang (context stuffing).

### Estimasi Storage

| Skenario | Chunks | Vector storage | Total |
|----------|--------|---------------|-------|
| 1 paper (20 halaman, ~15K tokens) | ~30 chunks | ~180 KB | ~250 KB (incl. text) |
| Power user, 100 papers | ~3.000 chunks | ~18 MB | ~25 MB |
| 1000 users x 10 papers | ~300K chunks | ~1.8 GB | ~2.5 GB |

### Relasi Data

```
files (existing)
  |
  +-- extractedText (existing, tetap ada)
  +-- embeddingStatus (new)
  |
  +-- fileChunks (new, 1-to-many)
        +-- content (chunk text)
        +-- source ("text" | "vision")
        +-- embedding (vector 768d)
        +-- metadata (page, index)
```

`extractedText` tetap ada — dipakai untuk context stuffing pada file kecil dan sebagai fallback.

---

## 4. Ingestion Pipeline

### Flow Lengkap

```
File upload (existing)
    |
Text extraction (existing, nggak diubah)
    |
embeddingStatus = "processing"
    |
STEP 1: Vision Extraction (hanya PDF dan gambar)
  PDF -> split per halaman -> render jadi gambar
  -> kirim ke Gemini Flash -> dapat deskripsi konten visual
    |
STEP 2: Combine & Chunk
  Gabungkan per halaman:
  - Teks dari pdf-parse (source: text)
  - Deskripsi dari vision (source: vision)
  Chunk masing-masing secara terpisah (512 tokens, ~50 token overlap)
    |
STEP 3: Embed & Store
  embedMany() via @ai-sdk/google
  taskType: RETRIEVAL_DOCUMENT, dimensionality: 768
  Batch insert ke fileChunks table
    |
embeddingStatus = "completed"
```

### Vision Extraction: Kapan Dipanggil

| File type | Text extraction | Vision extraction | Alasan |
|-----------|----------------|-------------------|--------|
| **PDF** | pdf-parse | **Ya** | Tangkap diagram, grafik, tabel visual, scanned pages |
| **Gambar** (PNG/JPG/WebP) | Nggak ada | **Ya** | Gambar standalone perlu dideskripsikan untuk embedding |
| **DOCX** | mammoth | Nggak | mammoth sudah cukup |
| **XLSX** | xlsx-populate | Nggak | Data tabular sudah jadi markdown |
| **PPTX** | officeparser | Nggak (v1) | Bisa ditambah nanti |
| **TXT/CSV** | Langsung | Nggak | Plain text |

### Vision Extraction Detail

```typescript
// src/lib/file-extraction/vision-extractor.ts
// Input: PDF file dari Convex storage
// Output: Array of { pageNumber, description }
// Pakai Gemini Flash via @ai-sdk/google -- generateText()
// Prompt: factual description of visual content per page
```

**PDF ke gambar**: Pakai `pdf-to-img` (atau library sejenis) untuk render tiap halaman PDF jadi PNG.

**Batasan**: Max 6 halaman per PDF untuk vision (cost control). Kalau PDF > 6 halaman, vision hanya dijalankan pada halaman yang pdf-parse hasilkan sedikit/kosong teks (indikasi halaman visual/scanned).

### Chunking Strategy

```typescript
// src/lib/embedding/chunker.ts
interface ChunkConfig {
  maxTokens: 512,
  overlapTokens: 50,
  respectBoundaries: true
}
```

**Rules:**
1. Teks dan vision deskripsi di-chunk terpisah (beda `source` tag)
2. Satu tabel = satu chunk (nggak dipecah meski exceed 512 tokens)
3. Split di sentence boundary
4. Overlap 50 tokens supaya konteks nggak putus antar chunk

### Embedding Batch

```typescript
// src/lib/embedding/embedder.ts
import { google } from '@ai-sdk/google';
import { embedMany } from 'ai';

const model = google.embedding('gemini-embedding-001');

const { embeddings } = await embedMany({
  model,
  values: chunks.map(c => c.content),
  providerOptions: {
    google: {
      taskType: 'RETRIEVAL_DOCUMENT',
      outputDimensionality: 768,
    },
  },
});
```

### Dimana Pipeline Ini Jalan

**Di Next.js API route** (bukan Convex action), karena:
1. Vision extraction butuh render PDF ke gambar (Node.js native libs)
2. Existing text extraction udah di Next.js API (`/api/extract-file`)
3. Satu tempat, satu flow

**Trigger**: Setelah text extraction selesai, lanjut ke vision -> chunk -> embed. Satu API call, sequential.

### Error Handling

| Step gagal | Behavior |
|-----------|----------|
| Vision extraction fail | `embeddingStatus = "completed"` tetap lanjut. Cuma text chunks yang di-embed, vision di-skip |
| Chunking fail | `embeddingStatus = "failed"`. Fallback ke context stuffing |
| Embedding API fail | Retry 2x dengan backoff. Tetap gagal = `embeddingStatus = "failed"`, fallback ke context stuffing |
| Partial failure | Simpan yang berhasil, log warning. Retrieval jalan dengan chunks yang ada |

**Prinsip: graceful degradation.** Embedding itu enhancement. Kalau gagal, sistem jatuh ke behavior yang sekarang (context stuffing).

---

## 5. Retrieval & Hybrid Routing

### Decision Logic

```
User kirim pesan + attached files
    |
Fetch semua file metadata (existing)
    |
Cek embeddingStatus tiap file
    |
ROUTING DECISION:
    |
    +-- Semua file embeddingStatus === undefined (file lama)?
    |   -> Context stuffing (100% existing behavior)
    |
    +-- Ada file dengan embeddingStatus?
    |   -> Hitung total extractedText semua file
    |       |
    |       +-- < 10K tokens -> Context stuffing (teks masuk utuh)
    |       |
    |       +-- >= 10K tokens -> RAG retrieval
    |
    +-- File embeddingStatus === "failed"?
        -> Context stuffing untuk file itu (fallback)
```

### Kenapa 10K Tokens Sebagai Threshold

Riset LaRA (ICML 2025): "lost in the middle" mulai muncul di sekitar 10K tokens. Sweet spot cost vs quality. 10K ini total semua attached files, bukan per file.

### RAG Retrieval Flow

```typescript
// src/lib/embedding/retriever.ts
import { google } from '@ai-sdk/google';
import { embed } from 'ai';

async function retrieveRelevantChunks({
  query,
  conversationId,
  fileIds,
  topK = 8,
  convexOptions,
}: RetrieveParams): Promise<RetrievedChunk[]> {

  // 1. Embed user query
  const { embedding } = await embed({
    model: google.embedding('gemini-embedding-001'),
    value: query,
    providerOptions: {
      google: {
        taskType: 'RETRIEVAL_QUERY',
        outputDimensionality: 768,
      },
    },
  });

  // 2. Vector search di Convex (via fetchAction — server-side pattern)
  const results = await fetchAction(
    api.fileChunks.searchSimilar,
    { vector: embedding, conversationId, fileIds, limit: topK },
    convexOptions
  );

  return results;
}
```

### Convex Action untuk Vector Search

```typescript
// convex/fileChunks.ts
export const searchSimilar = action({
  args: {
    vector: v.array(v.float64()),
    conversationId: v.optional(v.id("conversations")),
    fileIds: v.optional(v.array(v.id("files"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const filter = args.conversationId
      ? (q: any) => q.eq("conversationId", args.conversationId)
      : undefined;

    const results = await ctx.vectorSearch("fileChunks", "by_embedding", {
      vector: args.vector,
      limit: args.limit ?? 8,
      ...(filter && { filter }),
    });

    const chunks = await Promise.all(
      results.map(async (r) => {
        const chunk = await ctx.runQuery(
          internal.fileChunks.getById, { id: r._id }
        );
        return { ...chunk, score: r._score };
      })
    );

    if (args.fileIds) {
      return chunks.filter(c => args.fileIds!.includes(c.fileId));
    }
    return chunks;
  },
});
```

### Context Injection Format

```
[Retrieved from: skripsi.pdf, halaman 12, relevance: 0.87]
Metodologi penelitian menggunakan pendekatan kualitatif dengan...

[Retrieved from: skripsi.pdf, halaman 15 (visual), relevance: 0.82]
Grafik batang menunjukkan distribusi responden: kelompok A (45%),
kelompok B (32%), kelompok C (23%). Axis X: kategori usia...

[Retrieved from: data-survey.xlsx, sheet: Hasil, relevance: 0.79]
| Variabel | Mean | SD | p-value |
| Motivasi | 3.82 | 0.45 | 0.003 |
```

Chunk `source: "vision"` ditandai `(visual)` supaya AI tahu itu deskripsi konten visual.

### Paper Mode: Truncation Problem Solved

| | Sekarang | Dengan RAG |
|---|---------|-----------|
| Paper mode limit | 6K char/file, 20K total | Nggak berlaku -- RAG retrieve max 8 chunks, always within budget |
| 5 files x 20 halaman | 4 file di-skip | Semua ter-embed, semua searchable |
| AI dapat konteks | Potongan awal file | Bagian yang relevan dengan stage/pertanyaan |

Paper mode truncation logic tetap ada tapi hanya berlaku di context stuffing path.

### Latency Budget

| Step | Estimasi | Catatan |
|------|----------|--------|
| Embed user query | ~200ms | Satu call, 768 dimensi |
| Vector search Convex | ~50ms | Native, optimized |
| Fetch chunk documents | ~100ms | Parallel fetch |
| **Total tambahan** | **~350ms** | Acceptable |

---

## 6. Upgrade Path & Future-proofing

### Embedding Model Swap

Ganti model = satu baris kode:

```typescript
// src/lib/embedding/embedder.ts
const EMBEDDING_MODEL = 'gemini-embedding-001';     // Fase 1
// const EMBEDDING_MODEL = 'gemini-embedding-2-preview'; // Fase 2
```

**Saat swap model:**
1. Ubah model ID di `embedder.ts`
2. Re-embed semua existing chunks (embedding space incompatible antar model)
3. Update `dimensions` di vector index kalau berubah

**Yang NGGAK perlu diubah:** Schema, retriever, routing, chat API integration.

### Re-embedding Migration

Estimasi: 10.000 chunks x 512 tokens = ~5M tokens = ~$0.75. Bisa di-batch via Gemini Batch API (50% off).

### Fase 2: Knowledge Base (Preview)

Knowledge base nanti reuse 90% arsitektur ini. Yang berubah hanya scope:

| Aspek | Fase 1 (Attachment) | Fase 2 (Knowledge Base) |
|-------|-------------------|------------------------|
| Scope embedding | Per conversation | Per user (lintas conversation) |
| Filter vector search | `conversationId` | `userId` + optional `collectionId` |
| Trigger embed | Saat upload di chat | Saat upload ke library |
| UI | Nggak ada (transparent) | Browse/search/manage library |
| Multimodal embed | Nggak (vision -> text -> embed) | Ya (embed PDF/gambar langsung via gemini-embedding-2) |

**Persiapan built-in di Fase 1:**
- `userId` field di `fileChunks` -- siap untuk cross-conversation search
- `filterFields` di vector index -- sudah include `userId`
- Embedder abstraction -- model-agnostic
- Chunker -- reusable as-is

### Fase 2: Multimodal Embedding (Preview)

Saat `gemini-embedding-2-preview` stable DAN Vercel AI SDK support multimodal `embed()`:

1. Swap model ke gemini-embedding-2
2. PDF: embed halaman langsung (binary) -> skip vision extraction
3. Gambar: embed langsung -> skip vision deskripsi
4. Vision extraction jadi optional fallback
5. Re-embed existing data

Vision extractor nggak dibuang -- tetap berguna sebagai fallback dan untuk human-readable deskripsi.

### Config & Admin Control

Fase 1: hardcoded constants. Admin config ditambah nanti saat ada kebutuhan tuning:

```typescript
// Potential fields di aiProviderConfigs (nanti, bukan sekarang)
embeddingModel: "gemini-embedding-001",
embeddingDimensions: 768,
ragThresholdTokens: 10000,
ragTopK: 8,
visionExtractionEnabled: true,
visionMaxPages: 6,
```

---

## 7. Cost Analysis & Risks

### Cost per Operation

**Ingestion (sekali per file upload):**

| Step | Model | Contoh: PDF 20 halaman |
|------|-------|----------------------|
| Text extraction | Local libs | $0 |
| Vision extraction | Gemini Flash | 6 halaman x ~1K tokens = ~$0.0006 |
| Embedding chunks | gemini-embedding-001 | 30 chunks x 512 tokens = ~$0.0023 |
| **Total per file** | | **~$0.003** |

**Retrieval (tiap chat turn dengan RAG):**

| Step | Model | Per message |
|------|-------|-------------|
| Embed user query | gemini-embedding-001 | ~$0.000008 |
| Vector search | Convex (built-in) | $0 |
| **Total** | | **< $0.00001** |

### Monthly Cost Projection

| Skenario | Files/bulan | Embedding cost | Vision cost | Total |
|----------|-----------|---------------|-------------|-------|
| 1 user casual | 5 | $0.01 | $0.003 | ~$0.01 |
| 1 user aktif | 30 | $0.07 | $0.02 | ~$0.09 |
| 100 users mixed | 500 | $1.15 | $0.30 | ~$1.50 |
| 1000 users | 5.000 | $11.50 | $3.00 | ~$15 |

Embedding itu <10% dari total AI cost.

### Billing Integration

Embedding masuk ke existing credit system. Nggak ada limit terpisah untuk embedding.

| Operation type | Multiplier | Alasan |
|---------------|-----------|--------|
| `file_embedding` | 0.3x | Jauh lebih murah dari chat, tapi tetap tracked |

Satu credit pool per tier. User yang upload banyak file = credit lebih cepat habis. User tentukan prioritasnya sendiri.

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Gemini embedding API down | Medium | Graceful degradation -> fallback ke context stuffing |
| Rate limit hit (100 RPM free tier) | Low | embedMany() batch. Satu file = 1 call |
| Vision extraction hallucinate | Medium | Output ditandai `source: "vision"`. Prompt di-tune untuk factual description |
| Re-embedding cost saat model swap | Low | 10K chunks = ~$1. Batch API 50% off |
| Convex vector search latency spike | Low | Native feature, SLA sama dengan DB queries |
| Chunking pecah konteks | Medium | 50 token overlap + sentence boundary. Tabel nggak dipecah |
| File lama tanpa embedding | None | `embeddingStatus === undefined` -> context stuffing. 100% backward compatible |

### Unknown Risks

1. **Gemini embedding quality untuk Bahasa Indonesia** -- Benchmark MTEB mostly English. Perlu test manual setelah implementasi
2. **pdf-to-img rendering quality** -- Beberapa PDF complex layout mungkin render jelek
3. **Vision extraction cost pada PDF banyak halaman** -- Cap 6 halaman, monitor setelah deploy

---

## Summary

| Aspek | Detail |
|-------|--------|
| **Model** | `gemini-embedding-001` (stable, text-only, 768d) |
| **Provider** | `@ai-sdk/google` (sudah terinstall) |
| **Storage** | Convex native vector search |
| **Threshold** | < 10K tokens = context stuff, >= 10K = RAG |
| **Vision** | Gemini Flash per halaman PDF (max 6 halaman) |
| **Fallback** | Selalu ke context stuffing kalau embedding gagal |
| **Billing** | 0.3x multiplier, same credit pool |
| **New deps** | `pdf-to-img` (PDF page rendering) |
| **Upgrade** | Swap ke `gemini-embedding-2-preview` saat stable |
