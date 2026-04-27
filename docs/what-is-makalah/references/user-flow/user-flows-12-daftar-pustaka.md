## Stage 12: Daftar Pustaka

### Objective
Compile daftar pustaka yang bersih dan lengkap dari sitasi yang sudah approved
dan sumber yang terverifikasi di seluruh stage sebelumnya. Compile bibliography
via `compileDaftarPustaka`, buat artifact, submit untuk validasi.

### Signifikansi
Daftar pustaka adalah **satu-satunya stage yang menggunakan `compile_then_finalize`
workflowAction** dan **satu-satunya stage yang memanggil `compileDaftarPustaka({ mode: "persist" })`**.
Ini adalah **compilation stage, BUKAN writing stage** — model tidak menulis konten
baru, melainkan mengompilasi referensi yang sudah digunakan di stage-stage sebelumnya
menjadi daftar pustaka yang konsisten dan lengkap.

Bedanya dengan stage paper content lain: stage lain **menulis** section paper
(pendahuluan, tinjauan literatur, dll). Daftar pustaka **mengompilasi** — mengambil
semua referensi yang tersebar di berbagai stage dan menyusunnya dalam format
sitasi yang konsisten. Tidak ada analisis, tidak ada sintesis, tidak ada narasi baru.

Posisi strategis: ini stage finalisasi pertama setelah core content selesai
(stage 10). Semua referensi dari stage 1-10 harus ter-capture di sini. Jika
ada referensi yang hilang atau duplikat, ini tempat terakhir untuk membetulkannya.

### Artifact Category
**Paper content** — artifact berisi section daftar pustaka (bibliography) paper yang tampil di NASKAH.

### Input
- Referensi dari **SEMUA** stage sebelumnya (tarik dari DB — Cross-Stage C)
- Source metadata dari stageData stage sebelumnya
- Khususnya:
  - Gagasan: `referensiAwal` (sumber awal eksplorasi)
  - Tinjauan Literatur: referensi akademik (backbone bibliography)
  - Stage lain: sitasi yang digunakan di masing-masing artifact
- Living outline checklist status (checkedAt/checkedBy/editHistory)
- File yang di-attach user (jika ada)

### Search Policy
**PASSIVE — Review Mode.**
Generate dari approved material yang sudah ada, BUKAN dari search baru.
Hanya search kalau user **explicitly minta**. Jika search jalan, findings
muncul di response yang sama.

**PENTING:** Web search dan function tools TIDAK BOLEH jalan di turn yang sama.

Jangan fabricate references — kalau butuh evidence, tanya user apakah mau search.

### Plan Template
- Max **3** work tasks
- 1 terminal task: "Membuat artifak & Validasi pindah stage ke user" (kind: `artifact_validation`)
- Contoh task: "Review referensi dari seluruh stage", "Audit konsistensi sitasi",
  "Compile daftar pustaka final"

### Output Contract (stageData)
Required (harus ada sebelum `submitStageForValidation`):
- `entries` (array) — compiled bibliography entries

Optional:
- `totalCount` (number) — total entry count

### Function Tools
Allowed:
- `compileDaftarPustaka({ mode: "persist" })` — **MANDATORY** untuk finalisasi bibliography.
  **HANYA tersedia di stage ini.** Harus di-call SEBELUM `updateStageData` di tool chain
- `compileDaftarPustaka({ mode: "preview" })` — cross-stage bibliography audit tanpa persistence
- `inspectSourceDocument({ sourceId })` — verify exact source metadata sebelum citing
- `quoteFromSource({ sourceId, query })` — retrieve passages dari specific stored source
- `searchAcrossSources({ query })` — semantic search across semua stored sources
- `updateStageData` — save stage progress
- `createArtifact` — create stage output artifact
- `requestRevision` — call FIRST saat user minta revisi via chat selama pending_validation
- `updateArtifact` — new version saat revision (BUKAN createArtifact)
- `submitStageForValidation` — call di turn SAMA dengan createArtifact
- `readArtifact` — baca artifact stage sebelumnya untuk cross-reference

Disallowed:
- Placeholder bibliography entries
- Stage jumping
- Manual final bibliography compilation **tanpa** `compileDaftarPustaka({ mode: "persist" })`
- Function tools di turn yang sama dengan web search

### Flow Detail (Step-by-Step)

#### Turn 1: Review references + Present direction

**Kondisi:** User approve kesimpulan di validation panel → session advance ke daftar pustaka.

**Model:**
1. **Tarik artifacts dari DB** — butuh referensi dari SEMUA stage sebelumnya,
   terutama source metadata dan sitasi yang digunakan di setiap artifact.
