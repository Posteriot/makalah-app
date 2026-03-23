Section 1: Kontrak inspectSourceDocument
  Tool ini harus jadi sumber kebenaran untuk semua pertanyaan exact-source.

  Input terbaik:

  - sourceId: string
  - paragraphIndex?: number
  - includeParagraphs?: boolean
  - includeMetadata?: boolean

  Output terbaik:

  - success: boolean
  - sourceId: string
  - title?: string
  - author?: string
  - publishedAt?: string
  - paragraphs?: Array<{ index: number; text: string }>
  - requestedParagraph?: { index: number; text: string }
  - exactAvailable: { title: boolean; author: boolean; publishedAt: boolean;
    paragraphs: boolean }
  - error?: string

  Aturan perilaku:

  - Kalau user minta “paragraf kedua”, model wajib panggil tool ini dengan
    paragraphIndex: 2
  - Kalau requestedParagraph nggak ada, model wajib bilang tidak bisa
    diverifikasi secara exact
  - Kalau title kosong, model wajib bilang judul exact tidak tersedia
  - Model dilarang menebak dari URL slug, citation title, atau memori percakapan

  Kenapa kontrak ini yang paling tepat:

  - memaksa bukti exact keluar sebagai data struktural
  - memutus kebiasaan model menjawab dari chunk similarity
  - cukup generik untuk judul, author/date, dan kutipan per paragraf
  
  ---

Section 2: Data Flow dan File yang Kena

  Alur aktual saat ini

  1. Hasil websearch selesai di src/lib/ai/web-search/orchestrator.ts.
      - Orchestrator menjalankan retriever, compose jawaban, lalu melakukan
        fetchPageContent() untuk mengambil isi halaman dan ingestToRag() untuk
        menyimpan konten ke sourceChunks.
      - Ingest exact-document belum ada.
  2. Konten halaman web diambil di src/lib/ai/web-search/content-fetcher.ts.
      - Return type FetchedContent saat ini hanya berisi:
          - url
          - resolvedUrl
          - pageContent
          - fullContent
          - fetchMethod
      - Tidak ada title, author, publishedAt, atau paragraphs[] di output
        struktural.
      - buildMetadataBlock() memang menambahkan Author, Published, Source ke
        body markdown, tapi tidak menambahkan title artikel sebagai field
        struktural yang bisa diinspeksi exact.
  3. Penyimpanan RAG sekarang hanya ke tabel sourceChunks.
      - Definisi tabel ada di convex/schema.ts:212.
      - Operasi ingest/search ada di convex/sourceChunks.ts.
      - Data yang disimpan per chunk:
          - sourceId
          - content
          - embedding
          - metadata.title?
          - metadata.pageNumber?
          - metadata.sectionHeading?
      - Ini cocok untuk semantic retrieval, bukan inspeksi exact dokumen.
  4. Tool exact-follow-up saat ini masih numpang di semantic retrieval.
      - quoteFromSource dan searchAcrossSources ada di src/lib/ai/paper-
        tools.ts:393.
      - Keduanya memakai api.sourceChunks.searchByEmbedding.
      - Jadi pertanyaan exact seperti “paragraf kedua” atau “judul artikel”
        tetap dijawab dari vector similarity, bukan dari struktur dokumen.
      - Ini akar anomali yang lo tunjukkan.
  5. Tool di src/lib/ai/paper-tools.ts ternyata sudah universal secara runtime,
     walau namanya misleading.
      - Di src/app/api/chat/route.ts:1694, createPaperTools(...) di-spread
        langsung ke tools utama chat.
      - Artinya jalur terbaik memang menambah tool exact baru di sini, karena
        otomatis akan tersedia lintas mode chat, bukan cuma paper.

  File yang benar-benar harus kena

  1. src/lib/ai/web-search/content-fetcher.ts
      - Harus diubah supaya hasil fetch mengeluarkan metadata dokumen
        terstruktur:
          - title
          - author
          - publishedAt
          - paragraphs[]
      - Ini sumber data exact inspection.
  2. src/lib/ai/web-search/orchestrator.ts
      - Harus diubah supaya setelah fetch berhasil, dia tidak hanya ingest ke
        RAG, tapi juga persist dokumen exact.
      - Ini titik integrasi universal untuk semua hasil websearch.
  3. convex/schema.ts
      - Harus ditambah tabel baru untuk dokumen exact web source.
      - sourceChunks tidak cukup untuk kebutuhan ini.
      - Tabel baru yang benar:
          - misalnya sourceDocuments
          - minimal berisi conversationId, sourceId, resolvedUrl, title, author,
            publishedAt, paragraphs, createdAt
  4. File baru: convex/sourceDocuments.ts
      - Saat ini file ini belum ada.
      - Harus dibuat untuk:
          - upsert/get exact source document
          - lookup by conversationId + sourceId
          - mungkin helper by URL/resolvedUrl
  5. src/lib/ai/paper-tools.ts
      - Harus ditambah tool baru inspectSourceDocument.
      - Karena file ini sudah di-spread ke toolset utama chat, ini titik yang
        tepat untuk membuat tool exact jadi universal.
      - quoteFromSource juga harus direposisi sebagai semantic quote finder,
        bukan exact paragraph locator.
  6. src/app/api/chat/route.ts
      - Harus diubah di prompt/tool instruction layer supaya:
          - pertanyaan exact-source wajib pakai inspectSourceDocument
          - model dilarang menyebut jeroan seperti tool, RAG, available sources,
            search tool, dan istilah internal lain
      - File ini juga tempat paling tepat untuk guardrail global perilaku
        naratif.
  7. src/lib/ai/skills/web-search-quality/SKILL.md
      - Harus diubah supaya aturan tool jadi eksplisit:
          - quoteFromSource = semantic/exact chunk retrieval terbatas
          - inspectSourceDocument = title/author/date/paragraph-index/verbatim
            exact
      - Di sinilah aturan “jangan ungkapkan jeroan teknologi” juga harus
        ditegaskan.
  8. convex/conversations.ts
      - Harus ikut diubah untuk cleanup saat conversation dihapus.
      - Sekarang file ini hanya menghapus sourceChunks; kalau sourceDocuments
        ditambah, cleanup-nya harus ikut.

  File yang tidak perlu jadi pusat solusi

  - src/lib/ai/rag-ingest.ts
      - File ini masih tetap relevan untuk semantic retrieval.
      - Tapi ini bukan tempat terbaik untuk exact inspection contract.
      - Exact document storage lebih bersih dibuat sebagai jalur paralel, bukan
        dipaksa numpang di chunk+embedding pipeline.

  Kesimpulan desain yang akurat

  - Semantic retrieval tetap berjalan di:
      - src/lib/ai/rag-ingest.ts
      - convex/sourceChunks.ts
  - Exact inspection harus ditambahkan sebagai jalur baru di:
      - src/lib/ai/web-search/content-fetcher.ts
      - src/lib/ai/web-search/orchestrator.ts
      - convex/schema.ts
      - convex/sourceDocuments.ts
      - src/lib/ai/paper-tools.ts
      - src/app/api/chat/route.ts
      - src/lib/ai/skills/web-search-quality/SKILL.md
      - convex/conversations.ts

