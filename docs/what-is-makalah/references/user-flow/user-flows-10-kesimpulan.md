## Stage 10: Kesimpulan

### Objective
Menyusun kesimpulan yang menjawab rumusan masalah dan memberikan rekomendasi
tindak lanjut yang praktis. Sajikan opsi arah konten via choice card, lalu
generate kesimpulan ke artifact setelah user confirm (finalize choice card).
Jawaban harus di-map 1:1 ke rumusan masalah.

### Signifikansi
Kesimpulan adalah **stage core content terakhir** sebelum stage finalisasi (11-14).
Ini stage **synthesis murni** — BUKAN analisis baru. Semua material sudah tersedia
dari hasil dan diskusi yang approved. Model menyintesis, bukan menghasilkan temuan baru.

Bedanya dengan diskusi (stage 9): diskusi **menginterpretasi** hasil terhadap
teori dan literatur. Kesimpulan **merangkum jawaban** atas rumusan masalah dan
memberikan rekomendasi actionable. Diskusi boleh ekspansif; kesimpulan harus
ringkas dan conclusive.

Posisi strategis: setelah stage ini, tidak ada lagi stage yang menghasilkan
paper content baru. Stage 11-14 (daftar pustaka, lampiran, daftar isi, halaman
judul) adalah kompilasi dan formatting. Kesimpulan adalah **gerbang terakhir**
sebelum paper dianggap substantively complete.

### Artifact Category
**Paper content** — artifact berisi isi section kesimpulan paper yang tampil di NASKAH.

### Input
- Approved artifacts dari semua stage sebelumnya (tarik dari DB — Cross-Stage C)
- Khususnya:
  - Pendahuluan: **rumusan masalah** (untuk mapping 1:1 jawaban)
  - Hasil: temuan penelitian yang harus dirangkum
  - Diskusi: interpretasi dan implikasi yang harus disintesis
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
- Max **4** work tasks
- 1 terminal task: "Membuat artifak & Validasi pindah stage ke user" (kind: `artifact_validation`)
- Contoh task: "Review material hasil & diskusi", "Mapping jawaban ke rumusan masalah",
  "Sintesis rekomendasi penelitian", "Draft kesimpulan ke artifact"

### Output Contract (stageData)
Required (harus ada sebelum `submitStageForValidation`):
- `ringkasanHasil` (string) — results summary
- `jawabanRumusanMasalah` (array) — answers to research questions

Optional:
- `saranPeneliti` (string) — researcher recommendations

### Function Tools
Allowed:
- `updateStageData` — save stage progress
- `createArtifact` — create stage output artifact
- `requestRevision` — call FIRST saat user minta revisi via chat selama pending_validation
- `updateArtifact` — new version saat revision (BUKAN createArtifact)
- `submitStageForValidation` — call di turn SAMA dengan createArtifact
- `compileDaftarPustaka` (mode: preview) — cross-stage bibliography audit tanpa persistence
- `readArtifact` — baca artifact stage sebelumnya untuk cross-reference

Disallowed:
- Stage jumping
- `compileDaftarPustaka` (mode: persist)
- Function tools di turn yang sama dengan web search
- Introduce temuan baru yang tidak ada di hasil/diskusi

### Flow Detail (Step-by-Step)

#### Turn 1: Review approved material + Present direction

**Kondisi:** User approve diskusi di validation panel → session advance ke kesimpulan.

**Model:**
1. **Tarik artifacts dari DB** — butuh semua stage sebelumnya, terutama:
   - Pendahuluan (rumusan masalah — ini anchor untuk mapping 1:1)
   - Hasil (temuan yang harus dirangkum)
   - Diskusi (interpretasi yang harus disintesis)
2. Jika ada file attachment baru: acknowledge SEBELUM dialog.
3. Emit `plan-spec` block — 4 work task + 1 terminal task
4. Review approved material: identifikasi key findings dan interpretasi
5. Map preliminary answers ke setiap rumusan masalah
6. End with **choice card** (`continue_discussion`):
   - 2-3 opsi arah kesimpulan: framing, emphasis, atau pendekatan rekomendasi
   - **RECOMMENDATION** di-highlight
   - Contoh opsi: "Emphasis pada implikasi praktis", "Emphasis pada kontribusi
     teoretis", "Balanced practical + theoretical"

**CONSTRAINT:** Ini REVIEW stage. TIDAK proactive search. TIDAK generate artifact
di turn pertama.

**Harness:**
- Capture `plan-spec` + `yaml-spec`
- No function tool enforcement (direction turn)

#### Turn 2: Direction confirmed → Summarize + Finalize card

**User:** Klik option di choice card.

**Model:**
1. Summarize chosen direction:
   - Ringkas bagaimana setiap rumusan masalah akan dijawab
   - Outline rekomendasi utama
   - Confirm scope dan framing
2. Emit **FINAL choice card** (`finalize_stage`)

**PENTING:** Do NOT draft full content yet — full drafting happens di turn 3.

#### Turn 3: Finalize → Full tool chain

**User:** Klik `finalize_stage`.

**Harness:**
- Enforcer activates → forces tool chain

