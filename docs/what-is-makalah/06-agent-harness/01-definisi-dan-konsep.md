# Definisi & Konsep Agent Harness

*Agent Harness* adalah infrastruktur perangkat lunak lengkap yang membungkus LLM. Dokumen ini menjelaskan definisi, konsep fondasi, dan prinsip desain yang membentuk cara Makalah AI membangun harness-nya.

---

## 1. Definisi: Apa Itu Agent Harness?

**Agent Harness** adalah semua infrastruktur di luar model LLM itu sendiri yang membuatnya bisa bekerja secara otonom dalam konteks produksi — mencakup *orchestration loop*, tools, memory, context management, state persistence, error handling, dan guardrails.

Formulasi kanonik dari LangChain: **"If you're not the model, you're the harness."**

Perbedaan yang sering disalahpahami:
- **"Agent"** = perilaku yang muncul: entitas yang berorientasi tujuan, menggunakan tool, dan dapat mengoreksi diri sendiri.
- **"Harness"** = mesin yang menghasilkan perilaku tersebut.

Ketika seseorang berkata "gue bikin agent," artinya mereka bikin harness dan mengarahkannya ke model.

### Metafora Kuda dan Tali Kekang

Dari *Harness Engineering Guide* (Trae.ai, 2026):

> **AI Agent = SOTA Model (Kuda Liar) + Harness (Sistem Kendali) = Pemain Elit**

Model AI adalah "kuda liar" dengan potensi tak terbatas. Harness adalah tali kekang profesional yang membuat kuda itu bekerja terstruktur dan andal. Lo tidak mengubah DNA kuda (model itu sendiri) — lo merancang perlengkapan dan protokol pelatihan yang dibutuhkan untuk membuatnya bekerja buat lo.

### Mengapa Harness Penting?

Bukti empiris dari *Anatomy of an Agent Harness* (2026): LangChain **hanya mengubah infrastruktur** yang membungkus LLM-nya (model dan bobot sama), dan melompat dari luar top 30 ke peringkat 5 di TerminalBench 2.0. Dua produk dengan model identik bisa memiliki performa yang sangat berbeda **hanya berdasarkan desain harness-nya**.

---

## 2. Tiga Level Engineering

Ada tiga level konsentris yang mengelilingi model:

| Level | Cakupan |
|---|---|
| **Prompt Engineering** | Merancang instruksi yang diterima model |
| **Context Engineering** | Mengelola apa yang dilihat model dan kapan |
| **Harness Engineering** | Mencakup keduanya + seluruh infrastruktur aplikasi: orchestration tool, state persistence, error recovery, verification loops, safety enforcement, dan lifecycle management |

Harness bukan *wrapper* di sekitar prompt. Ia adalah sistem lengkap yang membuat perilaku agen otonom menjadi mungkin.

---

## 3. Loop Inti: PPAF & TAO Cycle

Agent harness produksi beroperasi pada dua loop yang saling melengkapi:

### 3.1 PPAF Loop (Persepsi-Perencanaan-Aksi-Umpan Balik)

Dari *Harness Engineering Guide*:
1. **Perceive** — Menangkap state dunia: input user, output tool, riwayat interaksi, progres task.
2. **Plan** — Memperbarui tujuan, mendekomposisi task, memutuskan langkah selanjutnya.
3. **Act** — Mengeksekusi operasi (internal: update memory; eksternal: panggil tool, beri respons).
4. **Feedback/Reflect** — Hasil aksi di-inject kembali ke konteks sebagai observasi untuk siklus berikutnya.

### 3.2 TAO Cycle (Thought-Action-Observation)

Dari *Anatomy of an Agent Harness* — juga disebut ReAct loop:

```
Assemble Prompt → Call LLM → Parse Output → Execute Tool Calls → Feed Results Back → Repeat
```

Harness mengelola siklus ini. Anthropic menyebutnya sebagai *"dumb loop"* — semua kecerdasan ada di model, harness hanya mengelola turns.

**Kondisi terminasi**: model menghasilkan respons tanpa tool calls, limit turn terlampaui, token budget habis, guardrail terpicu, user menginterupsi, atau safety refusal dikembalikan.

---

## 4. 12 Komponen Harness Produksi

Berdasarkan *Anatomy of an Agent Harness*, harness produksi memiliki dua belas komponen:

