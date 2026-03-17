# RAG & Knowledge Base — Research Findings

> Dokumen ini merangkum hasil eksplorasi codebase dan keputusan arsitektur yang disepakati selama sesi riset awal.

## 1. Keadaan Sistem Saat Ini (Baseline)

### Yang Sudah Ada

| Komponen | Status | Detail |
|----------|--------|--------|
| File upload | Ada | PDF, DOCX, XLSX, PPTX, TXT, Images (10MB max) |
| Text extraction | Ada | `pdf-parse`, `mammoth`, `xlsx`, `pptx-extractor`, OCR via OpenRouter Vision (model configurable via admin) |
| `extractedText` storage | Ada | Disimpan di `files` table, `v.optional(v.string())` tanpa limit |
| File-to-conversation link | Ada | `files.conversationId` + `messages.fileIds[]` |
| Conversation attachment context | Ada | `conversationAttachmentContexts` table — tracks `activeFileIds` per conversation (PR #57) |
| Context injection | Ada | Extracted text diinject ke prompt (max 6KB/file, 20KB total di paper mode) |
| Full-text search | Tidak ada | Tidak ada `searchIndex` di schema |
| Vector search | Tidak ada | Tidak ada `vectorIndex` di schema |
| Embedding pipeline | Tidak ada | Tidak ada model embedding terkonfigurasi |
| Cross-conversation file access | Tidak ada | File terisolasi per conversation |

### File Upload & Extraction Flow (Existing)

```
User clicks upload in chat → FileUploadButton validates (type + 10MB)
  → generateUploadUrl() → POST blob to Convex storage
  → createFile() mutation (status: "uploading")
  → Fire-and-forget: POST /api/extract-file (SEMUA file types, termasuk images)
    → Download from Convex storage
    → Route to extractor (TXT/PDF/DOCX/XLSX/PPTX/Image)
    → updateExtractionResult() mutation
  → File attached to message via fileIds[]
```

### Supported File Types

| Type | Library | Output |
|------|---------|--------|
| TXT | Native `Blob.text()` | Plain text |
| PDF | `pdf-parse` | Multi-page concatenated text |
| DOCX | `mammoth` | Plain text preserving paragraphs |
| XLSX | `xlsx` (via xlsx-extractor) | Markdown-formatted tables (max 10 sheets, 1000 rows) |
| PPTX | `pptx-extractor` | Extracted text from slides |
| Images | OpenRouter Vision (model configurable via admin) | OCR text or description (Indonesian) |

### Database Schema — `files` Table

```typescript
files: defineTable({
  userId: v.id("users"),
  conversationId: v.optional(v.id("conversations")),
  messageId: v.optional(v.id("messages")),
  storageId: v.string(),
  name: v.string(),
  type: v.string(),          // MIME type
  size: v.number(),
  status: v.string(),        // "uploading" | "processing" | "ready" | "error"
  extractedText: v.optional(v.string()),
  extractionStatus: v.optional(v.string()),
  extractionError: v.optional(v.string()),
  processedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_user", ["userId", "createdAt"])
  .index("by_conversation", ["conversationId", "createdAt"])
  .index("by_message", ["messageId"])
  .index("by_extraction_status", ["extractionStatus"])
```

### File Context Injection (dalam chat route)

File diinject ke prompt sebagai:
```
[File: filename.pdf]
<extracted text>

[File: another.xlsx]
<markdown tables>
```

Limits (paper mode): 6,000 chars/file, 20,000 chars total. Truncate tanpa warning jika exceed.

Status handling:
- `pending` → "File sedang diproses, belum bisa dibaca oleh AI."
- `success` → Inject extracted text
- `failed` → "File gagal diproses: {error message}"

### Chat Architecture Summary

- **API Route**: `src/app/api/chat/route.ts` (2100+ lines)
- **Tools System**: 3 categories — Artifact tools, Paper tools, Web search (google_search)
- **Web Search Constraint**: `google_search` (provider-defined) CANNOT mix with function tools
- **Search Router**: Deterministic (paper mode) or LLM-based (normal mode)
- **Dual Provider**: Primary (Vercel AI Gateway → Gemini) + Fallback (OpenRouter)
- **Billing**: Pre-flight check + post-operation recording

## 2. Masalah yang Harus Diselesaikan

1. **File terisolasi per conversation** — user tidak bisa akses file dari conversation lain
2. **Tidak bisa search konten file** — hanya inject full text, tidak ada retrieval
3. **Tidak ada chunking** — text extraction flat, satu string besar per file
4. **Tidak ada cross-reference** — AI tidak bisa membandingkan konten dari multiple dokumen secara intelligent
5. **User tidak punya visibility** — tidak tahu file mana yang AI bisa akses

## 3. Keputusan Arsitektur (Disepakati)

### 3.0 Design Paradigm: Knowledge Base First

**Keputusan kunci:** Knowledge Base page dibangun DULUAN sebagai fondasi, bukan sebagai afterthought dashboard untuk RAG.

**Alasan paradigma ini:**
1. **File attachment feature baru di-merge** — user bisa upload file di chat, tapi TIDAK ada tempat untuk melihat semua file yang pernah diupload. KB langsung solve pain point ini.
2. **KB = wadah file attachment** — setiap file yang diupload user dari chat otomatis muncul di KB. KB menjadi pusat visibility cross-conversation.
3. **Feedback loop lebih cepat** — user langsung bisa lihat file mereka. Saat RAG ditambahkan, status indexing berubah real-time di UI yang sudah ada.
4. **RAG tanpa KB = invisible** — user gak tau file mana yang ter-index. KB duluan bikin setiap fase RAG langsung visible.
5. **Metadata gratis** — upload HANYA dari chat, jadi `conversationId`, `userId`, `createdAt` sudah ada. Tidak perlu bikin metadata sendiri.

**Layer architecture:**
```
Layer 1: Knowledge Base (file visibility + management)    ← DIBANGUN DULUAN
Layer 2: RAG Ingestion (chunking + embedding + indexing)  ← Di-layer di atas KB
Layer 3: RAG Retrieval (AI tool + paper mode integration) ← Di-layer di atas ingestion
```

### 3.1 Teknologi: `@convex-dev/rag` Component

**Dipilih** karena:
- Native Convex — tidak perlu external vector DB
- Built-in chunking + embedding + vector search
- Filter support (per user, per file, per conversation)
- Relevance scoring bawaan
- Replace/update tanpa duplikasi
- Minimal infrastructure change

**Ditolak:**
- Convex `searchIndex` (full-text) — keyword-based, tidak bisa handle sinonim/semantic matching. Fatal untuk konteks akademik.
- External vector DB (Pinecone, Weaviate) — over-engineering, tambah infra complexity

### 3.2 Embedding Model: `text-embedding-3-small` (OpenAI)

- Dimensi: 1536
- Harga: ~$0.02/1M tokens (negligible)
- Estimasi 100 files = ~$0.01

### 3.3 Knowledge Base — Sidebar Panel di Chat Workspace

**Lokasi:** Sidebar panel di chat workspace (activity bar icon baru), **BUKAN** halaman terpisah.

**Peran utama:** Wadah sentral untuk semua file yang pernah diupload user dari chat. Bukan sekedar RAG dashboard — ini adalah **file library** user yang terintegrasi langsung di area kerja.

**Kenapa sidebar, bukan halaman terpisah:**
1. Pattern activity bar + sidebar panel sudah established (`PanelType`: chat-history, paper, progress)
2. Zero navigation friction — user tidak perlu keluar dari `/chat/*`
3. Dekat dengan konteks kerja user — lagi ngobrol, langsung bisa lihat file
4. Konsisten dengan UX existing (semua panel di sidebar)

**Fungsi:**
- List semua file user (cross-conversation), dikelompokkan per conversation origin
- File type, size, upload date
- Status extraction: pending / success / failed
- Status RAG indexing: indexed / pending / failed / belum di-index (null)
- Toggle: "Aktifkan untuk AI" per file (kontrol apa yang AI bisa search)
- Text preview singkat (200 chars) saat file di-expand
- Stats ringkas di footer (total dokumen, jumlah indexed)

**BUKAN search UI** — ini library management.

**File preview asli (PDF viewer, image viewer)** — fase terpisah nanti. V1 = metadata + text preview + toggle.

**Upload HANYA dari chat** — metadata (`conversationId`, `userId`, `createdAt`) gratis dari flow existing. Tidak perlu bikin metadata sendiri.

### 3.4 RAG sebagai AI Tool di Chat (bukan fitur terpisah)

**Alasan:**
- Use case query-based, bukan browsing-based
- Reuse infrastruktur existing (streaming, tools, billing)
- Paper mode synergy — auto-search user docs di research stages
- KB sudah ada sebagai visibility layer — RAG cuma perlu AI tool

### 3.5 Search Trigger: Hybrid (Eksplisit + Auto Paper Mode)

- **Eksplisit**: User bilang "cari dari file gue tentang X" → AI tool `searchUserDocuments`
- **Auto (paper mode only)**: Di stage research-heavy (gagasan, topik, tinjauan_literatur), AI otomatis cek file user sebelum web search
- **Normal chat**: Tidak auto-search (noise terlalu tinggi untuk casual conversation)

## 4. Arsitektur yang Diusulkan

### Layer 1: Knowledge Base (File Visibility)

```
Chat sidebar panel "Knowledge Base" (NEW activity bar icon + panel)
  → useQuery: list all user files cross-conversation
  → Display: file list grouped by conversation origin, extraction status, RAG status
  → Actions: toggle "active for AI", expand for text preview
  → Real-time: Convex reactive queries — status updates live
  → No upload capability (upload only from chat)
```

Dibangun DULUAN. Bahkan sebelum RAG pipeline ada, KB sudah berfungsi sebagai file manager yang menampilkan semua file dari semua conversation.

### Layer 2: Ingestion Pipeline

```
File Upload (existing) → Extract Text (existing)
  → Trigger RAG Ingestion (NEW)
    → rag.add(ctx, {
        namespace: userId,
        key: fileId,
        text: extractedText,
        title: fileName,
        filters: { userId, fileId, conversationId }
      })
    → Auto-chunk + auto-embed + store in vector index
    → KB page reflects status change real-time
```

### Layer 3: Retrieval Pipeline

```
User Query (in chat) → AI calls searchUserDocuments tool (NEW)
  → rag.search(ctx, {
      namespace: userId,
      query: userQuery,
      limit: 10,
      vectorScoreThreshold: 0.5,
      filter: { userId }   // HANYA file milik user ini
    })
  → Return top-K chunks + source file metadata
  → Inject ke prompt sebagai context
  → AI generates response with file citations
```

### Integration Points

| Touchpoint | Perubahan |
|------------|-----------|
| `convex/convex.config.ts` | Tambah `rag` component |
| `convex/schema.ts` | Tambah field `ragEntryId`, `ragIndexStatus` di files table |
| `src/components/chat/shell/ActivityBar.tsx` | Tambah KB icon di activity bar |
| `src/components/chat/ChatSidebar.tsx` | Tambah `"knowledge-base"` case di switch |
| `src/components/chat/sidebar/SidebarKnowledgeBase.tsx` | Panel baru (dibangun duluan) |
| `convex/files.ts` | Tambah queries untuk KB sidebar |
| `src/components/chat/FileUploadButton.tsx` | Hapus image extraction guard (semua file di-extract) |
| `/api/extract-file/route.ts` | Trigger RAG ingestion via `scheduleRagIndex` mutation |
| `/api/chat/route.ts` | Tambah `searchUserDocuments` tool |
| `src/lib/ai/paper-tools.ts` | Opsional: integrate search ke paper workflow |
| `convex/billing/constants.ts` | Tambah operation type `rag_search` dengan multiplier |

## 5. Estimasi Biaya

| Item | Estimasi |
|------|----------|
| Embedding model | `text-embedding-3-small` (~$0.02/1M tokens) |
| Avg file | ~5,000 tokens |
| 100 files | ~500K tokens = ~$0.01 |
| Search query | ~100 tokens per query |
| **Total** | **Negligible** dibanding LLM costs |

## 6. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Embedding latency saat upload | Async via Convex action (fire-and-forget, sama seperti extraction) |
| Large documents (>1MB) | Chunking otomatis oleh RAG component |
| Data isolation per user | Filter `userId` di setiap search query — mandatory |
| Convex component limits | Monitor usage via admin panel |
| Paper mode context budget | Prioritize RAG results over full-text injection |
| Extraction belum selesai saat index | Queue: index hanya jika `extractionStatus === "success"` |

## 7. Implementasi Bertahap (KB-First, RAG-Independent)

Implementasi dibagi dua grup independen dengan HARD GATE di antaranya.

### GRUP A: Knowledge Base (zero `@convex-dev/rag` dependency)

| Fase | Scope |
|------|-------|
| **Fase 1** | Schema changes ONLY — tambah `v.optional()` fields, index baru. Tidak install RAG. |
| **Fase 2** | KB sidebar panel + image extraction guard removal + E2E test |

**✅ CHECKPOINT:** KB harus 100% fungsional dan tested sebelum lanjut ke Grup B. Tidak boleh ada import `@convex-dev/rag` di codebase pada titik ini.

### GRUP B: RAG Pipeline (hanya setelah KB stabil)

| Fase | Scope |
|------|-------|
| **Fase 3** | Install `@convex-dev/rag`, setup instance, env vars |
| **Fase 4** | RAG ingestion — mutations + ragIndexFile + wire ke extract-file + KB post-RAG UI |
| **Fase 5** | RAG retrieval — `searchUserDocuments` AI tool + paper mode integration |
| **Fase 6** | Backfill existing files + billing integration + admin monitoring |

**Kenapa KB terpisah dari RAG:**
- KB langsung solve pain point "file tidak visible cross-conversation" tanpa dependency apapun
- Schema fields (`ragIndexStatus`, `ragActive`, dll) hanya `v.optional()` — tidak butuh RAG library
- Saat RAG ditambahkan di Grup B, status perubahan langsung visible di KB yang sudah ada
- User punya mental model jelas: "ini perpustakaan gue, AI bisa akses ini"

## 8. Key Files Reference (Existing)

### Chat System
- `src/app/api/chat/route.ts` — Main chat API
- `src/components/chat/ChatContainer.tsx` — Layout orchestrator
- `src/components/chat/ChatWindow.tsx` — Message UI + useChat hook
- `src/lib/ai/streaming.ts` — Provider config + model helpers
- `src/lib/ai/paper-tools.ts` — Paper workflow tools factory

### File System
- `src/components/chat/FileUploadButton.tsx` — Upload UI
- `src/app/api/extract-file/route.ts` — Text extraction API
- `src/lib/file-extraction/` — Per-type extractors
- `convex/files.ts` — File CRUD mutations/queries

### Schema & Data
- `convex/schema.ts` — Full database schema
- `convex/messages.ts` — Message CRUD
- `convex/conversations.ts` — Conversation CRUD

### Billing
- `src/lib/billing/enforcement.ts` — Quota checks
- `convex/billing/constants.ts` — Tier limits + multipliers
