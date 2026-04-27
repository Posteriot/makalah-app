## Stage 9: Diskusi

### Objective
Menginterpretasi temuan penelitian, membandingkan dengan literatur, dan menjelaskan
implikasi serta keterbatasan. Cross-reference findings dari hasil (stage 8) dengan
literature dari tinjauan literatur (stage 6).

### Signifikansi
Diskusi adalah **stage yang menjembatani temuan empiris dengan teori**. Ini stage
yang secara eksplisit harus menarik dua sumber utama: **hasil penelitian** (stage 8)
dan **tinjauan literatur** (stage 6) — lalu mensintesisnya menjadi interpretasi
yang koheren.

Bedanya dengan hasil: hasil menyajikan **data mentah dan analisis statistik** tanpa
interpretasi. Diskusi mengambil output hasil dan **memberikan makna** — kenapa temuan
ini penting, bagaimana posisinya terhadap literatur existing, apa implikasi teoretis
dan praktisnya, dan apa keterbatasan penelitian.

Bedanya dengan tinjauan literatur: tinjauan literatur membangun **kerangka teoretis
sebelum penelitian dilakukan**. Diskusi menggunakan kerangka itu sebagai **benchmark
untuk mengevaluasi temuan aktual** — apakah temuan mendukung, menentang, atau
memperluas teori existing.

### Artifact Category
**Paper content** — artifact berisi isi section diskusi paper yang tampil di NASKAH.

### Input
- Approved artifacts dari semua stage sebelumnya (tarik dari DB — Cross-Stage C)
- Khususnya:
  - Hasil (stage 8): temuan penelitian, data, analisis yang harus diinterpretasi
  - Tinjauan literatur (stage 6): kerangka teoretis, referensi, gap analysis sebagai benchmark
  - Outline: struktur dan word budget untuk section diskusi
- Existing references dari stage sebelumnya
- Living outline checklist status (checkedAt/checkedBy/editHistory)
- File yang di-attach user (jika ada)

### Search Policy
**PASSIVE — Review Mode.**
TIDAK proaktif mencari sumber. Semua comparison references harus datang dari
tinjauan literatur (stage 6) atau stage sebelumnya.

Jika user eksplisit minta search, baru jalan. Search findings muncul di response
yang sama.

**SEARCH TURN RULE:** Web search dan function tools TIDAK BOLEH di turn yang sama.
Setelah search results arrive, gunakan function tools di turn berikutnya.

### Plan Template
- Max **4** work tasks
- 1 terminal task: "Membuat artifak & Validasi pindah stage ke user" (kind: `artifact_validation`)
- Contoh task: "Review temuan hasil & referensi tinjauan literatur",
  "Interpretasi temuan & perbandingan literatur", "Implikasi & keterbatasan",
  "Finalisasi arah diskusi"

### Output Contract (stageData)
Required (harus ada sebelum `submitStageForValidation`):
- `interpretasiTemuan` (string) — findings interpretation

Optional:
- `perbandinganLiteratur` (string) — literature comparison
- `implikasiTeoretis` (string) — theoretical implications
- `keterbatasanPenelitian` (string) — research limitations

### Function Tools
Full suite tersedia:
- `inspectSourceDocument` — verify source metadata sebelum citing
- `quoteFromSource` — retrieve passages dari stored source
- `searchAcrossSources` — semantic search across all stored sources (cross-reference evidence)
- `readArtifact` — cross-reference artifacts dari stage sebelumnya
- `compileDaftarPustaka` (mode: preview) — bibliography audit (RECOMMENDED sebelum finalize)
- `updateStageData` — save progress
- `createArtifact` — create stage output artifact
- `submitStageForValidation` — submit untuk user approval
- `requestRevision` — call FIRST saat user minta revisi via chat during pending_validation
- `updateArtifact` — create new version saat revisi (BUKAN createArtifact)

**SOURCE TOOLS:** `inspectSourceDocument`, `quoteFromSource`, dan `searchAcrossSources`
tersedia untuk cross-referencing sumber dari stage sebelumnya. Gunakan untuk:
- Verify metadata sumber sebelum sitasi
- Retrieve passages spesifik untuk mendukung interpretasi
- Semantic search across stored sources untuk evidence cross-reference

**EVIDENCE BREADTH:** Report retrieved evidence breadth honestly. Jika results dari
satu sumber, katakan — jangan frame sebagai "all references" atau "cross-source."

### Flow Detail (Step-by-Step)

