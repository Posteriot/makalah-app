# Glosarium Makalah AI

Dokumen ini berisi daftar istilah teknis, konsep, dan arsitektur spesifik yang digunakan dalam ekosistem Makalah AI.

---

## #
- **4-Panel Architecture**: Arsitektur tata letak antarmuka utama yang terdiri dari Activity Bar, Sidebar (Riwayat & Linimasa), Main Area (Chat), dan Artifact Panel (Meja kerja sisi kanan).

## A
- **Academic Escape Clause**: Aturan baku System Prompt yang melarang AI mengubah istilah teknis, rumus, dan format sitasi saat proses konversi gaya bahasa (Refrasa) demi menjaga integritas ilmiah.
- **Active Search**: Kebijakan pencarian di mana AI didorong secara aktif mengeksplorasi informasi baru dari web (berlaku pada tahap Gagasan & Tinjauan Literatur).
- **Agent Harness**: Sistem orkestrasi di atas LLM yang secara deterministik mengontrol, memvalidasi, dan mengarahkan perilaku AI agar mematuhi alur aplikasi.
- **Approved Status**: Status siklus hidup draf di mana pengguna telah menyetujui hasil kerja AI, mengunci data tahap tersebut dan memasukkannya ke dalam Naskah Bertumbuh.
- **Artifak (Artifact)**: Representasi visual draf paper per section/subbab yang "hidup". Bersifat modular dan memiliki riwayat versi independen. Merupakan bukti bahwa diskusi di suatu tahap telah difinalisasi menjadi draf.
- **Artifact Indicator (Kartu Artifak)**: Kartu yang muncul di dalam area chat untuk merepresentasikan draf yang sedang atau telah disusun. Mengklik kartu ini akan memicu munculnya Panel Artifak.
- **Auth Recovery Rate Limiting**: Sistem pembatasan laju multi-dimensi (per *key*, per email, per IP) dengan *cooldown* yang meningkat (*escalating*) untuk mencegah serangan *brute force* pada *magic link* dan permintaan lupa sandi.
- **Auto-Rescue**: Mekanisme penyelamatan otonom yang memindahkan status tahap menjadi `revision` jika AI mencoba melakukan *updateArtifact* padahal belum ada permintaan revisi formal.

## B
- **BetterAuth**: Solusi autentikasi terpusat yang mendukung sesi lintas domain dan terintegrasi mendalam dengan Convex.
- **BPP (Bayar Per Paper)**: Tier langganan *pay-as-you-go* menggunakan sistem saldo kredit, di mana setiap operasi memotong saldo dan tidak memiliki batas kuota bulanan.

## C
- **Choice Card**: "Bahasa visual" AI berupa opsi interaktif di area chat yang mempermudah User mengambil keputusan tanpa harus mengetik instruksi panjang. Pilihan ini merutekan langkah eksplorasi atau finalisasi.
- **Choice YAML Prompt**: Instruksi *hardcoded* yang mendefinisikan "Bahasa Visual" AI, memaksa AI menjawab menggunakan format Choice Card beserta opsi aksi alur kerjanya.
- **Cloudflare Turnstile**: Proteksi bot "invisible" tanpa CAPTCHA yang divalidasi sisi server untuk mengamankan alur autentikasi.
- **COMPOSE_PHASE_DIRECTIVE**: Instruksi sistem ketat yang disuntikkan ke AI pada fase sintesis untuk memastikan *Zero Fabrication* dan melarang janji pencarian baru.
- **Context Compaction**: Strategi manajemen memori otomatis (seperti menghapus chitchat atau meringkas pesan lama) untuk mencegah kelebihan beban token ketika riwayat obrolan sangat panjang.
- **Control Plane vs Domain Actions**: Prinsip pemisahan di mana *Control Plane* (Harness) mengatur lifecycle *runtime* secara otomatis, sedangkan *Domain Actions* adalah tindakan spesifik workflow yang di-*trigger* model via *tool calls*.
- **CONVEX_INTERNAL_KEY**: Kunci rahasia yang mengamankan mutasi internal *backend-to-backend* (seperti dari *webhook* pembayaran) agar tidak bisa dipanggil langsung oleh klien eksternal.
- **Convex**: Infrastruktur *backend* reaktif yang menggabungkan database *realtime*, fungsi *serverless*, dan sinkronisasi data otomatis.
- **Copyright Fencing**: Pagar etis anti-plagiarisme pada LLM yang secara eksplisit melarang AI mengeluarkan salinan kalimat persis (*verbatim*) lebih dari 10 kata dari sumber berhak cipta, dan memaksanya memparafrase (*Refrasa*).
- **Cross-Domain Bypass Plugin**: Plugin kustom BetterAuth (`twoFactorCrossDomainBypass`) yang mengatasi keterbatasan sistem 2FA bawaan agar mendukung autentikasi lintas domain (frontend dan backend terpisah) dengan menerbitkan *bypass token*.
- **Cross-Domain Plugin**: Konfigurasi BetterAuth untuk mendukung persistensi sesi (via `localStorage`) antar subdomain Makalah AI.

