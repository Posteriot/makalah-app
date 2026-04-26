## Stage 11: Pembaruan Abstrak

### Objective
Merevisi abstrak awal (stage 4) agar selaras dengan temuan penelitian aktual dari
seluruh core stages yang sudah approved (stage 1-10). Abstrak stage 4 ditulis sebagai
**proyeksi** sebelum hasil riset ada. Sekarang seluruh core stage approved, model
membandingkan abstrak asli terhadap metodologi aktual, temuan, dan kesimpulan — lalu
mengusulkan update yang presisi dan targeted, bukan rewrite total. Sajikan opsi
pendekatan revisi via choice card, lalu generate abstrak yang diperbarui ke artifact
setelah user confirm (finalize choice card).

### Signifikansi
Pembaruan abstrak adalah **stage finalisasi pertama** (stage 11-14 semuanya
finalisasi/kompilasi). Ini bukan paper content baru — ini **revisi terhadap
paper content yang sudah ada** (stage 4 abstrak).

Posisi strategis:
- Stage 1-10 = **core content** (dari eksplorasi sampai kesimpulan)
- Stage 11-14 = **finalisasi** (kompilasi, revisi, formatting)
- Stage 11 menjembatani transisi ini: satu-satunya finalization stage yang
  menghasilkan **paper content revision** (bukan kompilasi metadata)

Bedanya dengan abstrak stage 4: stage 4 ditulis sebagai **proyeksi** berdasarkan
rencana riset. Stage 11 merevisi proyeksi itu berdasarkan **temuan aktual** dari
stage 5-10. Ini bukan menulis ulang dari nol — ini membandingkan setiap klaim
di abstrak asli terhadap data yang sudah approved, lalu merevisi yang mismatch.

Cross-reference **seluruh 10 stage sebelumnya** — ini stage dengan input
terbanyak karena abstrak harus reflect keseluruhan paper secara akurat.

### Artifact Category
**Paper content** — artifact berisi isi section abstrak paper yang diperbarui,
menggantikan abstrak proyeksi dari stage 4 di NASKAH.

### Input
- Approved artifacts dari **SEMUA** stage sebelumnya (tarik dari DB — Cross-Stage C)
- Cross-reference detail per stage:
  - **Stage 1 (Gagasan):** research vision dan novelty angle — HARUS dipertahankan
  - **Stage 2 (Topik):** scope dan batasan penelitian
  - **Stage 3 (Outline):** struktur paper dan section hierarchy
  - **Stage 4 (Abstrak):** `ringkasanPenelitian`, `keywords` — ini **baseline** yang direvisi
  - **Stage 5 (Pendahuluan):** `rumusanMasalah`, `tujuanPenelitian` — verify problem statement alignment
  - **Stage 6 (Tinjauan Literatur):** `kerangkaTeoretis`, `gapAnalisis` — confirm theoretical framing masih berlaku
  - **Stage 7 (Metodologi):** `pendekatanPenelitian`, `desainPenelitian`, `teknikAnalisis` — check apakah metodologi diverge dari deskripsi abstrak
  - **Stage 8 (Hasil):** `temuanUtama`, `dataPoints` — incorporate temuan aktual yang mungkin diproyeksikan berbeda
  - **Stage 9 (Diskusi):** `interpretasiTemuan`, `implikasiPraktis`, `keterbatasanPenelitian` — reflect implikasi nyata
  - **Stage 10 (Kesimpulan):** `ringkasanHasil`, `jawabanRumusanMasalah` — verify kesimpulan match klaim abstrak
- Living outline checklist context (checkedAt, checkedBy, editHistory) — ensure structural coherence
- File yang di-attach user (jika ada)

**Strategi input:** Identifikasi setiap klaim di abstrak asli, lalu verify masing-masing
terhadap approved data di atas. Flag mismatches sebagai revision candidates.

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
- Contoh task: "Cross-reference abstrak asli vs temuan aktual", "Identifikasi mismatch
  dan rencana revisi", "Draft abstrak updated ke artifact"