---

Section 3: Kontrak sourceDocuments dan Output inspectSourceDocument

  Tabel baru: sourceDocuments
  Tujuan tabel ini: menyimpan representasi dokumen web yang bisa diperiksa
  secara exact, terpisah dari sourceChunks yang dipakai untuk similarity.

  Field yang gue rekomendasikan:

  - conversationId
  - sourceId
  - resolvedUrl
  - originalUrl
  - title?
  - author?
  - publishedAt?
  - siteName?
  - paragraphs: Array<{ index: number; text: string }>
  - documentText
  - createdAt
  - updatedAt

  Index yang dibutuhkan:

  - by_conversation
  - by_source
  - kalau perlu by_conversation_source sebagai lookup utama exact inspection

  Kenapa field ini yang tepat:

  - title, author, publishedAt menutup kebutuhan metadata exact
  - paragraphs[] menutup kebutuhan “paragraf kedua”, “kutipan exact”, “kalimat
    pembuka”
  - documentText tetap berguna untuk fallback inspeksi ringan atau debug
  - resolvedUrl dan originalUrl mencegah kacau karena redirect/proxy URL

  Aturan persist

  - Satu sourceId per conversationId merepresentasikan satu dokumen exact.
  - Kalau source yang sama di-fetch ulang, lakukan upsert, bukan insert buta.
  - sourceChunks tetap boleh dedup sendiri seperti sekarang, tapi
    sourceDocuments jadi sumber kebenaran exact.

  Kontrak tool inspectSourceDocument
  Input:

  - sourceId: string
  - paragraphIndex?: number
  - includeParagraphs?: boolean
  - includeMetadata?: boolean

  Output:

  - success: boolean
  - sourceId: string
  - title?: string
  - author?: string
  - publishedAt?: string
  - siteName?: string
  - requestedParagraph?: { index: number; text: string }
  - paragraphs?: Array<{ index: number; text: string }>
  - exactAvailable: { title: boolean; author: boolean; publishedAt: boolean;
    paragraphs: boolean }
  - error?: string

  Aturan perilaku tool

  - Kalau paragraphIndex dikirim:
      - tool hanya mengembalikan paragraf itu
      - kalau tidak ada, success: false
  - Kalau includeParagraphs=true tanpa paragraphIndex:
      - batasi jumlah paragraf yang dikembalikan, misalnya 20 pertama atau range
        terdekat
  - Untuk pertanyaan title/author/date:
      - tool mengembalikan metadata apa adanya
      - kalau kosong, jangan buat fallback sintetik dari URL

  Aturan perilaku model

  - Klaim exact hanya boleh dibuat dari output tool ini.
  - Jika title kosong:
      - model harus bilang judul exact tidak berhasil diverifikasi
  - Jika requestedParagraph tidak ada:
      - model harus bilang paragraf exact tidak tersedia
  - Model dilarang:
      - menebak dari URL
      - menebak dari citation label
      - menebak dari chunk similarity

  Rekomendasi terbaik di section ini

  - simpan paragraphs[] langsung di tabel, jangan hitung ulang dari documentText
    setiap kali
  - itu bikin hasil exact stabil dan deterministik