## D
- **Deferred Resolution**: Mekanisme penundaan resolusi URL proxy (seperti dari Vertex AI) yang diproses secara paralel untuk meminimalkan latensi pencarian.
- **Dirty Context (isDirty Flag)**: Mekanisme pendeteksi ketidaksinkronan data yang dipicu jika pengguna mengedit pesan lama atau me-*regenerate* pesan, mewajibkan AI untuk meminta pengguna melakukan sinkronisasi.
- **Dirty State Detection**: Mekanisme keamanan data (guardrail) yang memunculkan peringatan di Validation Panel jika User melanjutkan diskusi *setelah* draf dibuat, guna mengingatkan perlunya sinkronisasi ulang data.
- **Drafting Choice Artifact Enforcer**: Mekanisme penjaga (*enforcer*) yang mengotomatiskan transisi dari keputusan konten ke pembuatan dokumen dengan memaksa urutan `updateStageData` -> `createArtifact` -> `submitStageForValidation`.
- **Drafting Status**: Status tahap awal di mana AI berdiskusi, merumuskan ide, dan mengumpulkan referensi tanpa menghasilkan dokumen permanen.
- **Dynamic Provider Configuration**: Pengaturan di mana model AI dan kunci API tidak *hardcoded*, melainkan dikontrol secara dinamis melalui database.

## E
- **Execution Boundary Classification**: Klasifikasi mode eksekusi tool (mis. `forced-sync`, `forced-submit`) yang dievaluasi per step untuk menentukan batasan operasi agen.

## F
- **FALLBACK MODE**: Mode *degraded* yang diaktifkan otomatis jika tidak ada System Prompt yang aktif di database, memungkinkan sistem tetap beroperasi dengan instruksi minimal.
- **First-turn Guard**: Mekanisme khusus pada tahap Gagasan yang sengaja memblokir pencarian otomatis (web search) pada turn pertama chat, memaksa model untuk berdiskusi ide terlebih dahulu dengan User.
- **Framer Motion**: Library animasi untuk menciptakan transisi mulus dan animasi mikro interaktif pada antarmuka (UI).

## G
- **Geist & Geist Mono**: Fon standar aplikasi untuk antarmuka (*sans-serif*) dan elemen teknis (*monospaced*).
- **getEffectiveTier()**: Fungsi penentu tier aktif pengguna secara absolut, di mana status role (superadmin/admin) selalu meng-override status langganan (`subscriptionStatus`) pengguna di database.
- **Google Search Grounding**: Fitur pengutipan dan validasi fakta *real-time* langsung dari indeks Google via `@ai-sdk/google`, menjadi prioritas pertama dalam sistem pencarian.

## H
- **Harness Decisions**: Rekaman di database setiap kali agen membutuhkan campur tangan User (contoh: persetujuan, klarifikasi) yang dapat menyebabkan run masuk ke status *paused*.
- **Harness Events**: Log *append-only* di database yang mencatat setiap peristiwa teknis (seperti `run_started`, `tool_called`) untuk keperluan observabilitas dan *tracing*.
- **Harness Runs**: Rekaman di database yang melacak siklus hidup eksekusi utuh dari awal permintaan User hingga selesai, memfasilitasi status *running*, *paused*, atau *completed*.

## I
- **Iconoir**: Pustaka ikon konsisten dengan estetika garis tipis minimalis, sejalan dengan desain *Mechanical Grace*.
- **Instruction Stack Entries**: Serangkaian pesan sistem (prompt) yang disusun secara dinamis dengan urutan prioritas tertentu untuk memberikan konteks relevan per giliran chat.

