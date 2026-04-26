## Stage 8: Hasil

### Objective
Generate projected research results based on approved methodology, literature review,
and research questions from previous stages. Agent drafts the results section
autonomously — user validates, not provides raw data.

### Signifikansi
Hasil adalah stage paper content dengan **DUA mode operasi**:

1. **Agentic mode (default):** Model generate projected results dari approved material
   (metodologi design, tinjauan literatur findings, rumusan masalah). User tidak perlu
   menyediakan data mentah — model memproyeksikan hasil berdasarkan kerangka yang sudah
   disetujui.

2. **Manual data entry mode (optional):** Hanya aktif jika user **eksplisit menyatakan**
   punya data riset aktual untuk diinput. Ini BUKAN default — model tidak boleh
   mengasumsikan user punya data kecuali diberitahu.

Perbedaan ini krusial: di agentic mode, model adalah **penulis** yang memproyeksikan
temuan. Di manual mode, model adalah **penerima** yang menstrukturkan data user.

Stage ini juga menggunakan `special_finalize` (bukan `finalize_stage`) sebagai
workflowAction pada choice card terakhir — karena Hasil memerlukan treatment khusus
di harness: projected results harus di-validate lebih ketat sebelum menjadi artifact.

### Artifact Category
**Paper content** — artifact berisi isi section hasil penelitian paper yang tampil di NASKAH.

### Input
- Approved artifacts dari semua stage sebelumnya (tarik dari DB — Cross-Stage C)
- Khususnya:
  - Metodologi: `pendekatanPenelitian`, `desainPenelitian`, `metodePerolehanData` — determines what kind of results to project
  - Tinjauan Literatur: `kerangkaTeoretis`, `reviewLiteratur` — determines theoretical basis for projected findings
  - Pendahuluan: `rumusanMasalah`, `tujuanPenelitian` — determines what questions the results must answer
  - Gagasan + Topik: `angle`, `novelty`, `researchGap` — provides the research direction
- Living outline checklist status (`checkedAt`, `checkedBy`, `editHistory`)
- File yang di-attach user (jika ada)

### Search Policy
**PASSIVE — only when user explicitly requests it.**
Ini adalah REVIEW MODE: generate dari existing approved material dulu, bukan dari search baru.
Model TIDAK boleh proactively search. Jika user eksplisit minta search, jalankan segera.

**SEARCH TURN RULE:** Web search dan function tools TIDAK BOLEH di turn yang sama.

### Plan Template
- Max **4** work tasks
- 1 terminal task: "Membuat artifak & Validasi pindah stage ke user" (kind: `artifact_validation`)
- Contoh task: "Review approved material", "Tentukan format penyajian hasil",
  "Proyeksikan temuan utama", "Susun data points"

### Output Contract (stageData)
Required (harus ada sebelum `submitStageForValidation`):
- `temuanUtama` (array) — key findings

Optional:
- `metodePenyajian` (string) — presentation method
- `dataPoints` (array) — data points

### Function Tools
Allowed:
- `updateStageData` — save stage progress
- `createArtifact` — create stage output artifact
- `requestRevision` — call FIRST when user requests changes via chat during `pending_validation`
- `updateArtifact` — create new version during revision (NOT `createArtifact`)
- `submitStageForValidation` — call in the SAME TURN as `createArtifact`
- `compileDaftarPustaka` (mode: preview) — cross-stage bibliography audit without persistence
- `readArtifact` — read full content of previous stage's artifact for cross-stage reference

**PENTING:** Stage ini menggunakan `special_finalize` sebagai workflowAction,
BUKAN `finalize_stage`. Ini berarti choice card terakhir emit `special_finalize`,
dan harness mengenali action ini untuk trigger tool chain enforcement.

Disallowed:
- Stage jumping
- `compileDaftarPustaka` (mode: persist) — hanya boleh di stage daftar_pustaka
- Function tools di turn yang sama dengan web search
- Inventing data points

### Flow Detail (Step-by-Step)

#### Turn 1: Review approved material + Present direction options

**Kondisi:** User approve metodologi di validation panel → session advance ke hasil.