### Output Contract (stageData)
Required (harus ada sebelum `submitStageForValidation`):
- `ringkasanPenelitianBaru` (string) — updated abstract text
- `perubahanUtama` (array) — list of significant changes dari abstrak asli

Optional:
- `keywordsBaru` (array) — updated keywords
- `wordCount` (number) — updated word count

### Function Tools
Allowed:
- `updateStageData` — save stage progress
- `createArtifact` — create stage output artifact
- `requestRevision` — call FIRST saat user minta revisi via chat selama pending_validation
- `updateArtifact` — new version saat revision (BUKAN createArtifact)
- `submitStageForValidation` — call di turn SAMA dengan createArtifact
- `compileDaftarPustaka` (mode: preview) — cross-stage bibliography audit tanpa persistence
- `readArtifact` — baca artifact stage sebelumnya untuk cross-reference (terutama stage 4
  untuk baseline abstrak asli)

Disallowed:
- Stage jumping
- `compileDaftarPustaka` (mode: persist) di luar daftar_pustaka stage
- Function tools di turn yang sama dengan web search
- Self-initiated search (compile dari existing data)

### Flow Detail (Step-by-Step)

#### Turn 1: Cross-reference abstrak asli vs temuan aktual + Direction proposal

**Kondisi:** User approve kesimpulan di validation panel → session advance ke pembaruan abstrak.

**Model:**
1. **Tarik artifacts dari DB** — butuh SEMUA 10 stage sebelumnya. Terutama:
   - Stage 4 (abstrak asli — baseline yang direvisi)
   - Stage 5-10 (temuan aktual yang harus di-cross-reference)
   - Stage 1-2 (research vision dan novelty yang harus dipertahankan)
2. Jika ada file attachment baru: acknowledge SEBELUM dialog.
3. Emit `plan-spec` block — 3 work task + 1 terminal task
4. **Systematic cross-reference:** Bandingkan setiap klaim di abstrak asli terhadap
   approved data dari stage 5-10. Identifikasi:
   - Klaim yang masih akurat (retain)
   - Klaim yang diverge dari temuan aktual (revise)
   - Informasi baru yang belum ada di abstrak asli (potentially add)
5. **Jika abstrak asli sudah well-aligned:** Eksplisit katakan — jangan paksakan
   perubahan yang tidak perlu
6. End with **choice card** (`continue_discussion`):
   - 2-3 opsi pendekatan revisi berdasarkan findings:
     - Contoh: "Minimal edit — hanya koreksi klaim yang mismatch",
       "Moderate revision — update findings + strengthened conclusions",
       "Structural reframe — reorganize emphasis based on actual results"
   - **RECOMMENDATION** di-highlight dengan alasan
   - Sertakan ringkasan mismatch yang ditemukan

**CONSTRAINT:** Ini REVIEW stage. TIDAK proactive search. TIDAK generate artifact
di turn pertama.

**Harness:**
- Capture `plan-spec` + `yaml-spec`
- Semua 10 stageData tersedia di context

#### Turn 2: Direction confirmed → Summarize + Finalize card

**User:** Klik option di choice card.

**Model:**
1. Summarize chosen revision approach:
   - Ringkas perubahan spesifik yang akan dilakukan
   - Confirm klaim mana yang dipertahankan, mana yang direvisi
   - Confirm keywords: apakah perlu update atau tetap
2. Emit **FINAL choice card** (`finalize_stage`)

**PENTING:** Do NOT draft full content yet — full drafting happens di turn 3.

#### Turn 3 (Finalize): Direction confirmed → Full tool chain

**User:** Klik `finalize_stage`.

**Harness:**
- Enforcer activates → forces tool chain