---

Section 4: Guardrail Model dan Narasi Tanpa Bocor Jeroan

  Ini penting, karena lo minta model tidak menyebut “search tool”, “available
  web sources”, “RAG”, “fetch”, dan jeroan teknis lain. Gue setuju. Itu harus
  dipaksa di dua lapisan: prompt runtime dan skill rule.

  Guardrail perilaku yang harus ditambahkan

  1. Model dilarang menyebut mekanisme internal.
      - Larang frasa seperti:
          - “berdasarkan tool”
          - “aku ambil dari search tool”
          - “available web sources”
          - “RAG”
          - “retrieval”
          - “database sumber”
          - “fetch web”
      - Sebagai gantinya, model hanya boleh bicara dalam narasi hasil:
          - “aku belum bisa memverifikasi judulnya secara exact”
          - “dari sumber yang berhasil diverifikasi”
          - “di dokumen yang dirujuk”
  2. Model harus membedakan 3 tingkat keyakinan:
      - verified exact
      - verified summary
      - not exact-verifiable
      - Ini bukan untuk ditulis ke user sebagai label teknis, tapi untuk
        perilaku internal model.
  3. Untuk pertanyaan exact-source:
      - kalau exact inspection gagal, model harus menolak dengan tenang
      - bukan menjelaskan tool gagal
      - bukan menjelaskan metadata internal kurang
      - cukup naratif:
          - “aku belum bisa memastikan judul exact-nya dari data yang berhasil
            diverifikasi”
          - “aku belum bisa memastikan itu benar paragraf kedua secara persis”

  File yang harus diubah untuk guardrail ini

  1. src/app/api/chat/route.ts
      - Ini tempat terbaik untuk menambahkan rule global system prompt / tool
        instruction.
      - Tambahkan aturan eksplisit:
          - jangan sebut tool/teknologi internal
          - jawaban ke user harus naratif
          - exact claims hanya boleh dari inspectSourceDocument
  2. src/lib/ai/skills/web-search-quality/SKILL.md
      - Ini harus menegaskan:
          - semantic retrieval ≠ exact inspection
          - exact-source questions wajib pakai tool exact
          - tidak boleh mengungkap jeroan sistem ke user
      - Skill ini sekarang sudah punya rule bagus soal jangan asal klaim title/
        names dari sumber yang tidak terverifikasi, tapi belum cukup keras soal
        exact inspection universal dan larangan bocor mekanisme internal.
  3. src/lib/ai/paper-tools.ts
      - Description tool inspectSourceDocument harus jelas:
          - dipakai untuk exact metadata dan exact paragraph lookup
          - kalau data tidak ada, AI harus bilang tidak bisa diverifikasi exact
      - Ini bantu model dari sisi affordance tool.

  Contoh rule yang benar

  - “Never mention internal tools, retrieval systems, storage layers, search
    pipeline, or implementation details to the user.”
  - “Respond in natural narrative language only.”
  - “If exact metadata or exact paragraph position is unavailable, say that it
    cannot be verified exactly from the verified source data.”
  - “Do not infer article titles from URLs, domain names, slugs, or citation
    labels.”

  Rekomendasi terbaik
  Jangan cuma menambah larangan umum “jangan sebut tool”.
  Yang lebih penting:

  - larang dua hal sekaligus
      1. menyebut jeroan sistem
      2. menambal kekosongan bukti exact dengan tebakan


