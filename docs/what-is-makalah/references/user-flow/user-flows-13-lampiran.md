## Stage 13: Lampiran

### Objective
Menganalisis material dari stage-stage sebelumnya (terutama Metodologi dan Hasil)
untuk mengidentifikasi item-item yang layak dijadikan lampiran. Sajikan opsi via
choice card dengan RECOMMENDATION (termasuk opsi "tidak ada lampiran"), lalu
generate artifact berisi advisory list setelah user confirm (finalize choice card).
User yang mengelola data lampiran aktual — model hanya menyarankan apa yang perlu
dilampirkan.

### Signifikansi
Lampiran adalah **OPTIONAL content stage** — isinya bisa legitimately kosong.
Berbeda dengan stage 3-10 yang HARUS menghasilkan konten substantif, lampiran
hanya diperlukan jika paper memiliki material pendukung (instrumen, data tambahan,
kuesioner, dll) yang terlalu detail untuk masuk ke body paper.

Namun **artifact HARUS selalu di-generate** meskipun isinya "Tidak Ada Lampiran".
Ini karena semua 14 stage HARUS punya artifact agar NASKAH preview bisa di-compile
lengkap. Artifact kosong (dengan catatan tidak ada lampiran) tetap valid.

Bedanya dengan stage content lain: model di sini bukan **penulis** konten paper,
melainkan **advisor** — menyarankan item apa saja yang perlu dilampirkan. User
yang mengelola data aktual sendiri (terlalu token-expensive untuk AI). Fitur
konversi data lampiran akan ditangani di masa depan.

### Artifact Category
**Advisory** — artifact berisi saran model tentang item-item yang perlu dilampirkan,
BUKAN konten lampiran aktual. Alternatifnya: **"Tidak Ada Lampiran"** jika user
memutuskan tidak perlu lampiran.

### Input
- Approved artifacts dari semua stage sebelumnya (tarik dari DB — Cross-Stage C)
- Khususnya:
  - Metodologi: instrumen penelitian, prosedur pengumpulan data — sumber utama item lampiran
  - Hasil: data tambahan, tabel detail, grafik pendukung — sumber kedua item lampiran
  - Outline: living outline checklist status (`checkedAt`, `checkedBy`, `editHistory`)
- File yang di-attach user (jika ada)

### Search Policy
**PASSIVE — only when user explicitly requests it.**
Ini adalah REVIEW MODE: generate dari existing approved material dulu, bukan dari search baru.
Model TIDAK boleh proactively search. Jika user eksplisit minta search, jalankan segera.

**SEARCH TURN RULE:** Web search dan function tools TIDAK BOLEH di turn yang sama.

### Plan Template
- Max **3** work tasks
- 1 terminal task: "Membuat artifak & Validasi pindah stage ke user" (kind: `artifact_validation`)
- Contoh task: "Review material metodologi & hasil", "Identifikasi item lampiran potensial",
  "Konfirmasi arah lampiran"

### Output Contract (stageData)
Required (harus ada sebelum `submitStageForValidation`):
- (none — lampiran may legitimately be empty)

Optional:
- `items` (array) — appendix items
- `tidakAdaLampiran` (boolean) — confirm no appendix needed

**Catatan:** Ini satu-satunya stage (bersama beberapa stage finalisasi lain) yang
tidak punya required stageData fields. Gate-check pada `submitStageForValidation`
tetap pass meskipun stageData minimal.

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
- Unnecessary appendix inflation

### Flow Detail (Step-by-Step)

#### Turn 1: Review approved material + Present direction options

**Kondisi:** User approve daftar pustaka di validation panel → session advance ke lampiran.

**Model:**
1. **Tarik artifacts dari DB** — butuh semua stage sebelumnya, terutama metodologi
   (instrumen, prosedur) dan hasil (data tambahan, tabel detail).
2. Jika ada file attachment baru: acknowledge SEBELUM dialog.
3. Emit `plan-spec` block — 3 work task + 1 terminal task.
4. Review approved material dan identifikasi:
   - Item-item yang layak dijadikan lampiran (instrumen, kuesioner, data mentah, dll)
   - Apakah paper ini membutuhkan lampiran sama sekali
