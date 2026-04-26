## Stage 6: Tinjauan Literatur

### Objective
Membangun tinjauan literatur yang menetapkan kerangka teoretis, analisis gap,
dan justifikasi penelitian.

### Signifikansi
Tinjauan literatur adalah **stage paling research-intensive** di seluruh 14 stage.
Ini satu-satunya paper content stage dengan **ACTIVE search policy** — model
proaktif mencari sumber akademik tanpa diminta user. Bersama stage 1 (gagasan),
ini adalah dua stage di mana model boleh search mandiri.

Bedanya dengan gagasan: gagasan search untuk **eksplorasi awal** (dual mode:
academic + non-academic). Tinjauan literatur search untuk **deep academic dive** —
fokus pada jurnal, studi empiris, theoretical frameworks, state-of-the-art.

### Artifact Category
**Paper content** — artifact berisi isi section tinjauan literatur paper yang tampil di NASKAH.

### Input
- Approved artifacts dari semua stage sebelumnya (tarik dari DB — Cross-Stage C)
- Khususnya:
  - Topik: research gap yang harus di-address
  - Outline: struktur dan word budget untuk tinjauan literatur
  - Pendahuluan: latar belakang dan rumusan masalah (untuk alignment)
- Existing references dari stage sebelumnya (gagasan referensiAwal, dll)
- Living outline checklist status
- File yang di-attach user (jika ada)

### Search Policy
**ACTIVE — Deep Academic Search Mode.**
Proaktif mencari sumber akademik ketika literature base masih thin.
Fokus: jurnal, studi empiris, theoretical frameworks, state-of-the-art.

Perbedaan dengan gagasan search:
| Aspek | Gagasan (stage 1) | Tinjauan Literatur (stage 6) |
|-------|-------------------|------------------------------|
| Mode | Dual (academic + non-academic) | **Deep academic only** |
| Tujuan | Eksplorasi awal, feasibility | Deep dive, theoretical framing |
| Epistemic labeling | Ya (3 tier) | Ya — tapi focus pada academic |
| Source hierarchy | Academic primary, non-academic insight | **Academic dominant** |
| Proactive | Ya | Ya |

Source hierarchy berlaku (Cross-Stage E): academic = rujukan utama, non-academic = wawasan saja.
Di stage ini, academic sources harus **mendominasi** — tinjauan literatur yang
sebagian besar non-academic adalah substandard.

**SEARCH TURN RULE:** Response yang present search findings HARUS juga end with
choice card (`continue_discussion`). Search response TIDAK exempt dari choice card requirement.

### Plan Template
- Max **5** work tasks
- 1 terminal task: "Membuat artifak & Validasi pindah stage ke user" (kind: `artifact_validation`)
- Contoh task: "Review material existing", "Deep academic search", "Analisis kerangka teoretis",
  "Sintesis gap analysis", "Draft tinjauan literatur ke artifact"

### Output Contract (stageData)
Required (harus ada sebelum `submitStageForValidation`):
- `kerangkaTeoretis` (string) — theoretical framework
- `reviewLiteratur` (string) — literature review synthesis

Optional:
- `gapAnalisis` (string) — gap analysis
- `referensi` (array) — collected references

### Function Tools
Full suite tersedia:
- `inspectSourceDocument` — verify source metadata
- `quoteFromSource` — retrieve passages
- `searchAcrossSources` — semantic search across stored sources
- `readArtifact` — cross-reference artifacts
- `compileDaftarPustaka` (mode: preview) — bibliography audit (RECOMMENDED sebelum finalize)
- `updateStageData` — save progress (**TIDAK di search turn**, tapi turn berikutnya)

**PENTING:** `updateStageData` harus di-call di turn SETELAH search, bukan di turn search.
Search turn = search + present findings + choice card. Function tools = next turn.

### Flow Detail (Step-by-Step)

#### Turn 1: Review material + Identify literature gaps

**Kondisi:** User approve pendahuluan di validation panel → session advance ke tinjauan literatur.

**Model:**
1. **Tarik artifacts dari DB** — butuh semua stage sebelumnya, terutama topik (research gap)
   dan pendahuluan (rumusan masalah).
2. Jika ada file attachment baru: acknowledge SEBELUM dialog.
3. Emit `plan-spec` block — 5 work task + 1 terminal task
4. Review existing references dan identify **area yang masih thin**
5. **Initiate proactive academic search** — TIDAK tunggu user confirm
   - Ini berbeda dari semua stage lain: model search TANPA diminta
   - Search langsung jalan, findings di-present di response yang sama

**CONSTRAINT search turn:** Turn ini search-only. TIDAK BOLEH call function tools.
Findings disimpan di turn berikutnya.

6. Present search findings:
   - Academic sources FIRST
   - Classify claims dengan epistemic labels
   - Be transparent tentang source proportions
7. End with **choice card** (`continue_discussion`):
   - 2-3 opsi framework/synthesis approach berdasarkan findings
   - **RECOMMENDATION** di-highlight

**Harness:**
- Capture `plan-spec` + `yaml-spec`
- Search results captured by harness
- No function tool enforcement (search turn)

#### Turn 2: Save findings + Continue discussion

**User:** Klik option di choice card.

**Model:**
1. Save search findings via `updateStageData` (sekarang boleh, bukan search turn lagi)
2. Present deeper analysis berdasarkan direction yang dipilih user
3. Jika literature masih thin: **boleh search lagi** (proactive)
4. End with **choice card** (`continue_discussion`) jika masih ada task pending