2. Jika ada file attachment baru: acknowledge SEBELUM dialog.
3. Emit `plan-spec` block — 3 work task + 1 terminal task
4. Review existing references: identifikasi total count, konsistensi format,
   potential duplicates, dan gaps
5. Boleh call `compileDaftarPustaka({ mode: "preview" })` untuk audit awal
6. End with **choice card** (`continue_discussion`):
   - 2-3 opsi arah kompilasi: citation style, grouping approach, atau
     penanganan edge cases
   - **RECOMMENDATION** di-highlight
   - Contoh opsi: "APA 7th strict", "Include semua sumber termasuk non-academic",
     "Hanya sumber yang di-cite langsung di paper body"

**CONSTRAINT:** Ini REVIEW stage. TIDAK proactive search. TIDAK generate artifact
di turn pertama.

**Harness:**
- Capture `plan-spec` + `yaml-spec`
- No function tool enforcement (direction turn)

#### Turn 2: Direction confirmed → Summarize + Compile confirmation card

**User:** Klik option di choice card.

**Model:**
1. Summarize chosen direction:
   - Confirm citation style yang dipilih
   - Ringkas total referensi yang akan di-compile
   - Note any duplicates/gaps yang akan di-resolve
2. Emit **FINAL choice card** (`compile_then_finalize`)

**PENTING:** Do NOT draft full content yet — full compilation happens di turn 3.
`compile_then_finalize` workflowAction menandakan bahwa turn berikutnya akan
menjalankan `compileDaftarPustaka({ mode: "persist" })` diikuti tool chain lengkap.

#### Turn 3: Compile + Finalize → Full tool chain

**User:** Klik `compile_then_finalize`.

**Harness:**
- Enforcer activates → forces tool chain

**Model (enforced by harness):**
1. `compileDaftarPustaka({ mode: "persist" })` — **MANDATORY FIRST STEP.**
   Compile bibliography dari semua referensi yang tersimpan. Tool ini melakukan
   cross-stage compilation dan persistence
2. `updateStageData` — save `entries` (+ optional `totalCount`)
3. `createArtifact` — artifact content = **section daftar pustaka paper**.
   Harus berisi:
   - Semua referensi yang di-cite di paper body
   - Format sitasi konsisten (sesuai style yang dipilih user)
   - Tidak ada placeholder entries
   - Tidak ada duplikat
   - Urutan sesuai convention (alphabetical untuk APA, numbered untuk IEEE, dll)
4. `submitStageForValidation` — stage status → `pending_validation`

**TOOL CHAIN ORDER:** `compileDaftarPustaka({ mode: "persist" })` → `updateStageData` →
`createArtifact` → `submitStageForValidation`.
Ini **BERBEDA** dari semua stage lain yang mulai dari `updateStageData`.
Do NOT skip `compileDaftarPustaka`. Do NOT skip `updateStageData`.
Do NOT call `submitStageForValidation` sebelum `createArtifact`.

**Chat output setelah artifact:**
- Brief summary: total reference count, source stages covered, notable gaps/additions
- BUKAN full daftar pustaka
- Satu kalimat confirm artifact created + arahkan ke panel validasi

#### Validation Phase

**UI:** `PaperValidationPanel` muncul.

**User options:**
- **Approve** → stage `daftar_pustaka` = `approved`, session advance ke stage berikutnya
- **Revise** → trigger revision flow

**Revision contract:**
- PATH A (no search needed): `requestRevision(feedback)` → `updateArtifact` →
  `submitStageForValidation` — semua di turn SAMA
- PATH B (revision butuh search): search ONLY turn ini (no function tools).
  NEXT turn: IMMEDIATELY `requestRevision` → `updateArtifact` →
  `submitStageForValidation` tanpa tunggu user reminder

### Choice Card Count
Minimum: **2 choice cards** sebelum artifact
- 1 direction proposal (`continue_discussion`)
- 1 compile confirmation (`compile_then_finalize`)
- Bisa lebih kalau user minta adjustments

### Edge Cases & Guardrails

1. **Placeholder bibliography entries:** DILARANG. Setiap entry harus dari
   actual source yang digunakan di paper. Tidak boleh ada "placeholder" atau
   "to be added" entries
2. **Inconsistent citation formatting:** Semua entries harus mengikuti satu
   citation style yang konsisten. Model harus detect dan resolve format
   inconsistencies selama compilation
3. **Duplicate entries:** DILARANG. Referensi yang sama dari stage berbeda
   harus di-deduplicate. `compileDaftarPustaka` seharusnya handle ini, tapi
   model harus verify
4. **Missing references:** Referensi yang di-cite di paper body tapi tidak
   ada di daftar pustaka = critical error. Model harus cross-check
