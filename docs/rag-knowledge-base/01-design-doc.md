# RAG & Knowledge Base — Technical Design Document

> Version: 1.3
> Status: Draft
> Date: 2026-03-02

## 1. Overview

### 1.1 Tujuan

Membangun **Knowledge Base** sebagai pusat visibility file user, lalu me-layer **RAG (Retrieval-Augmented Generation)** di atasnya agar AI bisa:
- **Search dari file yang pernah diupload user** (cross-conversation)
- **Cross-reference antar dokumen** (membandingkan/menggabungkan informasi dari multiple files)

### 1.2 Design Paradigm: Knowledge Base First

Knowledge Base **BUKAN** afterthought dashboard untuk RAG. KB adalah **fondasi** — wadah sentral untuk semua file attachment yang diupload user dari chat. RAG adalah layer intelligence yang ditambahkan di atas fondasi ini.

```
┌─────────────────────────────────────────────────┐
│  Layer 3: RAG Retrieval                         │
│  AI tool searchUserDocuments + paper mode        │
├─────────────────────────────────────────────────┤
│  Layer 2: RAG Ingestion                         │
│  Auto-chunk + embed + index setelah extraction  │
├─────────────────────────────────────────────────┤
│  Layer 1: Knowledge Base (FONDASI)              │  ← Dibangun DULUAN
│  File visibility + management + toggle kontrol  │
├─────────────────────────────────────────────────┤
│  Layer 0: Existing File Upload + Extraction     │
│  Chat upload → Convex storage → text extraction │
└─────────────────────────────────────────────────┘
```

**Alasan KB dibangun duluan:**
1. File attachment feature baru di-merge — user butuh visibility sekarang
2. KB tanpa RAG sudah berguna (file manager cross-conversation)
3. RAG tanpa KB tidak visible (user gak tau file mana yang ter-index)
4. Saat RAG ditambahkan, status changes langsung muncul di UI yang sudah ada

### 1.3 Scope

| In Scope | Out of Scope |
|----------|-------------|
| **Knowledge Base sidebar panel** (file visibility + management di chat workspace) | Upload file dari KB (hanya dari chat) |
| RAG ingestion pipeline (auto-index setelah extraction) | Full-text keyword search (hanya vector search) |
| `searchUserDocuments` AI tool di chat | File preview/viewer UI (PDF.js, image viewer — fase terpisah) |
| Per-file toggle "Aktif untuk AI" | Shared/collaborative knowledge bases |
| Paper mode auto-search integration | External document sources (URL scraping) |
| Image OCR extraction untuk RAG (hapus client-side guard) | Admin-level RAG management |
| Backfill existing extracted files | Halaman terpisah `/dashboard/knowledge-base` |
| Billing integration (`rag_search` operation type) | |

### 1.4 Prasyarat

- `@ai-sdk/openai` sudah terinstall (v2.0.86) — dibutuhkan untuk embedding model
- Convex component system sudah dipakai (`@convex-dev/better-auth` di `convex.config.ts`)
- File extraction pipeline sudah production-ready (TXT, PDF, DOCX, XLSX, PPTX, Images)
- File attachment feature sudah di-merge ke main (termasuk `conversationAttachmentContexts` table)
- Activity bar + sidebar panel pattern sudah established di chat workspace (`PanelType`)

---

## 2. Technical Architecture

### 2.1 Component: `@convex-dev/rag`

```
npm install @convex-dev/rag
```

**Registration** di `convex/convex.config.ts`:
```typescript
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import rag from "@convex-dev/rag/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(rag);

export default app;
```

### 2.2 RAG Instance

**File baru:** `convex/rag.ts`

```typescript
import { RAG } from "@convex-dev/rag";
import { components } from "./_generated/api";
import { openai } from "@ai-sdk/openai";

type RAGFilters = {
  userId: string;
  fileId: string;
  conversationId: string;
  userAndActive: { userId: string; active: boolean };
};

export const rag = new RAG<RAGFilters>(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
  filterNames: ["userId", "fileId", "conversationId", "userAndActive"],
});
```