5. End with **choice card** (`continue_discussion`):
   - 2-3 opsi arah lampiran:
     - Opsi A: Lampiran dengan item spesifik (list item yang teridentifikasi)
     - Opsi B: Lampiran minimal (hanya item esensial)
     - Opsi C: **Tidak ada lampiran** — paper tidak memerlukan material pendukung tambahan
   - **RECOMMENDATION** di-highlight
   - Opsi "tidak ada lampiran" HARUS selalu tersedia sebagai opsi valid

**Harness:**
- Capture `plan-spec` + `yaml-spec`
- No function tool enforcement (discussion turn)

#### Turn 2: Confirm direction → Present finalize card

**User:** Klik option di choice card.

**Model:**
1. Summarize chosen direction:
   - Jika user pilih lampiran: list item yang akan di-include
   - Jika user pilih "tidak ada lampiran": confirm keputusan
2. Present **FINAL choice card** (`special_finalize`):
   - Konfirmasi item lampiran yang akan di-generate ke artifact, ATAU
   - Konfirmasi artifact "Tidak Ada Lampiran" yang akan di-generate
   - Do NOT draft full content yet — save full drafting for finalize step

#### Turn Finalize: Direction confirmed → Draft ke artifact

**Kondisi:** Direction confirmed via choice cards, semua work tasks complete.

**User:** Klik `special_finalize`.

**Harness:**
- Enforcer activates → forces tool chain

**Model (enforced by harness):**
1. `updateStageData` — save `items` array (jika ada) atau `tidakAdaLampiran: true`
2. `createArtifact` — artifact content bergantung pada direction:
   - **Jika ada lampiran:** advisory list berisi:
     - Daftar item yang disarankan untuk dilampirkan
     - Deskripsi singkat tiap item
     - Referensi ke stage asal (metodologi/hasil)
     - Catatan bahwa user mengelola data aktual sendiri
   - **Jika tidak ada lampiran:** artifact berisi:
     - Catatan "Tidak Ada Lampiran"
     - Justifikasi singkat mengapa lampiran tidak diperlukan
3. `submitStageForValidation` — stage status → `pending_validation`

**Chat output setelah artifact:**
- Brief summary: berapa item lampiran yang disarankan (atau bahwa tidak ada lampiran),
  tipe item, dan stage asal material
- BUKAN full advisory list
- Satu kalimat confirm artifact created + arahkan ke panel validasi

#### Validation Phase

**UI:** `PaperValidationPanel` muncul.

**User options:**
- **Approve** → stage `lampiran` = `approved`, session advance ke stage berikutnya
- **Revise** → trigger revision flow

**Revision contract:**
- PATH A (no search needed): `requestRevision(feedback)` → `updateArtifact` → `submitStageForValidation` — SAME turn
- PATH B (revision requires search): search ONLY this turn. NEXT turn: immediately `requestRevision` → `updateArtifact` → `submitStageForValidation`
- Selalu gunakan `updateArtifact` (BUKAN `createArtifact`) untuk revisi
- Base revision pada `📄 CURRENT ARTIFACT` yang di-inject, bukan regenerate dari scratch

### Choice Card Count
Minimum: **2 choice cards** sebelum artifact
- 1 direction/arah lampiran termasuk opsi "tidak ada lampiran" (`continue_discussion`)
- 1 final confirmation (`special_finalize`)
- Bisa lebih jika user minta adjustment

### Edge Cases & Guardrails

1. **"Tidak ada lampiran" adalah valid:** Model TIDAK BOLEH memaksakan lampiran jika
   paper tidak membutuhkannya. Opsi ini harus selalu tersedia di choice card dan
   dihormati jika user memilihnya
2. **Artifact HARUS selalu exist:** Meskipun isinya "Tidak Ada Lampiran", artifact
   harus tetap di-create. Semua 14 stage harus punya artifact untuk NASKAH preview