| # | Komponen | Fungsi |
|---|---|---|
| 1 | **Orchestration Loop** | Jantung sistem. Mengimplementasikan TAO/ReAct cycle. Mengelola turns, bukan menentukan isinya. |
| 2 | **Tools** | "Tangan" agen. Didefinisikan sebagai schema (nama, deskripsi, tipe parameter) yang diinjeksi ke konteks LLM. Harness menangani registrasi, validasi, eksekusi sandbox, dan formatting hasil. |
| 3 | **Memory** | Beroperasi di beberapa timescale: short-term (riwayat sesi), long-term (lintas sesi via file/DB). Prinsip kritis: agen memperlakukan memory-nya sebagai "petunjuk" dan memverifikasi ke state aktual sebelum bertindak. |
| 4 | **Context Management** | Mencegah *context rot* — degradasi performa 30%+ ketika konten kunci berada di posisi tengah window. Strategi: compaction, observation masking, just-in-time retrieval, sub-agent delegation. |
| 5 | **Prompt Construction** | Merakit apa yang dilihat model di setiap step secara hierarkis: system prompt → tool definitions → memory files → conversation history → user message. |
| 6 | **Output Parsing** | Harness modern mengandalkan native tool calling (model return `tool_calls` terstruktur). Jika ada tool calls → eksekusi dan loop; tidak ada → itu jawaban final. |
| 7 | **State Management** | State yang membutuhkan konsistensi lintas-turn harus di-offload ke external state manager — bukan dipaksa dipertahankan model via prompt. |
| 8 | **Error Handling** | 4 tipe error: transient (retry), LLM-recoverable (kembalikan error ke model), user-fixable (interrupt), unexpected (bubble up). Error compound: proses 10 langkah dengan 99% success per langkah = hanya ~90.4% end-to-end. |
| 9 | **Guardrails & Safety** | 3 level: input guardrails, output guardrails, tool guardrails. Model memutuskan apa yang akan dilakukan; tool system memutuskan apa yang diizinkan. |
| 10 | **Verification Loops** | Memisahkan toy demos dari production agents. Pendekatan: rules-based feedback (tests, linters), visual feedback, LLM-as-judge. Memberikan cara model memverifikasi kerjanya meningkatkan kualitas 2-3x. |
| 11 | **Subagent Orchestration** | Model eksekusi fork, teammate, atau worktree; agents-as-tools atau handoffs. |
| 12 | **Lifecycle Management** | Autentikasi, run creation, step management, dan terminasi yang deterministik. |

---

## 5. Arsitektur Makalah AI: Control Plane vs Domain Actions

Berdasarkan referensi *Control Plane vs Domain Actions Mapping*, Makalah AI menerapkan batas arsitektural yang tegas untuk menyeimbangkan otonomi model dan kebenaran alur kerja (*workflow correctness*). Arsitektur ini membagi tanggung jawab menjadi tiga lapisan:

### A. Control Plane (Harness-Owned)
Infrastruktur yang mengoperasikan *runtime* itu sendiri. Model tidak memilih tindakan ini; sistem melakukannya secara otomatis. Tanggung jawab meliputi:
- **Entry & Run Lifecycle**: Autentikasi, pembuatan *run* dan *step*, serta infrastruktur *pause/resume*.
- **Context Assembly**: Resolusi tumpukan instruksi (*instruction stack precedence*), konversi pesan, dan alokasi *context budget*.
- **Persistence & Observability**: Menyimpan *run*, *step*, *event*, dan *policy snapshot* ke database (Convex).
- **Verification**: Memverifikasi *outcome* dari suatu step dan mengecek *completion blockers*.

### B. Domain Actions (Model-Triggered Tools)
Tindakan yang memiliki makna *workflow* bagi pengguna. Model memilih tindakan ini secara eksplisit melalui *tool calls*.
- **State Inspection**: `getCurrentPaperState`, `getStageCapabilities` (menggantikan *enforcer knowledge* tersembunyi).
- **Search & Evidence**: `searchReferences`, `inspectStoredSources`.
- **Stage Progress & Artifacts**: `updateStageData`, `createArtifact`, `updateArtifact`.
- **Validation Lifecycle**: `submitStageForValidation`, `requestRevision`, `unapproveStage`.
- **Workflow Control**: `rewindToStage`, `emitChoiceCard`, `cancelChoiceDecision`.

### C. Backend Contracts (Convex Guards)
Aturan hukum (*legality rules*), *state invariants*, dan penjaga transisi yang ditegakkan di level database (Convex), **bukan** diandalkan pada kepatuhan prompt.
- **Legal State Transitions**: `requestRevision` hanya sah jika status `pending_validation`.
- **Artifact Legality**: Kapan *create* vs *update* diizinkan, dan penanganan artifak yang *invalidated*.
- **Search Legality**: Kontrak lampiran sumber dan aturan ketersediaan *exact source*.

