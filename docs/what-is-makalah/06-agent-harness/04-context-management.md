# 04: Context Management & Memory

File ini menjelaskan bagaimana Makalah AI mengelola memori jangka pendek dan panjang agen untuk menjaga relevansi instruksi dan efisiensi penggunaan token. Desain ini bertujuan untuk memaksimalkan **Reasoning Space** bagi agen agar tetap mampu melakukan **[Programmatic Tool Calling](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/docs/what-is-makalah/references/programatic-tools-calling/programmatic-tool-calling.md)** di atas data riset yang besar.

> **Sumber kebenaran**: `src/lib/chat-harness/context/resolve-instruction-stack.ts`, `src/lib/ai/context-compaction.ts`, `src/lib/ai/context-budget.ts`, `src/lib/chat-harness/context/apply-context-budget.ts`.

---

## 1. Instruction Stack (13 Layers)

Harness menggunakan sistem penumpukan instruksi (*Instruction Stack*) dengan aturan presedensi yang ketat di `resolve-instruction-stack.ts`. Urutan ini harus cocok persis dengan `route.ts fullMessagesBase` (L622-710).

| Layer | Source Label | Fungsi & Fakta Kode |
| :--- | :--- | :--- |
| 1 | `base-prompt` | Identitas dasar dan aturan perilaku global (`systemPrompt`). |
| 2 | `paper-mode` | Instruksi spesifik workflow penulisan paper. Hanya diinjeksi jika `paperModePrompt` tidak null. |
| 3 | `file-context` | Konten dari file yang diunggah. |
| 4 | `attachment-awareness` | Panduan referensi lampiran. |
| 5 | `sources-context` | Hasil mentah dari web search. Diinjeksi hanya jika `shouldIncludeRawSourcesContext === true`. |
| 6 | `source-inventory` | Daftar terstruktur sumber yang terkumpul. |
| 7 | `exact-source-inspection` | Aturan tool inspeksi eksak. Diinjeksi hanya jika `shouldIncludeExactInspectionSystemMessage === true`. |
| 8 | `source-provenance` | Kebijakan atribusi anti-halusinasi. **Selalu diinjeksi** (tidak kondisional). |
| 9 | `recent-source-skill` | Instruksi dinamis dari sistem *Skill*. Diinjeksi hanya jika `shouldIncludeRecentSourceSkillInstructions === true`. |
| 10 | `choice-context-note` / `free-text-context-note` | Catatan Choice Note *atau* Free-text Note — **mutually exclusive**, choice note mengambil prioritas. |
| 11 | `choice-yaml-prompt` | Format instruksi *Choice Card*. Diinjeksi hanya pada `isDraftingStage === true`. |
| 12 | `review-finalization-discipline` | Aturan workflow di stage finalisasi (`hasil`, `diskusi`, `kesimpulan`, `pembaruan_abstrak`, `daftar_pustaka`, `lampiran`, `judul`). Termasuk **Daftar Pustaka Revision Chain** yang deterministik. |
| 13 | `completed-session-override` | Izin menjawab follow-up. Diinjeksi hanya jika `paperSession.currentStage === "completed"`. |

---

## 2. Dua Threshold Context Budget

Sistem menggunakan **dua threshold terpisah** yang dihitung dari `context-budget.ts`:

| Threshold | Rasio | Fungsi |
|---|---|---|
| `compactionThreshold` | **85%** dari context window | Memicu P1–P4 compaction chain |
| `threshold` | **80%** dari context window | Memicu brute prune (*shouldPrune*) |

Context window dibaca dari konfigurasi database (`aiProviderConfigs.primaryContextWindow`), dengan fallback ke 128K jika tidak terkonfigurasi. Kedua flag dapat aktif bersamaan; `apply-context-budget.ts` menjalankan compaction **sebelum** brute prune.

---

## 3. Strategi Context Compaction (P1–P4)

Ketika token melebihi `compactionThreshold` (85%), sistem menjalankan `runCompactionChain` secara sekuensial. Setiap priority berhenti segera jika token turun di bawah threshold.

- **P1 (Strip Chitchat)** — Deterministik, semua mode:
  - Pesan user dengan `content.length > 50` karakter **tidak** dianggap chitchat.
  - Pesan user dengan `text.length < 15` **dan** tidak mengandung `?` atau `!` → dihapus.
  - Artinya: hanya pesan pendek (< 15 karakter) tanpa tanda tanya/seru yang distrip.

- **P2 (Compact Oldest Completed Stages)** — Deterministik, **paper mode saja**:
  - Menghapus histori pesan dari stage lama berdasarkan `stageMessageBoundaries` di paperSession.
  - Setelah setiap stage dicompact, menyisipkan **Memory Digest** (`buildStageDigestMessage`) yang merangkum keputusan stage tersebut dari `paperMemoryDigest`, menyaring entry yang `superseded`.
  - Stage diiterasi dari tertua ke terbaru; berhenti segera setelah di bawah threshold.

- **P3 (LLM Summarize)** — Async, paper mode + general chat:
  - **Paper mode**: summarize 30% pertama dari conversation messages, maksimal 30 messages.
  - **General chat**: summarize 40% pertama, maksimal 20 messages (`P3_GENERAL_CHAT_OLDEST_COUNT`).
  - Hanya dijalankan jika `summarizeCount > 2`. Jika LLM summarization gagal/return null, P3 dilewati tanpa error.
  - Hasil summary diinjeksi sebagai system message `[PREVIOUS DISCUSSION SUMMARY]`.

- **P4 (Signal Shrink Stage Detail)** — Sinyal ke caller, **paper mode saja**:
  - P4 **tidak melakukan penghapusan pesan**. Ia hanya set `resolvedAtPriority = "P4"` dan return.
  - Sinyal ini diinterpretasi oleh caller (`apply-context-budget.ts`) untuk memperkecil `formatStageData` detail window.

---

## 4. Brute Prune (Safety Net)

Jika token masih melebihi `threshold` (80%) setelah compaction chain, `apply-context-budget.ts` menjalankan **brute prune**:
- Memisahkan `systemMessages` dan `conversationMessages`.
- Hanya mempertahankan N pesan conversation terakhir (`keepLastN`, default dari `DEFAULT_KEEP_LAST_N = 50`).
- Brute prune ini ada di `src/lib/chat-harness/context/apply-context-budget.ts` (L92-109), **bukan di `route.ts`**.

---

## 5. Filosofi: Memory for Reasoning

Manajemen konteks di sini bukan sekadar optimasi biaya, melainkan strategi untuk menjaga stabilitas *epistemic* agen. Dengan memindahkan beban histori percakapan ke **Memory Digest** (memori semantik di Layer P2), agen memiliki slot token yang lebih besar untuk memproses **Raw Data** dari sumber riset di Layer 5 dan 7 instruction stack. Ini memungkinkan agen tetap "cerdas" dalam melakukan analisis mendalam tanpa terganggu oleh tumpukan histori diskusi yang repetitif.

---

**File Source Code Utama:**
- `src/lib/chat-harness/context/resolve-instruction-stack.ts`: Perakitan 13-layer instruction stack.
- `src/lib/chat-harness/context/apply-context-budget.ts`: Koordinator compaction chain + brute prune; menghitung budget dan memanggil `runCompactionChain`.
- `src/lib/ai/context-budget.ts`: Definisi threshold (85% compaction, 80% brute prune), context window fallback (128K).
- `src/lib/ai/context-compaction.ts`: Implementasi `runCompactionChain` (P1–P4).
- `src/lib/ai/compaction-prompts.ts`: Template prompt untuk summarization P3.
