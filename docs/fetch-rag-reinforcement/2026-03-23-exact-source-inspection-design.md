# Exact Source Inspection Design

**Tanggal:** 2026-03-23

**Masalah**

Jalur websearch saat ini kuat untuk sintesis semantik, tetapi lemah untuk pembuktian exact-source. Pertanyaan seperti "judul artikel apa", "paragraf kedua", "kutip verbatim", atau "tanggal terbit exact" masih dijawab lewat semantic retrieval berbasis embedding. Itu membuat model bisa menemukan potongan teks yang relevan, tetapi tidak bisa membuktikan posisi dokumen, metadata artikel, atau hubungan exact antara kutipan dan dokumen asal.

Anomali yang terlihat di screenshot berasal dari kontrak tool yang salah:

- `quoteFromSource` dan `searchAcrossSources` memakai `sourceChunks.searchByEmbedding`
- `sourceChunks` menyimpan chunk untuk retrieval semantik, bukan representasi dokumen exact
- metadata seperti `title` memang bisa tersimpan di chunk, tetapi tidak diekspos cukup kuat ke model untuk pertanyaan exact
- model tidak dipaksa membedakan antara hasil "relevan" dan hasil "exact"

**Tujuan**

Menambahkan jalur **exact inspection universal** untuk semua sumber web yang sudah masuk ke percakapan, sehingga model:

- bisa memverifikasi judul artikel, author, tanggal, dan paragraf tertentu secara exact
- menolak secara naratif jika bukti exact tidak tersedia
- tidak mengungkap jeroan teknis seperti tool, RAG, available sources, atau pipeline internal

## Keputusan Desain

### 1. Pisahkan semantic retrieval dari exact inspection

Semantic retrieval tetap menggunakan:

- `src/lib/ai/rag-ingest.ts`
- `convex/sourceChunks.ts`
- `quoteFromSource`
- `searchAcrossSources`

Exact inspection ditambahkan sebagai jalur paralel baru:

- tabel `sourceDocuments`
- query/mutation `convex/sourceDocuments.ts`
- tool `inspectSourceDocument`

Alasan:

- vector similarity memang cocok untuk "temukan bagian yang relevan"
- vector similarity tidak cocok untuk "paragraf kedua", "judul artikel", atau "kutipan verbatim exact"

### 2. Jadikan `inspectSourceDocument` sebagai satu-satunya jalur klaim exact

Pertanyaan berikut wajib memakai `inspectSourceDocument`:

- judul artikel
- author exact
- tanggal terbit exact
- paragraf ke-N
- kalimat pertama
- kutipan verbatim exact dari sumber tertentu

Kalau tool exact tidak bisa membuktikan, model wajib mengatakan bahwa informasi exact belum bisa diverifikasi dari sumber yang berhasil dipastikan.

### 3. Exact inspection harus universal

`createPaperTools()` sudah di-spread ke tool utama chat di `src/app/api/chat/route.ts`, jadi tool exact baru akan tersedia di:

- normal chat
- paper mode
- follow-up setelah websearch

Tidak perlu membuat tool set terpisah untuk exact inspection.

## Data Flow Aktual dan Perubahan

### Alur aktual

1. `executeWebSearch()` di `src/lib/ai/web-search/orchestrator.ts` menjalankan retriever chain.
2. Setelah itu `fetchPageContent()` di `src/lib/ai/web-search/content-fetcher.ts` mengambil isi halaman.
3. Konten hasil fetch di-ingest ke `sourceChunks` melalui `src/lib/ai/rag-ingest.ts`.
4. Follow-up exact saat ini tetap memakai `quoteFromSource` / `searchAcrossSources`, yang keduanya membaca `sourceChunks.searchByEmbedding`.

Masalah dari alur ini:

- tidak ada store dokumen exact
- tidak ada paragraf yang diberi index eksplisit
- tidak ada tool untuk membaca metadata exact dari satu dokumen

### Alur target

