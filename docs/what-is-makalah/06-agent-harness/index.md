# Kategori 06: Agent Harness (Overview)

Dokumen ini berfungsi sebagai peta navigasi utama dan landasan teknis untuk seluruh dokumentasi di kategori **Agent Harness**. Arsitektur Harness Makalah AI dirancang mengikuti prinsip pemisahan tugas yang tegas antara infrastruktur runtime (*Control Plane*) dan logika alur kerja (*Domain Actions*).

## 1. Definisi Agent Harness

Berdasarkan [Anatomy of an Agent Harness](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/docs/what-is-makalah/references/agent-harness/anatomy/anatomy-agent-harness.md), **Agent Harness** adalah infrastruktur perangkat lunak lengkap yang membungkus LLM (*Large Language Model*). Jika LLM adalah "otak" yang statis, maka Harness adalah "sistem operasi" yang menyediakan:
- *Orchestration loop* (TAO/ReAct cycle).
- *Memory management* (Short-term & Long-term).
- *Context engineering* (Compaction & Budgeting).
- *Tool orchestration* & *Safety enforcement*.

> **Prinsip Utama:** "If you're not the model, you're the harness." Harness bertanggung jawab mentransformasikan *stateless LLM* menjadi agen yang mampu menyelesaikan tugas penulisan paper secara otonom. Arsitektur ini mengadopsi filosofi **[Programmatic Tool Calling](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/docs/what-is-makalah/references/programatic-tools-calling/programmatic-tool-calling.md)**, di mana performa agen dimaksimalkan dengan meminimalkan *rigid pipelines* dan memberikan kebebasan bagi model untuk bernalar di atas data mentah melalui *tool orchestration* yang efisien.

## 2. Arsitektur: Control Plane vs Domain Actions

Sesuai dengan [Control Plane vs Domain Actions Mapping](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/docs/what-is-makalah/references/agent-harness/control-plane-domain-action.md), arsitektur kita membagi tanggung jawab menjadi tiga layer utama:

### A. Control Plane (Harness-Owned)
Infrastruktur yang mengoperasikan *runtime* itu sendiri. Model tidak memilih tindakan ini; sistem melakukannya secara otomatis.
- **Entry & Lifecycle:** Autentikasi, *run creation*, *step management*.
- **Context Assembly:** *Instruction stack precedence*, *message sanitization*, *context budget*.
- **Persistence:** Penyimpanan *events*, *steps*, dan *run snapshots*.
- **Verification:** Pengecekan *outcome* dan *completion blockers*.

### B. Domain Actions (Model-Triggered Tools)
Tindakan yang merupakan bagian dari *workflow* bermakna bagi *User*. Model memilih tindakan ini secara eksplisit via *tool calls*.
- **State Inspection:** `getCurrentPaperState`, `readArtifact`.
- **Search & Evidence:** `inspectSourceDocument`, `quoteFromSource`, `searchAcrossSources`.
- **Artifact Lifecycle:** `createArtifact`, `updateArtifact`.
- **Validation:** `submitStageForValidation`, `requestRevision`.
- **Workflow:** `updateStageData`, `compileDaftarPustaka`, `resetToStage`, `requestRevision`, `renameConversationTitle`.

### C. Backend Contracts (Convex Guards)
Aturan hukum (*legality rules*) dan *state invariants* yang dipaksa di level *database* (Convex). Ini adalah *single source of truth* untuk validitas transisi status.

## 3. Komponen Utama Harness Makalah AI

Audit Forensik mengidentifikasi komponen kunci berikut dalam implementasi kita:

1.  **Orchestration Loop:** Terpusat di `runtime/orchestrate-sync-run.ts` — engine 13-step yang mengelola siklus hidup run secara penuh. `executor/` (`buildStepStream`) adalah komponen yang dipanggil oleh orchestrator untuk mengelola per-turn TAO cycle.
2.  **Context Engineering:** Menggunakan 13-layer *instruction stack* dinamis yang dikelola di `context/resolve-instruction-stack.ts`.
3.  **Memory Management:** Melalui *Memory Digest* yang diinjeksi ke prompt **hanya ketika P2 compaction terjadi** (paper mode, saat token melebihi 85% context window) — bukan di setiap turn.
4.  **Runtime Enforcers:** Tiga fungsi enforcer terpisah (`createRevisionChainEnforcer`, `createDraftingChoiceArtifactEnforcer`, `createUniversalReactiveEnforcer`) yang memastikan *tool chain* dieksekusi secara benar via manipulasi `toolChoice`.

## 4. Struktur Dokumentasi

Dokumentasi di folder ini dibagi menjadi beberapa sub-topik mendalam berdasarkan tingkat kepentingan dan peran arsitekturalnya:

1. **[01-definisi-dan-konsep.md](./01-definisi-dan-konsep.md)**: Definisi, konsep dasar, dan landasan pengetahuan Agent Harness — berdasarkan referensi anatomy, engineering guide, dan control plane mapping.
2. **[02-orchestration-loop.md](./02-orchestration-loop.md)**: "Jantung" dari harness. Menjelaskan 13-step execution engine di `orchestrate-sync-run.ts`, TAO (*Thought-Action-Observation*) cycle, dan mekanisme pause/resume via `pendingDecisionId`.
3. **[03-tool-inventory-capabilities.md](./03-tool-inventory-capabilities.md)**: "Tangan" dari agen. Katalog lengkap *tools* yang tersedia, fungsi teknisnya, dan bagaimana model menggunakannya untuk kemajuan *workflow*.
4. **[04-context-management.md](./04-context-management.md)**: "Memori kerja" agen. Strategi *compaction*, *budgeting*, dan pengelolaan *instruction stack* 13-layer.
5. **[05-tool-safety-enforcement.md](./05-tool-safety-enforcement.md)**: "Penjaga gawang" sistem. Detail mekanisme *enforcers* (runtime) dan *guards* (Convex) yang menjamin keamanan eksekusi.
6. **[06-persistence-observability.md](./06-persistence-observability.md)**: "Catatan sejarah" sesi. Struktur data *run*, *step*, dan *events* untuk audit dan pemulihan status (*resume*).

---

**Referensi Teknis Utama:**
- [Anatomy of an Agent Harness](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/docs/what-is-makalah/references/agent-harness/anatomy/anatomy-agent-harness.md)
- [Control Plane vs Domain Actions Mapping](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/docs/what-is-makalah/references/agent-harness/control-plane-domain-action.md)
- [Programmatic Tool Calling](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/docs/what-is-makalah/references/programatic-tools-calling/programmatic-tool-calling.md)
