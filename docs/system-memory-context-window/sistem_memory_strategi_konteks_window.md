Analisis: Sistem Memory & Strategi Konteks Window di Paper Workflow                                                                                                                                       
                                                                               
  Riset selesai. Hasilnya cukup menarik — ada strategi yang cerdas tapi juga ada gap yang signifikan. Gue breakdown per aspek.                                                                              
                                                                                                                                                                                                            
  ---                                                                                                                                                                                                       
  1. Arsitektur Memory: 4 Layer                                                                                                                                                                             

  Sistem ini punya 4 layer memory yang saling melengkapi:                                                                                                                                                   
                                                                                                                                                                                                            
  ┌─────────────────────────┬────────────────────────────────────────────────────────┬───────────────────────────────────┬────────────────────────────────────────┐
  │          Layer          │                       Mekanisme                        │              Ukuran               │              Persistensi               │
  ├─────────────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────┼────────────────────────────────────────┤
  │ L1: Chat History        │ Seluruh pesan conversation                             │ Tak terbatas (bergantung model)   │ Di database, dikirim semua ke model    │
  ├─────────────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────┼────────────────────────────────────────┤
  │ L2: Paper Memory Digest │ Array keputusan ter-approve per tahap                  │ Max ~2.600 chars (13 × 200 char)  │ Di database, injected ke system prompt │
  ├─────────────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────┼────────────────────────────────────────┤
  │ L3: Stage Data          │ Structured data per tahap (ringkasan, referensi, dll.) │ ~1.000 char per field (truncated) │ Di database, formatted lalu injected   │
  ├─────────────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────┼────────────────────────────────────────┤
  │ L4: Artifacts           │ Dokumen lengkap hasil tiap tahap                       │ Tidak dibatasi                    │ Di database, TIDAK auto-injected       │
  └─────────────────────────┴────────────────────────────────────────────────────────┴───────────────────────────────────┴────────────────────────────────────────┘

  ★ Insight ─────────────────────────────────────
  - L2 (Digest) adalah jantung memory system — ini "compressed decision log" yang membuat AI tetap koherent lintas 13 tahap. Tanpa ini, AI harus parse ratusan pesan chat untuk ingat apa yang sudah
  disepakati.
  - L4 (Artifacts) adalah blind spot — konten artifact dari tahap sebelumnya TIDAK otomatis di-inject ke context. AI hanya bisa "ingat" tahap lama via ringkasan 200 char, bukan via konten artifact
  lengkap.
  ─────────────────────────────────────────────────

  ---
  2. Ringkasan Sebagai Memory Anchor

  Ini mekanisme paling kritis. Flow-nya:

  Diskusi panjang (1000+ kata)
      ↓ kompresi
  updateStageData({ ringkasan: "max 280 char" })
      ↓ approval
  approveStage() → digest entry (truncated ke 200 char)
      ↓ di tahap selanjutnya
  formatStageData() → "RINGKASAN TAHAP SELESAI: ..."
      ↓ injected ke
  System prompt AI

  Compression ratio: Diskusi bisa ratusan pesan → 200 karakter keputusan final.

  Kekuatan: Extreme compression memungkinkan 13 tahap tanpa ledakan context.

  Kelemahan: Informasi nuansa hilang. Contoh:
  - Diskusi panjang soal research gap spesifik → ringkasan jadi "Gap: belum ada studi di Indonesia"
  - AI di tahap 10 nggak ingat detail gap yang sebenarnya sudah didiskusikan di tahap 2

  ---
  3. Context Scoping Strategy

  Sistem ini punya strategi cerdas untuk minimize context bloat:

  Hanya Instruksi Tahap Aktif yang Di-inject

  getStageInstructions(stage) return instruksi hanya untuk tahap saat ini, bukan semua 13 tahap.

  ┌───────────────────────────┬──────────────────────┐
  │         Strategi          │     Ukuran Hemat     │
  ├───────────────────────────┼──────────────────────┤
  │ Inject semua 13 instruksi │ ~40.000-50.000 chars │
  ├───────────────────────────┼──────────────────────┤
  │ Inject hanya tahap aktif  │ ~3.000 chars         │
  ├───────────────────────────┼──────────────────────┤
  │ Penghematan               │ ~90% lebih kecil     │
  └───────────────────────────┴──────────────────────┘

  Truncation di formatStageData

  - Field teks panjang: di-truncate ke SUMMARY_CHAR_LIMIT = 1.000 chars
  - Ringkasan: di-truncate ke RINGKASAN_CHAR_LIMIT = 280 chars
  - Outline checklist: max depth 2, max 10 section
  - Referensi array: ditampilkan lengkap (ini potensi bloat)

  Estimasi Total Context Injected per Tahap

  ┌─────────────────────────┬──────────────────┬──────────────────┬───────────────────┐
  │        Komponen         │ Tahap Awal (1-3) │ Tahap Tengah (7) │ Tahap Akhir (10+) │
  ├─────────────────────────┼──────────────────┼──────────────────┼───────────────────┤
  │ Base paper mode prompt  │ ~1.100 chars     │ ~1.100 chars     │ ~1.100 chars      │
  ├─────────────────────────┼──────────────────┼──────────────────┼───────────────────┤
  │ Stage instructions      │ ~3.000 chars     │ ~3.000 chars     │ ~3.000 chars      │
  ├─────────────────────────┼──────────────────┼──────────────────┼───────────────────┤
  │ Ringkasan tahap selesai │ ~600 chars       │ ~1.800 chars     │ ~2.500 chars      │
  ├─────────────────────────┼──────────────────┼──────────────────┼───────────────────┤
  │ Active stage data       │ ~500 chars       │ ~1.500 chars     │ ~2.000 chars      │
  ├─────────────────────────┼──────────────────┼──────────────────┼───────────────────┤
  │ Outline checklist       │ —                │ ~500 chars       │ ~500 chars        │
  ├─────────────────────────┼──────────────────┼──────────────────┼───────────────────┤
  │ Total injected          │ ~5.200 chars     │ ~7.900 chars     │ ~9.100 chars      │
  ├─────────────────────────┼──────────────────┼──────────────────┼───────────────────┤
  │ Estimasi token          │ ~1.300 tokens    │ ~1.975 tokens    │ ~2.275 tokens     │
  └─────────────────────────┴──────────────────┴──────────────────┴───────────────────┘

  ★ Insight ─────────────────────────────────────
  - ~2.275 tokens untuk seluruh paper context di tahap akhir itu sangat efisien. Gemini 2.5 Flash punya 1M token context window, jadi overhead paper mode cuma ~0.2% dari kapasitas.
  - Trade-off-nya: efisiensi ini dicapai dengan lossy compression — banyak detail yang hilang demi hemat token.
  ─────────────────────────────────────────────────

  ---
  4. Anti-Hallucination Mechanisms

  4.1 Stage Key Whitelist

  File convex/paperSessions.ts punya STAGE_KEY_WHITELIST — daftar field yang boleh ditulis per tahap. AI nggak bisa invent field sembarangan.

  - Kalau AI kirim key yang nggak ada di whitelist → error langsung
  - Ini mencegah "schema drift" — AI nggak bisa bikin field ngawur

  4.2 normalizeReferensiData

  Parser yang convert string citation ke structured object:
  - AI sering kirim referensiAwal: ["Smith 2024 - Title"] (string)
  - Parser extract: title, authors, year, URL dari string
  - Convert ke object terstruktur

  Catatan: Ini normalize FORMAT, tapi nggak validate KEASLIAN. Kalau AI hallucinate referensi "Smith 2024 - Fake Paper", parser tetap terima.

  4.3 Web Search 3-Layer Protection

  ┌────────────────┬──────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────┐
  │     Layer      │                      Mekanisme                       │                                     Cek Apa                                      │
  ├────────────────┼──────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
  │ Task-based     │ isStageResearchIncomplete()                          │ Stage butuh referensi tapi belum cukup (e.g., gagasan butuh min 2 referensiAwal) │
  ├────────────────┼──────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
  │ Intent-based   │ aiIndicatedSearchIntent()                            │ 10 regex pattern cek apakah AI janji mau search di pesan sebelumnya              │
  ├────────────────┼──────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
  │ Language-based │ isUserConfirmation() / isExplicitSaveSubmitRequest() │ Deteksi user bilang "ya", "ok", "simpan"                                         │
  └────────────────┴──────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────┘

  System notes yang di-inject:
  - PAPER_TOOLS_ONLY_NOTE: "google_search TIDAK TERSEDIA... JANGAN berjanji akan mencari"
  - getResearchIncompleteNote(): "JIKA ANDA SKIP PENCARIAN, ANDA MELANGGAR PROTOKOL"

  4.4 Stage Instruction Guards

  Di SETIAP file instruksi tahap, ada larangan eksplisit yang diulang:
  - "JANGAN PERNAH mengarang/hallucinate referensi"
  - "JANGAN PERNAH mengarang data faktual"
  - "JANGAN menyusun draft dengan referensi sebelum google_search"

  Diulang 12+ kali across codebase — strategi repetisi supaya model nggak "lupa".

  4.5 Auto-Stage Safety

  updateStageData tool TIDAK punya parameter stage. Tool auto-fetch dari session.currentStage. Ini mencegah error "Cannot update topik while in gagasan" yang sering terjadi kalau AI confused soal
  posisinya.

  ---
  5. Context Window Strategy

  Temuan Kritis: TIDAK ADA Message Truncation

  Ini finding paling penting dari riset ini.

  Di src/app/api/chat/route.ts:
  - Semua pesan conversation di-fetch dari database
  - Dikirim langsung ke streamText() tanpa preprocessing
  - Tidak ada maxMessages parameter
  - Tidak ada sliding window / message slicing
  - Tidak ada summarization layer
  - Tidak ada token budget calculation

  Kenapa Ini (Saat Ini) Bukan Masalah

  Sistem bergantung sepenuhnya pada kapasitas model:

  ┌────────────────────┬──────────────────┬───────────────────────────────────┬──────────┐
  │       Model        │  Context Window  │   Paper Session Estimate (max)    │ Headroom │
  ├────────────────────┼──────────────────┼───────────────────────────────────┼──────────┤
  │ Gemini 2.5 Flash   │ 1.048.576 tokens │ ~50.000-100.000 tokens (200 turn) │ ~90%+    │
  ├────────────────────┼──────────────────┼───────────────────────────────────┼──────────┤
  │ GPT-5.1 (fallback) │ 1.047.576 tokens │ Same                              │ ~90%+    │
  └────────────────────┴──────────────────┴───────────────────────────────────┴──────────┘

  Dengan model 1M token, paper session 13 tahap kemungkinan besar nggak akan overflow. Tapi ini implicit reliance, bukan explicit management.

  Kapan Ini Bisa Jadi Masalah

  1. Switch ke model dengan context lebih kecil — Kalau someday pakai model 128K, paper session bisa overflow
  2. Paper session sangat panjang — User yang revisi berkali-kali di banyak tahap bisa accumulate 300+ turn
  3. No degradation signal — Sistem nggak tahu kalau mendekati limit, nggak ada warning

  ★ Insight ─────────────────────────────────────
  - Strategi "rely on big context" ini common di era model 1M+ token. Trade-off: simple implementation, tapi brittle kalau model berubah.
  - Best practice yang belum diterapkan: sliding window (buang pesan lama, keep ringkasan), token budget monitor, atau progressive summarization.
  - Paper Memory Digest sebenarnya SUDAH jadi fondasi untuk sliding window — tinggal implement: kalau total context > threshold, replace old messages dengan digest entries.
  ─────────────────────────────────────────────────

  ---
  6. Gap & Kelemahan

  Gap Kritis

  ┌─────┬───────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────┬──────────┐
  │  #  │                  Gap                  │                                  Dampak                                  │ Severity │
  ├─────┼───────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┼──────────┤
  │ 1   │ Tidak ada token budget tracking       │ Sistem nggak tahu seberapa dekat ke limit context                        │ Medium   │
  ├─────┼───────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┼──────────┤
  │ 2   │ Tidak ada message windowing           │ Semua pesan dikirim, nggak ada pruning                                   │ Medium   │
  ├─────┼───────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┼──────────┤
  │ 3   │ Artifact content nggak auto-injected  │ AI di tahap 10 nggak bisa baca artifact tahap 4 kecuali secara eksplisit │ High     │
  ├─────┼───────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┼──────────┤
  │ 4   │ isDirty flag nggak dipakai di UI      │ User nggak tahu kalau stageData desync dengan chat                       │ Medium   │
  ├─────┼───────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┼──────────┤
  │ 5   │ Web search guard berbasis regex       │ AI bisa bypass dengan phrasing yang nggak tertangkap pattern             │ Medium   │
  ├─────┼───────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┼──────────┤
  │ 6   │ Digest nggak pernah di-prune          │ Superseded entries numpuk setelah multiple rewind                        │ Low      │
  ├─────┼───────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┼──────────┤
  │ 7   │ Stage data field nggak ada size limit │ AI bisa save 10.000+ kata ke satu field                                  │ Low      │
  └─────┴───────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────┴──────────┘

  Skenario Breakdown Koherensi

  Skenario 1: Ringkasan Information Loss (Probabilitas: Medium)
  - Diskusi kompleks di tahap 2 soal research gap
  - Ringkasan: "Gap: belum ada studi di Indonesia" (oversimplified)
  - Di tahap 9 (Diskusi), AI nggak ingat detail spesifik gap
  - Diskusi section misalign dengan intent original

  Skenario 2: Artifact Desync (Probabilitas: Medium)
  - Artifact tahap 4 dibuat, lalu user edit pesan chat dan regenerate
  - isDirty flag di-set tapi nggak ada UI warning
  - Artifact stale, user nggak tahu

  Skenario 3: Web Search Bypass (Probabilitas: Medium)
  - Mode function tools aktif (google_search nggak available)
  - AI tulis: "Based on recent studies, we find..."
  - Nggak ada search dilakukan — referensi di-hallucinate
  - Lolos karena nggak ada source validation di backend

  Skenario 4: Superseded Digest Confusion (Probabilitas: Low)
  - User rewind berkali-kali
  - Digest punya 3 versi keputusan "topik" (2 superseded)
  - AI lihat semua 3 entries, bingung mana yang current

  ---
  7. Kekuatan Arsitektur

  Meskipun ada gap, arsitektur ini punya beberapa design decision yang bagus:

  ┌───────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────┐
  │                   Kekuatan                    │                                Kenapa Efektif                                │
  ├───────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Ringkasan sebagai compression anchor          │ 1000+ kata diskusi → 200 char keputusan. Memory economy luar biasa           │
  ├───────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Stage instruction scoping                     │ Hemat ~90% context dengan hanya inject tahap aktif                           │
  ├───────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ STAGE_KEY_WHITELIST                           │ Hard validation mencegah schema drift — AI nggak bisa bikin field ngawur     │
  ├───────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Auto-stage di updateStageData                 │ Eliminasi seluruh kelas bug "wrong stage update"                             │
  ├───────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ 3-layer web search enforcement                │ Defense-in-depth: kalau satu layer miss, layer lain catch                    │
  ├───────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Zod validation di tool definitions            │ Hard constraint di tool parameter level                                      │
  ├───────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ Repetisi larangan di setiap stage instruction │ Brute-force reinforcement supaya model nggak "lupa" anti-hallucination rules │
  └───────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────┘

  ---
  Kesimpulan

  Sistem memory di paper workflow ini menggunakan lossy compression strategy — mempertahankan keputusan inti (via ringkasan/digest) sambil sacrifice detail nuansa. Ini trade-off yang reasonable untuk
  workflow 13 tahap.

  Context window strategy: Fully implicit — bergantung pada kapasitas 1M token Gemini. Nggak ada explicit management, tapi juga nggak butuh (untuk sekarang).

  Anti-hallucination: Multi-layered tapi ada celah di language-based detection. Backend validation (key whitelist, Zod) lebih robust dari prompt-based guards.

  Biggest gap: Artifact content isolation — AI di tahap lanjut nggak punya akses langsung ke konten artifact tahap sebelumnya, hanya ringkasan 200 char.

