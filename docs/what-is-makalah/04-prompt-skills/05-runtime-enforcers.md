# Runtime Enforcers

**Runtime Enforcers** adalah mekanisme penjaga (*Guardrails*) pada tingkat kebijakan (*Policy*) yang memaksakan model AI untuk mengikuti alur pemanggilan alat bantu (*Tool Calling*) tertentu. Enforcer memastikan bahwa AI tidak hanya "berjanji" melakukan sesuatu dalam teks, tetapi benar-benar mengeksekusinya di sistem.

## Filosofi Enforcement

Meskipun AI diberikan instruksi melalui prompt, model terkadang bisa menyimpang atau berhenti terlalu dini sebelum sebuah alur kerja selesai. Enforcers bekerja di tingkat orkestrasi aplikasi untuk:
1.  **Memaksa Kelengkapan**: Memastikan semua langkah dalam sebuah rantai proses diselesaikan dalam satu giliran (*turn*).
2.  **Membatasi Pilihan**: Mempersempit opsi *tool* yang tersedia agar AI tidak melakukan aksi yang tidak relevan atau berbahaya pada tahap tertentu.

## Jenis-Jenis Enforcers

### 1. Revision Chain Enforcer
Enforcer ini aktif ketika status tahap adalah `pending_validation` atau `revision`.
- **Tujuan**: Memastikan proses revisi dokumen berjalan secara utuh.
- **Mekanisme**: Enforcer bersifat **reaktif** (bukan preskriptif). Setelah `requestRevision` atau `updateStageData` dipanggil, ia set `toolChoice: "required"` (model bebas pilih tool apapun). Satu-satunya langkah yang **dipaksa spesifik** adalah: setelah `updateArtifact`/`createArtifact` berhasil → paksa `submitStageForValidation`.
- AI dilarang berhenti sebelum memanggil `submitStageForValidation` jika artifact sudah berhasil dibuat/diperbarui.

### 2. Drafting Choice Artifact Enforcer
Aktif selama tahap penyusunan draf (*Drafting*) ketika pengguna memilih opsi dari Kartu Pilihan yang memicu pembuatan artifak.
- **Tujuan**: Mengotomatiskan transisi dari keputusan konten ke pembuatan dokumen.
- **Urutan yang Dipaksa**: `compileDaftarPustaka` (opsional) → `updateStageData` → `createArtifact` → `submitStageForValidation`.

### 3. Universal Reactive Enforcer
Enforcer umum yang bereaksi terhadap tindakan AI secara real-time.
- **Tujuan**: Menjamin sinkronisasi antara data stage dan dokumen fisik (artifak).
- **Logika**: Jika AI memanggil `updateStageData`, enforcer ini akan memaksa AI untuk segera memanggil `createArtifact` atau `updateArtifact` diikuti dengan `submitStageForValidation` dalam giliran yang sama.

## Mekanisme Kerja

Enforcer diimplementasikan sebagai fungsi `PrepareStepFunction` yang dievaluasi sebelum setiap langkah pemanggilan *tool* oleh LLM. Jika kondisi terpenuhi, enforcer akan menyuntikkan `toolChoice: { type: "tool", toolName: "..." }` yang secara teknis memaksakan LLM untuk menggunakan *tool* tersebut tanpa opsi lain.

## Referensi Kode
- `src/lib/chat-harness/policy/enforcers.ts`: Implementasi logika ketiga enforcer (`createRevisionChainEnforcer`, `createDraftingChoiceArtifactEnforcer`, `createUniversalReactiveEnforcer`).
- `src/lib/chat-harness/policy/evaluate-runtime-policy.ts`: Tempat ketiga enforcer diinstantiasi dan dikompilasi menjadi `prepareStep` function untuk diteruskan ke executor.
- `src/lib/chat-harness/runtime/orchestrate-sync-run.ts`: Tempat `evaluateRuntimePolicy` dipanggil dan `policyDecision.prepareStep` disuntikkan ke dalam siklus eksekusi LLM.

---
**Lihat Juga:**
- [Orkestrasi Instruction Stack](./orchestration.md)
- [Katalog Stage Skills](./stage-skills.md)
