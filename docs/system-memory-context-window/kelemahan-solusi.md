Daftar Lengkap Kelemahan (7 items)                                                                                                                                                                        
                                                                                                                                                                                                            
  Dari riset sebelumnya, ini semua kelemahan yang teridentifikasi, diurutkan dari paling impactful:                                                                                                         

  ┌─────┬───────────────────────────────────────────────────────────────────┬──────────┬───────────────────────────────────────────┐                                                                        
  │  #  │                             Kelemahan                             │ Severity │           Pain Point Sekarang?            │                                                                        
  ├─────┼───────────────────────────────────────────────────────────────────┼──────────┼───────────────────────────────────────────┤                                                                        
  │ W1  │ Artifact content nggak auto-injected ke context tahap selanjutnya │ High     │ Ya — AI kehilangan detail                 │                                                                        
  ├─────┼───────────────────────────────────────────────────────────────────┼──────────┼───────────────────────────────────────────┤
  │ W2  │ Tidak ada message windowing / token budget tracking               │ Medium   │ Belum (1M window), tapi risiko masa depan │
  ├─────┼───────────────────────────────────────────────────────────────────┼──────────┼───────────────────────────────────────────┤
  │ W3  │ Web search guard berbasis regex, bypassable                       │ Medium   │ Ya — AI kadang hallucinate referensi      │
  ├─────┼───────────────────────────────────────────────────────────────────┼──────────┼───────────────────────────────────────────┤
  │ W4  │ isDirty flag nggak dipakai di UI                                  │ Medium   │ Ya — user nggak tahu stageData desync     │
  ├─────┼───────────────────────────────────────────────────────────────────┼──────────┼───────────────────────────────────────────┤
  │ W5  │ Ringkasan extreme compression (200 char) kehilangan nuansa        │ Medium   │ Ya — AI lupa detail di tahap akhir        │
  ├─────┼───────────────────────────────────────────────────────────────────┼──────────┼───────────────────────────────────────────┤
  │ W6  │ Paper Memory Digest nggak pernah di-prune                         │ Low      │ Belum terasa                              │
  ├─────┼───────────────────────────────────────────────────────────────────┼──────────┼───────────────────────────────────────────┤
  │ W7  │ Stage data field nggak ada size limit                             │ Low      │ Belum terasa                              │
  └─────┴───────────────────────────────────────────────────────────────────┴──────────┴───────────────────────────────────────────┘

  ---
  Solusi Section 1: W1 — Artifact Content Isolation

  Masalah: AI di tahap 10 nggak bisa baca konten artifact dari tahap 4. Hanya punya ringkasan 200 char. Detail penting (outline lengkap, draft abstrak, daftar pustaka) hilang dari "ingatan" AI.

  3 Pendekatan:

  ┌───────────────────────────────┬─────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────┬─────────────────────────────────────────────┐
  │           Approach            │                                  Mekanisme                                  │                    Pro                     │                   Kontra                    │
  ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ A) Artifact Summary Injection │ Saat format stageData, auto-fetch artifact content dari tahap selesai,      │ AI punya akses ringkasan konten artifact,  │ +~6.500 char di tahap akhir (~1.600 token). │
  │  (Recommended)                │ truncate ke ~500 char per artifact, inject ke prompt                        │ bukan cuma ringkasan keputusan             │  Masih sangat aman di 1M window             │
  ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ B) On-Demand Artifact         │ Tambah AI tool getArtifactContent({ artifactId }) agar AI bisa query        │ Zero overhead kalau nggak dipakai          │ AI harus "ingat" untuk panggil tool. Sering │
  │ Retrieval                     │ artifact saat butuh                                                         │                                            │  lupa                                       │
  ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ C) Full Artifact Injection    │ Inject seluruh konten artifact dari semua tahap selesai                     │ AI punya akses penuh                       │ Bisa 50.000+ char. Wasteful, prompt bloat   │
  └───────────────────────────────┴─────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────┴─────────────────────────────────────────────┘

  Rekomendasi: Approach A — Artifact Summary Injection. Otomatis, predictable overhead, dan nggak bergantung pada AI "ingat" untuk query. Overhead ~1.600 token di tahap akhir itu nggak signifikan.

  Implementasi: Modifikasi formatStageData.ts → untuk setiap tahap yang punya artifactId, fetch artifact content, truncate ke 500 char, dan append ke output formatted data.

  Solusi Section 2: W2 — Tidak Ada Message Windowing / Token Budget Tracking                                                                                                                                
                                                         
  Masalah: Semua pesan conversation dikirim ke model tanpa pruning. Nggak ada tracking seberapa dekat ke context limit. Saat ini aman karena Gemini 1M, tapi fragile kalau switch model atau session sangat 
  panjang.                                                                  
                                                                                                                                                                                                            
  3 Pendekatan:                                                             

  ┌─────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────┬────────────────────────────────┐
  │              Approach               │                                       Mekanisme                                       │                   Pro                   │             Kontra             │
  ├─────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┼────────────────────────────────┤
  │ A) Context Budget Monitor + Soft    │ Hitung estimasi token sebelum kirim. Kalau > threshold (misal 80% capacity), prune    │ Future-proof, graceful degradation,     │ Perlu token estimator (bisa    │
  │ Window (Recommended)                │ pesan lama tapi keep system prompt + digest + N pesan terakhir                        │ nggak ganggu user normal                │ simple: chars/4)               │
  ├─────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┼────────────────────────────────┤
  │ B) Hard Message Limit               │ Selalu kirim max N pesan terakhir (misal 100)                                         │ Simple, predictable                     │ Bisa kehilangan context        │
  │                                     │                                                                                       │                                         │ penting di awal session        │
  ├─────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┼────────────────────────────────┤
  │ C) Progressive Summarization        │ Kalau pesan > threshold, summarize batch lama jadi 1 pesan ringkasan                  │ Preserve context dengan compression     │ Butuh extra LLM call, latency, │
  │                                     │                                                                                       │                                         │  cost                          │
  └─────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────┴────────────────────────────────┘

  Rekomendasi: Approach A — Context Budget Monitor + Soft Window.

  Kenapa: Paper Memory Digest sudah jadi "summarized history" natural. Jadi kalau pesan lama di-prune, AI masih punya digest sebagai anchor. Ini leverage infrastructure yang sudah ada.

  Implementasi:
  1. Tambah fungsi estimateTokenCount(messages, systemPrompt) — simple chars/4
  2. Di route.ts, sebelum streamText(): cek total estimated tokens
  3. Kalau > threshold → slice messages, keep: system prompt + paper context + N pesan terakhir
  4. Log warning ke systemAlerts kalau pruning terjadi

  ---
  Solusi Section 3: W3 — Web Search Guard Berbasis Regex, Bypassable

  Masalah: 3-layer protection pakai regex pattern matching di natural language. AI bisa bypass dengan phrasing yang nggak tertangkap. Contoh: AI tulis "Based on recent studies..." tanpa pernah search —
  referensi di-hallucinate.

  3 Pendekatan:

  ┌─────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────┬────────────────────────────┬──────────────────────────────────────────────────┐
  │            Approach             │                                      Mekanisme                                       │            Pro             │                      Kontra                      │
  ├─────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┼──────────────────────────────────────────────────┤
  │ A) Source Validation di Backend │ Saat updateStageData dengan field referensi, validasi bahwa setiap referensi punya   │ Hard enforcement, AI nggak │ Nggak bisa validasi apakah URL legit (tapi URL   │
  │  (Recommended)                  │ url yang bukan kosong. Reject kalau nggak ada URL                                    │  bisa bypass               │ dari google_search pasti ada)                    │
  ├─────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┼──────────────────────────────────────────────────┤
  │ B) Cross-check dengan Search    │ Track semua URL dari google_search results. Saat referensi disimpan, cek apakah URL  │ Strict validation, prove   │ Complex, butuh search result logging             │
  │ History                         │ ada di search history                                                                │ source exists              │                                                  │
  ├─────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────┼──────────────────────────────────────────────────┤
  │ C) Tambah Regex Patterns        │ Perluas regex di paper-search-helpers.ts                                             │ Quick fix                  │ Tetap bypassable, whack-a-mole                   │
  └─────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────┴────────────────────────────┴──────────────────────────────────────────────────┘

  Rekomendasi: Approach A — Source Validation di Backend.

  Kenapa: Simple, hard enforcement. Kalau referensi nggak punya URL → reject. URL hanya bisa datang dari google_search results. Ini tutup celah tanpa complexity tinggi.

  Implementasi:
  1. Di updateStageData mutation, kalau field adalah referensi array (referensiAwal, referensiPendukung, referensi, sitasiAPA, sitasiTambahan):
  2. Validasi setiap entry punya url yang non-empty
  3. Kalau ada entry tanpa URL → return warning (bukan hard error, biar nggak block flow) + inject system note ke AI: "Referensi tanpa URL terdeteksi, wajib gunakan google_search"

  ---
  Solusi Section 4: W4 — isDirty Flag Nggak Dipakai di UI

  Masalah: isDirty flag di-track di backend (set true saat user edit/regenerate pesan setelah stageData disimpan), tapi nggak ada UI indicator. User nggak tahu stageData sudah desync dengan chat.

  2 Pendekatan:

  ┌────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────┬───────────────────────────────┐
  │              Approach              │                                      Mekanisme                                      │                     Pro                     │            Kontra             │
  ├────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────┼───────────────────────────────┤
  │ A) Warning Banner di Validation    │ Saat isDirty === true dan AI submit untuk validasi, tampilkan warning: "Data tahap  │ Minimal UI change, tepat di momen yang      │ Hanya muncul saat validasi,   │
  │ Panel (Recommended)                │ ini mungkin belum sinkron dengan percakapan terbaru"                                │ paling penting (sebelum approve)            │ bukan real-time               │
  ├────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────┼───────────────────────────────┤
  │ B) Real-time Indicator di Stage    │ Badge/icon di PaperStageProgress yang menandakan stage dirty                        │ User selalu tahu                            │ Bisa overwhelming, noise      │
  │ Progress                           │                                                                                     │                                             │                               │
  └────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────┴───────────────────────────────┘

  Rekomendasi: Approach A — Warning Banner di Validation Panel.

  Kenapa: Momen paling kritis adalah saat user mau approve. Kalau di situ ada warning "data mungkin belum sinkron", user bisa minta AI update dulu sebelum approve. Simple, targeted.

  Implementasi:
  1. Di komponen validation panel, cek session.isDirty
  2. Kalau true, tampilkan warning banner dengan CTA: "Minta AI sinkronkan data sebelum approve"
  3. Opsional: disable tombol Approve saat dirty, force user resolve dulu

  ---
  Solusi Section 5: W5 — Ringkasan Extreme Compression (200 char)

  Masalah: Ringkasan 200 char kehilangan nuansa. AI di tahap akhir nggak ingat detail diskusi dari tahap awal. Contoh: research gap kompleks → "Gap: belum ada studi di Indonesia".

  3 Pendekatan:

  ┌─────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────┬────────────────────────────────────────┐
  │          Approach           │                                      Mekanisme                                       │                   Pro                   │                 Kontra                 │
  ├─────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┼────────────────────────────────────────┤
  │ A) Dual-Layer Ringkasan     │ Pertahankan ringkasan 280 char (short) untuk digest. Tambah field ringkasanDetail    │ Best of both worlds: digest tetap       │ +~1.000 char per tahap di prompt.      │
  │ (Recommended)               │ max 1.000 char yang di-inject ke prompt saat tahap terkait relevan                   │ compact, detail tersedia saat butuh     │ Perlu logic "kapan inject detail"      │
  ├─────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┼────────────────────────────────────────┤
  │ B) Naikkan Limit Ringkasan  │ Ubah dari 280 char ke 800 char                                                       │ Simple                                  │ Digest jadi bloated, semua tahap kena  │
  ├─────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────┼────────────────────────────────────────┤
  │ C) Biarkan, Rely on         │ Kalau W1 diimplementasi, artifact summary 500 char sudah menutupi                    │ Zero extra work                         │ Artifact summary beda fokus dari       │
  │ Artifact Summary (W1)       │                                                                                      │                                         │ decision summary                       │
  └─────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────┴────────────────────────────────────────┘

  Rekomendasi: Approach A — Dual-Layer Ringkasan.

  Kenapa: ringkasan (short) tetap jadi memory anchor yang compact di digest. ringkasanDetail (long) di-inject selektif — misalnya hanya untuk 3 tahap terakhir yang selesai, atau hanya saat tahap saat ini
  secara tematik terkait (e.g., Diskusi perlu detail dari Pendahuluan dan Tinjauan Literatur).

  Implementasi:
  1. Tambah field ringkasanDetail (optional, max 1.000 char) di setiap stage data type
  2. Update tool description updateStageData untuk encourage AI mengisi ringkasanDetail
  3. Di formatStageData, inject ringkasanDetail untuk 3 tahap terakhir yang selesai (bukan semua, hemat token)
  4. Overhead: +3.000 char max di prompt (~750 token)

  ---
  Solusi Section 6: W6 — Paper Memory Digest Nggak Pernah Di-prune

  Masalah: Superseded entries (dari rewind) nggak pernah dihapus. Multiple rewind cycles bisa accumulate 20+ entries. AI lihat versi lama dan baru, bisa bingung.

  2 Pendekatan:

  Approach: A) Filter Superseded saat Format (Recommended)
  Mekanisme: Di formatStageData, skip entries dengan superseded: true. Tetap simpan di database untuk audit trail
  Pro: Zero data loss, AI hanya lihat keputusan current
  Kontra: Minimal effort
  ────────────────────────────────────────
  Approach: B) Hard Prune saat Rewind
  Mekanisme: Delete superseded entries dari array
  Pro: Simpler data
  Kontra: Kehilangan audit trail

  Rekomendasi: Approach A — Filter saat format.

  Kenapa: Data tetap di database (audit trail terjaga), tapi AI nggak pernah lihat keputusan yang sudah di-supersede. Satu line filter di formatStageData.

  Implementasi: Di formatRingkasanTahapSelesai, tambah .filter(entry => !entry.superseded) sebelum render digest entries ke prompt.

  ---
  Solusi Section 7: W7 — Stage Data Field Nggak Ada Size Limit

  Masalah: AI bisa save teks sangat panjang ke field seperti analisis, ideKasar, dll. Nggak ada char limit di backend. Risiko: database bloat + prompt overflow saat field di-inject.

  2 Pendekatan:

  ┌────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────┬───────────────────────────────┐
  │                  Approach                  │                                      Mekanisme                                      │                 Pro                 │            Kontra             │
  ├────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────┼───────────────────────────────┤
  │ A) Truncate di Mutation + Warning          │ Di updateStageData, truncate field teks ke max 2.000 char. Return warning ke AI     │ Prevent bloat, AI aware kalau kena  │ Perlu define limit per field  │
  │ (Recommended)                              │ kalau truncated                                                                     │ limit                               │ type                          │
  ├────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────┼───────────────────────────────┤
  │ B) Zod Validation di Tool Definition       │ Tambah .max(2000) di Zod schema tiap field                                          │ Validation di client side (AI       │ AI bisa error, nggak graceful │
  │                                            │                                                                                     │ layer)                              │                               │
  └────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────┴───────────────────────────────┘

  Rekomendasi: Approach A — Truncate di mutation + warning.

  Kenapa: Graceful — data tetap disimpan (truncated), AI dapet feedback "field X di-truncate ke 2.000 char". Nggak blocking, nggak error.

  Implementasi:
  1. Di updateStageData mutation, setelah key whitelist validation
  2. Untuk setiap string field (bukan array, bukan ID): truncate ke 2.000 char
  3. Kalau ada truncation, append warning ke return message

  ---
  Rangkuman Seluruh Solusi

  ┌─────┬───────────────────────────────┬──────────────────────────────────────────────────────────┬────────┬───────────────────────┐
  │  #  │           Kelemahan           │                          Solusi                          │ Effort │        Impact         │
  ├─────┼───────────────────────────────┼──────────────────────────────────────────────────────────┼────────┼───────────────────────┤
  │ W1  │ Artifact content isolation    │ Artifact Summary Injection (500 char/artifact di prompt) │ Medium │ High                  │
  ├─────┼───────────────────────────────┼──────────────────────────────────────────────────────────┼────────┼───────────────────────┤
  │ W2  │ No message windowing          │ Context Budget Monitor + Soft Window                     │ Medium │ Medium (future-proof) │
  ├─────┼───────────────────────────────┼──────────────────────────────────────────────────────────┼────────┼───────────────────────┤
  │ W3  │ Web search guard bypassable   │ Source Validation di backend (URL wajib)                 │ Low    │ High                  │
  ├─────┼───────────────────────────────┼──────────────────────────────────────────────────────────┼────────┼───────────────────────┤
  │ W4  │ isDirty flag unused           │ Warning Banner di Validation Panel                       │ Low    │ Medium                │
  ├─────┼───────────────────────────────┼──────────────────────────────────────────────────────────┼────────┼───────────────────────┤
  │ W5  │ Ringkasan extreme compression │ Dual-Layer Ringkasan (short + detail 1.000 char)         │ Medium │ High                  │
  ├─────┼───────────────────────────────┼──────────────────────────────────────────────────────────┼────────┼───────────────────────┤
  │ W6  │ Digest nggak di-prune         │ Filter superseded saat format prompt                     │ Low    │ Low                   │
  ├─────┼───────────────────────────────┼──────────────────────────────────────────────────────────┼────────┼───────────────────────┤
  │ W7  │ No field size limit           │ Truncate di mutation + warning                           │ Low    │ Low                   │
  └─────┴───────────────────────────────┴──────────────────────────────────────────────────────────┴────────┴───────────────────────┘

  Urutan implementasi yang gue rekomendasikan (highest impact + lowest effort first):
  1. W6 → 1 line filter, instant win
  2. W3 → URL validation, tutup celah hallucination
  3. W4 → Warning banner, simple UI
  4. W7 → Truncation guard
  5. W1 → Artifact summary injection
  6. W5 → Dual-layer ringkasan
  7. W2 → Context budget monitor (paling complex, paling future-proof)

