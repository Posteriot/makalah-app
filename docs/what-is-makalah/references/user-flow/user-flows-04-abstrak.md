## Stage 4: Abstrak

### Objective
Menyusun abstrak yang ringkas dan akurat, mengkompilasi konteks yang sudah disetujui tanpa memperkenalkan klaim yang tidak didukung. Abstrak ini adalah **versi proyeksi** — ditulis berdasarkan rencana riset, bukan hasil aktual (yang belum ada). Akan direvisi di stage 11 (pembaruan abstrak) setelah seluruh paper content selesai.

### Signifikansi Arsitektural: Paper Content Stage Pertama
Ini adalah **titik transisi** dari preparatory ke paper content. Mulai dari stage ini:
- Artifact bukan lagi working notes — ini **isi paper itu sendiri**
- Artifact muncul di fitur NASKAH sebagai preview section paper
- Skill harus tegas tentang **how to write** — format akademik, gaya bahasa, citation
- Outline dari stage 3 menjadi panduan struktur yang HARUS diikuti

Abstrak istimewa karena ditulis DUA KALI:
1. Stage 4 (sekarang): abstrak proyeksi — berdasarkan rencana
2. Stage 11 (pembaruan abstrak): abstrak final — direvisi berdasarkan temuan aktual

### Artifact Category
**Paper content** — artifact berisi isi abstrak paper yang akan tampil di fitur NASKAH.

### Input
- Approved artifacts dari stage gagasan, topik, DAN outline (tarik dari DB — Cross-Stage C)
- Khususnya: outline `sections` untuk memahami struktur paper
- Living outline checklist status
- File yang di-attach user (jika ada)

### Search Policy
**PASSIVE — Review Mode.**
Generate dari approved material. TIDAK proactive search. Hanya search jika user explicitly minta.

### Plan Template
- Max 4 work tasks
- 1 terminal task: "Membuat artifak & Validasi pindah stage ke user" (kind: `artifact_validation`)
- Contoh task: "Review material fase persiapan", "Identifikasi framing approach",
  "Konfirmasi arah abstrak", "Draft abstrak ke artifact"

### Output Contract (stageData)
Required (harus ada sebelum `submitStageForValidation`):
- `ringkasanPenelitian` (string) — research summary text (isi abstrak)
- `keywords` (array) — keyword list

Optional:
- `wordCount` (number) — abstract word count

### Function Tools
Sama dengan stage topik, plus `readArtifact` untuk cross-reference semua artifact sebelumnya.
TIDAK punya `inspectSourceDocument`, `quoteFromSource`, `searchAcrossSources`.

### Flow Detail (Step-by-Step)

#### Turn 1: Review material + Direction proposal

**Kondisi:** User approve outline di validation panel → session advance ke abstrak.

**Model:**
1. **Tarik artifacts gagasan, topik, DAN outline dari DB** — model butuh ketiga artifact:
   gagasan untuk konteks riset, topik untuk scope, outline untuk struktur.
2. Jika ada file attachment baru: acknowledge SEBELUM dialog.
3. Emit `plan-spec` block — 4 work task + 1 terminal task
4. Review approved material, lalu present **abstract framing approach**:
   - 2-3 opsi framing — misalnya:
     - Opsi A: fokus pada research gap dan novelty
     - Opsi B: fokus pada methodology dan expected contribution
     - Opsi C: fokus pada problem urgency dan practical implications
5. Present via **choice card** (`continue_discussion`):
   - 2-3 opsi framing
   - **RECOMMENDATION** di-highlight dengan alasan

**Pola baru — Direction + Finalize Review:**
Stage ini memperkenalkan pola yang akan dipakai di hampir semua paper content stages
(stage 4-11): **satu round direction confirmation, lalu finalize**. Lebih ringkas
daripada gagasan (4+ rounds) atau outline (2-3 rounds) karena scope per stage lebih
focused — satu section, bukan seluruh paper.

**Harness:**
- Capture `plan-spec` + `yaml-spec`
- Gagasan, topik, outline stageData tersedia di context

#### Turn 2-N: Discussion jika user minta adjustment

**User:** Mungkin minta adjust framing, emphasis, atau keyword approach.

**Model:**
- Proses adjustment via choice cards (`continue_discussion`)
- Mark tasks sebagai `complete` saat confirmed
- TIDAK draft content selama masih `continue_discussion`

#### Turn Finalize: Direction confirmed → Draft ke artifact

**Kondisi:** User sudah confirm framing approach.

**Model:**
1. Summarize chosen direction
2. Emit **FINAL choice card** (`finalize_stage`):
   - "Draft abstrak?"
   - Clear bahwa ini commit point — model akan tulis abstrak langsung ke artifact

**User:** Klik `finalize_stage`.

**Harness:**
- Enforcer activates → forces tool chain