**Model:**
1. **Tarik artifacts dari DB** — butuh semua stage sebelumnya, terutama metodologi
   (design penelitian), tinjauan literatur (kerangka teoretis), dan pendahuluan
   (rumusan masalah + tujuan).
2. Jika ada file attachment baru: acknowledge SEBELUM dialog.
3. Emit `plan-spec` block — 4 work task + 1 terminal task.
4. Review approved material dan identifikasi:
   - Jenis hasil yang bisa diproyeksikan berdasarkan desain penelitian
   - Format penyajian yang sesuai (narrative/tabular/mixed)
   - Key findings yang harus di-cover berdasarkan rumusan masalah
5. **Determine mode:**
   - Default → agentic mode (project results dari material)
   - Jika user eksplisit menyatakan punya data aktual → switch ke manual data entry mode
6. End with **choice card** (`continue_discussion`):
   - 2-3 opsi format penyajian (narrative, tabular, mixed)
   - **RECOMMENDATION** di-highlight
   - Opsi framing/emphasis jika relevan

**Harness:**
- Capture `plan-spec` + `yaml-spec`
- No function tool enforcement (discussion turn)

#### Turn 2: Confirm direction + Deeper analysis

**User:** Klik option di choice card.

**Model:**
1. Summarize chosen direction (format penyajian, emphasis)
2. Present deeper analysis: projected key findings berdasarkan direction yang dipilih
3. Jika user mau adjustment: emit choice card tambahan (`continue_discussion`)
4. Jika direction sudah confirmed: present **FINAL choice card** (`special_finalize`)

#### Turn Finalize: Direction confirmed → Draft ke artifact

**Kondisi:** Direction confirmed via choice cards, semua work tasks complete.

**Model (sebelum finalize click):**
1. Summarize chosen direction dan projected findings scope
2. Emit **FINAL choice card** (`special_finalize`)

**User:** Klik `special_finalize`.

**Harness:**
- Enforcer activates → forces tool chain

**Model (enforced by harness):**
1. `updateStageData` — save `temuanUtama` (+ optional `metodePenyajian`, `dataPoints`)
2. `createArtifact` — artifact content = **section hasil penelitian paper dalam format akademik**.
   Harus berisi:
   - Temuan utama yang diproyeksikan berdasarkan desain penelitian
   - Penyajian data sesuai format yang dipilih (narrative/tabular/mixed)
   - Diferensiasi jelas antara observed findings dan interpretation
   - Konsistensi logis dengan metodologi dan tinjauan literatur
   - Sitasi APA untuk klaim yang mereferensikan sumber
3. `submitStageForValidation` — stage status → `pending_validation`

**Chat output setelah artifact:**
- Brief summary: format penyajian, key findings covered, data scope
- BUKAN full section hasil
- Satu kalimat confirm artifact created + arahkan ke panel validasi

#### Validation Phase

**UI:** `PaperValidationPanel` muncul.

**User options:**
- **Approve** → stage `hasil` = `approved`, session advance ke stage berikutnya
- **Revise** → trigger revision flow

**Revision contract:**
- PATH A (no search needed): `requestRevision(feedback)` → `updateArtifact` → `submitStageForValidation` — SAME turn
- PATH B (revision requires search): search ONLY this turn. NEXT turn: immediately `requestRevision` → `updateArtifact` → `submitStageForValidation`
- Selalu gunakan `updateArtifact` (BUKAN `createArtifact`) untuk revisi
- Base revision pada `📄 CURRENT ARTIFACT` yang di-inject, bukan regenerate dari scratch

### Choice Card Count
Minimum: **2 choice cards** sebelum artifact
- 1 direction/format penyajian (`continue_discussion`)
- 1 final confirmation (`special_finalize`)
- Bisa lebih jika user minta adjustment

### Edge Cases & Guardrails

1. **Agentic vs manual mode confusion:** Default SELALU agentic. Manual data entry
   hanya jika user EKSPLISIT bilang punya data aktual. Model tidak boleh bertanya
   "apakah Anda punya data?" — asumsikan agentic kecuali diberitahu sebaliknya