#### Turn 3-N: Additional search rounds + discussion

**Model:**
- Bisa multiple search rounds kalau literature base belum cukup
- Setiap search turn: search + present + choice card (TIDAK function tools)
- Turn berikutnya: save findings + continue analysis
- Mark tasks sebagai `complete` saat confirmed

**PENTING:** Ini stage yang paling mungkin punya banyak turns karena search iterative.
Discussion turn cap tetap berlaku (soft warning + hard override).

#### Turn Pre-Finalize: Bibliography audit (RECOMMENDED)

**Model:**
- Sebelum finalize, RECOMMENDED call `compileDaftarPustaka({ mode: "preview" })`
- Audit reference consistency across stages
- Pastikan tidak ada referensi yang hilang atau duplicate

#### Turn Finalize: Direction confirmed → Draft ke artifact

**Kondisi:** Semua work tasks complete, framework/synthesis approach confirmed.

**Model:**
1. Summarize chosen framework dan synthesis approach
2. Emit **FINAL choice card** (`finalize_stage`)

**User:** Klik `finalize_stage`.

**Harness:**
- Enforcer activates → forces tool chain

**Model (enforced by harness):**
1. `updateStageData` — save `kerangkaTeoretis`, `reviewLiteratur` (+ optional fields)
2. `createArtifact` — artifact content = **section tinjauan literatur paper dalam format akademik**.
   Harus berisi:
   - Kerangka teoretis yang digunakan
   - Review dan sintesis literatur per tema/sub-topik
   - Gap analysis: apa yang belum diteliti
   - Justifikasi penelitian: kenapa penelitian ini perlu dilakukan
   - Sitasi APA untuk SEMUA klaim yang mereferensikan sumber
   - Academic sources sebagai backbone argumentasi
3. `submitStageForValidation` — stage status → `pending_validation`

**Chat output setelah artifact:**
- Brief summary: theoretical lens, key themes, gap direction
- BUKAN full tinjauan literatur
- Satu kalimat confirm + arahkan ke panel

#### Validation Phase

**UI:** `PaperValidationPanel` muncul.

**User options:**
- **Approve** → stage `tinjauan_literatur` = `approved`, session advance ke `metodologi`
- **Revise** → trigger revision flow (Cross-Stage F)

### Choice Card Count
Minimum: **2-3 choice cards** sebelum artifact
- 1+ search findings + direction (`continue_discussion`)
- 0-1 additional search/discussion rounds (`continue_discussion`)
- 1 final (`finalize_stage`)
- Bisa lebih karena iterative search

### Edge Cases & Guardrails

1. **Literature terlalu thin setelah search:** Model harus honestly state limitation.
   Jangan fabricate references untuk fill gaps
2. **Non-academic sources mendominasi:** Substandard untuk tinjauan literatur.
   Model harus proactively search lebih banyak academic sources
3. **Search turn + function tools:** DILARANG di turn yang sama.
   `updateStageData` di turn berikutnya
4. **Referensi fabricated:** DILARANG. Semua referensi harus dari actual search results
5. **Bibliography consistency:** RECOMMENDED audit via `compileDaftarPustaka({preview})`
   sebelum finalize
6. **Iterative search cap:** Discussion turn cap tetap berlaku — model tidak bisa
   search indefinitely
7. **Tool call integrity:** TIDAK BOLEH claim artifact created kecuali benar-benar call tools
8. **Evidence breadth honesty:** Semua guardrails evidence dari pendahuluan berlaku
   (exact metadata, restatement scope, opening sentence framing)

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
| Academic source quality | NONE — no validation source is actually academic | No |
| Bibliography consistency | NONE — compileDaftarPustaka only recommended, not enforced | No |

### Perbedaan Kunci dengan Stage Sebelumnya

| Aspek | Abstrak (4) | Pendahuluan (5) | Tinjauan Literatur (6) |
|-------|-------------|-----------------|----------------------|
| Search policy | PASSIVE | PASSIVE | **ACTIVE (deep academic)** |
| Proactive search | Tidak | Tidak | **Ya** |
| Source tools | Tidak | Ya | **Ya (full suite)** |
| Max work tasks | 4 | 5 | **5** |
| Turn count typical | 2-3 | 2-3 | **3-5+** (iterative search) |
| Bibliography audit | Tidak | Tidak | **Recommended** |
| Nature | Ringkasan proyeksi | Narrative framing | **Deep academic synthesis** |
| Source quality concern | Low | Medium | **High** — academic must dominate |

---

## Phase 2 Design Decisions (from context.md Entry 5)

**D1 (Two-Tier Plan):** Plan menjadi two-tier (context.md 2g). Work tasks = model's domain, display-only. Structural phases (identifikasi → eksplorasi → free zone → tasks complete → verifikasi → artifact) = harness-enforced via `paperToolTracker`.

**D2 (Choice Card Post-Capture Validation):** Post-capture validation aktif: jika model emit finalize-class `workflowAction` tapi `updateStageData` belum dipanggil di drafting session ini, harness downgrade ke `continue_discussion`.

**D3 (CHAIN_COMPLETION Abort):** CHAIN_COMPLETION abort (bukan recover). Impact HIGH — prose chat ≠ academic section. Abort prevents garbage artifact.

**D8 (Atomic Create+Link):** `artifacts.create` mutation di-extend untuk atomic link ke `stageData.artifactId` dalam satu transaction.

**D10 (Validation Recovery):** Validation panel verify artifact existence di DB sebelum render. Error state + retry button jika artifact missing.
