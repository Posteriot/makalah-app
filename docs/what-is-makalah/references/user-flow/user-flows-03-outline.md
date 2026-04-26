## Stage 3: Outline

### Objective
Membangun struktur paper yang koheren dengan hirarki section, word budget, dan
baseline living checklist untuk stage-stage selanjutnya.

### Signifikansi Arsitektural
Outline adalah **stage preparatory terakhir** sebelum masuk ke paper content stages
(abstrak dst). Artifact outline menjadi **cetak biru** yang mengatur:
- Section apa saja yang akan ditulis di stage 4-14
- Urutan dan hirarki section
- Word budget per section
- Living checklist yang di-track sepanjang sisa proses

Setelah outline approved, model di stage-stage berikutnya HARUS mengikuti struktur ini.
Outline bukan saran — ini commitment.

### Artifact Category
**Preparatory** — artifact berisi struktur paper, bukan isi paper. Tapi artifact ini
paling impactful dari ketiga preparatory stages karena menentukan keseluruhan bentuk paper.

### Input
- Approved artifacts dari stage gagasan DAN topik (tarik dari DB — lihat Cross-Stage C)
- Khususnya: `definitif`, `angleSpesifik`, `researchGap` dari topik
- File yang di-attach user (jika ada)

### Search Policy
**PASSIVE — Review Mode.**
Generate dari approved material. TIDAK proactive search. Jika user explicitly minta
search, jalankan — tapi ini exception, bukan default.

### Plan Template
- Max **5** work tasks (lebih dari gagasan/topik yang max 4)
- 1 terminal task: "Membuat artifak & Validasi pindah stage ke user" (kind: `artifact_validation`)
- Contoh task: "Review material", "Proposal struktur high-level", "Detail sub-sections",
  "Word budget distribution", "Finalisasi outline"

### Output Contract (stageData)
Required (harus ada sebelum `submitStageForValidation`):
- `sections` (array) — outline sections dengan IDs, titles, levels
- `totalWordCount` (number) — estimated total word count

Optional:
- `completenessScore` (number) — self-assessed completeness

### Function Tools
Sama dengan stage topik, plus:
- `readArtifact` — untuk cross-reference artifact gagasan dan topik

### Living Checklist
Outline memperkenalkan **living checklist** — setiap section di outline punya:
- `checkedAt` — kapan terakhir diverifikasi
- `checkedBy` — siapa yang verifikasi
- `editHistory` — log perubahan

Section IDs HARUS stabil — tidak boleh berubah setelah outline approved, karena
checklist auto-check dan minor-edit lifecycle bergantung pada ID consistency.

Living checklist ini di-track sepanjang stage 4-14: setiap kali section corresponding
di-approve, checklist item ter-update.

### Flow Detail (Step-by-Step)

#### Turn 1: Review material + HIGH-LEVEL structure proposal

**Kondisi:** User approve topik di validation panel → session advance ke outline.

**Model:**
1. **Tarik artifacts gagasan DAN topik dari DB** — via `readArtifact` atau injected context.
   Model butuh kedua artifact: gagasan untuk konteks riset, topik untuk scope definitif.
2. Jika ada file attachment baru: acknowledge SEBELUM dialog.
3. Emit `plan-spec` block — 5 work task + 1 terminal task
4. Review approved material, lalu present **HIGH-LEVEL structure proposal**:
   - Berapa main sections?
   - Overall flow approach (chronological? thematic? problem-solution?)
   - Estimasi total word count
5. Present via **choice card** (`continue_discussion`):
   - 2-3 opsi struktur high-level
   - **RECOMMENDATION** di-highlight dengan alasan

**Perbedaan kunci dengan topik:**
- Multi-confirmation review: BUKAN satu kali confirm lalu finalize
- Butuh minimum DUA confirmation round (high-level + detail) sebelum finalize
- Max 5 work tasks (lebih kompleks)

**Harness:**
- Capture `plan-spec`
- Stabilize plan
- Gagasan + topik stageData tersedia di context

#### Turn 2: DETAIL-LEVEL proposal

**Kondisi:** User sudah confirm/adjust high-level structure di turn sebelumnya.

**Model:**
1. Mark high-level task sebagai `complete`
2. Berdasarkan high-level structure yang di-confirm, present **DETAIL-LEVEL proposal**:
   - Sub-sections per main section
   - Word count distribution per section
   - Section ordering detail
3. Present via **choice card** (`continue_discussion`):
   - Detail structure berdasarkan high-level yang dipilih
   - Opsi adjustment jika ada

**PENTING:** Model TIDAK generate full outline di turn ini. Ini masih discussion —
user harus confirm detail dulu sebelum outline di-generate.

#### Turn 3-N: Additional discussion jika user minta adjustment

**User:** Mungkin minta adjust ordering, word budget, tambah/hapus section.

