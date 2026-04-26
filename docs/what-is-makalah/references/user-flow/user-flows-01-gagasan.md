## Stage 1: Gagasan --> baca: 

### Objective
Membentuk ide mentah user menjadi arah riset yang feasible dengan klaim novelty yang jelas.

### Prinsip Fundamental: "Apapun Obrolannya, Ujung-Ujungnya Jadi Paper"

Stage gagasan adalah **gerbang masuk** seluruh Makalah AI app. User boleh ngobrol
tentang apapun — ide acak, curhat tentang tugas kampus, pertanyaan umum, bahkan topik
yang belum jelas mau dibawa ke mana. **Tapi prinsipnya tetap satu: obrolan ini HARUS
berakhir menjadi bahan penyusunan paper.**

Ini bukan obrolan tanpa arah. Ini obrolan yang ber-output paper.

Stage gagasan SIGNIFIKAN karena di sinilah ditentukan apakah percakapan ini menjadi
paper yang layak atau hanya chat biasa yang gak ke mana-mana. Model harus:
- Menangkap intensi user, sebebas apapun bentuknya
- Mengarahkan intensi itu ke arah riset yang feasible
- Mengumpulkan bahan (lewat diskusi dan search) yang cukup untuk stage berikutnya
- Menutup dengan output terstruktur (artifact) yang siap dibawa ke stage topik

**Peran harness (bukan hanya prompt):**
Prinsip ini TIDAK BOLEH hanya bergantung pada system prompt dan stage skill yang
bersifat probabilistik. Harness harus secara deterministik mendukung prinsip ini:
- Menyediakan tools yang mengarahkan model ke paper output (plan, choice card, artifact)
- Membatasi domain freedom model — bebas berkreasi, tapi dalam boundary yang
  ditentukan harness (plan locked, choice card gated, artifact required)
- Enforce bahwa stage HARUS berakhir dengan artifact + validation, bukan chat
  yang menggantung tanpa kesimpulan

Model boleh bebas, asal: (a) disediakan tools yang tepat, dan (b) beroperasi dalam
domain yang ditentukan harness. Freedom within structure.

### Input
- Pesan pertama user (ide mentah — bisa berupa apapun)
- File yang di-attach user (jika ada)
- Tidak ada stage sebelumnya (ini stage pertama)

### Search Policy
**ACTIVE — Dual Search Mode.**
Proactif mencari sumber akademik (jurnal, studi) DAN non-akademik (berita, data, kebijakan).
Ini satu-satunya stage selain stage 6 yang model boleh search tanpa diminta user.

Hirarki sumber berlaku (lihat Cross-Stage E): academic sources = rujukan utama,
non-academic sources = wawasan terkini saja, bukan rujukan utama. Saat present
findings, academic FIRST. Saat build argumentasi di artifact, academic yang jadi
backbone.

### Plan Template
- Max 4 work tasks
- 1 terminal task: "Membuat artifak & Validasi pindah stage ke user" (kind: `artifact_validation`)
- Contoh task: "Memahami ide user", "Cari referensi awal", "Analisis kelayakan", "Formulasi arah riset"

### Output Contract (stageData)
Required (harus ada sebelum `submitStageForValidation`):
- `ideKasar` (string) — refined core idea
- `analisis` (string) — feasibility assessment
- `angle` (string) — chosen research perspective

Optional (simpan jika tersedia):
- `novelty` (string) — apa yang membuat pendekatan ini baru
- `referensiAwal` (array) — referensi awal (auto-saved oleh search)

### Flow Detail (Step-by-Step)

#### Turn 1: User mengirim pesan pertama

**User:** Mengirim ide mentah. Bisa berupa satu kalimat ("aku mau nulis paper tentang AI di pendidikan") atau penjelasan panjang. Bisa juga attach file.

**Model:**
1. Jika ada file attachment: acknowledge setiap file by name, summarize 2-4 kalimat per file, connect ke objective stage. Ini HARUS dilakukan SEBELUM dialog lain.
2. Emit `plan-spec` block PERTAMA — 4 work task + 1 terminal task
3. Diskusi substansial tentang ide user:
   - Analisis kekuatan dan kelemahan ide
   - Identifikasi angle yang mungkin
   - Nilai feasibility berdasarkan pengetahuan model
   - TIDAK sycophantic ("wah ide bagus!") — langsung ke substansi