#### Turn 1: Review material + Present content direction

**Kondisi:** User approve hasil di validation panel → session advance ke diskusi.

**Model:**
1. **Tarik artifacts dari DB** — butuh semua stage sebelumnya, terutama:
   - Hasil (stage 8): temuan yang harus diinterpretasi
   - Tinjauan literatur (stage 6): kerangka teoretis sebagai benchmark
2. Jika ada file attachment baru: acknowledge SEBELUM dialog
3. Emit `plan-spec` block — 4 work task + 1 terminal task
4. Review approved material:
   - Identifikasi temuan kunci dari hasil
   - Map temuan ke kerangka teoretis dari tinjauan literatur
   - Identifikasi area di mana temuan mendukung/menentang/memperluas teori
5. **TIDAK search proaktif** — ini PASSIVE stage
6. Present content direction options:
   - Framing interpretasi (temuan mendukung vs menentang teori)
   - Emphasis (implikasi teoretis vs praktis)
   - Approach keterbatasan (defensive vs constructive)
7. End with **choice card** (`continue_discussion`):
   - 2-3 opsi content direction
   - **RECOMMENDATION** di-highlight

**Harness:**
- Capture `plan-spec` + `yaml-spec`
- No search enforcement (passive stage)

#### Turn 2: Confirm direction + Present finalize

**User:** Klik option di choice card.

**Model:**
1. Summarize chosen direction:
   - Key findings yang akan diinterpretasi
   - Pendekatan perbandingan literatur
   - Focus implikasi dan keterbatasan
2. Boleh call source tools (`inspectSourceDocument`, `quoteFromSource`,
   `searchAcrossSources`) untuk verify cross-reference evidence
3. End with **FINAL choice card** (`finalize_stage`)

**PENTING:** Do NOT draft full content yet — save full drafting untuk step 3.

#### Turn 3 (Finalize): Direction confirmed → Draft ke artifact

**Kondisi:** User klik `finalize_stage`.

**Harness:**
- Enforcer activates → forces tool chain

**Model (enforced by harness):**

**TOOL CHAIN ORDER:** `updateStageData` → `createArtifact` → `submitStageForValidation`

1. `updateStageData` — save `interpretasiTemuan` (+ optional: `perbandinganLiteratur`,
   `implikasiTeoretis`, `keterbatasanPenelitian`)
2. `createArtifact` — artifact content = **section diskusi paper dalam format akademik**.
   Harus berisi:
   - Interpretasi temuan utama — apa artinya data ini
   - Perbandingan dengan literatur — bagaimana temuan relate ke studi sebelumnya
     (referensi dari tinjauan literatur stage 6)
   - Implikasi teoretis — kontribusi terhadap teori existing
   - Implikasi praktis — relevansi untuk praktik/policy
   - Keterbatasan penelitian — limitasi metodologis dan scope
   - Sitasi APA untuk SEMUA klaim yang mereferensikan sumber
3. `submitStageForValidation` — stage status → `pending_validation`

**Chat output setelah artifact:**
- Brief summary: focus interpretasi, pendekatan literatur, implikasi utama
- BUKAN full diskusi
- Satu kalimat confirm + arahkan ke panel

#### Turn Pre-Finalize (RECOMMENDED): Bibliography audit

**Model:**
- Sebelum finalize, RECOMMENDED call `compileDaftarPustaka({ mode: "preview" })`
- Audit reference consistency — terutama cross-check antara referensi dari
  tinjauan literatur (stage 6) dan yang digunakan di diskusi
- Pastikan tidak ada referensi yang hilang atau duplicate

#### Validation Phase

**UI:** `PaperValidationPanel` muncul.

**User options:**
- **Approve** → stage `diskusi` = `approved`, session advance ke stage berikutnya
- **Revise** → trigger revision flow:
  - PATH A (no new search): `requestRevision` → `updateArtifact` → `submitStageForValidation` — SAME turn
  - PATH B (revision requires search): search ONLY this turn. NEXT turn: `requestRevision` → `updateArtifact` → `submitStageForValidation`

### Choice Card Count
Minimum: **2 choice cards** sebelum artifact
- 1 content direction (`continue_discussion`)
- 1 final (`finalize_stage`)
- Bisa lebih jika user minta adjustments

### Edge Cases & Guardrails

1. **Interpretasi tanpa evidence:** Model TIDAK BOLEH membuat klaim interpretasi
   yang tidak grounded di temuan hasil (stage 8). Semua interpretasi harus tied
   ke data aktual