> ⚠️ API shape (`rag.add`, `rag.search`, `rag.delete`, filterValues format)
> berdasarkan dokumentasi publik `@convex-dev/rag`. Harus diverifikasi
> terhadap versi aktual saat install di Task 1.1. Adjust kode jika API berbeda.

**Penjelasan filter design:**
- `userId` — isolasi data per user (mandatory di setiap search)
- `fileId` — lookup/delete spesifik per file
- `conversationId` — opsional: search dalam scope conversation tertentu
- `userAndActive` — compound filter: cari file user yang toggle "active" = true

### 2.3 Schema Changes

**`convex/schema.ts`** — tambah field di `files` table:

```typescript
files: defineTable({
  // ... existing fields ...

  // RAG indexing fields (NEW)
  ragEntryId: v.optional(v.string()),       // RAG component entry ID
  ragIndexStatus: v.optional(v.string()),   // "pending" | "indexed" | "failed" | "removed"
  ragIndexError: v.optional(v.string()),    // Error message jika indexing gagal
  ragIndexedAt: v.optional(v.number()),     // Timestamp saat berhasil di-index
  ragActive: v.optional(v.boolean()),       // Toggle: aktif untuk AI search (default: true)
})
  // ... existing indexes ...
  .index("by_rag_status", ["userId", "ragIndexStatus"])
  .index("by_rag_active", ["userId", "ragActive"])
```

**Field semantics:**
| Field | Type | Default | Keterangan |
|-------|------|---------|------------|
| `ragEntryId` | string? | undefined | ID dari RAG component, untuk delete/update |
| `ragIndexStatus` | string? | undefined | Status indexing: pending → indexed / failed |
| `ragIndexError` | string? | undefined | Error message jika indexing gagal |
| `ragIndexedAt` | number? | undefined | Timestamp indexing berhasil |
| `ragActive` | boolean? | undefined | User toggle, `undefined` = true (default active) |

**Backward compatible:** Semua field optional, existing files tetap valid tanpa migration.

---

## 3. Ingestion Pipeline

### 3.1 Flow

```
                    EXISTING                              NEW
┌──────────────────────────────┐  ┌─────────────────────────────────────┐
│ FileUploadButton → upload    │  │                                     │
│   (SEMUA file types,         │  │                                     │
│    termasuk images — guard   │  │                                     │
│    dihapus)                  │  │                                     │
│   → createFile() mutation    │  │                                     │
│   → POST /api/extract-file   │  │                                     │
│     → extract text           │  │                                     │
│     → updateExtractionResult │──┼──→ fetchMutation(scheduleRagIndex)  │
│       (extractionStatus:     │  │     → ctx.scheduler.runAfter(0,     │
│        "success")            │  │         internal.ragActions          │
│                              │  │           .ragIndexFile, { fileId }) │
│                              │  │       → rag.add(ctx, {              │
│                              │  │           namespace: userId,         │
│                              │  │           key: fileId,               │
│                              │  │           text: extractedText,       │
│                              │  │           title: fileName,           │
│                              │  │           filterValues: [...]        │
│                              │  │         })                           │
│                              │  │       → patch file: ragEntryId,      │
│                              │  │         ragIndexStatus: "indexed"    │
└──────────────────────────────┘  └─────────────────────────────────────┘
```

**Catatan image files:** Client-side guard (`if (!file.type.startsWith("image/"))`) di `FileUploadButton.tsx` **dihapus**. Semua file types termasuk images sekarang trigger extraction. Images → OCR via OpenRouter Vision → extractedText → RAG index.

### 3.2 Trigger Point

Di `src/app/api/extract-file/route.ts`, **setelah** `updateExtractionResult` dengan `extractionStatus: "success"`:

