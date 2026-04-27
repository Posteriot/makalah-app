# User Flows & System Behavior

> DNA document untuk redesign harness enforcement.
> Mendeskripsikan bagaimana sistem bekerja per stage dari perspektif user, model, dan harness —
> sehingga setiap determinasi, constraint, dan edge case terlihat jelas untuk dirancang ulang.

## Referensi Arsitektur

| Referensi                       | Path                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Harness anatomy                 | `.worktrees/what-is-makalah/docs/what-is-makalah/references/agent-harness/anatomy/anatomy-agent-harness.md`                              |
| Artifact pattern                | `.references/agent-harness/artifact-aidsk.md`                                                                                            |
| Json-renderer / choice card     | `.references/agent-harness/json-renderer-vercel/index.md`                                                                                |
| Control plane vs domain actions | `.worktrees/what-is-makalah/docs/what-is-makalah/references/agent-harness/control-plane-domain-action.md`                                |
| System prompt (offline v69)     | `.worktrees/what-is-makalah/docs/what-is-makalah/references/agent-harness/system-prompt-skills-active/updated-9`                         |
| Stage skills (offline v69)      | `.worktrees/what-is-makalah/docs/what-is-makalah/references/agent-harness/system-prompt-skills-active/updated-9` s/d `14-judul-skill.md` |

---

## Cross-Stage Mechanisms

Mekanisme berikut berlaku di SEMUA 14 stage. Didokumentasikan sekali di sini supaya tidak diulang per stage — tapi setiap stage section akan mereferensi mekanisme ini ketika perilaku spesifik stage menyimpang atau menambahkan di atas mekanisme shared.

### A. Plan-Spec Lifecycle

**Apa:** Plan adalah work breakdown yang di-emit model dalam format YAML (fenced `plan-spec`). Plan mendeklarasikan task-task yang harus dikerjakan di stage ini.

**Siapa yang mengelola plan:**
Model bertindak sebagai agent yang di-persona-kan menjadi expert penyusunan paper akademik (persona dibentuk dalam system prompt utama). Dalam kapasitas ini, MODEL yang:

- **Menentukan** task-task dalam plan (berdasarkan stage objective dan input yang tersedia)
- **Mengerjakan** setiap task (melalui reasoning, search, dan tool calls)
- **Menyelesaikan** task dengan mark status `complete` di plan-spec berikutnya

Plan adalah self-managed by model — harness hanya capture, stabilize, persist, dan display. Harness TIDAK menentukan isi task, TIDAK mengerjakan task, dan saat ini TIDAK memverifikasi apakah task benar-benar dikerjakan (lihat Known Disconnect di bawah).

**Bagaimana:**

1. Model emit `plan-spec` YAML di setiap response (captured oleh `pipe-plan-capture.ts`)
2. Plan pertama kali di-stabilize oleh `stabilizePlanAgainstCurrent()` di `plan-spec.ts`
3. Setelah stabil, plan LOCKED — model tidak boleh add/remove/reorder task kecuali user minta
4. Setiap stage punya `maxWorkTasks` dari `STAGE_LIMITS` di `stage-skill-contracts.ts`
5. Plan di-persist ke `paperSessions.stageData[stage]._plan` via `updatePlan` mutation
6. Plan di-inject ke prompt via `formatStageData.ts` supaya model bisa lihat progress

**Struktur plan:**

- N work tasks (jumlah max bervariasi per stage, lihat stage section)
- 1 terminal task: "Membuat artifak & Validasi pindah stage ke user" (kind: `artifact_validation`)
- Terminal task hanya complete setelah `createArtifact` + `submitStageForValidation` sukses

**Status task:** `pending` → `in-progress` → `complete`

**Rendering saat ini:**
Plan di-render oleh `UnifiedProcessCard` component — standalone React component yang terpisah dari json-renderer framework. Plan dan choice card saat ini adalah **dua rendering pipeline terpisah** (plan: `pipe-plan-capture` → `UnifiedProcessCard`,
choice: `pipe-yaml-render` → `JsonRendererChoiceBlock`).

**Design consideration untuk redesign:**
Plan berpotensi di-render melalui json-renderer supaya plan dan choice card menggunakan **satu framework UI yang sama**. Ini akan menyatukan capture pipeline dan rendering path. Pertimbangan: plan di-update setiap response (living display), sedangkan choice card di-emit sekali per response (one-shot interactive). Keputusan di design doc.

