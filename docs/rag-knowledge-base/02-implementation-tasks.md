# RAG & Knowledge Base — Implementation Tasks Plan

> Version: 1.3 — KB-First, RAG-Independent
> Dokumen ini adalah panduan implementasi step-by-step.
> Setiap task memiliki acceptance criteria yang harus dipenuhi sebelum lanjut ke task berikutnya.
> Reference: `01-design-doc.md` untuk spesifikasi teknis detail.

---

## Implementation Order Rationale

**Prinsip utama:** Knowledge Base HARUS bisa hidup, berfungsi, dan di-test secara lengkap **TANPA** dependency ke `@convex-dev/rag`. File attachment yang sudah jalan harus punya wadah dulu.

KB dan RAG di-decouple menjadi dua grup independen:

```
╔══════════════════════════════════════════════════════════════╗
║  GRUP A: KNOWLEDGE BASE (nol dependency ke @convex-dev/rag) ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Fase 1: Schema (tambah RAG fields ke files table)           ║
║    ↓                                                         ║
║  Fase 2: KB Sidebar Panel + Image Extraction                 ║
║    ↓                                                         ║
║  ✅ CHECKPOINT: KB fully functional, bisa di-ship            ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  GRUP B: RAG PIPELINE (baru mulai setelah KB stabil)         ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Fase 3: RAG Setup (install component + instance + env)      ║
║    ↓                                                         ║
║  Fase 4: RAG Ingestion (extract → index, KB reflects live)   ║
║    ↓                                                         ║
║  Fase 5: RAG Retrieval (AI tool + paper mode)                ║
║    ↓                                                         ║
║  Fase 6: Backfill + Billing                                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

**Kenapa decouple ini penting:**
1. KB cuma butuh schema fields (`v.optional`) — tidak butuh library apapun
2. Kalau `@convex-dev/rag` ternyata incompatible atau API berubah, KB tetap jalan
3. KB bisa di-ship, di-test, dan di-pakai user sementara RAG dikerjakan
4. File attachment yang sudah jalan langsung punya wadah visible

---

## ═══ GRUP A: KNOWLEDGE BASE ═══

## Fase 1: Schema Preparation

> Fase ini HANYA menambah optional fields ke schema. Tidak install library apapun. Tidak ada dependency eksternal. Cepat dan aman.

### Task 1.1: Schema Changes — Files Table

**Files:**
- `convex/schema.ts` (modify)

**Steps:**
1. Tambah field ke `files` table:
   - `ragEntryId: v.optional(v.string())`
   - `ragIndexStatus: v.optional(v.string())`
   - `ragIndexError: v.optional(v.string())`
   - `ragIndexedAt: v.optional(v.number())`
   - `ragActive: v.optional(v.boolean())`
2. Tambah indexes:
   - `.index("by_rag_status", ["userId", "ragIndexStatus"])`
   - `.index("by_rag_active", ["userId", "ragActive"])`
3. Verify: `npx convex dev` deploys schema tanpa error

**Acceptance Criteria:**
- [ ] Schema valid, Convex dev sync success
- [ ] New fields optional (backward compatible, no migration needed)
- [ ] Existing file records unaffected
- [ ] New indexes visible di Convex dashboard
- [ ] **TIDAK ada dependency ke `@convex-dev/rag`** — murni schema changes

**Blocked by:** Nothing
**Blocks:** Task 2.1

---

## Fase 2: Knowledge Base Sidebar Panel (FONDASI)

> KB dibangun sebagai sidebar panel di chat workspace. Pada fase ini **TIDAK ADA RAG** — KB menampilkan file + extraction status saja. RAG-specific UI (indexing status, toggle) sudah disiapkan tapi otomatis hidden karena semua `ragIndexStatus` masih null. Pattern mengikuti existing sidebar panels (SidebarPaperSessions).

### Task 2.1: Convex Queries — Knowledge Base Data

**Files:**
- `convex/files.ts` (modify)

**Steps:**
1. Implement `getUserKnowledgeBase` query:
   - Fetch ALL user files (ordered by createdAt desc)
   - Enrich with conversation titles via lookup
   - Return: name, type, size, createdAt, extractionStatus, ragIndexStatus, ragActive, conversationId, conversationTitle
2. Implement `toggleRagActive` mutation:
   - Auth: requireFileOwner
   - Patch `ragActive` field
3. Implement `getKnowledgeBaseStats` query:
   ```typescript
   return {
     total: files.length,
     extracted: files.filter(f => f.extractionStatus === "success").length,
     extractionPending: files.filter(f => !f.extractionStatus || f.extractionStatus === "pending").length,
     extractionFailed: files.filter(f => f.extractionStatus === "failed").length,
     indexed: files.filter(f => f.ragIndexStatus === "indexed").length,
     ragPending: files.filter(f => f.ragIndexStatus === "pending").length,
     inactive: files.filter(f => f.ragActive === false).length,
   }
   ```

**Acceptance Criteria:**
- [ ] `getUserKnowledgeBase` returns enriched file list with conversation titles
- [ ] `toggleRagActive` toggles field correctly
- [ ] `getKnowledgeBaseStats` returns accurate counts
- [ ] Auth enforced on all queries/mutations
- [ ] Works with files that have NO ragIndexStatus (all null — pre-RAG state)

**Blocked by:** Task 1.1
**Blocks:** Task 2.2

---

### Task 2.2: KB Sidebar Panel & Activity Bar Integration

**Files:**
- `src/components/chat/sidebar/SidebarKnowledgeBase.tsx` (new)
- `src/components/chat/shell/ActivityBar.tsx` (modify)
- `src/components/chat/ChatSidebar.tsx` (modify)

**Steps:**
1. Update `PanelType` di `ActivityBar.tsx`:
   - Add `"knowledge-base"` to union type
   - Add panel item: `{ panel: "knowledge-base", icon: <Book />, label: "Knowledge Base" }` (Iconoir Book/Archive icon)
2. Update `ChatSidebar.tsx`:
   - Add `case "knowledge-base": return <SidebarKnowledgeBase />` in switch
3. Create `SidebarKnowledgeBase.tsx` (mirip SidebarPaperSessions pattern):
   - **Header:** "Knowledge Base" (Geist Sans bold) + "Dokumen Tersimpan" (Geist Mono, muted)
   - **Fetch data:** `useQuery(api.files.getUserKnowledgeBase)`
   - **Grouping:** Files dikelompokkan per conversation origin (collapsible folders)
   - **File item (collapsed):** Nama file + status badge
   - **File item (expanded):** + type · size · date + text preview (200 chars)
   - **Status badge adaptatif:**
     - Pre-RAG (all `ragIndexStatus` null): extraction status (Extracted / Extracting / Failed)
     - Post-RAG (any `ragIndexStatus` exists): RAG index status (Indexed / Indexing / Failed)
   - **Toggle switch (ragActive):**
     - Pre-RAG: hidden (tidak ditampilkan)
     - Post-RAG: visible, disabled jika not indexed
   - **Error message display** jika extraction/indexing failed
   - **Stats footer:** "12 dokumen · 8 extracted" (pre-RAG) atau "12 dokumen · 10 indexed" (post-RAG)
   - **Empty state:** "Belum ada file. Upload melalui percakapan chat."
   - **Loading state** while fetching
   - **Scrollable** content area (`.overflow-y-auto .scrollbar-thin`)
   - **CreditMeter footer** (shared — already rendered by ChatSidebar parent)
4. Follow Mechanical Grace design system strictly

**Acceptance Criteria:**
- [ ] KB icon visible in activity bar (4th icon)
- [ ] Clicking KB icon switches sidebar to KB panel
- [ ] File list renders all user files cross-conversation
- [ ] Files grouped by conversation origin (collapsible folders)
- [ ] Status badges use correct colors (Teal/Sky/Rose)
- [ ] Empty state shown when no files
- [ ] Loading state shown while fetching
- [ ] **Pre-RAG mode works**: semua ragIndexStatus null → shows extraction-level info only
- [ ] Toggle switch hidden in pre-RAG mode
- [ ] Design system compliance: correct fonts, radius, borders, icons (Iconoir)
- [ ] Keyboard navigation works in activity bar (existing pattern)

**Blocked by:** Task 2.1
**Blocks:** Task 2.4

---

### Task 2.3: Image Extraction Guard Removal

**Files:**
- `src/components/chat/FileUploadButton.tsx` (modify)

**Steps:**
1. Remove the `if (!file.type.startsWith("image/"))` guard (line ~102)
2. All file types (including images) now trigger `/api/extract-file`
3. Images → OCR via OpenRouter Vision → extractedText → will be indexed when RAG pipeline is active

**Acceptance Criteria:**
- [ ] Image upload triggers extraction (not skipped)
- [ ] Document upload still works as before
- [ ] OCR returns extractedText for images
- [ ] Images appear in KB sidebar with extraction status

**Blocked by:** Nothing (can parallel with 2.1-2.2)
**Blocks:** Task 2.4

---

### Task 2.4: End-to-End Knowledge Base Test (Pre-RAG)

> **CHECKPOINT KRITIS.** Setelah task ini selesai, KB harus 100% berfungsi tanpa RAG. Baru setelah itu lanjut ke Grup B.

**Steps:**
1. Login → open chat → click KB icon in activity bar
2. Verify: sidebar switches to KB panel
3. Verify: files grouped by conversation, stats show extraction-level counts
4. Upload new file in chat → switch to KB panel → new file appears (Convex real-time)
5. Upload image file → verify extraction triggered and OCR text saved
6. Verify: toggle switch NOT visible (pre-RAG mode)
7. Switch between activity bar panels (chat ↔ paper ↔ progress ↔ KB) — smooth
8. Empty state test (new user with no files)
9. Mobile check: KB panel accessible
10. Verify existing chat functionality NOT broken (upload, extraction, context injection)

**Acceptance Criteria:**
- [ ] KB sidebar works **completely without RAG pipeline**
- [ ] Data refreshes reactively (Convex real-time)
- [ ] New uploads (including images) appear without refresh
- [ ] Activity bar panel switching is smooth
- [ ] Empty state renders correctly
- [ ] Image files show extraction status
- [ ] **No `@convex-dev/rag` import anywhere in the codebase** at this point
- [ ] **Existing chat features unaffected** (file upload, extraction, context injection, paper mode)

**Blocked by:** Task 2.2, Task 2.3
**Blocks:** Fase 3 (HARD GATE — Fase 3 tidak boleh dimulai sebelum task ini pass)

---

## ═══ GRUP B: RAG PIPELINE ═══

> **HARD GATE:** Grup B HANYA dimulai setelah Task 2.4 (KB E2E test) pass 100%. KB harus sudah aktif, berfungsi, dan tidak ada masalah.

## Fase 3: RAG Component Setup

> Sekarang KB sudah berfungsi, baru install dan setup RAG component.

### Task 3.1: Install Dependencies & Register Component

**Files:**
- `package.json` (modify)
- `convex/convex.config.ts` (modify)

**Steps:**
1. Install `@convex-dev/rag`:
   ```bash
   npm install @convex-dev/rag
   ```
2. Register di `convex/convex.config.ts`:
   ```typescript
   import rag from "@convex-dev/rag/convex.config";
   // ...
   app.use(rag);
   ```
3. Verify: `npx convex dev` jalan tanpa error
4. **Verify KB masih berfungsi** — open chat, check KB sidebar, pastikan tidak ada regression

**Acceptance Criteria:**
- [ ] `@convex-dev/rag` ada di `package.json` dependencies
- [ ] `convex.config.ts` register RAG component
- [ ] `npx convex dev` success tanpa type errors
- [ ] `components.rag` tersedia di generated API
- [ ] **KB sidebar masih berfungsi normal** (no regression)

**Blocked by:** Task 2.4 (HARD GATE)
**Blocks:** Task 3.2

---

### Task 3.2: Create RAG Instance

**Files:**
- `convex/rag.ts` (new)

**Steps:**
1. Create `convex/rag.ts` dengan RAG instance + filter types
2. Configure embedding model: `openai.embedding("text-embedding-3-small")`
3. Define filter names: `userId`, `fileId`, `conversationId`, `userAndActive`
4. Export `rag` instance

> ⚠️ API shape (`rag.add`, `rag.search`, filterValues format) harus diverifikasi terhadap versi aktual library. Adjust kode jika API berbeda dari dokumentasi.

**Acceptance Criteria:**
- [ ] `convex/rag.ts` exists dengan typed filters
- [ ] Import `components` dari `"./_generated/api"` resolves
- [ ] No TypeScript errors

**Blocked by:** Task 3.1
**Blocks:** Task 4.2

---

### Task 3.3: Environment Variables

**Steps:**
1. Tambah `OPENAI_API_KEY` di `.env.local` (untuk development)
2. Set `OPENAI_API_KEY` di Convex environment variables:
   ```bash
   npx convex env set OPENAI_API_KEY sk-...
   ```
3. Verify: embedding model bisa diakses dari Convex action

> ⚠️ `@ai-sdk/openai` embedding call dijalankan dari Convex action. Perlu verifikasi bahwa library ini compatible dengan Convex runtime. Jika tidak, fallback: pindahkan embedding call ke Next.js API route.

**Acceptance Criteria:**
- [ ] `OPENAI_API_KEY` set di `.env.local`
- [ ] `OPENAI_API_KEY` set di Convex env vars
- [ ] Test: simple embedding call succeeds (bisa test manual via Convex dashboard)

**Blocked by:** Nothing (paralel dengan 3.1-3.2)
**Blocks:** Task 4.2

---

## Fase 4: RAG Ingestion Pipeline

### Task 4.1: Convex Mutations — RAG Status Updates

**Files:**
- `convex/files.ts` (modify)

**Steps:**
1. Tambah `internal` mutation `updateRagStatus`:
   ```typescript
   export const updateRagStatus = internalMutation({
     args: {
       fileId: v.id("files"),
       ragEntryId: v.optional(v.string()),
       ragIndexStatus: v.string(),
       ragIndexError: v.optional(v.string()),
       ragIndexedAt: v.optional(v.number()),
     },
     handler: async (ctx, args) => {
       await ctx.db.patch(args.fileId, {
         ragEntryId: args.ragEntryId,
         ragIndexStatus: args.ragIndexStatus,
         ragIndexError: args.ragIndexError,
         ragIndexedAt: args.ragIndexedAt,
       })
     },
   })
   ```
2. Tambah `internal` query `getFileInternal`:
   ```typescript
   export const getFileInternal = internalQuery({
     args: { fileId: v.id("files") },
     handler: async (ctx, { fileId }) => await ctx.db.get(fileId),
   })
   ```
3. Tambah `internal` query `getUnindexedFiles`:
   ```typescript
   export const getUnindexedFiles = internalQuery({
     handler: async (ctx) => {
       return await ctx.db
         .query("files")
         .filter(q => q.and(
           q.eq(q.field("extractionStatus"), "success"),
           q.eq(q.field("ragIndexStatus"), undefined)
         ))
         .collect()
     },
   })
   ```

**Acceptance Criteria:**
- [ ] All three internal functions compile without errors
- [ ] `updateRagStatus` can patch file record (test via Convex dashboard)
- [ ] `getUnindexedFiles` returns files with `extractionStatus: "success"` but no `ragIndexStatus`

**Blocked by:** Task 1.1 (schema fields)
**Blocks:** Task 4.2

---

### Task 4.2: Convex Action — `ragIndexFile` + `scheduleRagIndex`

**Files:**
- `convex/ragActions.ts` (new)

**Steps:**
1. Create `convex/ragActions.ts`
2. Implement `ragIndexFile` as **internalAction** (not public — only called via scheduler):
   - Fetch file via `internal.files.getFileInternal`
   - Guard: skip jika `extractedText` kosong atau terlalu pendek (<10 chars)
   - Call `rag.add()` dengan namespace, key, text, title, filterValues
   - Handle `replacedEntry` (cleanup old entry)
   - Update file via `internal.files.updateRagStatus`
   - Error handling: catch → set `ragIndexStatus: "failed"` + error message
3. Implement `scheduleRagIndex` as **public mutation** (called from Next.js via `fetchMutation`):
   ```typescript
   export const scheduleRagIndex = mutation({
     args: { fileId: v.id("files") },
     handler: async (ctx, { fileId }) => {
       await ctx.scheduler.runAfter(0, internal.ragActions.ragIndexFile, { fileId })
     },
   })
   ```
   Kenapa public mutation (bukan HTTP route `/api/rag-index`): auth token sudah ada di extract-file route, pattern `ctx.scheduler.runAfter` sudah proven di codebase.

**Acceptance Criteria:**
- [ ] Action compiles without errors
- [ ] Test manual: call `ragIndexFile` → file gets `ragIndexStatus: "indexed"`
- [ ] Idempotent: calling twice on same file doesn't create duplicate entries
- [ ] Error case: invalid fileId returns meaningful error
- [ ] Guard: files with extractedText < 10 chars are skipped
- [ ] **KB sidebar reflects status change real-time** (ragIndexStatus goes from null → "indexed")

**Blocked by:** Task 3.2, Task 3.3, Task 4.1
**Blocks:** Task 4.3

---

### Task 4.3: Wire Extraction → Indexing

**Files:**
- `src/app/api/extract-file/route.ts` (modify)

**Steps:**
1. Setelah `updateExtractionResult` dengan `extractionStatus: "success"`:
   ```typescript
   // Schedule RAG indexing via direct Convex mutation (not HTTP hop)
   try {
     await fetchMutation(api.ragActions.scheduleRagIndex, {
       fileId: fileId as Id<"files">,
     }, convexOptions)
   } catch (err) {
     console.error("[RAG Index] Schedule failed:", err)
     // Non-blocking — extraction success is primary
   }
   ```
2. Non-blocking: extraction response returned regardless of RAG scheduling result
3. If scheduling fails, `ragIndexStatus` stays `undefined` → detectable for retry via backfill

**Acceptance Criteria:**
- [ ] Upload file di chat → extraction selesai → RAG indexing auto-triggered
- [ ] File record di Convex: `ragIndexStatus` berubah dari undefined → "indexed"
- [ ] **KB sidebar shows status change real-time**
- [ ] File extraction failure → RAG indexing NOT triggered
- [ ] RAG indexing failure → extraction status unaffected (independent)

**Blocked by:** Task 4.2
**Blocks:** Task 4.4

---

### Task 4.4: KB Sidebar Update — Post-RAG Mode

**Files:**
- `src/components/chat/sidebar/SidebarKnowledgeBase.tsx` (modify)

**Steps:**
1. KB now detects files with `ragIndexStatus` → switches to post-RAG mode automatically
2. Stats footer: "12 dokumen · 10 indexed" (RAG-level)
3. File items: show RAG index status badge + toggle switch
4. Toggle switch: visible and enabled only for indexed files

**Acceptance Criteria:**
- [ ] Stats automatically switch to RAG-aware mode when indexed files exist
- [ ] Toggle switch appears and works
- [ ] Toggle persists after refresh
- [ ] Status badges show RAG indexing states

**Blocked by:** Task 4.3 (need indexed files to test)
**Blocks:** Task 4.5

---

### Task 4.5: End-to-End Ingestion Test

**Steps:**
1. Start dev: `npm run dev` + `npx convex dev`
2. Upload file di chat (PDF, DOCX, TXT, XLSX, Image)
3. Open KB sidebar → verify:
   - File appears immediately (extraction pending)
   - Status changes to "Extracted" → "Indexing" → "Indexed" (real-time)
   - Stats update accordingly
4. Upload file yang gagal extract (corrupt PDF)
5. Verify KB: shows "Extraction Failed" with error message
6. Upload file yang sangat kecil (<10 chars)
7. Verify: handled gracefully (skipped or indexed)
8. Toggle test: disable indexed file → verify toggle works
9. Image file: upload → OCR → indexed → searchable

**Acceptance Criteria:**
- [ ] PDF → indexed, KB shows ✅
- [ ] DOCX → indexed, KB shows ✅
- [ ] TXT → indexed, KB shows ✅
- [ ] XLSX → indexed, KB shows ✅
- [ ] Image → OCR → indexed, KB shows ✅
- [ ] Failed extraction → KB shows ❌ with error
- [ ] Toggle works on indexed files
- [ ] Multiple uploads → no duplicate RAG entries
- [ ] **Full KB real-time flow visible in browser**

**Blocked by:** Task 4.4
**Blocks:** Fase 5

---

## Fase 5: RAG Retrieval — AI Tool

### Task 5.1: Convex Action — `searchDocuments`

**Files:**
- `convex/ragActions.ts` (modify)

**Steps:**
1. Implement `searchDocuments` action (lihat design doc Section 4.2)
2. Filter mandatory: `userAndActive` compound filter
3. Optional filter: `conversationId`
4. Enrich results dengan file metadata (name, type, conversationId)
5. Return structured response

**Acceptance Criteria:**
- [ ] Search returns relevant chunks
- [ ] Results filtered by userId (test: user A cannot see user B's files)
- [ ] Results filtered by ragActive (toggled-off files excluded)
- [ ] Optional conversationId filter works
- [ ] Empty results handled gracefully
- [ ] Score threshold filters low-relevance results

**Blocked by:** Task 4.5 (need indexed files to test)
**Blocks:** Task 5.2

---

### Task 5.2: AI Tool — `searchUserDocuments`

**Files:**
- `src/app/api/chat/route.ts` (modify)

**Steps:**
1. Define `searchUserDocuments` tool di tools object (function tools section)
2. Tool description dalam bahasa Indonesia
3. Parameters: `query` (required), `conversationId` (optional), `limit` (optional, default 5)
4. Execute: call `searchDocuments` Convex action
5. Return structured results ke AI

**Placement:**
- Masuk di **function tools** section (bersama artifact tools + paper tools)
- TIDAK available di web search mode (sesuai constraint existing)

**Acceptance Criteria:**
- [ ] Tool muncul di tools list saat function tools mode
- [ ] AI bisa call tool dan terima results
- [ ] AI menggunakan results untuk menjawab pertanyaan user
- [ ] AI menyebutkan sumber file dalam jawaban
- [ ] Tool TIDAK muncul di web search mode

**Blocked by:** Task 5.1
**Blocks:** Task 5.3

---

### Task 5.3: Paper Mode System Note

**Files:**
- `src/app/api/chat/route.ts` (modify)

**Steps:**
1. Di bagian paper mode context preparation (setelah system prompt assembly):
   - Query: apakah user punya indexed files? Count files with `ragIndexStatus === "indexed"` AND `ragActive !== false`
   - Jika count > 0 → inject system note:
     ```
     [KNOWLEDGE BASE]
     User memiliki {N} dokumen terindeks di Knowledge Base.
     Jika relevan dengan tahap saat ini, gunakan tool searchUserDocuments
     untuk mencari referensi dari koleksi dokumen user sebelum atau
     sebagai pelengkap web search.
     ```
2. Note diinject HANYA di active research stages (gagasan, topik, tinjauan_literatur, pendahuluan, diskusi)

**Acceptance Criteria:**
- [ ] System note injected saat user punya indexed files DAN stage = active research
- [ ] System note NOT injected di non-research stages
- [ ] System note NOT injected jika user punya 0 indexed files
- [ ] AI considers using `searchUserDocuments` based on note

**Blocked by:** Task 5.2
**Blocks:** Task 5.4

---

### Task 5.4: End-to-End Retrieval Test

**Steps:**
1. Ensure 2-3 files indexed (dari Fase 4 tests)
2. Di chat, ask: "Cari informasi tentang [topic] dari file-file gue"
3. Verify: AI calls `searchUserDocuments`, returns relevant chunks, synthesizes answer
4. Test cross-reference: "Bandingkan informasi dari [file A] dan [file B]"
5. Test negative: ask tentang topic yang TIDAK ada di file → no results, AI says so
6. Test toggle: disable satu file di KB → search again di chat → file excluded
7. Paper mode test: start paper session → verify system note injected → AI aware of KB

**Acceptance Criteria:**
- [ ] Explicit search request → AI uses tool → relevant response
- [ ] Cross-reference → AI pulls from multiple files
- [ ] No relevant files → AI communicates clearly
- [ ] Disabled file (via KB toggle) → excluded from chat search results
- [ ] Paper mode system note works
- [ ] Billing: token usage recorded for the chat turn

**Blocked by:** Task 5.3
**Blocks:** Fase 6

---

## Fase 6: Backfill & Billing

### Task 6.1: Backfill Migration

**Files:**
- `convex/migrations/backfillRagIndex.ts` (new)

**Steps:**
1. Create backfill action yang:
   - Query all files with `extractionStatus === "success"` AND `ragIndexStatus === undefined`
   - Loop: call `ragIndexFile` per file
   - Track success/failure counts
   - Return summary
2. Test on dev environment first
3. Run: `npx convex run migrations/backfillRagIndex`
4. Verify di KB sidebar: all eligible files now show as "Indexed"

**Acceptance Criteria:**
- [ ] Migration script compiles
- [ ] Dev run: all eligible files get indexed
- [ ] Failed files logged with reasons
- [ ] Summary returned: { total, indexed, failed }
- [ ] Idempotent: running twice doesn't cause issues
- [ ] **KB sidebar reflects all newly-indexed files**

**Blocked by:** Task 4.2
**Blocks:** Nothing (can run anytime after Task 4.2)

---

### Task 6.2: Billing Integration

**Files:**
- `convex/billing/constants.ts` (modify)
- `src/lib/billing/enforcement.ts` (modify, if needed)

**Steps:**
1. Add `rag_search: 0.5` ke `OPERATION_COST_MULTIPLIERS`
2. Verify type compatibility (TypeScript union type includes new key)
3. Verify `recordUsageAfterOperation` can handle the new operation type
4. If needed: update type definitions

**Note:** RAG search tokens are added to the chat turn's total usage, NOT as separate pre-flight check. See design doc Section 6.2.

**Acceptance Criteria:**
- [ ] `rag_search` multiplier added
- [ ] No TypeScript errors
- [ ] Usage recording works with new operation type

**Blocked by:** Nothing
**Blocks:** Nothing (can be done in parallel)

---

### Task 6.3: Admin Monitoring (Optional/Nice-to-have)

**Files:**
- Admin panel component (identify exact file)
- `convex/files.ts` (add admin queries)

**Steps:**
1. Add admin query: `getRAGStats` (total indexed, pending, failed across all users)
2. Add to admin panel: RAG health section
3. Wire system alerts for `rag_index_failed`

**Acceptance Criteria:**
- [ ] Admin can see RAG health stats
- [ ] Failed indexings visible in admin panel
- [ ] System alerts fire on failures

**Blocked by:** Fase 5
**Blocks:** Nothing

---

## Dependency Graph

```
═══ GRUP A: KNOWLEDGE BASE (nol dependency @convex-dev/rag) ═══