```typescript
// After successful extraction...
await fetchMutation(api.files.updateExtractionResult, {
  fileId, extractedText, extractionStatus: "success", ...
}, convexOptions)

// NEW: Trigger RAG indexing via direct mutation (schedules async action)
try {
  await fetchMutation(api.ragActions.scheduleRagIndex, {
    fileId: fileId as Id<"files">,
  }, convexOptions)
} catch (err) {
  console.error("[RAG Index] Schedule failed:", err)
  // Non-blocking — extraction success is primary, RAG indexing can retry via backfill
}
```

**Kenapa direct mutation (bukan HTTP route `/api/rag-index`):**
- Auth token (`convexOptions`) sudah ada di extract-file route
- Pattern `ctx.scheduler.runAfter` sudah proven di codebase (`waitlist.ts`)
- Satu less API route = less attack surface, less code
- `scheduleRagIndex` cuma schedule internal action — fire-and-forget by design
- Jika gagal, `ragIndexStatus` tetap `undefined` (bisa dideteksi untuk retry via backfill)

### 3.3 Convex Functions: `scheduleRagIndex` + `ragIndexFile`

**File baru:** `convex/ragActions.ts`

**`scheduleRagIndex`** (public mutation — called from Next.js via `fetchMutation`):

```typescript
export const scheduleRagIndex = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    await ctx.scheduler.runAfter(0, internal.ragActions.ragIndexFile, { fileId })
  },
})
```

**`ragIndexFile`** (internal action — scheduled, never called directly from client):

```typescript
export const ragIndexFile = internalAction({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, { fileId }) => {
    // 1. Fetch file record
    const file = await ctx.runQuery(internal.files.getFileInternal, { fileId })
    if (!file || !file.extractedText) throw new Error("File not found or no text")

    // 2. Guard: already indexed → replace (key-based dedup)
    // rag.add with same key auto-replaces

    // 3. Index into RAG
    const { entryId, status, replacedEntry } = await rag.add(ctx, {
      namespace: file.userId,  // User-level isolation
      key: String(fileId),     // Dedup key
      text: file.extractedText,
      title: file.name,
      filterValues: [
        { name: "userId", value: String(file.userId) },
        { name: "fileId", value: String(fileId) },
        { name: "conversationId", value: String(file.conversationId ?? "none") },
        { name: "userAndActive", value: { userId: String(file.userId), active: true } },
      ],
    })

    // 4. Clean up replaced entry jika ada
    if (replacedEntry) {
      await rag.delete(ctx, { entryId: replacedEntry.entryId })
    }

    // 5. Update file record
    await ctx.runMutation(internal.files.updateRagStatus, {
      fileId,
      ragEntryId: String(entryId),
      ragIndexStatus: "indexed",
      ragIndexedAt: Date.now(),
    })

    return { entryId, status }
  },
})
```

### 3.4 Backfill Existing Files

**File baru:** `convex/migrations/backfillRagIndex.ts`

```typescript
// One-time migration: index all files with extractedText but no ragEntryId
export const backfillRagIndex = action({
  handler: async (ctx) => {
    const files = await ctx.runQuery(internal.files.getUnindexedFiles)

    let indexed = 0, failed = 0
    for (const file of files) {
      try {
        await ctx.runAction(internal.ragActions.ragIndexFile, { fileId: file._id })
        indexed++
      } catch (err) {
        console.error(`[Backfill] Failed for ${file._id}:`, err)
        failed++
      }
    }

    return { total: files.length, indexed, failed }
  },
})
```

Query helper:
```typescript
// convex/files.ts (internal)
export const getUnindexedFiles = internalQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("files")
      .filter((q) =>
        q.and(
          q.eq(q.field("extractionStatus"), "success"),
          q.eq(q.field("ragIndexStatus"), undefined)
        )
      )
      .collect()
  },
})
```

---

## 4. Retrieval Pipeline

### 4.1 AI Tool: `searchUserDocuments`