4. State assertively: untuk melanjutkan diskusi secara akurat, model perlu baca referensi awal dulu
5. End with **MANDATORY choice card** (`continue_discussion`):
   - Primary option: "Cari referensi awal" — ini DIRECTIVE, bukan question
   - Ini trigger search di turn berikutnya
6. Model TIDAK search di turn pertama ini

**Harness:**
- Capture `plan-spec` via `pipe-plan-capture.ts`
- Stabilize plan (first emission)
- Capture `yaml-spec` (choice card) via `pipe-yaml-render`
- Save assistant message
- No tool calls expected di turn ini

#### Turn 2: User klik choice card "Cari referensi awal"

**User:** Klik option di choice card.

**Harness:**
- `choiceInteractionEvent` created
- `resolveChoiceWorkflow` → `continue_discussion` → no enforcer chain (discussion, not finalize)

**Model:**
1. Execute web search — dual mode:
   - Academic sources: journals, studies, university research
   - Non-academic sources: news, data, policy articles
2. Present findings di response yang sama (TIDAK tanya dulu "mau cari?")
3. Separate sources: Academic FIRST, then Non-Academic
4. Classify claims with epistemic labels:
   - "Supported by academic evidence" + cite source
   - "Indicated by non-academic sources" + cite source
   - "Needs further verification"
5. Be transparent about source proportions ("5 academic, 15 non-academic")
6. End with **choice card** (`continue_discussion`):
   - 2-3 direction options based on findings
   - Recommendation labeled which is best and why

**CONSTRAINT:** Turn ini search-only. TIDAK BOLEH call function tools (updateStageData dll).
Findings disimpan di turn berikutnya.

#### Turn 3-N: Incremental discussion per plan task

**User:** Klik salah satu option di choice card, atau ketik response manual.

**Model:**
1. Untuk setiap plan task (dikerjakan SATU PER SATU):
   a. Present analysis/findings untuk task saat ini di text
   b. Mark task sebelumnya sebagai `complete` di plan-spec (jika confirmed)
   c. End with **choice card** (`continue_discussion`) — user steer direction
   d. TUNGGU response user sebelum lanjut ke task berikutnya
2. Jika perlu simpan data ke stageData: call `updateStageData` (tidak boleh di search turn)
3. TIDAK BOLEH combine multiple tasks dalam satu response
4. TIDAK BOLEH skip tasks

**Harness:**
- Capture updated plan-spec setiap turn
- Track plan task progression
- No enforcement (masih `continue_discussion`)

#### Turn Final: Semua work tasks complete → Finalize

**Kondisi:** Semua 4 work tasks sudah confirmed oleh user via choice cards.

**Model:**
1. Present summary of what was discussed and agreed upon
2. Emit **FINAL choice card** (`finalize_stage`):
   - Ini COMMIT point — "Buat artifak gagasan?"
   - Option harus clear bahwa ini akan create artifact dan move ke validation

**User:** Klik `finalize_stage` option.

**Harness:**
- `choiceInteractionEvent` created
- `resolveChoiceWorkflow` → `finalize_stage` → `ResolvedChoiceWorkflow` with `toolStrategy: "update_create_submit"`
- **Drafting Choice Artifact Enforcer** activates:
  - Forces tool chain: `updateStageData` → `createArtifact` → `submitStageForValidation`
  - `toolChoice` set to `required` — model HARUS call tools

**Model (enforced by harness):**
1. `updateStageData` — save `ideKasar`, `analisis`, `angle` (+ optional fields)
2. `createArtifact` — artifact content = elaborated conclusion of the discussion.
   Artifact ini berisi **poin-poin penting yang jadi bekal penyusunan paper di stage
   berikutnya**: ide yang sudah di-refine, analisis kelayakan, angle riset, referensi
   awal. Artifact ini disimpan di DB sebagai persistent backup — ketika model masuk
   stage topik, artifact gagasan inilah yang ditarik sebagai input utama (lihat Cross-Stage C).