**Model (enforced by harness):**
1. `updateStageData` — save `ringkasanHasil`, `jawabanRumusanMasalah` (+ optional `saranPeneliti`)
2. `createArtifact` — artifact content = **section kesimpulan paper dalam format akademik**.
   Harus berisi:
   - Ringkasan hasil utama
   - Jawaban 1:1 terhadap setiap rumusan masalah
   - Rekomendasi tindak lanjut yang praktis dan actionable
   - Keterbatasan penelitian (jika relevan)
   - SYNTHESIS only — tidak ada temuan baru, tidak ada analisis baru
3. `submitStageForValidation` — stage status → `pending_validation`

**TOOL CHAIN ORDER:** `updateStageData` → `createArtifact` → `submitStageForValidation`.
Do NOT skip `updateStageData`. Do NOT call `submitStageForValidation` sebelum `createArtifact`.

**Chat output setelah artifact:**
- Brief summary: rumusan masalah mana yang dijawab, rekomendasi utama,
  keterbatasan yang acknowledged
- BUKAN full kesimpulan
- Satu kalimat confirm artifact created + arahkan ke panel validasi

#### Validation Phase

**UI:** `PaperValidationPanel` muncul.

**User options:**
- **Approve** → stage `kesimpulan` = `approved`, session advance ke `daftar_pustaka`
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
- 1 final confirmation (`finalize_stage`)
- Bisa lebih kalau user minta adjustments

### Edge Cases & Guardrails

1. **Jawaban tidak cover semua rumusan masalah:** DILARANG. Setiap rumusan masalah
   dari pendahuluan HARUS punya jawaban eksplisit di kesimpulan. Model harus
   verify mapping 1:1 sebelum finalize
2. **Kesimpulan berisi temuan baru:** DILARANG. Kesimpulan adalah SYNTHESIS —
   semua konten harus traceable ke hasil dan diskusi yang approved
3. **Kesimpulan terlalu verbose:** Kesimpulan harus ringkas dan conclusive.
   Ini bukan tempat untuk re-state seluruh diskusi
4. **Tool call integrity:** TIDAK BOLEH claim artifact created kecuali benar-benar
   call tools dan dapat success response
5. **Chat output setelah artifact:** TIDAK BOLEH duplicate artifact body.
   Summary only + arahkan ke panel
6. **Revision during pending_validation:** Gunakan `updateArtifact`, BUKAN
   `createArtifact`. `createArtifact` hanya untuk first draft
7. **Source-body parity:** Jika artifact menampilkan reference inventory,
   include ALL items. Jangan silently truncate

### Harness Enforcement Points (saat ini)
| Point | Mechanism | Deterministic? |
|-------|-----------|---------------|
| Plan task count | Plan inflation guard (max 4) | Yes |
| Choice card filter | NONE — model-emitted card unfiltered | No (Disconnect 2) |
| Finalize tool chain | Drafting Choice Artifact Enforcer | Yes |
| Artifact content quality | NONE — prose used as fallback | No (Disconnect 3) |
| Artifact-session link | Non-atomic (two mutations) | Partial (Disconnect 4) |
| Panel artifact verification | NONE — string presence only | No (Disconnect 5) |
| Discussion turn cap | Soft prompt warning + hard server override | Yes |
| Work-complete constraint | Force finalize after 1 tolerance turn | Yes |
| Circuit breaker | 3x identical / 3x rejected / 15 total | Yes |
| Rumusan masalah mapping | NONE — no validation answers cover all questions | No |
| Synthesis-only constraint | NONE — no detection of new findings in conclusion | No |

### Perbedaan Kunci dengan Stage Sebelumnya

| Aspek | Diskusi (9) | Kesimpulan (10) |
|-------|-------------|-----------------|
| Search policy | PASSIVE | **PASSIVE** |
| Nature | Interpretasi & implikasi | **Synthesis & jawaban rumusan masalah** |
| New analysis | Ya — interpretasi terhadap teori | **TIDAK — synthesis only** |
| Max work tasks | 4 | **4** |
| Turn count typical | 2-3 | **2-3** |
| Required stageData | `pembahasanUtama`, `implikasiPenelitian` | **`ringkasanHasil`, `jawabanRumusanMasalah`** |
| Key constraint | Interpretasi harus grounded di hasil | **Jawaban 1:1 ke rumusan masalah** |
| Position | Mid content stage | **LAST core content stage** |
| Next stage | Kesimpulan (10) | **Daftar Pustaka (11) — finalization** |

---

## Phase 2 Design Decisions (from context.md Entry 5)

**D1 (Two-Tier Plan):** Plan menjadi two-tier (context.md 2g). Work tasks = model's domain, display-only. Structural phases (identifikasi → eksplorasi → free zone → tasks complete → verifikasi → artifact) = harness-enforced via `paperToolTracker`.

**D2 (Choice Card Post-Capture Validation):** Post-capture validation aktif: jika model emit finalize-class `workflowAction` tapi `updateStageData` belum dipanggil di drafting session ini, harness downgrade ke `continue_discussion`.

**D3 (CHAIN_COMPLETION Abort):** CHAIN_COMPLETION abort (bukan recover). Impact HIGH — prose chat ≠ academic section. Abort prevents garbage artifact.

**D8 (Atomic Create+Link):** `artifacts.create` mutation di-extend untuk atomic link ke `stageData.artifactId` dalam satu transaction.

**D10 (Validation Recovery):** Validation panel verify artifact existence di DB sebelum render. Error state + retry button jika artifact missing.