## J
- **json-render**: Library untuk mengubah output AI dalam format JSON/YAML menjadi elemen UI interaktif, seperti Choice Card.

## K
- **KBLI 62015**: Kode Klasifikasi Baku Lapangan Usaha Indonesia (Aktivitas Pemrograman Berbasis Kecerdasan Artifisial) yang menjadi landasan izin kegiatan usaha inti platform Makalah AI.

## L
- **Locked Workflows**: Sistem pengamanan integritas dokumen yang mengunci fase dan tahapan *state-machine* (misalnya: Gagasan -> Topik) jika sudah disetujui, demi mencegah manipulasi sewenang-wenang tanpa riwayat revisi.

## M
- **Makalah-Carbon**: Token identitas warna kustom aplikasi yang didefinisikan secara global.
- **Mandatory Discipline**: Aturan ketat pada tahap finalisasi yang melarang AI menggunakan jargon teknis (seperti menceritakan retry/kegagalan tool) dan memaksa jawaban yang sangat singkat.
- **Mechanical Grace**: Filosofi desain Makalah AI yang menggabungkan estetika industrial teknis dengan kehalusan interaksi modern.
- **Memory Digest**: Catatan ringkas berisi keputusan-keputusan krusial di tahap awal yang disuntikkan secara mandatori ke *system prompt* agar AI tidak "lupa" di tahap selanjutnya.
- **Multi-Route Extraction**: Strategi pengambilan konten web secara berlapis (menggunakan `@mozilla/readability` atau `Tavily`) tergantung tingkat kesulitan akses URL.

## N
- **Naskah**: Pratinjau (*preview*) final dari "jahitan" utuh seluruh draf yang telah disetujui (Approved) oleh User, ditampilkan dalam layout menyerupai dokumen akademik.
- **Naskah Bertumbuh**: Representasi visual utuh dari paper pengguna yang dibangun dan di-*rebuild* secara otomatis setiap kali sebuah tahap (stage) disetujui.
- **Next.js (App Router)**: Kerangka kerja web utama yang mengatur *Server Components*, *Client Components*, dan *Route Groups*.

## O
- **OKLCH**: Ruang warna yang digunakan dalam CSS Makalah AI untuk memastikan akurasi dan aksesibilitas kontras di berbagai layar.
- **OpenRouter**: Layanan *fallback provider* yang memberikan AI kemampuan penelusuran agnostik via akhiran model `:online`.
- **Orchestration Loop**: Mesin pengeksekusi sinkron yang mengelola seluruh siklus hidup *run* dengan pola *Gather-Act-Verify* dalam 13 tahap (termasuk *entry*, *context assembly*, dan eksekusi).
- **OTT (One-Time Token)**: Token sekali pakai berumur sangat singkat (3 menit) yang diterbitkan sistem otorisasi dan digunakan untuk menjembatani pembuatan sesi antar-domain.
- **Ownership Enforcement**: Kebijakan keamanan arsitektur di mana setiap pengaksesan basis data (Convex) dilindungi oleh pemeriksaan kepemilikan identitas (`userId`) secara absolut untuk mencegah kebocoran data antar pengguna.

