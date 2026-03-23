# Exact Source Inspection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menambahkan jalur exact inspection universal untuk sumber web agar pertanyaan seperti judul artikel, author/date exact, paragraf ke-N, dan kutipan verbatim tidak lagi dijawab lewat semantic retrieval.

**Architecture:** Semantic retrieval tetap memakai `sourceChunks` dan embedding search. Exact inspection ditambah sebagai jalur paralel lewat tabel baru `sourceDocuments`, persist setelah fetch web selesai, dan tool baru `inspectSourceDocument` yang dipakai lintas mode chat melalui `createPaperTools()`.

**Tech Stack:** Next.js 16 App Router, Convex schema/query/mutation/action, Vercel AI SDK v5/v6 tool calling, TypeScript, Vitest.

---

### Task 1: Tambah tabel `sourceDocuments`

**Files:**
- Modify: `convex/schema.ts`

**Step 1: Tulis test atau validasi schema target**

Catat struktur target:

- `conversationId`
- `sourceId`
- `originalUrl`
- `resolvedUrl`
- `title?`
- `author?`
- `publishedAt?`
- `siteName?`
- `paragraphs`
- `documentText`
- `createdAt`
- `updatedAt`

**Step 2: Tambah definisi tabel**

Tambahkan `sourceDocuments` ke `convex/schema.ts` dengan index:

- `by_conversation`
- `by_source`

**Step 3: Jalankan codegen**

Run: `npx convex codegen`

Expected: generated API/types terbarui tanpa error schema

**Step 4: Commit**

```bash
git add convex/schema.ts convex/_generated
git commit -m "feat(convex): add sourceDocuments table for exact source inspection"
```

### Task 2: Tambah query dan mutation exact document

**Files:**
- Create: `convex/sourceDocuments.ts`
- Modify: `convex/conversations.ts`

**Step 1: Buat mutation `upsertDocument`**

Mutation harus:

- cek existing row by `conversationId + sourceId`
- update jika ada
- insert jika belum ada

**Step 2: Buat query `getBySource`**

Query harus:

- menerima `conversationId` dan `sourceId`
- memverifikasi ownership conversation
- mengembalikan dokumen exact lengkap

**Step 3: Buat mutation/query cleanup jika perlu**

Tambahkan helper delete by conversation bila diperlukan.

**Step 4: Update cleanup conversation**

Di `convex/conversations.ts`, saat conversation dihapus, hapus juga semua `sourceDocuments` untuk conversation itu.

**Step 5: Verifikasi**

Run: `npx eslint convex/sourceDocuments.ts convex/conversations.ts convex/schema.ts`

Expected: lint bersih

**Step 6: Commit**

```bash
git add convex/sourceDocuments.ts convex/conversations.ts convex/schema.ts
git commit -m "feat(convex): add source document queries and cleanup"
```

### Task 3: Ubah `content-fetcher` agar menghasilkan dokumen exact-friendly

**Files:**
- Modify: `src/lib/ai/web-search/content-fetcher.ts`

**Step 1: Perluas tipe `FetchedContent`**

Tambahkan field:

- `title`
- `author`
- `publishedAt`
- `siteName`
- `paragraphs`
- `documentText`

**Step 2: Ekstrak title secara eksplisit**

Jangan hanya mengandalkan `buildMetadataBlock()`. Title harus disimpan sebagai field terstruktur.

**Step 3: Bentuk paragraf deterministik**

Pisahkan content final menjadi array paragraf stabil dengan index 1-based atau 0-based yang konsisten.

**Step 4: Pertahankan backward compatibility**

`pageContent` dan `fullContent` tetap ada untuk compose dan RAG ingest.

**Step 5: Verifikasi**

Run: `npx eslint src/lib/ai/web-search/content-fetcher.ts`

Expected: lint bersih

**Step 6: Commit**

```bash
git add src/lib/ai/web-search/content-fetcher.ts
git commit -m "feat(fetch): extract exact source metadata and paragraphs"
```

### Task 4: Persist `sourceDocuments` dari orchestrator

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts`

**Step 1: Import mutation exact document**

Tambahkan jalur persist setelah fetch sukses dan sebelum/bersamaan dengan RAG ingest.

**Step 2: Persist exact document**

Untuk setiap `fetchedContent.fullContent` yang valid:

- simpan metadata exact
- simpan paragraphs
- simpan `documentText`

**Step 3: Jangan rusak jalur lama**

`ingestToRag()` tetap dijalankan untuk semantic retrieval.

**Step 4: Verifikasi**

Run: `npx eslint src/lib/ai/web-search/orchestrator.ts`

Expected: lint bersih

**Step 5: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts
git commit -m "feat(orchestrator): persist exact source documents alongside RAG chunks"
```

