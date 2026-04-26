## Stage 5: Pendahuluan

### Objective
Menulis pendahuluan yang kuat dengan latar belakang, rumusan masalah, research gap,
tujuan penelitian, signifikansi, dan opsional hipotesis.

### Artifact Category
**Paper content** — artifact berisi isi section pendahuluan paper yang tampil di NASKAH.

### Input
- Approved artifacts dari semua stage sebelumnya (tarik dari DB — Cross-Stage C)
- Khususnya:
  - Gagasan: ide, analisis kelayakan, angle
  - Topik: topik definitif, research gap, argumentasi kebaruan
  - Outline: struktur section, word budget untuk pendahuluan
  - Abstrak: ringkasan penelitian (untuk alignment)
- Living outline checklist status
- File yang di-attach user (jika ada)

### Search Policy
**PASSIVE — Review Mode.**
Generate dari approved material (gagasan, topik, saved references). TIDAK proactive search.

### Plan Template
- Max **5** work tasks (lebih dari abstrak yang max 4)
- 1 terminal task: "Membuat artifak & Validasi pindah stage ke user" (kind: `artifact_validation`)
- Contoh task: "Review material", "Identifikasi narrative approach", "Formulasi rumusan masalah",
  "Susun alur argumentasi", "Draft pendahuluan ke artifact"

### Output Contract (stageData)
Required (harus ada sebelum `submitStageForValidation`):
- `latarBelakang` (string) — background context
- `rumusanMasalah` (string) — problem formulation

Optional:
- `researchGapAnalysis` (string) — research gap analysis
- `tujuanPenelitian` (string) — research objectives
- `sitasiAPA` (array) — APA citations

### Function Tools
**Kembali punya source tools** — berbeda dari abstrak dan topik:
- `inspectSourceDocument` — verify exact source metadata sebelum citing
- `quoteFromSource` — retrieve passages dari stored source
- `searchAcrossSources` — semantic search across all stored sources
- `readArtifact` — cross-reference artifact stage sebelumnya
- `compileDaftarPustaka` (mode: preview) — bibliography audit

Source tools kembali tersedia karena pendahuluan butuh **sitasi langsung** dari
referensi yang sudah dikumpulkan. Berbeda dari abstrak yang lebih ringkas dan
jarang butuh direct citation.

### Flow Detail (Step-by-Step)

#### Turn 1: Review material + Narrative approach proposal

**Kondisi:** User approve abstrak di validation panel → session advance ke pendahuluan.

**Model:**
1. **Tarik artifacts dari DB** — butuh gagasan, topik, outline, abstrak.
   Pendahuluan harus aligned dengan abstrak (yang sudah di-approve) dan
   mengikuti struktur dari outline.
2. Jika ada file attachment baru: acknowledge SEBELUM dialog.
3. Emit `plan-spec` block — 5 work task + 1 terminal task
4. Review approved material, lalu present **narrative approach**:
   - 2-3 opsi narrative framing — misalnya:
     - Opsi A: mulai dari fenomena umum, narrowing ke masalah spesifik
     - Opsi B: mulai dari research gap, lalu latar belakang
     - Opsi C: mulai dari urgency/impact, lalu konteks akademik
5. Present via **choice card** (`continue_discussion`):
   - 2-3 opsi
   - **RECOMMENDATION** di-highlight

**Pola:** Direction + Finalize Review (sama dengan abstrak — lihat user-flows-04).

**Harness:**
- Capture `plan-spec` + `yaml-spec`
- Semua stageData sebelumnya tersedia di context

#### Turn 2-N: Discussion jika user minta adjustment

**Model:**
- Proses adjustment via choice cards (`continue_discussion`)
- TIDAK draft content selama masih `continue_discussion`

#### Turn Finalize: Direction confirmed → Draft ke artifact

**Model:**
1. Summarize chosen narrative approach
2. Emit **FINAL choice card** (`finalize_stage`)

**User:** Klik `finalize_stage`.

**Harness:**
- Enforcer activates → forces tool chain

**Model (enforced by harness):**
1. `updateStageData` — save `latarBelakang`, `rumusanMasalah` (+ optional fields)
2. `createArtifact` — artifact content = **section pendahuluan paper dalam format akademik**.
   Struktur pendahuluan:
   - Latar belakang: konteks umum → narrowing ke masalah
   - Rumusan masalah: pertanyaan penelitian yang spesifik
   - Research gap: apa yang belum diteliti/belum terjawab
   - Tujuan penelitian: apa yang mau dicapai
   - Signifikansi: kenapa penelitian ini penting
   - Opsional: hipotesis (jika applicable)
   - Sitasi APA untuk klaim yang mereferensikan sumber
