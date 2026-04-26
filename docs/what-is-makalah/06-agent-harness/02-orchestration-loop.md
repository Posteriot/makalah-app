# 02: Orchestration Loop (Engine)

File ini merinci "jantung" dari Makalah AI Agent Harness—sebuah **13-step synchronous execution engine** yang mengelola seluruh siklus hidup sebuah *run* (dari permintaan User hingga respon final).

## 1. Filosofi Desain

Orchestration loop kita dirancang sebagai *stateless engine* yang mendelegasikan seluruh keputusan logis ke model, namun tetap menjaga kontrol ketat atas infrastruktur runtime. Kita mengikuti pola **Gather-Act-Verify**:
- **Gather**: Mengumpulkan konteks, pesan, lampiran, dan status sesi.
- **Act**: Menjalankan siklus TAO (*Thought-Action-Observation*) via LLM.
- **Verify**: Memvalidasi hasil tindakan terhadap kebijakan keamanan dan integritas alur kerja.

### Perpindahan dari Rigid Pipeline ke Agentic Harness
Desain ini mengadopsi prinsip **Programmatic Tool Calling**. Alih-alih menggunakan *hardcoded pipelines* (Step A -> Step B) yang kaku, kita memberikan Agen kebebasan untuk menentukan urutan pemanggilan tool secara otonom di dalam sebuah *Control Plane* (Harness). Hal ini krusial untuk memaksimalkan performa Agen dalam skenario penelitian kompleks yang membutuhkan penalaran dinamis di atas data mentah tanpa hambatan latensi *round-trip* yang berlebihan.

## 2. Anatomi 13-Step Engine

Seluruh alur kerja terpusat di [orchestrate-sync-run.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/chat-harness/runtime/orchestrate-sync-run.ts). Berikut adalah rincian tahapannya:

### Tahap 1-4: Entry & Persistence
1.  **Resolve Conversation**: Memvalidasi kepemilikan dan keberadaan percakapan.
2.  **Resolve Run Lane**: Menentukan apakah ini permintaan baru atau *resume* dari status *paused*.
3.  **Resolve Attachments**: Mengumpulkan file dan sumber konteks yang relevan.
4.  **Persist User Message**: Mencatat pesan User ke database sebelum pemrosesan AI dimulai.

### Tahap 5-7: Context Assembly
5.  **Resolve Paper-Mode Context**: Mengambil status sesi penulisan (`paperSessions`) dan menyusun prompt instruksi spesifik *stage*.
6.  **Validate Choice Interaction**: Memproses input dari *Choice Card* (jika ada).
7.  **Assemble Step Context**: Menggabungkan seluruh data menjadi satu objek konteks yang akan dikirim ke LLM. Di sini **13-layer Instruction Stack** diterapkan.

### Tahap 8-10: Policy & Tooling
8.  **Evaluate Runtime Policy**: *Enforcers* memeriksa apakah tindakan selanjutnya memerlukan persetujuan User atau melanggar aturan alur kerja.
9.  **Build Tool Registry**: Membangun daftar *tools* (seperti `createArtifact`, `updateStageData`) yang diizinkan untuk digunakan agen pada putaran ini.
10. **Build Telemetry Scope**: Menyiapkan infrastruktur pelacakan dan observabilitas.

### Tahap 11-13: Execution & Fallback
11. **Primary Stream Execution**: Memanggil LLM dan menjalankan siklus TAO secara streaming via `buildStepStream`. Di dalamnya, `onFinishConfig` (diimplementasi oleh `build-on-finish-handler.ts`) mengelola persistence status akhir, penggunaan token, plan capture, dan artifact setelah stream selesai — ini bukan step terpisah di orchestrator, melainkan callback yang berjalan di dalam stream.
12. **Fallback Path** (step 12 di kode): Jika *primary provider* throw error, sistem otomatis beralih ke *fallback provider* via `attemptFallbackExecution` untuk menjaga kontinuitas.

## 3. Mekanisme Pause & Resume

Harness kita mendukung interupsi otonom melalui status **Paused**.
- **Pause**: Terjadi di Step 8.5 jika *Policy Evaluator* memutuskan `requiresApproval === true`. Sistem memanggil `runStore.pauseRun()` (membuat baris `harnessDecisions`, mengubah `harnessRuns.status` ke `paused`, menyimpan `pendingDecisionId`), lalu emit event `run_paused` dan return `{ kind: "paused" }`.
- **Resume**: Terjadi ketika User memberikan input. Harness mendeteksi header `x-harness-resume` via `accepted.resumeContext`. Step 1 (resolve conversation) **tetap berjalan**. Yang diskip adalah pembuatan `harnessRuns` row baru di Step 2 — lane direkonstruksi dari identifiers yang sudah dipersist. Event `run_resumed` dikirim sebagai pengganti `run_started`. Semua step selanjutnya berjalan normal.

## 4. Peran Executor (`buildStepStream`)

Executor adalah komponen yang mengimplementasikan protokol Vercel AI SDK. Ia bertanggung jawab untuk:
- Mengelola putaran multi-step (Agen bisa memanggil beberapa tools sebelum memberikan jawaban akhir).
- Menangani *tool call validation* dan *error recovery* di level runtime.
- Menyediakan *reasoning trace* yang transparan kepada User.

---

**File Source Code Utama:**
- `src/lib/chat-harness/runtime/orchestrate-sync-run.ts`: Logika 13-step engine.
- `src/lib/chat-harness/executor/build-step-stream.ts`: Implementasi siklus TAO — mengelola multi-step turns dan tool execution.
- `src/lib/chat-harness/executor/build-on-finish-handler.ts`: Callback persistence setelah stream selesai (plan capture, billing, artifact, token usage).
- `src/lib/chat-harness/entry/resolve-run-lane.ts`: Logika pembuatan run lane baru vs resume.

**Referensi Eksternal & Filosofi:**
- [Programmatic Tool Calling](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/docs/what-is-makalah/references/programatic-tools-calling/programmatic-tool-calling.md): Dasar pemikiran perpindahan dari pipeline kaku ke agentic harness.