**Lokasi:** Didefinisikan di `src/app/api/chat/route.ts` sebagai function tool.

```typescript
searchUserDocuments: tool({
  description: `Cari informasi dari dokumen-dokumen yang pernah diupload user.
Gunakan tool ini ketika:
- User meminta untuk mencari dari file/dokumen mereka
- User ingin cross-reference antar dokumen
- Butuh informasi spesifik dari dokumen yang sudah diupload
- Paper mode: mencari referensi dari koleksi dokumen user

JANGAN gunakan jika user hanya menanyakan hal umum yang tidak terkait dokumen mereka.`,
  parameters: z.object({
    query: z.string().describe("Query pencarian dalam bahasa Indonesia atau Inggris"),
    conversationId: z.string().optional().describe("Filter ke conversation tertentu (opsional)"),
    limit: z.number().optional().default(5).describe("Jumlah hasil maksimal (default: 5)"),
  }),
  execute: async ({ query, conversationId, limit }) => {
    // Call Convex action untuk search
    const results = await fetchAction(api.ragActions.searchDocuments, {
      userId: String(userId),
      query,
      conversationId: conversationId ?? undefined,
      limit: limit ?? 5,
    }, convexOptions)

    return results
  },
})
```

### 4.2 Convex Action: `searchDocuments`

**File:** `convex/ragActions.ts`

```typescript
export const searchDocuments = action({
  args: {
    userId: v.string(),
    query: v.string(),
    conversationId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, query, conversationId, limit }) => {
    const searchLimit = Math.min(limit ?? 5, 10)

    // Build filters — ALWAYS filter by userId + active
    const filters = [
      { name: "userAndActive" as const, value: { userId, active: true } },
    ]

    // Optional: scope ke conversation tertentu
    if (conversationId) {
      filters.push(
        { name: "conversationId" as const, value: conversationId }
      )
    }

    // Execute vector search
    const { results, text, entries, usage } = await rag.search(ctx, {
      namespace: userId,
      query,
      limit: searchLimit,
      vectorScoreThreshold: 0.4, // Slightly lower threshold for Indonesian text
      filters,
    })

    // Enrich results with file metadata
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        // Extract fileId from the entry's filter values or key
        const entry = entries.find(e => e.entryId === result.entryId)
        const fileId = entry?.key // key = fileId string

        let fileInfo = null
        if (fileId) {
          fileInfo = await ctx.runQuery(internal.files.getFileMetadata, {
            fileId: fileId as any,
          })
        }

        return {
          text: result.text,
          score: result.score,
          chunkIndex: result.chunkIndex,
          fileName: fileInfo?.name ?? "Unknown",
          fileType: fileInfo?.type ?? "Unknown",
          conversationId: fileInfo?.conversationId ?? null,
          conversationTitle: null, // TODO: lookup if needed
        }
      })
    )

    return {
      results: enrichedResults,
      totalChunksFound: results.length,
      embeddingTokensUsed: usage?.tokens ?? 0,
    }
  },
})
```

### 4.3 Tool Response Format (ke AI)

AI menerima hasil dalam format:

```json
{
  "results": [
    {
      "text": "...chunk dari dokumen...",
      "score": 0.87,
      "chunkIndex": 3,
      "fileName": "skripsi-bab2.pdf",
      "fileType": "application/pdf",
      "conversationId": "conv123"
    },
    {
      "text": "...chunk lain...",
      "score": 0.72,
      "fileName": "data-survey.xlsx",
      "fileType": "application/vnd.openxmlformats...",
      "conversationId": "conv456"
    }
  ],
  "totalChunksFound": 2,
  "embeddingTokensUsed": 47
}
```

AI kemudian synthesize jawaban berdasarkan chunks ini, menyebutkan sumber file.

### 4.4 Tool Placement (Web Search Constraint)