> **Golden Rule Arsitektur Makalah AI**:
> Buat pemilihan *domain action* menjadi eksplisit melalui *tools* (memberi model otonomi), pertahankan infrastruktur *runtime* di dalam *harness* (kestabilan), dan jadikan *backend guards* sebagai satu-satunya sumber kebenaran (*single source of truth*) untuk legalitas (kebenaran *workflow*).

---

## 6. Framework R.E.S.T — Empat Tujuan Inti

Dari *Harness Engineering Guide*, harness produksi harus mengamankan empat objektif:

| Objektif | Definisi | Requirement Kunci |
|---|---|---|
| **Reliability** | Layanan stabil menghadapi input tak terduga | Fault recovery, idempotent operations, behavioral consistency |
| **Efficiency** | Penggunaan efektif compute/storage/network | Resource control, low-latency response, high throughput |
| **Security** | Proteksi dari akses tidak sah | Least privilege, sandboxed execution, I/O filtering |
| **Traceability** | Data cukup untuk memahami state dan keputusan agen | End-to-end tracing, explainable decisions, auditable state |

---

## 7. Enam Prinsip Desain

Dari *Harness Engineering Guide*:

1. **Design for Failure** — Perlakukan exception sebagai norma, bukan outlier. Setiap komponen harus support fault tolerance, retry, dan graceful degradation.
2. **Contract-First** — Definisikan semua interaksi melalui kontrak eksplisit dan machine-readable (Schemas, APIs, Events).
3. **Secure by Default** — Keamanan bukan tambahan. Dimulai dari prinsip least privilege, zero trust, dan defense-in-depth.
4. **Separation of Concerns** — Pisahkan "memutuskan apa yang dilakukan" (planning) dari "bagaimana melakukannya" (execution). (Implementasinya: Control Plane vs Domain Actions).
5. **Everything is Measurable** — Setiap perilaku, keputusan, dan resource harus bisa dikuantifikasi.
6. **Data-Driven Evolution** — Setiap agent run adalah kesempatan belajar. Bangun closed loop data collection → labeling → feedback.

---

## 8. Tujuh Keputusan Desain

Setiap arsitek harness menghadapi tujuh pilihan fundamental:

| # | Keputusan | Rekomendasi |
|---|---|---|
| 1 | Single-agent vs Multi-agent | Maksimalkan single agent dulu. Split hanya jika >10 overlapping tools atau domain task jelas terpisah. |
| 2 | ReAct vs Plan-and-Execute | Default ke Plan-and-Execute. ReAct lebih fleksibel tapi biaya per-step lebih tinggi. |
| 3 | Context window strategy | Lima pendekatan produksi: time-based clearing, summarization, observation masking, structured note-taking, sub-agent delegation. |
| 4 | Verification loop design | Computational verification (deterministik) vs Inferential verification (LLM-as-judge, semantik tapi latency lebih tinggi). |
| 5 | Permission & safety architecture | Permissive (cepat tapi berisiko) vs Restrictive (aman tapi lambat). Bergantung pada konteks deployment. |
| 6 | Tool scoping strategy | Lebih banyak tools sering = performa lebih buruk. Ekspos minimum tool set yang dibutuhkan untuk langkah saat ini. |
| 7 | Harness thickness | Thin harness + model improvement (Anthropic) vs Explicit control via graph (LangGraph). |

---

## 9. Prinsip Co-Evolution

Model kini dilatih dengan harness spesifik dalam loop. Mengubah implementasi tool bisa mendegradasi performa karena coupling yang erat ini.

**Future-proofing test**: Jika performa naik seiring model yang lebih kuat tanpa menambah kompleksitas harness, maka desainnya sound.

Tren saat ini: harness bergerak menuju **thin harness** seiring model yang semakin mampu. Banyak guardrail harness yang hari ini bersifat eksternal, ke depannya akan baked langsung ke dalam model.

---

## Referensi

| Dokumen | Deskripsi |
|---|---|
| [Anatomy of an Agent Harness](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/docs/what-is-makalah/references/agent-harness/anatomy/anatomy-agent-harness.md) | Deep dive 12 komponen harness: Anthropic, OpenAI, LangChain, CrewAI |
| [The Definitive Guide to Harness Engineering](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/docs/what-is-makalah/references/agent-harness/harness-engineering-guid.md) | Framework R.E.S.T, PPAF loop, 6 prinsip desain, arsitektur Control Plane vs Data Plane |
| [Control Plane vs Domain Actions](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/docs/what-is-makalah/references/agent-harness/control-plane-domain-action.md) | Pemetaan tanggung jawab harness Makalah AI secara spesifik |