## P
- **Panel Artifak**: Ruang kerja ("Meja kerja") khusus di sisi kanan antarmuka tempat User dapat meninjau, membaca utuh, menyunting manual, serta menjalankan proses Refrasa untuk suatu draf.
- **Paper Mode Prompt**: Instruksi *hardcoded* paling kompleks yang aktif saat penulisan paper; berisi *Memory Anchor*, aturan sitasi APA ketat, dan logika penggunaan *tool*.
- **Passive Search**: Kebijakan pencarian di mana AI hanya menggunakan konteks yang ada dan melakukan pencarian web hanya jika sangat diperlukan untuk verifikasi fakta.
- **Pending Validation Status**: Status di mana AI telah selesai membuat draf dan menunggu persetujuan pengguna melalui *Validation Panel*; AI dilarang mengubah data di status ini.
- **Plan-Spec**: Spesifikasi YAML di dalam aliran teks AI yang memecah tugas kompleks menjadi rencana langkah-langkah, yang kemudian di-*render* di UI (contoh: UnifiedProcessCard).
- **Platform IP**: Hak kekayaan intelektual atas infrastruktur, desain antarmuka, sistem agen AI, dan algoritma *prompt* yang secara legal dimiliki oleh PT The Management Asia.
- **PPAF Loop**: Siklus operasi *Agent Harness* yang terdiri dari *Perceive*, *Plan*, *Act*, dan *Feedback/Reflect*.
- **Programmatic Tool Calling**: Prinsip desain yang memberikan Agen kebebasan untuk melakukan *reasoning* dan menentukan urutan pemanggilan alat secara otonom di dalam *Control Plane*, sebagai pengganti pipeline statis.
- **Progress Timeline**: Representasi visual berwujud linimasa di Sidebar yang digunakan untuk melacak jejak pengerjaan ke-14 tahap paper secara *real-time*.
- **Provenance Tracking**: Fitur pelacakan asal-usul (*SourceChunks*) pada kutipan teks yang memungkinkan verifikasi sumber rujukan secara langsung, bertindak sebagai mitigasi atas tuduhan bias *AI detector*.
- **Provider Abstraction Layer**: Arsitektur pembayaran yang menggunakan *adapter* (seperti `XenditAdapter`) agar sistem Makalah AI tidak terikat secara kaku pada satu antarmuka *payment gateway*.
- **PT The Management Asia**: Entitas hukum perusahaan berstatus Penanaman Modal Dalam Negeri (PMDN) yang secara legal menaungi, mengelola, dan mengoperasikan Makalah AI.

## R
- **R.E.S.T Framework**: Empat tujuan inti *harness* produksi: *Reliability* (andal), *Efficiency* (efisien), *Security* (aman), dan *Traceability* (terlacak).
- **Radix UI**: *Headless UI library* dasar yang menjamin komponen kompleks memiliki dukungan aksesibilitas WAI-ARIA bawaan.
- **RAG Ingest (Retrieval-Augmented Generation)**: Tahap memecah (*chunking*) teks file referensi yang diunggah pengguna ke indeks pencarian internal.
- **Reasoning Panel**: Komponen UI yang menampilkan jejak pemikiran internal (*thinking trace*) model AI secara terpisah dari jawaban final, memberikan transparansi proses.
- **Reasoning-delta**: Sinyal teks yang diekstrak secara spesifik dari *tag* `<think>` agar alur pemikiran AI dirender terpisah dari draf utamanya.
- **Refrasa**: Fitur konverter gaya bahasa (Humanizer) yang dijalankan oleh agen khusus untuk menstruktur ulang tulisan "robotik" menjadi lebih natural dan manusiawi tanpa mengubah argumen riset.
- **Resend**: Infrastruktur pengiriman email transaksional (mis. Magic Link, struk pembayaran) menggunakan komponen *React Email*.
- **Retriever Registry**: Rantai antrean mesin pencari (mis. Google Grounding -> Grok -> Perplexity) yang dieksekusi berurutan apabila terjadi kegagalan pencarian.
- **Revision Chain Enforcer**: Mekanisme penjaga reaktif yang memaksa AI menyelesaikan alur revisi dokumen, di mana setelah artifak diperbarui, AI wajib memanggil `submitStageForValidation`.
- **Revision Status**: Status yang aktif ketika pengguna meminta perbaikan (*Revise*); AI dipaksa menerima catatan revisi dan memperbarui artifak yang ada alih-alih membuat ulang.
- **Rewind (Rollback)**: Mekanisme kembali ke tahapan masa lalu melalui Progress Timeline. Aksi ini secara otomatis memicu "Invalidasi" terhadap artifak-artifak di tahapan yang lebih maju dari titik target.
- **Rewind History**: Tabel rekaman (*audit trail*) di database yang mencatat setiap aksi lompat mundur (*Rewind*) yang dilakukan pengguna untuk tujuan pelacakan integritas naskah.
- **Role-Based Access Control (RBAC)**: Sistem hierarki tiga level (`superadmin`, `admin`, `user`) untuk mengamankan fungsi-fungsi manajemen, dipadukan dengan kebijakan *ownership enforcement* secara independen.
- **Route Groups**: Strategi folder Next.js (contoh: `(marketing)`, `(auth)`) yang mengorganisir rute tanpa mempengaruhi struktur URL.
- **Runtime Enforcers**: Mekanisme penjaga (*Guardrails*) tingkat kebijakan yang memaksakan model AI untuk secara deterministik mengikuti atau menyelesaikan alur pemanggilan alat bantu (*Tool Calling*).