`searchUserDocuments` adalah **function tool** (bukan provider-defined tool), jadi:
- **Bisa** dipakai bersamaan dengan artifact tools dan paper tools
- **Tidak bisa** dipakai bersamaan dengan `google_search` (web search mode)

Ini OK karena:
- Jika user minta search file → mode function tools
- Jika AI butuh web search → mode web search (tanpa file search)
- Dua mode sudah saling eksklusif di router existing

### 4.5 Paper Mode Integration

Di `src/app/api/chat/route.ts`, pada bagian search decision logic untuk **active research stages** (gagasan, topik, tinjauan_literatur):

```
SEBELUM web search decision:
1. Cek apakah user punya indexed files (ragActive files count > 0)
2. Jika ada → inject system note:
   "User memiliki {N} dokumen di Knowledge Base.
    Pertimbangkan untuk menggunakan searchUserDocuments
    sebelum web search untuk mencari referensi dari
    koleksi dokumen yang sudah ada."
3. AI decide: pakai file search, web search, atau keduanya secara sequential
```

**Tidak otomatis trigger** — hanya inject system note agar AI aware. AI yang decide apakah perlu search user docs.

---

## 5. Knowledge Base Sidebar Panel (FONDASI — Dibangun Duluan)

KB sidebar panel adalah **Layer 1** dari arsitektur ini. Dibangun sebelum RAG ingestion/retrieval agar user punya visibility file mereka sejak awal. Saat awal launch, KB menampilkan semua file dengan status extraction. Saat RAG ditambahkan di fase berikutnya, status indexing muncul otomatis di UI yang sudah ada.

**Dua mode KB:**
- **Pre-RAG** (setelah Fase 2): Menampilkan file + extraction status. Toggle dan RAG status belum aktif (semua null).
- **Post-RAG** (setelah Fase 3): Menampilkan file + extraction status + RAG indexing status. Toggle aktif.

### 5.1 Lokasi: Chat Sidebar Panel

KB adalah **sidebar panel** di chat workspace, bukan halaman terpisah.

**Arsitektur existing yang di-extend:**
- `PanelType` di `ActivityBar.tsx`: `"chat-history" | "paper" | "progress"` → tambah `"knowledge-base"`
- `ChatSidebar.tsx` switch case: tambah `case "knowledge-base": return <SidebarKnowledgeBase />`
- `ChatLayout.tsx`: tidak perlu diubah (sudah generic untuk jumlah panel apapun)

**Files:**
- `src/components/chat/shell/ActivityBar.tsx` (modify — tambah icon)
- `src/components/chat/ChatSidebar.tsx` (modify — tambah case)
- `src/components/chat/sidebar/SidebarKnowledgeBase.tsx` (new — panel utama)

**Auth:** Sudah protected via `proxy.ts` — semua route `/chat/*` butuh `ba_session` cookie.

### 5.2 Data Requirements

**Query:** `getUserKnowledgeBase`

```typescript
// convex/files.ts
export const getUserKnowledgeBase = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx)

    // Get ALL user files (not just extracted — show full picture)
    const files = await ctx.db
      .query("files")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .order("desc")
      .collect()

    // Enrich with conversation titles
    const enriched = await Promise.all(
      files.map(async (file) => {
        let conversationTitle = null
        if (file.conversationId) {
          const conv = await ctx.db.get(file.conversationId)
          conversationTitle = conv?.title ?? null
        }

        return {
          _id: file._id,
          name: file.name,
          type: file.type,
          size: file.size,
          createdAt: file.createdAt,
          // Extraction status (existing)
          extractionStatus: file.extractionStatus ?? null,
          extractionError: file.extractionError ?? null,
          // RAG status (null until RAG pipeline is active)
          ragIndexStatus: file.ragIndexStatus ?? null,
          ragActive: file.ragActive !== false, // default: true
          ragIndexedAt: file.ragIndexedAt ?? null,
          // Conversation origin
          conversationId: file.conversationId ?? null,
          conversationTitle,
        }
      })
    )

    return enriched
  },
})
```