**Model (enforced by harness):**
1. `updateStageData` — save `ringkasanPenelitianBaru`, `perubahanUtama`
   (+ optional `keywordsBaru`, `wordCount`)
2. `createArtifact` — artifact content = **abstrak paper yang diperbarui**.
   Harus:
   - **Start dari abstrak asli (stage 4)** — targeted edits, BUKAN rewrite dari scratch
   - Match format abstrak asli (struktur, gaya bahasa, panjang serupa)
   - Reflect temuan aktual dari stage 5-10
   - Preserve core research vision dan novelty dari Phase 1 (stage 1-2)
   - **WAJIB menyertakan "Kata Kunci:"** di akhir — harus match format asli termasuk
     section "Kata Kunci:" yang merupakan bagian integral halaman abstrak
   - Bahasa formal akademik Indonesia
   - Tidak ada klaim yang tidak didukung approved material
3. `submitStageForValidation` — stage status → `pending_validation`

**TOOL CHAIN ORDER:** `updateStageData` → `createArtifact` → `submitStageForValidation`.
Do NOT skip `updateStageData`. Do NOT call `submitStageForValidation` sebelum `createArtifact`.

**Chat output setelah artifact:**
- Brief summary: section mana yang direvisi, apa yang dikoreksi atau ditambah
  berdasarkan temuan aktual, perubahan struktural (jika ada)
- BUKAN full abstrak — itu ada di artifact
- Satu kalimat confirm artifact created + arahkan ke panel validasi

#### Validation Phase

**UI:** `PaperValidationPanel` muncul.

**User options:**
- **Approve** → stage `pembaruan_abstrak` = `approved`, session advance ke stage berikutnya
- **Revise** → trigger revision flow

**Revision contract:**
- PATH A (no search needed): `requestRevision(feedback)` → `updateArtifact` →
  `submitStageForValidation` — semua di turn SAMA
- PATH B (revision butuh search): search ONLY turn ini (no function tools).
  NEXT turn: IMMEDIATELY `requestRevision` → `updateArtifact` →
  `submitStageForValidation` tanpa tunggu user reminder

### Choice Card Count
Minimum: **2 choice cards** sebelum artifact
- 1 revision approach / direction (`continue_discussion`)
- 1 final confirmation (`finalize_stage`)
- Bisa lebih kalau user minta adjustments

### Edge Cases & Guardrails

1. **DILARANG rewrite dari scratch:** Model HARUS start dari abstrak asli (stage 4)
   dan membuat targeted edits. Rewrite total menghilangkan research voice asli user
   dan berisiko kehilangan nuance
2. **Abstrak asli sudah well-aligned:** Jika cross-reference menunjukkan abstrak asli
   sudah akurat terhadap temuan aktual, model HARUS eksplisit menyatakan ini. Jangan
   paksakan perubahan yang tidak perlu
3. **Keywords (Kata Kunci) WAJIB di artifact:** Section "Kata Kunci:" adalah bagian
   integral halaman abstrak paper akademik. Artifact HARUS include "Kata Kunci:" dengan
   keyword list yang di-update (atau dipertahankan jika masih relevan). Format harus
   match abstrak asli
4. **Preserve research vision:** Core research vision dan novelty angle dari Phase 1
   (stage 1-2 gagasan) HARUS dipertahankan. Revisi boleh update spesifik, tapi tidak
   boleh mengubah fundamental direction penelitian
5. **Keyword changes need justification:** DILARANG mengubah keywords tanpa justifikasi
   eksplisit yang tied ke actual content evolution dari stage 5-10
6. **Tool call integrity:** TIDAK BOLEH claim artifact created kecuali benar-benar
   call tools dan dapat success response
7. **Chat output setelah artifact:** TIDAK BOLEH duplicate artifact body.
   Summary only + arahkan ke panel
8. **Revision during pending_validation:** Gunakan `updateArtifact`, BUKAN
   `createArtifact`. `createArtifact` hanya untuk first draft
