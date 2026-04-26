## Stage 14: Judul

### Objective
Finalize the paper title by generating 5 title options with different styles,
presenting them via choice card with recommendation, and creating the artifact
after user selects the final title.

### Signifikansi
Judul adalah **FINAL stage** di seluruh 14-stage workflow. Setelah stage ini
approved, paper lengkap dan user bisa export ke Word/PDF atau rewind ke stage
manapun untuk revisi.

Ini satu-satunya stage yang bersifat **meta-update** — artifact-nya bukan
section baru di NASKAH, melainkan **mengganti judul kerja** yang sudah di-set
sejak stage 2 (topik `definitif`). Judul final harus merefleksikan seluruh
isi paper yang sudah disetujui di 13 stage sebelumnya.

Stage ini juga menggunakan `special_finalize` (bukan `finalize_stage`) sebagai
workflowAction pada choice card terakhir — sama seperti stage 8 (hasil) dan
stage 13. Model meng-generate 5 opsi judul dengan style berbeda, user memilih
satu, lalu finalize.

### Artifact Category
**Meta-update** — artifact berisi judul final yang terpilih. Judul ini
**menggantikan judul kerja** (working title) yang di-set dari stage 2 topik
`definitif` di NASKAH. Bukan section baru — melainkan update metadata paper.

### Input
- Approved artifacts/summaries dari **SEMUA** stage sebelumnya (tarik dari DB — Cross-Stage C)
- Khususnya:
  - Topik: judul kerja (`definitif`) yang akan digantikan
  - Abstrak: ringkasan isi paper
  - Pendahuluan: latar belakang dan rumusan masalah
  - Tinjauan Literatur: kerangka teoretis
  - Metodologi: pendekatan penelitian
  - Hasil: temuan utama
  - Kesimpulan: kontribusi dan implikasi
- Final user positioning
- Living outline checklist status (`checkedAt`, `checkedBy`, `editHistory`)
- File yang di-attach user (jika ada)

### Search Policy
**PASSIVE — only when user explicitly requests it.**
Ini adalah REVIEW MODE: generate dari existing approved material dulu, bukan dari search baru.
Model TIDAK boleh proactively search. Jika user eksplisit minta search, jalankan segera.

**SEARCH TURN RULE:** Web search dan function tools TIDAK BOLEH di turn yang sama.

### Plan Template
- Max **3** work tasks
- 1 terminal task: "Membuat artifak & Validasi pindah stage ke user" (kind: `artifact_validation`)
- Contoh task: "Review material dari semua stage", "Generate 5 opsi judul",
  "Konfirmasi judul terpilih"

### Output Contract (stageData)
Required (harus ada sebelum `submitStageForValidation`):
- `opsiJudul` (array) — title options (5 opsi dengan style berbeda)
- `judulTerpilih` (string) — selected title

Optional:
- `alasanPemilihan` (string) — selection rationale

### Function Tools
Allowed:
- `updateStageData` — save stage progress
- `createArtifact` — create stage output artifact (judul final)
- `requestRevision` — call FIRST when user requests changes via chat during `pending_validation`
- `updateArtifact` — create new version during revision (BUKAN `createArtifact`)
- `submitStageForValidation` — call di turn yang SAMA dengan `createArtifact`
- `compileDaftarPustaka` (mode: preview) — cross-stage bibliography audit tanpa persistence
- `readArtifact({ artifactId })` — read artifact dari stage sebelumnya untuk cross-reference

Disallowed:
- Stage jumping
- `compileDaftarPustaka` (mode: persist) — hanya boleh di stage daftar_pustaka
- Function tools + web search di turn yang sama
- Judul yang TIDAK grounded di approved content

**workflowAction:** Menggunakan `special_finalize` (BUKAN `finalize_stage`)
pada choice card terakhir — treatment khusus di harness karena ini meta-update stage.

### Flow Detail (Step-by-Step)

#### Turn 1: Review all approved material + Generate title options

**Kondisi:** User approve stage sebelumnya di validation panel → session advance ke judul.

**Model:**
1. **Tarik artifacts dari DB** — butuh summaries dari SEMUA 13 stage sebelumnya,
   terutama topik (judul kerja), abstrak, pendahuluan (rumusan masalah),
   hasil (temuan utama), dan kesimpulan (kontribusi).
2. Jika ada file attachment baru: acknowledge SEBELUM dialog.
3. Emit `plan-spec` block — 3 work task + 1 terminal task
4. Review seluruh approved content untuk identify:
   - Core contribution/novelty
   - Key variables/concepts
   - Scope dan methodology
   - Target audience
5. Generate **5 opsi judul** dengan style berbeda:
   - **Descriptive** — langsung menjelaskan apa yang diteliti
   - **Conceptual** — fokus pada konsep/teori utama
   - **Provocative** — menarik perhatian, memancing curiosity
   - **Method-focused** — menonjolkan pendekatan penelitian
   - **Impact-focused** — menonjolkan kontribusi/dampak
6. Present via **choice card** (`continue_discussion`):
   - 5 opsi judul dengan label style masing-masing
   - **RECOMMENDATION** di-highlight — model harus pilih yang terbaik
   - Coverage analysis: keyword coverage, scope accuracy, audience fit

**Harness:**
- Capture `plan-spec` + `yaml-spec`
- No finalize enforcement (baru direction card)

#### Turn 2: User selects → Finalize confirmation

**User:** Klik option di choice card (salah satu dari 5 judul).

