## Stage 7: Metodologi

### Objective
Mendefinisikan metodologi penelitian yang executable dan academically defensible,
selaras dengan tujuan penelitian yang sudah disetujui.

### Signifikansi
Metodologi adalah **stage pertama setelah tinjauan literatur** yang kembali ke
**PASSIVE search policy**. Berbeda dengan tinjauan literatur yang proaktif mencari
sumber, metodologi **derive dari material yang sudah approved** — topik, outline,
pendahuluan, dan tinjauan literatur.

Stage ini unik karena merupakan **stage desain penelitian**: user harus memilih
pendekatan (kualitatif/kuantitatif/mixed), desain penelitian, metode perolehan data,
dan teknik analisis. Model menyajikan 2-3 opsi metodologi via choice card dengan
RECOMMENDATION, bukan langsung generate.

### Artifact Category
**Paper content** — artifact berisi isi section metodologi paper yang tampil di NASKAH.

### Input
- Approved artifacts dari semua stage sebelumnya (tarik dari DB — Cross-Stage C)
- Khususnya:
  - Topik: research direction dan scope penelitian
  - Outline: struktur dan word budget untuk metodologi
  - Pendahuluan: rumusan masalah dan tujuan penelitian (alignment)
  - Tinjauan literatur: kerangka teoretis dan gap analysis (justifikasi metode)
- Living outline checklist status (checkedAt/checkedBy/editHistory)
- File yang di-attach user (jika ada)

### Search Policy
**PASSIVE — Derive dari material approved.**
TIDAK proaktif search. Search hanya jalan kalau user EXPLICITLY minta.
Ketika search jalan, findings muncul di response yang sama.

**SEARCH TURN RULE:** Web search dan function tools TIDAK BOLEH di turn yang sama.
Setelah search results tiba, simpan findings via function tools di turn berikutnya.

### Plan Template
- Max **5** work tasks
- 1 terminal task: "Membuat artifak & Validasi pindah stage ke user" (kind: `artifact_validation`)
- Contoh task: "Review material & arah penelitian", "Analisis opsi pendekatan metodologi",
  "Tentukan desain & metode perolehan data", "Pilih teknik analisis",
  "Draft metodologi ke artifact"

### Output Contract (stageData)
Required (harus ada sebelum `submitStageForValidation`):
- `desainPenelitian` (string) — research design
- `pendekatanPenelitian` (string) — research approach

Optional:
- `metodePerolehanData` (string) — data collection method
- `teknikAnalisis` (string) — analysis technique

### Function Tools
Tersedia:
- `updateStageData` — save stage progress
- `createArtifact` — create stage output artifact
- `requestRevision` — call FIRST saat user minta revisi via chat di pending_validation
- `updateArtifact` — buat versi baru artifact saat revisi (BUKAN createArtifact)
- `submitStageForValidation` — call di turn SAMA dengan createArtifact
- `compileDaftarPustaka` (mode: preview) — cross-stage bibliography audit tanpa persistence
- `readArtifact` — baca full content artifact stage sebelumnya

**Perbedaan dengan tinjauan literatur:**
- TIDAK ada `inspectSourceDocument`, `quoteFromSource`, `searchAcrossSources`
  (source tools tidak tersedia — derive dari material, bukan search baru)
- TIDAK ada proactive search — passive only

Disallowed:
- Stage jumping
- `compileDaftarPustaka` (mode: persist) di luar daftar_pustaka stage
- Function tools + web search di turn yang sama
- Method claims tanpa clear rationale

### Flow Detail (Step-by-Step)

#### Turn 1: Review material + Present methodology direction

**Kondisi:** User approve tinjauan literatur di validation panel → session advance ke metodologi.

**Model:**
1. **Tarik artifacts dari DB** — butuh semua stage sebelumnya, terutama tinjauan literatur
   (kerangka teoretis, gap analysis) dan pendahuluan (rumusan masalah, tujuan penelitian).