5. **Manual compilation tanpa tool:** DILARANG. Final compilation HARUS melalui
   `compileDaftarPustaka({ mode: "persist" })`. Model tidak boleh manually
   menyusun bibliography tanpa tool ini
6. **Tool call integrity:** TIDAK BOLEH claim artifact created kecuali benar-benar
   call tools dan dapat success response
7. **Chat output setelah artifact:** TIDAK BOLEH duplicate artifact body.
   Summary only + arahkan ke panel
8. **Revision during pending_validation:** Gunakan `updateArtifact`, BUKAN
   `createArtifact`. `createArtifact` hanya untuk first draft
9. **Evidence breadth honesty:** Jangan claim "all references compiled" kecuali
   benar-benar di-verify. Jika ada limitation, state explicitly

### Harness Enforcement Points (saat ini)
| Point | Mechanism | Deterministic? |
|-------|-----------|---------------|
| Plan task count | Plan inflation guard (max 3) | Yes |
| Choice card filter | NONE — model-emitted card unfiltered | No (Disconnect 2) |
| Compile tool enforcement | NONE — no runtime check compileDaftarPustaka was called | No |
| Finalize tool chain | Drafting Choice Artifact Enforcer | Yes |
| Artifact content quality | NONE — prose used as fallback | No (Disconnect 3) |
| Artifact-session link | Non-atomic (two mutations) | Partial (Disconnect 4) |
| Panel artifact verification | NONE — string presence only | No (Disconnect 5) |
| Discussion turn cap | Soft prompt warning + hard server override | Yes |
| Work-complete constraint | Force finalize after 1 tolerance turn | Yes |
| Circuit breaker | 3x identical / 3x rejected / 15 total | Yes |
| Duplicate detection | NONE — no validation entries are unique | No |
| Placeholder detection | NONE — no validation entries are real sources | No |

### Perbedaan Kunci dengan Stage Sebelumnya

| Aspek | Kesimpulan (10) | Daftar Pustaka (12) |
|-------|-----------------|---------------------|
| Search policy | PASSIVE | **PASSIVE** |
| Nature | Synthesis & jawaban rumusan masalah | **Compilation — bukan writing** |
| workflowAction | `finalize_stage` | **`compile_then_finalize` (UNIQUE)** |
| Mandatory tool | Tidak ada | **`compileDaftarPustaka({ mode: "persist" })` (UNIQUE)** |
| Tool chain order | `updateStageData` → `createArtifact` → `submit` | **`compileDaftarPustaka` → `updateStageData` → `createArtifact` → `submit`** |
| Max work tasks | 4 | **3** |
| Turn count typical | 2-3 | **2-3** |
| Required stageData | `ringkasanHasil`, `jawabanRumusanMasalah` | **`entries` (array)** |
| Key constraint | Jawaban 1:1 ke rumusan masalah | **No placeholders, no duplicates, consistent formatting** |
| Source tools | `readArtifact` only | **Full suite: `inspectSourceDocument`, `quoteFromSource`, `searchAcrossSources`** |
| Position | Last core content stage | **First finalization stage** |
| Next stage | Daftar Pustaka (12) | **Lampiran (13) — finalization** |

---

## Phase 2 Design Decisions (from context.md Entry 5)

**D1 (Two-Tier Plan):** Plan menjadi two-tier (context.md 2g). Work tasks = model's domain, display-only. Structural phases (identifikasi → eksplorasi → free zone → tasks complete → verifikasi → artifact) = harness-enforced via `paperToolTracker`.

**D2 (Choice Card Post-Capture Validation):** Post-capture validation aktif: jika model emit `compile_then_finalize` tapi `updateStageData` belum dipanggil di drafting session ini, harness downgrade ke `continue_discussion`.

**D3 (CHAIN_COMPLETION Abort):** CHAIN_COMPLETION abort (bukan recover). Impact HIGH — stage ini compilation, bukan writing. Prose sebagai bibliography = invalid. Abort prevents garbage. Stage 12 punya variant tool chain (`compileDaftarPustaka` → chain), abort tetap berlaku.

**D8 (Atomic Create+Link):** `artifacts.create` mutation di-extend untuk atomic link ke `stageData.artifactId` dalam satu transaction. `compileDaftarPustaka` tetap terpisah (read-only query) — yang di-atomic-kan hanya `createArtifact` + stageData link, bukan compile + create.

**D9 (New Tools):** `rollbackArtifactVersion` masuk Phase 2 scope — berguna untuk error recovery jika compiled bibliography perlu di-revert.

**D10 (Validation Recovery):** Validation panel verify artifact existence di DB sebelum render. Error state + retry button jika artifact missing.