3. `submitStageForValidation` — stage status → `pending_validation`

**Chat output setelah artifact:**
- Brief summary: narrative approach, problem framing, research gap highlighted, objectives
- BUKAN full pendahuluan
- Satu kalimat confirm + arahkan ke panel

#### Validation Phase

**UI:** `PaperValidationPanel` muncul.

**User options:**
- **Approve** → stage `pendahuluan` = `approved`, session advance ke `tinjauan_literatur`
- **Revise** → trigger revision flow (Cross-Stage F)

### Choice Card Count
Minimum: **2 choice cards** sebelum artifact
- 1 direction/narrative approach (`continue_discussion`)
- 1 final (`finalize_stage`)

### Evidence & Citation Guardrails
Stage ini punya guardrails evidence yang lebih ketat dari abstrak karena
pendahuluan mengandung klaim-klaim yang harus di-cite:

1. **Evidence breadth honesty:** Jangan claim "semua referensi menunjukkan..."
   kalau evidence dari satu sumber. First sentence harus reflect limitation
2. **Exact metadata discipline:** Jika user tanya metadata spesifik, model HARUS
   call `inspectSourceDocument`. TIDAK boleh infer dari URL
3. **Restatement scope preservation:** "Jawab ulang" bukan license untuk widen
   evidence coverage
4. **Source-body parity:** Jika artifact display reference inventory, include ALL items.
   Jangan silently truncate

### Edge Cases & Guardrails

1. **Pendahuluan terlalu panjang:** Ikuti word budget dari outline. Pendahuluan
   typical 10-15% dari total paper
2. **Rumusan masalah tidak spesifik:** Model harus write specific, measurable
   research questions — bukan broad statements
3. **Klaim tanpa sitasi:** DILARANG. Pendahuluan paper harus cite sources untuk
   factual claims
4. **Tidak aligned dengan abstrak:** Pendahuluan harus consistent dengan apa yang
   di-promise di abstrak (yang sudah approved)
5. **Tool call integrity:** TIDAK BOLEH claim artifact created kecuali benar-benar call tools
6. **Chat output setelah artifact:** Brief summary ONLY

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
| Citation accuracy | NONE — no validation that cited sources exist | No |
| Outline alignment | NONE — no check against outline structure | No |
| Abstrak consistency | NONE — no check against approved abstrak | No |

### Perbedaan Kunci dengan Stage 4 (Abstrak)

| Aspek | Abstrak | Pendahuluan |
|-------|---------|-------------|
| Max work tasks | 4 | **5** |
| Source tools | TIDAK tersedia | **Tersedia** (inspectSourceDocument, quoteFromSource, searchAcrossSources) |
| Citation requirement | Minimal (ringkasan) | **Ketat** — factual claims harus di-cite |
| Content scope | Ringkasan seluruh paper (150-300 kata) | Section pendahuluan full (word budget dari outline) |
| Evidence guardrails | Basic | **Extended** — breadth honesty, metadata discipline, restatement scope |
| Cross-stage dependency | Gagasan, topik, outline | Gagasan, topik, outline, **+ abstrak** (alignment) |
| Nature | Proyeksi (akan direvisi di stage 11) | Konten yang lebih stabil (bisa direvisi tapi biasanya tidak) |

---

## Phase 2 Design Decisions (from context.md Entry 5)

**D1 (Two-Tier Plan):** Plan menjadi two-tier (context.md 2g). Work tasks = model's domain, display-only. Structural phases (identifikasi → eksplorasi → free zone → tasks complete → verifikasi → artifact) = harness-enforced via `paperToolTracker`.

**D2 (Choice Card Post-Capture Validation):** Post-capture validation aktif: jika model emit finalize-class `workflowAction` tapi `updateStageData` belum dipanggil di drafting session ini, harness downgrade ke `continue_discussion`.

**D3 (CHAIN_COMPLETION Abort):** CHAIN_COMPLETION abort (bukan recover). Impact HIGH — prose chat ≠ academic section. Abort prevents garbage artifact.

**D8 (Atomic Create+Link):** `artifacts.create` mutation di-extend untuk atomic link ke `stageData.artifactId` dalam satu transaction.

**D10 (Validation Recovery):** Validation panel verify artifact existence di DB sebelum render. Error state + retry button jika artifact missing.