2. **Inventing data points:** DILARANG. Projected results harus logically derived
   dari approved methodology dan literature, bukan fabricated
3. **Findings vs interpretation:** Model HARUS diferensiasi jelas antara temuan
   yang diproyeksikan dan interpretasi/implikasi
4. **Inconsistency dengan metodologi:** Results harus konsisten dengan desain
   penelitian di stage metodologi. Kuantitatif → data numerik projected.
   Kualitatif → temuan tematik projected
5. **Tool call integrity:** TIDAK BOLEH claim artifact created kecuali benar-benar
   call `createArtifact` dan `submitStageForValidation` dan terima success response.
   **Non-negotiable**
6. **Chat output setelah artifact:** TIDAK BOLEH duplicate artifact body di chat.
   Brief summary saja + confirm + arahkan ke panel
7. **Bibliography consistency:** RECOMMENDED audit via `compileDaftarPustaka({preview})`
   sebelum finalize
8. **Search turn + function tools:** DILARANG di turn yang sama
9. **SOURCE-BODY PARITY:** Jika artifact body display reference inventory, include
   ALL items. Jangan silently truncate

### Harness Enforcement Points (saat ini)
| Point | Mechanism | Deterministic? |
|-------|-----------|---------------|
| Plan task count | Plan inflation guard (max 4) | Yes |
| Choice card filter | NONE — model-emitted card unfiltered | No (Disconnect 2) |
| Finalize tool chain | Drafting Choice Artifact Enforcer (`special_finalize`) | Yes |
| Artifact content quality | NONE — prose used as fallback | No (Disconnect 3) |
| Artifact-session link | Non-atomic (two mutations) | Partial (Disconnect 4) |
| Panel artifact verification | NONE — string presence only | No (Disconnect 5) |
| Discussion turn cap | Soft prompt warning + hard server override | Yes |
| Work-complete constraint | Force finalize after 1 tolerance turn | Yes |
| Circuit breaker | 3x identical / 3x rejected / 15 total | Yes |
| Search-function separation | Runtime constraint (web search blocks tools) | Yes |
| Agentic vs manual mode | NONE — model instruction only | No |
| Data invention prevention | NONE — model instruction only | No |

### Perbedaan Kunci dengan Stage Sebelumnya

| Aspek | Tinjauan Literatur (6) | Metodologi (7) | Hasil (8) |
|-------|----------------------|----------------|-----------|
| Search policy | ACTIVE (deep academic) | PASSIVE | **PASSIVE** |
| Proactive search | Ya | Tidak | **Tidak** |
| Dual mode | Tidak | Tidak | **Ya (agentic + manual)** |
| Max work tasks | 5 | 4 | **4** |
| Finalize action | `finalize_stage` | `finalize_stage` | **`special_finalize`** |
| Turn count typical | 3-5+ | 2-3 | **2-3** |
| Bibliography audit | Recommended | Tidak | **Recommended** |
| Nature | Deep academic synthesis | Research design framing | **Projected findings** |
| Key constraint | Academic sources must dominate | Design-method consistency | **No data invention, findings vs interpretation** |

---

## Phase 2 Design Decisions (from context.md Entry 5)

**D1 (Two-Tier Plan):** Plan menjadi two-tier (context.md 2g). Work tasks = model's domain, display-only. Structural phases (identifikasi → eksplorasi → free zone → tasks complete → verifikasi → artifact) = harness-enforced via `paperToolTracker`.

**D2 (Choice Card Post-Capture Validation):** Post-capture validation aktif: jika model emit finalize-class `workflowAction` tapi `updateStageData` belum dipanggil di drafting session ini, harness downgrade ke `continue_discussion`.

**D3 (CHAIN_COMPLETION Abort):** CHAIN_COMPLETION abort (bukan recover). Impact HIGH — stage ini pakai `special_finalize` dan projected results butuh validasi ketat. Abort prevents garbage artifact.

**D8 (Atomic Create+Link):** `artifacts.create` mutation di-extend untuk atomic link ke `stageData.artifactId` dalam satu transaction.

**D10 (Validation Recovery):** Validation panel verify artifact existence di DB sebelum render. Error state + retry button jika artifact missing.