9. **Source-body parity:** Jika artifact menampilkan reference inventory,
   include ALL items. Jangan silently truncate
10. **Fabricated data/references:** DILARANG. Semua klaim harus traceable ke
    approved material dari stage 1-10

### Harness Enforcement Points (saat ini)
| Point | Mechanism | Deterministic? |
|-------|-----------|---------------|
| Plan task count | Plan inflation guard (max 3) | Yes |
| Choice card filter | NONE — model-emitted card unfiltered | No (Disconnect 2) |
| Finalize tool chain | Drafting Choice Artifact Enforcer | Yes |
| Artifact content quality | NONE — prose used as fallback | No (Disconnect 3) |
| Artifact-session link | Non-atomic (two mutations) | Partial (Disconnect 4) |
| Panel artifact verification | NONE — string presence only | No (Disconnect 5) |
| Discussion turn cap | Soft prompt warning + hard server override | Yes |
| Work-complete constraint | Force finalize after 1 tolerance turn | Yes |
| Circuit breaker | 3x identical / 3x rejected / 15 total | Yes |
| Cross-reference accuracy | NONE — no validation abstrak matches actual findings | No |
| Keyword preservation | NONE — no enforcement Kata Kunci section present in artifact | No |
| Rewrite-from-scratch guard | NONE — no detection model started fresh instead of editing original | No |

### Perbedaan Kunci dengan Stage Sebelumnya

| Aspek | Abstrak (4) | Kesimpulan (10) | Pembaruan Abstrak (11) |
|-------|-------------|-----------------|------------------------|
| Search policy | PASSIVE | PASSIVE | **PASSIVE** |
| Nature | Proyeksi berdasarkan rencana | Synthesis jawaban rumusan masalah | **Revisi targeted berdasarkan temuan aktual** |
| Input stages | 1-3 | 1-9 | **1-10 (ALL previous)** |
| Max work tasks | 4 | 4 | **3** |
| Turn count typical | 2-3 | 2-3 | **2-3** |
| Required stageData | `ringkasanPenelitian`, `keywords` | `ringkasanHasil`, `jawabanRumusanMasalah` | **`ringkasanPenelitianBaru`, `perubahanUtama`** |
| Key constraint | Proyeksi only, no actual results | Jawaban 1:1 ke rumusan masalah | **Start from original, targeted edits only** |
| Artifact relationship | Creates original abstrak | Creates new content | **Revises existing abstrak (stage 4)** |
| Phase | Core content (Phase 2) | Core content (Phase 2) | **Finalization (Phase 3) — FIRST finalization stage** |
| workflowAction | `finalize_stage` | `finalize_stage` | **`finalize_stage`** |
| Keywords | Wajib (Kata Kunci section) | N/A | **Wajib — must match original format** |

---

## Phase 2 Design Decisions (from context.md Entry 5)

**D1 (Two-Tier Plan):** Plan menjadi two-tier (context.md 2g). Work tasks = model's domain, display-only. Structural phases (identifikasi → eksplorasi → free zone → tasks complete → verifikasi → artifact) = harness-enforced via `paperToolTracker`.

**D2 (Choice Card Post-Capture Validation):** Post-capture validation aktif: jika model emit finalize-class `workflowAction` tapi `updateStageData` belum dipanggil di drafting session ini, harness downgrade ke `continue_discussion`.

**D3 (CHAIN_COMPLETION Abort):** CHAIN_COMPLETION abort (bukan recover). Impact HIGH — stage ini revisi targeted dari abstrak stage 4 berdasarkan temuan aktual. Prose sebagai artifact = abstrak invalid.

**D8 (Atomic Create+Link):** `artifacts.create` mutation di-extend untuk atomic link ke `stageData.artifactId` dalam satu transaction.

**D10 (Validation Recovery):** Validation panel verify artifact existence di DB sebelum render. Error state + retry button jika artifact missing.