**Known disconnect (lihat context.md Disconnect 1):**
Task status saat ini self-reported oleh model. Tidak ada verifikasi harness bahwa pekerjaan benar-benar dilakukan.

**Phase 2 decision (context.md Entry 5, D1):**
Plan menjadi **two-tier** (lihat context.md principle 2g):

- **Tier 1 — Structural phases** (harness-enforced): identifikasi stage → eksplorasi konteks → _free zone_ → tasks complete → verifikasi → generate artifact & validation. Harness verify via `paperToolTracker` (tool calls nyata), bukan plan status.
- **Tier 2 — Work tasks** (model-determined): di antara eksplorasi dan tasks complete, model bebas. Harness hanya display, BUKAN gate.
- `areWorkTasksComplete()` menjadi **informational signal** (display-only), bukan gating condition. Gating pindah ke structural phases dan post-capture validation (lihat Mechanism B).

### B. Choice Card (json-renderer yaml-spec)

**Apa:** Choice card adalah UI interaktif yang di-generate model melalui json-renderer.
Ini adalah bahasa visual model untuk human-in-the-loop — menuntun user memilih arah,
menyetujui rekomendasi, atau mengambil keputusan.

**Fungsi utama:** Choice card berisi **rekomendasi dari agent AI** untuk pilihan terkait
isi section paper yang sedang dikerjakan. Ini memudahkan user sehingga tidak perlu
mengetik — user cukup klik opsi. User hanya mengetik jika opsi yang diinginkan tidak
tertayang di choice card.

**Bagaimana:**

1. Model emit `yaml-spec` inline di response stream
2. Captured oleh `pipe-yaml-render` → disimpan di `capturedSpecRef`
3. Di-persist di field `jsonRendererChoice` pada message
4. Rendered di UI sebagai interactive card dengan opsi yang bisa di-klik user

**Dua workflowAction utama:**

- `continue_discussion` — melanjutkan diskusi, TIDAK commit ke artifact. User menyetujui/mengarahkan, model melanjutkan ke task berikutnya
- `finalize_stage` — commit point. User setuju bahwa diskusi selesai, trigger tool chain ke artifact

**Variant khusus:**

- `special_finalize` — untuk stage 8 (hasil), 13 (lampiran), 14 (judul)
- `compile_then_finalize` — untuk stage 12 (daftar pustaka), trigger `compileDaftarPustaka` dulu

**Kesetaraan bobot prompt user dan choice card:**
User prompt yang dikirim via chat punya **bobot setara** dengan klik choice card.
Jika user mengetik arah/pilihan yang substansinya sama dengan opsi di choice card,
model harus memperlakukannya identik — bukan second-class input.

Contoh kesetaraan:

- User klik "Cari referensi awal" di choice card = user ketik "tolong carikan referensi"
- User klik opsi topik A di choice card = user ketik "aku pilih arah topik A karena..."
- User klik `finalize_stage` = user ketik "oke, lanjut buat artifaknya"

**Deteksi kesetaraan — BUKAN regex:**
Penentuan apakah prompt user setara dengan choice card action TIDAK BOLEH menggunakan
regex atau keyword matching. Regex dengan daftar kata tidak akan efektif menyaring
varian bahasa Indonesia yang sangat beragam. Deteksi dilakukan melalui:

- **Instruction-driven:** Stage skill dan system prompt yang menginstruksikan model
  untuk interpret intent user, bukan code yang match pattern
- **Model semantic understanding:** Model yang memahami bahwa "ya udah bikin aja"
  setara dengan klik finalize — bukan regex yang match "bikin"

Ini sesuai prinsip CLAUDE.md: "Anti-regex for language understanding. Do not use regex
to parse, classify, or interpret natural language input. LLMs handle language — regex does not."

**Yang TIDAK boleh lewat choice card:**

- Stage approval / validation — itu domain `PaperValidationPanel`
- Stage transition — itu domain harness setelah validation approved

**Known disconnect (lihat context.md Disconnect 2):**
Choice card yang di-emit model saat ini tidak difilter oleh plan state. Model bisa offer `finalize_stage` meskipun plan task masih pending.

**Phase 2 decision (context.md Entry 5, D2):**
Choice card **tetap stream-based YAML** — TIDAK diubah menjadi domain tool. Harness menambah **post-capture validation** menggunakan pattern yang sama dengan 3 existing server overrides (`server_override_continue_to_finalize`, `server_override_discussion_limit_exceeded`, `server_override_work_complete_continue_exhausted`).