1. `fetchPageContent()` menghasilkan output yang lebih kaya:
   - `title`
   - `author`
   - `publishedAt`
   - `siteName`
   - `paragraphs[]`
   - `documentText`
2. `executeWebSearch()` menyimpan dua hal:
   - semantic chunks ke `sourceChunks`
   - dokumen exact ke `sourceDocuments`
3. `inspectSourceDocument(sourceId)` membaca dari `sourceDocuments`
4. `quoteFromSource` tetap membaca `sourceChunks`, tetapi hanya untuk retrieval semantik

## Kontrak Data Baru

### Tabel `sourceDocuments`

Field:

- `conversationId`
- `sourceId`
- `originalUrl`
- `resolvedUrl`
- `title?`
- `author?`
- `publishedAt?`
- `siteName?`
- `paragraphs: Array<{ index: number; text: string }>`
- `documentText`
- `createdAt`
- `updatedAt`

Index:

- `by_conversation`
- `by_source`

Aturan:

- satu `sourceId` per `conversationId` merepresentasikan satu dokumen exact
- upsert, bukan insert buta, jika source yang sama di-fetch ulang

### Tool `inspectSourceDocument`

Input:

- `sourceId: string`
- `paragraphIndex?: number`
- `includeParagraphs?: boolean`
- `includeMetadata?: boolean`

Output:

- `success: boolean`
- `sourceId: string`
- `title?: string`
- `author?: string`
- `publishedAt?: string`
- `siteName?: string`
- `requestedParagraph?: { index: number; text: string }`
- `paragraphs?: Array<{ index: number; text: string }>`
- `exactAvailable: { title: boolean; author: boolean; publishedAt: boolean; paragraphs: boolean }`
- `error?: string`

Aturan:

- kalau `paragraphIndex` dikirim, tool mengembalikan paragraf exact itu atau gagal
- tool tidak boleh membuat fallback sintetik dari URL atau citation label
- `paragraphs[]` harus datang dari data yang dipersist, bukan dihitung ulang saat query

## Guardrail Naratif

Model dilarang menyebut:

- tool
- search tool
- available web sources
- RAG
- retrieval
- fetch web
- pipeline internal lain

Model harus menjawab secara naratif:

- "aku belum bisa memverifikasi judul exact-nya"
- "aku belum bisa memastikan itu benar paragraf kedua secara persis"

Bukan:

- "tool tidak menyediakan"
- "RAG tidak punya metadata"
- "available sources tidak memuat"

## File yang Harus Diubah

File yang benar-benar kena berdasarkan kode saat ini:

- `src/lib/ai/web-search/content-fetcher.ts`
- `src/lib/ai/web-search/orchestrator.ts`
- `convex/schema.ts`
- `convex/sourceDocuments.ts` (file baru)
- `src/lib/ai/paper-tools.ts`
- `src/app/api/chat/route.ts`
- `src/lib/ai/skills/web-search-quality/SKILL.md`
- `convex/conversations.ts`

File yang tetap dipertahankan untuk semantic retrieval:

- `src/lib/ai/rag-ingest.ts`
- `convex/sourceChunks.ts`

## Rekomendasi Implementasi

Langkah implementasi terbaik:

1. Tambah `sourceDocuments` dan jalur persist exact
2. Tambah `inspectSourceDocument`
3. Reposisi `quoteFromSource` sebagai semantic-only
4. Tambah guardrail global exact-claim dan larangan bocor jeroan
5. Tambah test exact inspection dan fallback refusal

## Success Criteria

Sistem dianggap benar jika:

- model bisa memberikan judul exact bila metadata memang ada
- model bisa memberikan paragraf ke-2 exact bila dokumen memang punya paragraf terstruktur
- model menolak secara naratif bila exact proof tidak tersedia
- model tidak lagi menyebut jeroan tool/teknologi ke user
- semantic retrieval lama tetap berjalan untuk pertanyaan non-exact