**Model:**
1. Summarize judul yang dipilih user:
   - Kenapa judul ini cocok vs alternatif lain
   - Keyword coverage terhadap isi paper
   - Alignment dengan approved content
2. Emit **FINAL choice card** (`special_finalize`):
   - Konfirmasi judul terpilih
   - Opsi: "Gunakan judul ini sebagai judul final" vs "Modifikasi dulu"

**User:** Klik `special_finalize`.

**Harness:**
- Enforcer activates → forces tool chain

#### Turn 3: Artifact creation (enforced by harness)

**Model (enforced by harness):**
1. `updateStageData` — save `opsiJudul` (array 5 opsi), `judulTerpilih` (string),
   `alasanPemilihan` (string, jika ada)
2. `createArtifact` — artifact content = **judul final terpilih**.
   Artifact ini bersifat meta-update: menggantikan judul kerja di NASKAH.
   Content berisi:
   - Judul final yang terpilih
   - Style category (descriptive/conceptual/provocative/method/impact)
   - Alasan pemilihan singkat
3. `submitStageForValidation` — stage status → `pending_validation`

**Chat output setelah artifact:**
- Brief summary: judul terpilih, kenapa dipilih, keyword apa yang ter-cover
- BUKAN daftar lengkap semua opsi
- Satu kalimat confirm artifact created + arahkan ke panel
- Mention bahwa setelah approval, paper selesai dan bisa di-export

#### Validation Phase

**UI:** `PaperValidationPanel` muncul.

**User options:**
- **Approve** → stage `judul` = `approved`, **PAPER COMPLETE**.
  User bisa export ke Word/PDF atau rewind ke stage manapun untuk revisi.
- **Revise** → trigger revision flow (Cross-Stage F)

### Choice Card Count
Minimum: **2 choice cards** sebelum artifact
- 1 title options/direction (`continue_discussion`) — 5 opsi judul
- 1 final selection confirmation (`special_finalize`)
- Bisa lebih jika user minta adjustment atau modifikasi opsi

### Edge Cases & Guardrails

1. **Judul tidak grounded:** Judul HARUS mencerminkan isi approved content.
   Tidak boleh membuat judul yang meng-klaim sesuatu yang tidak ada di paper.
   Semua keyword/konsep di judul harus traceable ke stage sebelumnya.
2. **Judul terlalu generic:** Model harus memastikan judul cukup spesifik
   untuk membedakan paper ini dari paper lain di topik yang sama.
3. **Judul terlalu panjang:** Academic title guidelines — idealnya 10-15 kata.
   Jika melebihi, model harus note dan offer alternatif yang lebih ringkas.
4. **User minta judul clickbait:** Model harus push back — judul akademik
   bukan clickbait. Provocative style boleh, tapi tetap akademis.
5. **Search turn + function tools:** DILARANG di turn yang sama.
6. **Tool call integrity:** TIDAK BOLEH claim artifact created kecuali benar-benar
   call tools dan dapat success response.
7. **Post-artifact chat:** TIDAK BOLEH duplicate artifact body di chat.
   Brief summary saja + arahkan ke panel.
8. **Revision contract:** `requestRevision` → `updateArtifact` → `submitStageForValidation`.
   BUKAN `createArtifact` untuk revisi.
9. **Plan stability:** TIDAK BOLEH tambah task baru mendekati akhir untuk
   terus diskusi. Max 3 work tasks — setelah direction confirmed, langsung
   present finalize card.

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
| Title grounding validation | NONE — no check that title reflects approved content | No |
| Meta-update propagation | NONE — no enforcement that NASKAH title actually updates | No |

### Perbedaan Kunci dengan Stage Sebelumnya

| Aspek | Kesimpulan (10) | Daftar Pustaka (11) | Judul (14) |
|-------|-----------------|---------------------|------------|
| Search policy | PASSIVE | PASSIVE | **PASSIVE** |
| Artifact category | Paper content | Paper content | **Meta-update** |
| workflowAction | `finalize_stage` | `finalize_stage` | **`special_finalize`** |
| Max work tasks | 3 | 3 | **3** |
| Turn count typical | 2-3 | 2-3 | **2-3** |
| Choice card style | Direction + finalize | Direction + finalize | **5 title options + finalize** |
| Nature | Penutup paper | Kompilasi referensi | **Finalisasi judul — mengganti working title** |
| Post-approval | Lanjut ke stage berikut | Lanjut ke stage berikut | **PAPER COMPLETE — export available** |
| Input scope | Stage-stage sebelumnya | Semua referensi | **SEMUA stage (13 approved artifacts)** |

---

## Phase 2 Design Decisions (from context.md Entry 5)

**D1 (Two-Tier Plan):** Plan menjadi two-tier (context.md 2g). Work tasks = model's domain, display-only. Structural phases (identifikasi → eksplorasi → free zone → tasks complete → verifikasi → artifact) = harness-enforced via `paperToolTracker`.

**D3 (CHAIN_COMPLETION Abort):** CHAIN_COMPLETION abort (bukan recover). Impact HIGH — meta-update stage. Wrong prose bisa set wrong NASKAH title. Abort prevents title corruption.

**D8 (Atomic Create+Link):** `artifacts.create` mutation di-extend untuk atomic link ke `stageData.artifactId` dalam satu transaction.

**D10 (Validation Recovery):** Validation panel verify artifact existence di DB sebelum render. Error state + retry button jika artifact missing.