2. Jika ada file attachment baru: acknowledge SEBELUM dialog
   (nama file + ringkasan 2-4 kalimat + koneksi ke objective stage).
3. Emit `plan-spec` block — 5 work task + 1 terminal task
4. Review approved material: identifikasi arah metodologi yang paling sesuai
   dengan research gap dan kerangka teoretis
5. **TIDAK ada proactive search** — ini PASSIVE stage, derive dari material existing
6. Present **choice card** (`continue_discussion`):
   - 2-3 opsi pendekatan metodologi (e.g., kualitatif/kuantitatif/mixed)
   - **RECOMMENDATION** di-highlight dengan rationale
   - Setiap opsi jelaskan implikasi: desain, pengumpulan data, analisis

**Harness:**
- Capture `plan-spec` + `yaml-spec`
- No function tool enforcement (direction turn)

#### Turn 2-N: Discussion + Refine methodology choices

**User:** Klik option di choice card.

**Model:**
1. Elaborate pendekatan yang dipilih user
2. Present detail methodology: desain penelitian, metode perolehan data, teknik analisis
3. Jika user minta search: jalankan search (search turn — TIDAK function tools)
4. Save progress via `updateStageData` (jika bukan search turn)
5. End with **choice card** (`continue_discussion`) jika masih ada task pending,
   atau lanjut ke finalize jika semua direction confirmed

**PENTING:** Method choices harus internally consistent dan feasible untuk user context.
Setiap keputusan harus align dengan research gap dari tinjauan literatur.

#### Turn Finalize: Direction confirmed → Draft ke artifact

**Kondisi:** Semua work tasks complete, pendekatan/desain/metode/teknik confirmed.

**Model:**
1. Summarize chosen methodology: pendekatan, desain, metode, teknik analisis
2. Emit **FINAL choice card** (`finalize_stage`)

**User:** Klik `finalize_stage`.

**Harness:**
- Enforcer activates → forces tool chain

**Model (enforced by harness):**
1. `updateStageData` — save `desainPenelitian`, `pendekatanPenelitian` (+ optional fields)
2. `createArtifact` — artifact content = **section metodologi paper dalam format akademik**.
   Harus berisi:
   - Pendekatan penelitian (kualitatif/kuantitatif/mixed) dengan justifikasi
   - Desain penelitian yang dipilih
   - Metode perolehan data (instrumen, populasi/sampel jika relevan)
   - Teknik analisis data
   - Keseluruhan harus konsisten internal dan align dengan rumusan masalah
3. `submitStageForValidation` — stage status → `pending_validation`

**Chat output setelah artifact:**
- Brief summary: pendekatan, desain, teknik analisis utama
- BUKAN full section metodologi
- Satu kalimat confirm + arahkan ke panel

#### Validation Phase

**UI:** `PaperValidationPanel` muncul.

**User options:**
- **Approve** → stage `metodologi` = `approved`, session advance ke stage berikutnya
- **Revise** → trigger revision flow:
  - PATH A (no search needed): `requestRevision` → `updateArtifact` → `submitStageForValidation` — semua di turn SAMA
  - PATH B (revision butuh search): search ONLY turn ini (no function tools).
    NEXT turn: IMMEDIATELY `requestRevision` → `updateArtifact` → `submitStageForValidation`

### Choice Card Count
Minimum: **2 choice cards** sebelum artifact
- 1 direction/pendekatan metodologi (`continue_discussion`)
- 1 final (`finalize_stage`)
- Bisa lebih jika user minta adjustment atau detail tambahan

### Edge Cases & Guardrails

1. **Method claims tanpa rationale:** DILARANG. Setiap pilihan metodologi harus ada
   justifikasi yang jelas, linked ke research gap dan kerangka teoretis
2. **Internal inconsistency:** Pendekatan, desain, pengumpulan data, dan analisis
   harus coherent (e.g., jangan mixed methods tapi teknik analisis hanya kuantitatif)