- **Mechanism:** Jika `capturedSpecRef` berisi finalize-class `workflowAction` DAN stage adalah paper-content (4-12) DAN `updateStageData` belum dipanggil di drafting session ini (dicek via `paperToolTracker`), maka downgrade ke `continue_discussion` + harness note.
- **Signal:** `paperToolTracker` (record tool calls nyata), BUKAN `areWorkTasksComplete()` (self-reported).
- **Rationale:** Ini control plane verification (boolean check), bukan domain reasoning. Same pattern, bukan arsitektur baru.

### C. Artifact Lifecycle

**Apa:** Artifact adalah output terstruktur dari setiap stage — bukan chat prose, tapi dokumen yang berdiri sendiri dengan lifecycle-nya sendiri.

**Artifact sebagai persistent data (bukan hanya display):**
Artifact disimpan di database (`artifacts` table) dan berfungsi sebagai **backup persisten dari context window**. Context window bersifat volatile — bisa di-compact,
bisa hilang saat session panjang, bisa drift. Artifact di DB adalah **source of truth**
untuk output setiap stage.

Ketika model masuk ke stage berikutnya, yang HARUS ditarik pertama adalah **isi artifact
dari stage sebelumnya** (via `readArtifact` tool atau injected context). Model bekerja
dengan data valid dari DB, bukan hanya bersandar pada informasi di context window
yang mungkin sudah stale atau ter-compact.

Prinsip ini berlaku di SEMUA stage transitions:

- Stage N approve → masuk stage N+1
- Model di stage N+1 tarik artifact stage N dari DB sebagai input utama
- Context window hanya supplementary — artifact DB yang authoritative

**Empat kategori artifact:**
Setiap stage HARUS menghasilkan artifact — tidak ada exception. Fitur NASKAH
menampilkan preview lengkap dari seluruh stage, sehingga setiap stage harus punya
artifact yang bisa ditampilkan.

| Kategori          | Stages                          | Artifact berisi                                                                                           | Peran di NASKAH                                                                    |
| ----------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Preparatory**   | 1 gagasan, 2 topik, 3 outline   | Kesimpulan diskusi, bahan kerja, keputusan arah                                                           | Referensi/metadata. Topik (`definitif`) jadi working title                         |
| **Paper content** | 4-12 (abstrak → daftar_pustaka) | Isi section paper itu sendiri                                                                             | Section (subbab) paper — ini the actual paper                                      |
| **Advisory**      | 13 lampiran                     | Saran model tentang data yang sebaiknya dilampirkan, ATAU "Tidak Ada Lampiran" jika user tidak punya data | Section lampiran. Pengelolaan data actual oleh user (fitur dedicated = future dev) |
| **Meta-update**   | 14 judul                        | Judul final yang dipilih                                                                                  | Update title di NASKAH, mengganti working title dari topik                         |

Implikasi per kategori:

- **Preparatory:** Skill fokus pada how to discuss and conclude. Artifact = working document internal.
- **Paper content:** Skill harus tegas tentang **how to write** — format akademik, struktur
  section, gaya bahasa, citation. Artifact = paper itu sendiri, bukan notes.
- **Advisory:** Artifact selalu exist (bahkan jika "Tidak Ada Lampiran"). Stage tetap melalui
  full lifecycle (plan → choice → artifact → validation).
- **Meta-update:** Artifact update metadata paper (judul) di fitur NASKAH.

**Bagaimana:**

1. Model call `createArtifact` tool — artifact disimpan di table `artifacts`
2. Artifact di-link ke session via `paperSessions.stageData[stage].artifactId`
3. Setelah artifact created, model call `submitStageForValidation`
4. Stage status berubah ke `pending_validation`
5. `PaperValidationPanel` muncul di UI

**Untuk revisi:**

1. User request revision (via panel atau chat)
2. Model call `requestRevision` → status berubah ke `revision`
3. Model call `updateArtifact` (BUKAN `createArtifact`) untuk update konten
4. Model call `submitStageForValidation` lagi
5. Panel muncul lagi untuk approval

**Tool chain order (SELALU sama):**

```
updateStageData → createArtifact → submitStageForValidation
```

Exception: stage 12 (daftar pustaka) punya `compileDaftarPustaka({persist})` sebelum chain.

**Known disconnect (lihat context.md Disconnect 3, 4):**