3. **Advisory, bukan content:** Model menyarankan item, BUKAN menulis konten lampiran
   aktual. User mengelola data sendiri. Jangan generate isi kuesioner, tabel data
   mentah, dll — cukup identifikasi dan deskripsikan
4. **Unnecessary appendix inflation:** DILARANG. Jangan inflate item lampiran hanya
   supaya stage terlihat produktif. Setiap item harus genuinely needed
5. **Tool call integrity:** TIDAK BOLEH claim artifact created kecuali benar-benar
   call `createArtifact` dan `submitStageForValidation` dan terima success response.
   **Non-negotiable**
6. **Chat output setelah artifact:** TIDAK BOLEH duplicate artifact body di chat.
   Brief summary saja + confirm + arahkan ke panel
7. **Search turn + function tools:** DILARANG di turn yang sama
8. **SOURCE-BODY PARITY:** Jika artifact body display item inventory, include ALL
   identified items. Jangan silently truncate
9. **Token expense awareness:** Lampiran aktual terlalu token-expensive untuk AI.
   Stage ini hanya advisory — fitur konversi data akan ditangani di masa depan

### Harness Enforcement Points (saat ini)
| Point | Mechanism | Deterministic? |
|-------|-----------|---------------|
| Plan task count | Plan inflation guard (max 3) | Yes |
| Choice card filter | NONE — model-emitted card unfiltered | No (Disconnect 2) |
| Finalize tool chain | Drafting Choice Artifact Enforcer (`special_finalize`) | Yes |
| Artifact content quality | NONE — prose used as fallback | No (Disconnect 3) |
| Artifact-session link | Non-atomic (two mutations) | Partial (Disconnect 4) |
| Panel artifact verification | NONE — string presence only | No (Disconnect 5) |
| Discussion turn cap | Soft prompt warning + hard server override | Yes |
| Work-complete constraint | Force finalize after 1 tolerance turn | Yes |
| Circuit breaker | 3x identical / 3x rejected / 15 total | Yes |
| Search-function separation | Runtime constraint (web search blocks tools) | Yes |
| Empty artifact validity | NONE — no enforcement that "no lampiran" still creates artifact | No |
| Advisory vs content boundary | NONE — model instruction only | No |

### Perbedaan Kunci dengan Stage Sebelumnya

| Aspek | Daftar Pustaka (11) | Daftar Isi (12) | Lampiran (13) |
|-------|---------------------|-----------------|---------------|
| Search policy | PASSIVE | PASSIVE | **PASSIVE** |
| Proactive search | Tidak | Tidak | **Tidak** |
| Content nature | Bibliography compilation | TOC compilation | **Advisory list (atau kosong)** |
| Artifact category | Paper content | Paper content | **Advisory** |
| Optional content | Tidak (wajib ada referensi) | Tidak (wajib ada TOC) | **Ya — bisa legitimately kosong** |
| Max work tasks | 3 | 3 | **3** |
| Finalize action | `finalize_stage` | `finalize_stage` | **`special_finalize`** |
| Turn count typical | 2-3 | 2-3 | **2-3** |
| Key constraint | Reference accuracy | Section completeness | **No appendix inflation, advisory only** |
| "No content" option | Tidak valid | Tidak valid | **Valid — "Tidak Ada Lampiran"** |

---

## Phase 2 Design Decisions (from context.md Entry 5)

**D1 (Two-Tier Plan):** Plan menjadi two-tier (context.md 2g). Work tasks = model's domain, display-only. Structural phases (identifikasi → eksplorasi → free zone → tasks complete → verifikasi → artifact) = harness-enforced via `paperToolTracker`.

**D3 (CHAIN_COMPLETION Abort):** CHAIN_COMPLETION abort (bukan recover). Impact MEDIUM — advisory stage, tapi artifact HARUS exist (bahkan 'Tidak Ada Lampiran'). Abort + retry lebih baik daripada garbage artifact.

**D8 (Atomic Create+Link):** `artifacts.create` mutation di-extend untuk atomic link ke `stageData.artifactId` dalam satu transaction.

**D10 (Validation Recovery):** Validation panel verify artifact existence di DB sebelum render. Error state + retry button jika artifact missing.