### Task 5: Tambah tool `inspectSourceDocument`

**Files:**
- Modify: `src/lib/ai/paper-tools.ts`

**Step 1: Tambah tool baru**

Input:

- `sourceId`
- `paragraphIndex?`
- `includeParagraphs?`
- `includeMetadata?`

Output:

- metadata exact
- requested paragraph jika diminta
- `exactAvailable`

**Step 2: Ubah deskripsi `quoteFromSource`**

Perjelas bahwa tool ini untuk pencarian semantic chunk, bukan verifikasi paragraf exact atau title exact.

**Step 3: Verifikasi**

Run: `npx eslint src/lib/ai/paper-tools.ts`

Expected: lint bersih

**Step 4: Commit**

```bash
git add src/lib/ai/paper-tools.ts
git commit -m "feat(tools): add inspectSourceDocument and narrow quoteFromSource contract"
```

### Task 6: Tambah guardrail runtime di route

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1: Tambah rule exact inspection**

Di system/tool instruction layer, tambahkan aturan:

- exact-source questions wajib pakai `inspectSourceDocument`
- exact claims tanpa tool exact dilarang

**Step 2: Tambah rule naratif**

Tambahkan aturan global:

- jangan sebut tool
- jangan sebut RAG
- jangan sebut available web sources
- jangan sebut retrieval/fetch/pipeline internal

**Step 3: Tambah refusal behavior**

Kalau exact proof tidak tersedia, model harus menjawab naratif bahwa informasi exact belum bisa diverifikasi.

**Step 4: Verifikasi**

Run: `npx eslint src/app/api/chat/route.ts`

Expected: lint bersih

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(route): enforce exact-source inspection and narrative-only responses"
```

### Task 7: Update skill guidance

**Files:**
- Modify: `src/lib/ai/skills/web-search-quality/SKILL.md`

**Step 1: Update exact-source guidance**

Tambah aturan eksplisit:

- `inspectSourceDocument` untuk title, author/date exact, paragraph index, verbatim
- `quoteFromSource` untuk semantic chunk retrieval

**Step 2: Update narrative guardrail**

Tambah larangan eksplisit untuk membocorkan jeroan sistem.

**Step 3: Commit**

```bash
git add src/lib/ai/skills/web-search-quality/SKILL.md
git commit -m "docs(skill): enforce exact source inspection and no internal jargon"
```

### Task 8: Tambah test exact inspection

**Files:**
- Create: `convex/sourceDocuments.test.ts`
- Create: `src/lib/ai/paper-tools.inspect-source.test.ts`
- Modify or Create: route/tool behavior tests yang relevan

**Step 1: Test store dan lookup exact document**

Verifikasi:

- upsert by source
- get by source
- cleanup by conversation

**Step 2: Test tool contract**

Verifikasi:

- title exact dikembalikan
- paragraph exact dikembalikan sesuai index
- request paragraph yang tidak ada menghasilkan failure

**Step 3: Test guardrail behavior**

Verifikasi:

- pertanyaan exact-source tidak boleh puas dengan semantic-only data
- fallback response tidak membocorkan istilah internal

**Step 4: Jalankan test**

Run: `npx vitest run <exact file list>`

Expected: semua test exact inspection hijau

**Step 5: Commit**

```bash
git add convex/sourceDocuments.test.ts src/lib/ai/paper-tools.inspect-source.test.ts <test-files-lain>
git commit -m "test: cover exact source inspection flow"
```

### Task 9: Final verification

**Files:**
- No code changes unless verification fails

**Step 1: Run lint**

```bash
npx eslint convex/schema.ts convex/sourceDocuments.ts convex/conversations.ts src/lib/ai/web-search/content-fetcher.ts src/lib/ai/web-search/orchestrator.ts src/lib/ai/paper-tools.ts src/app/api/chat/route.ts
```

Expected: no errors

**Step 2: Run targeted tests**

```bash
npx vitest run convex/sourceDocuments.test.ts src/lib/ai/paper-tools.inspect-source.test.ts
```

Expected: PASS

**Step 3: Manual scenario checklist**

Verifikasi skenario:

- user meminta judul exact dari sumber lama
- user meminta paragraf kedua exact
- user meminta verbatim quote
- user meminta exact info yang tidak tersedia dan model menolak secara naratif
- model tidak menyebut tool/RAG/search internals

**Step 4: Commit jika ada perubahan akhir**

```bash
git add -A
git commit -m "chore: finalize exact source inspection verification"
```

Plan complete and saved to `docs/fetch-rag-reinforcement/2026-03-23-exact-source-inspection-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