**Model (enforced by harness):**
1. `updateStageData` — save `ringkasanPenelitian`, `keywords` (+ optional `wordCount`)
2. `createArtifact` — artifact content = **abstrak paper dalam format akademik**.
   Ini bukan notes — ini isi section abstrak paper yang akan muncul di NASKAH.
   Harus ditulis dengan:
   - Bahasa formal akademik Indonesia
   - Struktur: latar belakang singkat → tujuan → metode → hasil yang diharapkan → kesimpulan
   - Panjang sesuai standar (150-300 kata typical)
   - **WAJIB menyertakan Kata Kunci (Keywords)** di akhir abstrak — ini bagian integral
     dari halaman abstrak paper akademik, bukan opsional
   - Tidak ada klaim yang tidak didukung approved material
3. `submitStageForValidation` — stage status → `pending_validation`

**Chat output setelah artifact:**
- Brief summary: fokus abstrak, research angle, methodology type, expected contribution
- BUKAN full abstrak — itu ada di artifact
- Satu kalimat confirm + arahkan ke panel

#### Validation Phase

**UI:** `PaperValidationPanel` muncul.

**User options:**
- **Approve** → stage `abstrak` = `approved`, session advance ke stage `pendahuluan`
- **Revise** → trigger revision flow (Cross-Stage F)

### Choice Card Count
Minimum: **2 choice cards** sebelum artifact
- 1 direction/framing (`continue_discussion`)
- 1 final (`finalize_stage`)
- Bisa lebih jika user minta adjustment

### Writing Requirements (berlaku untuk semua paper content stages)

Karena artifact di stage ini adalah **isi paper itu sendiri**, model harus menulis
dengan standar akademik:

1. **Bahasa:** Formal akademik Indonesia. Technical terms dalam English boleh jika
   tidak ada padanan yang tepat
2. **Tidak boleh fabricate:** Semua klaim harus traceable ke approved material
   dari stage sebelumnya
3. **Citation:** Jika mereferensikan sumber, gunakan format APA
4. **Alignment dengan outline:** Konten harus sesuai dengan section structure
   yang sudah di-approve di outline
5. **Living checklist update:** Setelah stage di-approve, checklist item corresponding
   di outline ter-update

### Edge Cases & Guardrails

1. **Abstrak ini proyeksi, bukan final:** Akan direvisi di stage 11 setelah semua
   paper content selesai. Model harus tulis berdasarkan rencana, bukan seolah-olah
   hasil riset sudah ada
2. **Klaim tanpa sumber:** DILARANG. Semua statement di abstrak harus traceable ke
   approved material dari gagasan, topik, atau outline
3. **Terlalu panjang/pendek:** Model harus target 150-300 kata (standar abstrak akademik)
4. **Keywords tidak relevan:** Keywords harus reflect actual content dan research angle
5. **Tool call integrity:** TIDAK BOLEH claim artifact created kecuali benar-benar call tools
6. **Chat output setelah artifact:** Brief summary ONLY
7. **CHAIN_COMPLETION fallback:** Prose sebagai artifact content — khususnya berbahaya
   di paper content stages karena prose chat ≠ abstrak akademik (Disconnect 3)

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
| Academic writing quality | NONE — no content format validation | No |
| Outline alignment | NONE — no check against outline structure | No |

### Perbedaan Kunci: Preparatory vs Paper Content

| Aspek | Preparatory (1-3) | Paper Content (4+) |
|-------|-------------------|-------------------|
| Artifact berisi | Working notes, conclusions, blueprint | **Isi section paper** |
| Tampil di NASKAH | Referensi/metadata | **Section paper** |
| Writing standard | Conversational/structured | **Formal akademik** |
| Outline dependency | Tidak ada (outline belum ada) | **HARUS ikuti outline** |
| CHAIN_COMPLETION risk | Low (notes acceptable) | **HIGH** (prose ≠ paper) |
| Skill focus | How to discuss/conclude | **How to write section** |

---

## Phase 2 Design Decisions (from context.md Entry 5)

- **D1 (Two-Tier Plan):** Plan menjadi two-tier (context.md 2g). Work tasks = model's domain, display-only. Structural phases (identifikasi → eksplorasi → free zone → tasks complete → verifikasi → artifact) = harness-enforced via `paperToolTracker`.
- **D2 (Choice Card Post-Capture Validation):** Post-capture validation aktif: jika model emit finalize-class `workflowAction` tapi `updateStageData` belum dipanggil di drafting session ini, harness downgrade ke `continue_discussion`.
- **D3 (CHAIN_COMPLETION Abort):** CHAIN_COMPLETION abort (bukan recover). Impact HIGH — prose chat ≠ academic abstrak. Abort prevents garbage artifact.
- **D8 (Atomic Create+Link):** `artifacts.create` mutation di-extend untuk atomic link ke `stageData.artifactId` dalam satu transaction.
- **D10 (Validation Recovery):** Validation panel verify artifact existence di DB sebelum render. Error state + retry button jika artifact missing.