---

Section 5: Patch Plan Konkret Per File

  Ini urutan patch yang benar kalau lo mau implementasi tanpa ngaco.

  1. Ubah hasil fetch web jadi dokumen exact-friendly
      - File: src/lib/ai/web-search/content-fetcher.ts
      - Tambah struktur output FetchedContent:
          - title?
          - author?
          - publishedAt?
          - siteName?
          - paragraphs?: Array<{ index: number; text: string }>
      - title harus diambil dari metadata page yang sekarang sudah dipakai oleh
        webTitle.ts, bukan dibiarkan hilang.
      - paragraphs harus dibentuk deterministik dari content final yang sudah
        dibersihkan.
  2. Tambah tabel exact document
      - File: convex/schema.ts
      - Tambah tabel sourceDocuments
      - Minimal field:
          - conversationId
          - sourceId
          - originalUrl
          - resolvedUrl
          - title?
          - author?
          - publishedAt?
          - siteName?
          - paragraphs
          - documentText
          - createdAt
          - updatedAt
  3. Buat query/mutation exact document
      - File baru: convex/sourceDocuments.ts
      - Minimal function:
          - upsertDocument
          - getBySource
          - deleteByConversation
      - getBySource adalah basis tool inspectSourceDocument.
  4. Persist exact document saat orchestrator selesai fetch
      - File: src/lib/ai/web-search/orchestrator.ts
      - Setelah fetchPageContent() berhasil dan sebelum/bersamaan dengan
        ingestToRag(), simpan juga ke sourceDocuments.
      - Jangan ganggu jalur semantic retrieval yang ada.
      - Exact persist dan RAG ingest harus jadi dua jalur paralel, bukan saling
        menggantikan.
  5. Tambahkan tool universal inspectSourceDocument
      - File: src/lib/ai/paper-tools.ts
      - Tambah tool:
          - input sourceId, paragraphIndex?, includeParagraphs?,
            includeMetadata?
          - output metadata + paragraf exact
      - Karena createPaperTools() sudah di-spread ke tool utama chat di src/app/
        api/chat/route.ts:1694, tool ini otomatis jadi universal.
  6. Reposisi quoteFromSource
      - File: src/lib/ai/paper-tools.ts
      - Jangan hapus.
      - Tapi ubah deskripsinya secara tegas:
          - ini untuk mencari chunk relevan dalam sumber
          - bukan untuk memastikan paragraf ke-n atau title exact
      - Kalau perlu, tambahkan metadata balik:
          - sourceId
          - title
          - chunkIndex
  7. Tambah guardrail runtime
      - File: src/app/api/chat/route.ts
      - Tambah aturan global:
          - pertanyaan exact-source wajib pakai inspectSourceDocument
          - exact claim tanpa tool exact dilarang
          - jangan sebut jeroan seperti tool, RAG, retrieval, available sources,
            fetch, pipeline internal
  8. Perbarui skill guidance
      - File: src/lib/ai/skills/web-search-quality/SKILL.md
      - Tambahkan rule eksplisit:
          - “judul artikel”, “paragraf kedua”, “verbatim”, “author/date exact” →
            wajib inspectSourceDocument
          - kalau exact tidak tersedia → tolak secara naratif
          - jangan ungkap jeroan sistem
  9. Perbarui cleanup conversation
      - File: convex/conversations.ts
      - Saat conversation dihapus, hapus juga isi sourceDocuments
      - Kalau nggak, data exact document bakal jadi orphan
  10. Tambahkan test

  - File test baru untuk sourceDocuments
  - File test baru untuk tool inspectSourceDocument
  - Tambah test route/prompt behavior kalau user minta exact title/paragraf
  - Tambah test guardrail bahwa model tidak boleh menyebut istilah internal pada
    fallback exact-failure

  Rekomendasi implementasi terbaik
  Kalau dikerjakan, urutan paling aman:

  1. schema + convex/sourceDocuments.ts
  2. content-fetcher.ts
  3. orchestrator.ts
  4. inspectSourceDocument di paper-tools.ts
  5. prompt/skill guardrail
  6. test