2. **Referensi yang tidak ada di tinjauan literatur:** Diskusi harus primarily
   menggunakan referensi dari tinjauan literatur. Jika referensi baru diperlukan,
   user harus eksplisit minta search
3. **Search turn + function tools:** DILARANG di turn yang sama
4. **Referensi fabricated:** DILARANG. Semua referensi harus dari actual stored sources
5. **Bibliography consistency:** RECOMMENDED audit via `compileDaftarPustaka({preview})`
   sebelum finalize — terutama penting karena diskusi cross-references dua stage
6. **Tool call integrity:** TIDAK BOLEH claim artifact created kecuali benar-benar
   call tools dan dapat success response
7. **Evidence breadth honesty:** Semua guardrails evidence berlaku (exact metadata,
   restatement scope, opening sentence framing). Jika evidence dari satu sumber,
   katakan
8. **Chat output after artifact:** TIDAK BOLEH duplicate artifact body.
   Brief summary + confirm + arahkan ke panel
9. **Source-body parity:** Jika artifact menampilkan reference inventory, include
   ALL items dari attached sources — jangan truncate tanpa menyatakan

### Harness Enforcement Points (saat ini)
| Point | Mechanism | Deterministic? |
|-------|-----------|---------------|
| Plan task count | Plan inflation guard (max 4) | Yes |
| Choice card filter | NONE — model-emitted card unfiltered | No (Disconnect 2) |
| Finalize tool chain | Drafting Choice Artifact Enforcer | Yes |
| Tool chain order | Skill instruction: updateStageData → createArtifact → submitStageForValidation | No (instruction-based) |
| Artifact content quality | NONE — prose used as fallback | No (Disconnect 3) |
| Artifact-session link | Non-atomic (two mutations) | Partial (Disconnect 4) |
| Panel artifact verification | NONE — string presence only | No (Disconnect 5) |
| Discussion turn cap | Soft prompt warning + hard server override | Yes |
| Work-complete constraint | Force finalize after 1 tolerance turn | Yes |
| Circuit breaker | 3x identical / 3x rejected / 15 total | Yes |
| Search-function separation | Runtime constraint (web search blocks tools) | Yes |
| Cross-reference quality | NONE — no validation findings actually mapped to literature | No |
| Bibliography consistency | NONE — compileDaftarPustaka only recommended, not enforced | No |
| Source tool accuracy | NONE — no validation source metadata is correct before citing | No |

### Perbedaan Kunci dengan Stage Sebelumnya

| Aspek | Tinjauan Literatur (6) | Hasil (8) | Diskusi (9) |
|-------|----------------------|-----------|-------------|
| Search policy | ACTIVE (deep academic) | PASSIVE | **PASSIVE (review mode)** |
| Proactive search | Ya | Tidak | **Tidak** |
| Source tools | Ya (full suite) | Ya | **Ya (full suite)** |
| Max work tasks | 5 | 4 | **4** |
| Turn count typical | 3-5+ (iterative search) | 2-3 | **2-3** |
| Bibliography audit | Recommended | Tidak | **Recommended** |
| Nature | Deep academic synthesis | Data presentation | **Interpretasi + cross-reference** |
| Cross-stage dependency | Stages 1-5 | Stages 1-7 | **Hasil (8) + Tinjauan Literatur (6)** |
| Key challenge | Academic source quality | Data accuracy | **Grounding interpretasi ke evidence** |

---

## Phase 2 Design Decisions (from context.md Entry 5)

**D1 (Two-Tier Plan):** Plan menjadi two-tier (context.md 2g). Work tasks = model's domain, display-only. Structural phases (identifikasi → eksplorasi → free zone → tasks complete → verifikasi → artifact) = harness-enforced via `paperToolTracker`.

**D2 (Choice Card Post-Capture Validation):** Post-capture validation aktif: jika model emit finalize-class `workflowAction` tapi `updateStageData` belum dipanggil di drafting session ini, harness downgrade ke `continue_discussion`.

**D3 (CHAIN_COMPLETION Abort):** CHAIN_COMPLETION abort (bukan recover). Impact HIGH — prose chat ≠ academic section. Abort prevents garbage artifact.

**D8 (Atomic Create+Link):** `artifacts.create` mutation di-extend untuk atomic link ke `stageData.artifactId` dalam satu transaction.

**D10 (Validation Recovery):** Validation panel verify artifact existence di DB sebelum render. Error state + retry button jika artifact missing.