3. **Search turn + function tools:** DILARANG di turn yang sama.
   `updateStageData` di turn berikutnya
4. **Tool call integrity:** TIDAK BOLEH claim artifact created kecuali benar-benar call tools
5. **Artifact body duplication:** Setelah createArtifact, chat response BUKAN duplicate
   artifact body — brief summary saja
6. **Plan stability:** TIDAK BOLEH tambah task baru mendekati akhir untuk keep discussing.
   Saat direction task complete, present final choice card
7. **Revision contract:** Di pending_validation, gunakan `updateArtifact` (BUKAN createArtifact).
   Base revision pada CURRENT ARTIFACT content yang di-inject di prompt
8. **Source-body parity:** Jika artifact menampilkan referensi, include ALL items dari
   sumber. Jangan truncate tanpa explicit statement

### Harness Enforcement Points (saat ini)
| Point | Mechanism | Deterministic? |
|-------|-----------|---------------|
| Plan task count | Plan inflation guard (max 5) | Yes |
| Choice card filter | NONE — model-emitted card unfiltered | No (Disconnect 2) |
| Finalize tool chain | Drafting Choice Artifact Enforcer | Yes |
| Artifact content quality | NONE — prose used as fallback | No (Disconnect 3) |
| Artifact-session link | Non-atomic (two mutations) | Partial (Disconnect 4) |
| Panel artifact verification | NONE — string presence only | No (Disconnect 5) |
| Discussion turn cap | Soft prompt warning + hard server override | Yes |
| Work-complete constraint | Force finalize after 1 tolerance turn | Yes |
| Circuit breaker | 3x identical / 3x rejected / 15 total | Yes |
| Search-function separation | Runtime constraint (web search blocks tools) | Yes |
| Method rationale validation | NONE — no check that choices have justification | No |
| Internal consistency check | NONE — no validation desain vs pendekatan vs teknik | No |

### Perbedaan Kunci dengan Stage Sebelumnya

| Aspek | Pendahuluan (5) | Tinjauan Literatur (6) | Metodologi (7) |
|-------|-----------------|----------------------|----------------|
| Search policy | PASSIVE | **ACTIVE (deep academic)** | **PASSIVE** |
| Proactive search | Tidak | Ya | **Tidak** |
| Source tools | Ya (full suite) | Ya (full suite) | **Tidak** (derive only) |
| Max work tasks | 5 | 5 | **5** |
| Turn count typical | 2-3 | 3-5+ (iterative search) | **2-3** |
| Bibliography audit | Tidak | Recommended | **Available (preview)** |
| Nature | Narrative framing | Deep academic synthesis | **Research design decisions** |
| Key decision | Framing & flow | Theoretical lens & gaps | **Approach, design, method, technique** |
| stageData required | temaUtama, latarBelakang | kerangkaTeoretis, reviewLiteratur | **desainPenelitian, pendekatanPenelitian** |

---

## Phase 2 Design Decisions (from context.md Entry 5)

**D1 (Two-Tier Plan):** Plan menjadi two-tier (context.md 2g). Work tasks = model's domain, display-only. Structural phases (identifikasi → eksplorasi → free zone → tasks complete → verifikasi → artifact) = harness-enforced via `paperToolTracker`.

**D2 (Choice Card Post-Capture Validation):** Post-capture validation aktif: jika model emit finalize-class `workflowAction` tapi `updateStageData` belum dipanggil di drafting session ini, harness downgrade ke `continue_discussion`.

**D3 (CHAIN_COMPLETION Abort):** CHAIN_COMPLETION abort (bukan recover). Impact HIGH — prose chat ≠ academic section. Abort prevents garbage artifact.

**D8 (Atomic Create+Link):** `artifacts.create` mutation di-extend untuk atomic link ke `stageData.artifactId` dalam satu transaction.

**D10 (Validation Recovery):** Validation panel verify artifact existence di DB sebelum render. Error state + retry button jika artifact missing.