- CHAIN_COMPLETION menggunakan prose sebagai artifact content (Disconnect 3)
- Artifact-to-session link non-atomic — dua mutation terpisah (Disconnect 4)

**Phase 2 decisions (context.md Entry 5, D3 + D8):**

_Disconnect 3 — CHAIN_COMPLETION:_
CHAIN_COMPLETION **tidak lagi membuat artifact dari prose**. Ketika chain incomplete, behavior baru:

1. Clear `choiceInteractionEvent` (revert finalization attempt)
2. Stage tetap `drafting`
3. Emit fallback choice card: retry finalize / continue discussion
4. Log event untuk observability
   Enforcer handle retry di turn berikutnya — sudah detect incomplete chain via `paperToolTracker`.
   Edge case: repeated trigger → circuit breaker (Phase 1 mechanism #1) catches loop.

_Disconnect 4 — Atomic link:_
`artifacts.create` mutation di-extend untuk juga write `stageData.artifactId` link dalam **satu transaction**. Pattern sudah terbukti: `artifacts.update` sudah melakukan 3-table atomic writes. Stage 12: `compileDaftarPustaka` tetap terpisah (read-only query, separated dari create oleh model reasoning) — yang di-atomic-kan hanya `createArtifact` + stageData link.

### D. Validation Panel

**Apa:** `PaperValidationPanel` adalah UI component yang muncul setelah artifact
di-submit. Ini adalah human-in-the-loop gate untuk stage transition.

**Bagaimana:**

1. Muncul ketika `stageStatus === "pending_validation"` DAN `stageData[stage].artifactId` ada
2. User bisa: Approve (stage selesai, lanjut ke stage berikutnya) atau Revise (kembali ke revision flow)
3. Setelah approve: stage status → `approved`, session advance ke stage berikutnya

**Kesetaraan bobot prompt user dan validation panel:**
Validation panel bisa digantikan oleh **validasi teks dari user**. Ketika user mengirim
prompt seperti "setuju dan lanjutkan", "oke bagus, next stage", atau "approved",
itu punya **bobot setara** dengan klik tombol Approve di validation panel.

Demikian juga untuk revisi: user ketik "tolong perbaiki bagian X" setara dengan
klik Revise di panel lalu isi feedback.

**Deteksi kesetaraan — BUKAN regex:**
Sama seperti choice card (lihat Cross-Stage B), penentuan apakah prompt user setara
dengan validation action TIDAK BOLEH menggunakan regex atau keyword matching.
Deteksi dilakukan instruction-driven: stage skill dan system prompt menginstruksikan
model untuk interpret intent user sebagai approve/revise, bukan code yang match kata.

Ini penting karena varian bahasa Indonesia sangat beragam:

- "setuju" = "oke" = "lanjut" = "gas" = "ya udah bagus" = "acc" = approve
- "ubah X" = "perbaiki Y" = "kurang Z" = "tambahin A" = revise
  Regex tidak akan menangkap semua varian ini. Model yang harus interpret.

**Rendering saat ini:**
Standalone React component (`PaperValidationPanel.tsx`) — TIDAK menggunakan json-renderer.
Component ini punya mode transitions (normal → revision form → back), isDirty flag,
animasi, dan direct handler props (`onApprove`, `onRevise`). Rendered di `ChatWindow.tsx`
secara kondisional di bawah message list.

**Design consideration untuk redesign:**
Validation panel berpotensi di-render melalui json-renderer untuk konsistensi framework.
Pertimbangan: menurut `control-plane-domain-action.md`, `submitStageForValidation` dan
`requestRevision` adalah **domain tools** (bukan control plane) — artinya validation
lifecycle adalah domain action yang model trigger. Ini mendukung argumen bahwa panel
ini bisa jadi json-renderer component yang keberadaannya di-trigger model.
Counterargument: konten panel selalu fixed (Approve/Revise), bukan model-generated
content — json-renderer di-design untuk model-generated UI.
Keputusan di design doc.

**Arsitektur boundary (dari control-plane-domain-action.md):**

| Layer                   | Tanggung jawab terkait validation             |
| ----------------------- | --------------------------------------------- |
| Control plane (harness) | Verification outcome, completion blockers     |
| Domain tools (model)    | `submitStageForValidation`, `requestRevision` |
| Backend guards (Convex) | Legal state transitions, required conditions  |

**Known disconnect (lihat context.md Disconnect 5):**
Panel hanya cek `artifactId` sebagai string presence, tidak verify artifact benar-benar ada di table.

**Phase 2 decision (context.md Entry 5, D10):**
Jika `artifactId` ada di `stageData` tapi artifact row tidak ada di DB:

1. Validation panel menampilkan **error state** (bukan blank/stuck)
2. Menyediakan tombol "Buat ulang artifak" → trigger revision flow
3. **Backend guard:** `submitStageForValidation` mutation di Convex memvalidasi artifact existence sebelum menerima submission.

### E. Web Search & Source Hierarchy

**Search web skill:** Sistem memiliki "search web skill" — sebuah skill (sama
fungsinya dengan stage skill) yang memberikan procedural knowledge untuk melakukan
web search secara efektif. Skill ini aktif di stage-stage tertentu (lihat search
policy per stage).

**Source hierarchy (berlaku di SEMUA stage yang search):**

- **Academic sources** (jurnal, studi, konferensi, repository universitas) = **rujukan utama**.
  Ini yang menjadi fondasi argumentasi paper. Klaim yang didukung sumber akademik
  boleh dijadikan pilar tulisan.
- **Non-academic sources** (berita, blog, data pemerintah, artikel kebijakan) = **wawasan terkini saja**.
  Ini BUKAN rujukan utama. Fungsinya memberikan konteks, fenomena terkini, atau data
  pendukung — tapi TIDAK boleh menjadi satu-satunya basis argumentasi paper.

Model harus memperlakukan hirarki ini secara konsisten: saat present findings,
academic sources FIRST, non-academic SECOND. Saat build argumentasi di artifact,
academic sources yang jadi backbone, non-academic hanya supplementary.

**Turn constraint:** Web search dan function tools TIDAK BISA dijalankan di turn yang sama.

- Turn search: model search, present findings, end with choice card
- Turn berikutnya: model bisa pakai function tools (updateStageData, dll)

### F. Revision Contract (berlaku semua stage)

**Dua path:**

- **PATH A** (tanpa search baru): `requestRevision` → `updateArtifact` → `submitStageForValidation` — SAME turn
- **PATH B** (perlu search baru): search ONLY di turn ini → NEXT turn IMMEDIATELY `requestRevision` → `updateArtifact` → `submitStageForValidation`

Saat revisi, artifact content saat ini di-inject ke prompt sebagai "📄 CURRENT ARTIFACT" — model harus pakai ini sebagai base, bukan generate ulang dari scratch.

### G. Enforcer Chain (harness-side)

**Apa:** Setelah user klik choice card, harness menentukan tool chain yang harus
dieksekusi model secara deterministik.

**3 enforcer types:**

1. **Revision Chain Enforcer** — aktif saat `pending_validation` atau `revision`
2. **Drafting Choice Artifact Enforcer** — aktif saat `drafting` + ada `choiceInteractionEvent` + `shouldEnforceArtifactChain`
3. **Universal Reactive Enforcer** — fallback untuk drafting di semua stage

**Composition priority:** exactSource → revision → draftingChoice → universal → deterministicSync

**Phase 2 decision (context.md Entry 5, D6):**
Enforcer chain **tetap di control plane**. Enforcers enforce tool call ordering (runtime operation), bukan domain decisions (content quality, option selection). Consistent with principle 2f.

---

## Index

- Stage 1: Gagasan --> baca: `user-flows-01-gagasan.md`
- Stage 2: Topik --> baca: `user-flows-02-topik.md`
- Stage 3: Outline --> baca: `user-flows-03-outline.md`
- Stage 4: Abstrak --> baca: `user-flows-04-abstrak.md`
- Stage 5: Pendahuluan --> baca: `user-flows-05-pendahuluan.md`
- Stage 6: Tinjauan Literatur --> baca: `user-flows-06-tinjauan-literatur.md`
- Stage 7: Metodologi --> baca: `user-flows-07-metodologi.md`
- Stage 8: Hasil --> baca: `user-flows-08-hasil.md`
- Stage 9: Diskusi --> baca: `user-flows-09-diskusi.md`
- Stage 10: Kesimpulan --> baca: `user-flows-10-kesimpulan.md`
- Stage 11: Pembaruan Abstrak --> baca: `user-flows-11-pembaruan-abstrak.md`
- Stage 12: Daftar Pustaka --> baca: `user-flows-12-daftar-pustaka.md`
- Stage 13: Lampiran --> baca: `user-flows-13-lampiran.md`
- Stage 14: Judul --> baca: `user-flows-14-judul.md`