**Mutation:** `toggleRagActive`

```typescript
export const toggleRagActive = mutation({
  args: {
    fileId: v.id("files"),
    active: v.boolean(),
  },
  handler: async (ctx, { fileId, active }) => {
    await requireFileOwner(ctx, fileId)

    await ctx.db.patch(fileId, { ragActive: active })

    // Note: RAG filter update happens lazily on next search
    // karena filter check ada di search time, bukan index time.
    // Tapi untuk consistency, kita perlu update filter di RAG juga.
    // Ini dilakukan via scheduled action.
  },
})
```

### 5.3 UI Design — Sidebar Panel

Mengikuti **Mechanical Grace Design System** dan pattern existing sidebar panels (SidebarPaperSessions).

**Layout** (280px sidebar, mirip Sesi Paper):

```
┌─ Sidebar (280px) ─────────────────────────────┐
│                                                 │
│  Knowledge Base                                 │
│  Dokumen Tersimpan                              │
│                                                 │
│  ▼ 📁 Bab 1 Pendahuluan... (2 files)          │
│     📄 skripsi-draft.pdf        ✅ [ON]        │
│        PDF · 2.4 MB · 27 Feb                   │
│     📄 referensi-jones.pdf      ✅ [ON]        │
│        PDF · 1.1 MB · 25 Feb                   │
│                                                 │
│  ▶ 📁 Analisis Data... (1 file)               │
│                                                 │
│  ▶ 📁 Bab 3 Metodologi... (1 file)            │
│     📷 gambar-diagram.png       ❌              │
│        PNG · 3.2 MB · 24 Feb                   │
│        Error: OCR gagal                         │
│                                                 │
│  ─────────────────────────────────              │
│  12 dokumen · 10 indexed                        │
│                                                 │
│  Upload file melalui percakapan                 │
│  chat untuk menambahkan ke KB.                  │
│                                                 │
│  ┌────────────────────────┐                     │
│  │ UNLIMITED · Unlimited  │                     │
│  └────────────────────────┘                     │
└─────────────────────────────────────────────────┘
```

**Grouping:** Files dikelompokkan per conversation origin (collapsible folders, mirip Paper Sessions). Files tanpa conversation → group "Tanpa Percakapan".

**File item (collapsed):** Nama file + status badge + toggle switch (1 baris)
**File item (expanded):** + type · size · date + text preview (200 chars) + error message (if any)

**Pre-RAG state** (Fase 2, sebelum RAG pipeline active):
- Status badge: Extracted / Extracting / Failed (extraction-level)
- Toggle switch: hidden (tidak ditampilkan — semua ragIndexStatus null)
- Stats footer: "12 dokumen · 8 extracted"

**Post-RAG state** (Fase 3+, dengan RAG indexing active):
- Status badge: Indexed / Indexing / Failed (RAG-level)
- Toggle switch: visible, disabled jika not indexed
- Stats footer: "12 dokumen · 10 indexed"

**Detect mode otomatis:** Jika ada file dengan `ragIndexStatus !== null` → post-RAG mode.

**Design system compliance:**
- Header: Geist Sans bold (mirip "Sesi Paper")
- Subtitle: Geist Mono, muted (mirip "Folder Artifak")
- Folder items: collapsible, same expand/collapse pattern as Paper Sessions
- Status badges: `rounded-badge` (6px) + `text-signal` (Mono, uppercase, tracking-widest)
- Toggle: Switch component dari shadcn/ui (compact size untuk sidebar)
- Numbers (size, date): Geist Mono
- Icons: Iconoir (Book/Archive untuk activity bar, Page/Document untuk files)
- Border: `border-hairline` (0.5px) between items
- Status colors: Indexed = `--success` (Teal), Pending = `--info` (Sky), Failed = `--destructive` (Rose), Nonaktif = Slate-400
- Scrollable content area dengan `.scrollbar-thin`
- CreditMeter footer (shared across all panels — already exists)