1.1 (Schema) ──→ 2.1 (KB Queries) ──→ 2.2 (KB Sidebar + Activity Bar)
                                              │
                  2.3 (Image Guard Removal) ──┤
                                              │
                                              └──→ 2.4 (E2E KB Pre-RAG Test)
                                                      │
                                              ════════╪═══════ HARD GATE ═══
                                                      │
═══ GRUP B: RAG PIPELINE ═══════════════════          │
                                                      ↓
                  3.3 (Env Vars)            3.1 (Install RAG) ──→ 3.2 (Instance)
                      │                                                │
                      │                                                ↓
1.1 ──→ 4.1 (RAG Mutations) ──→ 4.2 (ragIndexFile) ←── 3.2 + 3.3
                                      │
                                      └──→ 4.3 (Wire Extract→Index)
                                              │
                                              └──→ 4.4 (KB Post-RAG Update)
                                                      │
                                                      └──→ 4.5 (E2E Ingestion Test)
                                                              │
                                                              └──→ 5.1 (searchDocuments)
                                                                      │
                                                                      └──→ 5.2 (AI Tool)
                                                                              │
                                                                              └──→ 5.3 (Paper Note)
                                                                                      │
                                                                                      └──→ 5.4 (E2E Retrieval)

Parallel tracks:
- 2.3 (Image Guard Removal) can parallel with 2.1-2.2
- 3.3 (Env Vars) can parallel with 3.1-3.2
- 6.1 (Backfill) can start after 4.2
- 6.2 (Billing) can be done anytime
- 6.3 (Admin) after Fase 5
```

---

## Estimated Timeline

| Fase | Tasks | Estimasi |
|------|-------|----------|
| **GRUP A** | | |
| Fase 1 | 1.1 (Schema) | 0.25 hari |
| Fase 2 | 2.1–2.4 (Knowledge Base) | 1.5 hari |
| **CHECKPOINT** | KB fully functional, tested | — |
| **GRUP B** | | |
| Fase 3 | 3.1–3.3 (RAG Setup) | 0.5 hari |
| Fase 4 | 4.1–4.5 (RAG Ingestion) | 1.5 hari |
| Fase 5 | 5.1–5.4 (RAG Retrieval) | 1.5 hari |
| Fase 6 | 6.1–6.3 (Backfill + Billing) | 0.5 hari |
| **Total** | | **~5.75 hari** |

---

## Pre-Implementation Checklist

Sebelum mulai coding:

**Untuk Grup A (KB):**
- [ ] Convex dev environment running
- [ ] Worktree branch `rag-knowledge-base` synced with main
- [ ] Design doc reviewed & approved
- [ ] Understand existing activity bar + sidebar panel pattern
- [ ] Understand existing file upload flow (FileUploadButton → extract-file route)

**Untuk Grup B (RAG) — cek setelah KB selesai:**
- [ ] `OPENAI_API_KEY` tersedia (untuk embedding model)
- [ ] KB sidebar tested dan berfungsi 100%
- [ ] Understand existing chat route structure (3300+ lines)
- [ ] `@convex-dev/rag` documentation reviewed for actual API shape