**Model:**
- Proses adjustment satu per satu via choice cards (`continue_discussion`)
- Mark tasks sebagai `complete` saat confirmed
- TIDAK skip ke finalize sebelum user puas dengan structure

#### Turn Final: Finalize → Generate full outline

**Kondisi:** High-level DAN detail-level structure sudah confirmed oleh user.

**Model:**
1. Present summary of agreed structure
2. Emit **FINAL choice card** (`finalize_stage`):
   - "Generate outline lengkap?"
   - Clear bahwa ini commit point

**User:** Klik `finalize_stage`.

**Harness:**
- `choiceInteractionEvent` created
- `resolveChoiceWorkflow` → `finalize_stage` → enforcer activates
- Forces tool chain: `updateStageData` → `createArtifact` → `submitStageForValidation`

**Model (enforced by harness):**
1. `updateStageData` — save `sections` (with stable IDs), `totalWordCount`
2. `createArtifact` — artifact content = full outline dengan hirarki section, word budget,
   dan living checklist baseline. Artifact ini jadi cetak biru yang akan di-follow
   oleh semua paper content stages. Disimpan di DB sebagai persistent reference (Cross-Stage C).
3. `submitStageForValidation` — stage status → `pending_validation`

**Chat output setelah artifact:**
- Brief summary: jumlah sections, flow approach, total word count
- TIDAK duplicate outline content di chat
- Satu kalimat confirm artifact + arahkan ke panel

#### Validation Phase

**UI:** `PaperValidationPanel` muncul.

**User options:**
- **Approve** → stage `outline` = `approved`, session advance ke stage `abstrak`.
  **Dari sini, semua stage berikutnya menghasilkan paper content.**
- **Revise** → trigger revision flow (Cross-Stage F)

### Choice Card Count
Minimum: **3 choice cards** sebelum artifact
- 1 high-level structure (`continue_discussion`)
- 1 detail-level structure (`continue_discussion`)
- 1 final (`finalize_stage`)
- Bisa lebih jika user minta adjustment

### Edge Cases & Guardrails

1. **User minta ubah topik, bukan outline:** Call `resetToStage({ targetStage: "topik" })` langsung
2. **User minta search:** Boleh jika explicitly requested (passive mode). Search turn = search only
3. **Section IDs harus stabil:** Setelah outline approved, IDs TIDAK boleh berubah.
   Living checklist bergantung pada ID stability
4. **Word budget unrealistic:** Model harus sanity-check total word count.
   Paper akademik typical 3000-10000 words tergantung jenis
5. **Outline terlalu granular/terlalu high-level:** Model harus balance — cukup detail
   untuk guide writing, tapi tidak terlalu rigid
6. **Full outline HANYA setelah finalize:** DILARANG generate full outline di discussion turns.
   Discussion = structure options, bukan content generation
7. **Tool call integrity:** TIDAK BOLEH claim artifact created kecuali benar-benar call tools
8. **Chat output setelah artifact:** Brief summary ONLY. TIDAK duplicate outline di chat

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
| Multi-confirmation enforcement | NONE — prompt-only | No — probabilistic |

### Perbedaan Kunci dengan Stage Sebelumnya

| Aspek | Gagasan | Topik | Outline |
|-------|---------|-------|---------|
| Search policy | ACTIVE (dual) | PASSIVE (derivation) | PASSIVE (review) |
| Input source | User ide + search | Artifact gagasan | Artifact gagasan + topik |
| Confirmation rounds | 4+ (per task) | 4+ (per task) | 2-3 (high-level + detail) |
| Max work tasks | 4 | 4 | **5** |
| Nature | Eksplorasi → converge | Derivasi → narrow | Strukturasi → blueprint |
| Artifact category | Preparatory (conclusion) | Preparatory (topic) | **Preparatory (blueprint)** |
| Special mechanism | Dual search, first-turn search ban | Search redirect | Living checklist, multi-confirmation |
| Post-outline impact | — | — | **Cetak biru untuk stage 4-14** |

---

## Phase 2 Design Decisions (from context.md Entry 5)

- **D1 (Two-Tier Plan):** Plan menjadi two-tier (context.md 2g). Work tasks = model's domain, display-only. Structural phases (identifikasi → eksplorasi → free zone → tasks complete → verifikasi → artifact) = harness-enforced via `paperToolTracker`.
- **D3 (CHAIN_COMPLETION Abort):** CHAIN_COMPLETION abort (bukan recover). Impact LOW untuk preparatory stages — prose-as-notes masih tolerable, tapi abort tetap berlaku untuk konsistensi lifecycle.
- **D8 (Atomic Create+Link):** `artifacts.create` mutation di-extend untuk atomic link ke `stageData.artifactId` dalam satu transaction.
- **D10 (Validation Recovery):** Validation panel verify artifact existence di DB sebelum render. Error state + retry button jika artifact missing.