---

## 6. Billing Integration

### 6.1 Operation Type Baru

**`convex/billing/constants.ts`:**

```typescript
export const OPERATION_COST_MULTIPLIERS = {
  chat_message: 1.0,
  paper_generation: 1.5,
  web_search: 2.0,
  refrasa: 0.8,
  rag_search: 0.5,   // NEW — cheaper than chat because it's retrieval-only
} as const
```

**Justifikasi multiplier 0.5x:**
- RAG search hanya embedding query (~100 tokens) + retrieval
- Tidak ada LLM generation cost di search step itu sendiri
- LLM generation cost sudah tercatat di `chat_message` atau `paper_generation`
- Jadi RAG search sebagai "add-on" yang murah

### 6.2 Quota Check

RAG search **tidak perlu separate pre-flight check**. Alasannya:
- `searchUserDocuments` dipanggil sebagai tool DALAM chat turn
- Chat turn sudah punya pre-flight check (`chat_message` atau `paper_generation`)
- Token usage dari embedding query ditambahkan ke total turn usage

Yang berubah: di `recordUsageAfterOperation()`, jika turn menggunakan RAG search, tambahkan embedding tokens ke total.

### 6.3 RAG Indexing Cost

Indexing (saat file diupload) **GRATIS, tidak dihitung ke quota user**:
- Embedding cost ditanggung sistem (~$0.01 per 100 files)
- User tidak boleh dicharge untuk "menyimpan" file mereka
- Ini mendorong adoption — user upload tanpa khawatir quota

---

## 7. Security & Data Isolation

### 7.1 Mandatory Filters

**SETIAP** search query HARUS include `userId` filter. Tidak ada escape hatch.

```typescript
// Di searchDocuments action:
const filters = [
  { name: "userAndActive" as const, value: { userId, active: true } },
]
```

### 7.2 Namespace Isolation

RAG namespace = `userId`. Setiap user punya namespace terpisah. Bahkan tanpa filter, satu user tidak bisa access namespace user lain.

### 7.3 Auth Chain

```
Client → /api/chat → BetterAuth session check → Convex token
  → searchDocuments action → userId from auth context (bukan dari client)
```

`userId` **TIDAK** diambil dari request body. Selalu dari authenticated session.

### 7.4 Toggle Enforcement

`ragActive === false` → file TIDAK muncul di search results. Enforced via:
1. **Filter level**: `userAndActive` compound filter saat search
2. **Query level**: `toggleRagActive` mutation updates field
3. **UI level**: Toggle switch disabled jika `ragIndexStatus !== "indexed"`

---

## 8. Error Handling & Edge Cases

### 8.1 Indexing Failures

| Scenario | Handling |
|----------|----------|
| Embedding API down | `ragIndexStatus: "failed"`, `ragIndexError` set. Retry via backfill. |
| Text terlalu pendek (<10 chars) | Skip indexing, set `ragIndexStatus: "skipped"` |
| Text terlalu besar (>500KB) | Chunking otomatis oleh RAG component |
| File extraction gagal | RAG indexing tidak triggered (guard: `extractionStatus === "success"`) |
| Duplicate index | `key: fileId` ensures dedup. Re-index = replace. |

### 8.2 Search Edge Cases

| Scenario | Handling |
|----------|----------|
| User punya 0 indexed files | Tool returns `{ results: [], totalChunksFound: 0 }`. AI responds accordingly. |
| Query terlalu vague | Low relevance scores (< threshold), fewer/no results |
| All files toggled off | `userAndActive` filter returns empty. Same as 0 files. |
| Mixed languages (ID + EN) | `text-embedding-3-small` handles multilingual natively |

### 8.3 Race Conditions

| Scenario | Handling |
|----------|----------|
| Search during indexing | File not yet searchable — OK, eventually consistent |
| Toggle off during search | Current search may still include file — OK, next search won't |
| Delete conversation with files | Files still exist in `files` table + RAG index. Knowledge Base shows them. |