## S
- **Search Orchestrator**: Otak intelijen riset AI yang mengatur strategi pencarian menggunakan pendekatan *Reactive Search* (terdiri dari 3 fase: Silent Search, Content Fetching, Compose) guna meminimalkan halusinasi informasi.
- **Sentry**: Infrastruktur *observability* untuk memantau error UI, anomali *pipeline* AI, dan integritas sistem secara *real-time*.
- **SessionCookieSync**: Mekanisme sinkronisasi sesi lintas domain di mana frontend membaca kredensial dari `localStorage` lintas-domain (`crossDomainClient`) dan merakitnya menjadi sebuah cookie browser (`ba_session`) untuk otorisasi permintaan berikutnya.
- **Smart Downgrade**: Mekanisme yang secara otomatis mengubah status pengguna Pro yang masa aktifnya habis menjadi BPP jika masih memiliki sisa saldo kredit, sehingga mencegah hangusnya kredit.
- **Source-Body Parity**: Mekanisme penjaga (guard) saat membuat/memperbarui artifak yang memverifikasi konsistensi antara daftar sumber referensi yang diklaim dengan kutipan di dalam konten.
- **Stage Skills**: Modul instruksi spesifik (dikelola via database) yang aktif hanya pada tahap penulisan tertentu agar AI fokus pada tugas spesifik stagenya.
- **System Prompts**: Instruksi inti AI yang dikelola di database Convex dengan fitur *versioning*, memungkinkan perubahan perilaku AI secara *real-time* tanpa *deployment* kode.

## T
- **Tailwind CSS v4**: Mesin pengiriman gaya (*style delivery engine*) yang mengeksekusi sistem desain *Mechanical Grace* secara cepat.
- **TAO Cycle**: Siklus *Thought-Action-Observation* (ReAct loop) yang dikelola oleh *harness* untuk setiap putaran LLM, mendelegasikan kecerdasan ke model namun mengendalikan giliran (turns).
- **Tavily AI**: Mesin ekstraksi konten tingkat lanjut yang dikhususkan untuk menembus proteksi situs jurnal akademik dan mengekstrak dokumen PDF.
- **Thinking Budget**: Alokasi kuota token yang diatur secara dinamis untuk membatasi atau memaksimalkan seberapa dalam model boleh melakukan *reasoning* sebelum menjawab.
- **Tiptap**: Editor teks kaya (*rich-text editor*) kustom untuk fitur penyuntingan naskah kolaboratif.
- **Token Overage**: Kelebihan token yang tercatat untuk kebutuhan analitik saat batas token habis, tetapi tidak memblokir operasi yang sedang berjalan secara proaktif.
- **Tool Chain Enforcement**: Aturan di level kode orkestrasi (*runtime enforcer*) yang memastikan urutan pemanggilan alat bantu (*tool*) AI dilakukan secara benar dan deterministik.
- **Top Bar**: Pusat kendali navigasi di atas area chat yang berisi tombol akses Naskah, *theme switcher*, dan indikator jumlah artifak.

## U
- **Unified Process Card**: Fitur transparansi berupa kartu di dalam chat yang menampilkan detail langkah yang direncanakan AI (*tasks*), status *tool calls*, dan indikator jumlah sumber riset secara *real-time*.
- **Universal Reactive Enforcer**: Penjaga sinkronisasi umum; jika AI memperbarui data stage, enforcer ini memaksa AI segera membuat/memperbarui artifak dan memvalidasinya di giliran yang sama.
- **User IP**: Hak kekayaan intelektual atas seluruh keluaran (draf paper, *outline*, hasil analisis) di platform yang secara utuh menjadi milik pengguna.

## V
- **Validation Panel**: Panel gerbang kendali bagi User ("Setujui & Lanjutkan" atau "Minta Revisi"). Sistem tidak akan pindah tahapan sebelum panel ini di-klik, memastikan prinsip *kedaulatan User*.
- **Vercel AI Gateway**: Infrastruktur perantara (*proxy*) utama yang mengelola keamanan dan koneksi langsung dengan model Google Gemini.

## X
- **Xendit**: *Payment gateway* yang memproses top-up kredit menggunakan pola *Adapter* dan webhook verifikasi berbasis token.