3. `submitStageForValidation` — stage status → `pending_validation`

**Harness post-tool:**
- Artifact created in `artifacts` table (persistent, outlives context window)
- `stageData[gagasan].artifactId` linked (currently non-atomic — Disconnect 4)
- Stage status → `pending_validation`

#### Validation Phase

**UI:** `PaperValidationPanel` muncul.

**User options:**
- **Approve** → stage `gagasan` = `approved`, session advance ke stage `topik`
- **Revise** → trigger revision flow

**Jika Revise:**
- Model receives revision request
- PATH A (no search): `requestRevision` → `updateArtifact` → `submitStageForValidation` — same turn
- PATH B (needs search): search this turn → next turn immediately `requestRevision` → `updateArtifact` → `submitStageForValidation`
- Artifact content saat ini di-inject sebagai "📄 CURRENT ARTIFACT" — model apply changes ke ini, TIDAK generate ulang dari scratch
- Panel muncul lagi untuk approval/revise

### Choice Card Count
Minimum: **5 choice cards** sebelum artifact
- 1 per work task (4 work tasks × `continue_discussion`)
- 1 final (`finalize_stage`)
- Bisa lebih jika user minta deeper discussion

### Edge Cases & Guardrails

1. **File attachment di turn pertama:** Acknowledge SEBELUM dialog — overrides "dialog first" directive
2. **Search di turn pertama:** DILARANG. Model harus discuss dulu, search di turn berikutnya
3. **Search + function tools same turn:** DILARANG. Search turn = search only. Function tools = next turn
4. **Model skip tasks:** DILARANG. Setiap task = checkpoint di mana user bisa redirect/challenge/deepen
5. **Model add tasks setelah plan locked:** DILARANG kecuali user explicitly minta deeper exploration
6. **Evidence breadth honesty:** Jangan claim "semua referensi menunjukkan..." kalau evidence dari satu sumber. First sentence harus reflect limitation
7. **Exact metadata:** Jika user tanya metadata spesifik (author, title, date), model HARUS call `inspectSourceDocument`. TIDAK boleh infer dari URL
8. **Tool call integrity:** TIDAK BOLEH claim artifact created kecuali benar-benar call `createArtifact` + `submitStageForValidation` dan receive success
9. **CHAIN_COMPLETION fallback:** Jika model gagal call tools setelah finalize, harness trigger CHAIN_COMPLETION — tapi ini menggunakan prose sebagai artifact content (Disconnect 3)

### Harness Enforcement Points (saat ini)
| Point | Mechanism | Deterministic? |
|-------|-----------|---------------|
| Plan task count | Plan inflation guard | Yes |
| Choice card filter | NONE — model-emitted card unfiltered | No (Disconnect 2) |
| Finalize tool chain | Drafting Choice Artifact Enforcer | Yes |
| Artifact content quality | NONE — prose used as fallback | No (Disconnect 3) |
| Artifact-session link | Non-atomic (two mutations) | Partial (Disconnect 4) |
| Panel artifact verification | NONE — string presence only | No (Disconnect 5) |
| Discussion turn cap | Soft prompt warning + hard server override | Yes |
| Work-complete constraint | Force finalize after 1 tolerance turn | Yes |
| Circuit breaker | 3x identical / 3x rejected / 15 total | Yes |

---

## Phase 2 Design Decisions (from context.md Entry 5)

- **D1 (Two-Tier Plan):** Plan menjadi two-tier (context.md 2g). Work tasks = model's domain, display-only. Structural phases (identifikasi → eksplorasi → free zone → tasks complete → verifikasi → artifact) = harness-enforced via `paperToolTracker`.
- **D3 (CHAIN_COMPLETION Abort):** CHAIN_COMPLETION abort (bukan recover). Impact LOW untuk preparatory stages — prose-as-notes masih tolerable, tapi abort tetap berlaku untuk konsistensi lifecycle.
- **D8 (Atomic Create+Link):** `artifacts.create` mutation di-extend untuk atomic link ke `stageData.artifactId` dalam satu transaction.
- **D10 (Validation Recovery):** Validation panel verify artifact existence di DB sebelum render. Error state + retry button jika artifact missing.