---

## 9. Monitoring & Admin

### 9.1 Admin Panel Extensions

Di existing admin panel (`/dashboard`), tambah tab atau section:

**RAG Health:**
- Total indexed files (across all users)
- Files pending indexing
- Failed indexings (with error messages)
- Embedding token usage (last 24h, last 7d)

### 9.2 System Alerts

Reuse existing `systemAlerts` table:

| Alert Type | Severity | Trigger |
|------------|----------|---------|
| `rag_index_failed` | warning | File indexing gagal setelah retry |
| `rag_embedding_api_error` | critical | Embedding API unreachable |
| `rag_backfill_complete` | info | Backfill migration selesai |

---

## 10. Environment Variables

**Baru:**
```
OPENAI_API_KEY=sk-...   # Untuk text-embedding-3-small
```

**Catatan:** `@ai-sdk/openai` sudah terinstall. Key ini HANYA untuk embeddings, terpisah dari LLM keys (Gateway/OpenRouter). Bisa juga reuse key yang sama jika sudah ada.

Harus di-set di:
- `.env.local` (development)
- Convex environment variables (untuk actions yang run di Convex runtime)

> ⚠️ `@ai-sdk/openai` embedding call dijalankan dari Convex action.
> Perlu verifikasi bahwa library ini compatible dengan Convex runtime.
> Jika tidak, fallback: pindahkan embedding call ke Next.js API route
> dan pass hasilnya ke Convex via mutation.

---

## 11. Dependencies

### NPM Packages

| Package | Purpose | Status |
|---------|---------|--------|
| `@convex-dev/rag` | RAG component | **NEW — harus install** |
| `@ai-sdk/openai` | Embedding model provider | Sudah ada (v2.0.86) |

### Convex Components

| Component | Registration |
|-----------|-------------|
| `@convex-dev/better-auth` | Existing |
| `@convex-dev/rag` | **NEW** |

---

## 12. File Inventory (New & Modified)

> Fase numbering mengikuti `02-implementation-tasks.md` v1.3 (GRUP A: Fase 1-2, GRUP B: Fase 3-6).

### New Files (ordered by implementation phase)

| File | Purpose | Fase (Grup) |
|------|---------|-------------|
| `src/components/chat/sidebar/SidebarKnowledgeBase.tsx` | KB sidebar panel | 2 (A) |
| `convex/rag.ts` | RAG instance definition + filters | 3 (B) |
| `convex/ragActions.ts` | Ingestion + search Convex actions | 4 (B) |
| `convex/migrations/backfillRagIndex.ts` | One-time backfill migration | 6 (B) |

### Modified Files

| File | Change | Fase (Grup) |
|------|--------|-------------|
| `convex/schema.ts` | Add RAG fields to `files` table (v.optional — no RAG dep) | 1 (A) |
| `convex/files.ts` | Add `getUserKnowledgeBase`, `toggleRagActive`, `updateRagStatus`, `getUnindexedFiles` | 1-2 (A) |
| `src/components/chat/shell/ActivityBar.tsx` | Add KB icon + `"knowledge-base"` to `PanelType` | 2 (A) |
| `src/components/chat/ChatSidebar.tsx` | Add `"knowledge-base"` case in switch | 2 (A) |
| `src/components/chat/FileUploadButton.tsx` | Remove image extraction guard (all files trigger extraction) | 2 (A) |
| `convex/convex.config.ts` | Add `app.use(rag)` | 3 (B) |
| `src/app/api/extract-file/route.ts` | Add `scheduleRagIndex` mutation call after extraction success | 4 (B) |
| `src/app/api/chat/route.ts` | Add `searchUserDocuments` tool + paper mode system note | 5 (B) |
| `convex/billing/constants.ts` | Add `rag_search` multiplier | 6 (B) |
