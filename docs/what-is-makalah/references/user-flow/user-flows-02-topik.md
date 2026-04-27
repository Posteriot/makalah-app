## Stage 2: Topik

### Objective
Mengubah ide yang sudah disepakati di stage gagasan menjadi topik riset definitif dengan research gap yang eksplisit dan defensible.

### Relasi dengan Stage Sebelumnya
Stage topik adalah **derivasi langsung** dari stage gagasan. Semua material di stage ini
berasal dari output gagasan yang sudah di-approve — bukan dari pencarian baru.
Ini stage pertama yang menunjukkan pola "build on approved output":
- `ideKasar` dari gagasan → menjadi bahan derivasi topik
- `analisis` dari gagasan → menjadi basis feasibility assessment
- `angle` dari gagasan → menjadi titik tolak angle spesifik
- `referensiAwal` dari gagasan → menjadi supporting references

### Input
- Approved output dari stage gagasan (ideKasar, analisis, angle, referensiAwal)
- Latest user feedback
- File yang di-attach user (jika ada)

### Search Policy
**PASSIVE — Derivation Mode.**
Model TIDAK BOLEH initiate web search baru di stage ini. Semua material diderivasi
dari output gagasan dan referensi yang sudah disimpan.

Jika user explicitly minta search lebih dalam:
- Redirect ke stage gagasan (kalau mau perbaiki ide dasar), ATAU
- Redirect ke stage tinjauan_literatur (kalau mau deep academic search nanti)

Source hierarchy tetap berlaku (lihat Cross-Stage E) untuk referensi yang sudah ada.

### Plan Template
- Max 4 work tasks
- 1 terminal task: "Membuat artifak & Validasi pindah stage ke user" (kind: `artifact_validation`)
- Contoh task: "Review material gagasan", "Derivasi opsi topik", "Identifikasi research gap", "Formulasi topik definitif"

### Output Contract (stageData)
Required (harus ada sebelum `submitStageForValidation`):
- `definitif` (string) — definitive topic statement
- `angleSpesifik` (string) — specific research angle
- `researchGap` (string) — identified research gap

Optional (simpan jika tersedia):
- `argumentasiKebaruan` (string) — novelty argumentation
- `referensiPendukung` (array) — supporting references

### Function Tools
Sama dengan stage gagasan KECUALI:
- `inspectSourceDocument`, `quoteFromSource`, `searchAcrossSources` — TIDAK tersedia
  (stage ini derivasi, bukan investigasi sumber baru)
- `compileDaftarPustaka` (mode: preview) — tersedia untuk bibliography audit

### Flow Detail (Step-by-Step)

#### Turn 1: Stage topik dimulai setelah gagasan approved

**Kondisi:** User approve gagasan di validation panel → session advance ke topik.

**Model:**
1. **PERTAMA: Tarik artifact gagasan dari DB** — via `readArtifact` atau injected context.
   Artifact gagasan berisi poin-poin penting (ideKasar, analisis, angle, referensiAwal)
   yang jadi bekal utama stage ini. Model bekerja dari data valid di DB, BUKAN hanya
   mengandalkan context window yang mungkin sudah ter-compact atau stale (lihat Cross-Stage C).
2. Jika ada file attachment baru: acknowledge setiap file by name, summarize 2-4 kalimat,
   connect ke objective stage. SEBELUM dialog.
3. Emit `plan-spec` block — 4 work task + 1 terminal task
4. Review approved gagasan material (dari artifact, bukan dari ingatan):
   - Apa ide yang disepakati?
   - Apa angle yang dipilih?
   - Apa referensi yang sudah dikumpulkan?
5. Derive 2-3 topic options dari material gagasan — BUKAN dari search baru
5. Present via **choice card** (`continue_discussion`):
   - 2-3 opsi topik yang diderivasi
   - **RECOMMENDATION** di-highlight sebagai default — model harus pick yang terbaik dan jelaskan kenapa
   - User confirm dengan select, bukan extended discussion

**Perbedaan kunci dengan gagasan:**
- TIDAK ada search di turn manapun (kecuali user explicitly minta)
- Lebih fokus (derivasi, bukan eksplorasi)
- Opsi dipresentasikan langsung di turn pertama (gagasan butuh search dulu)

**Harness:**
- Capture `plan-spec` via `pipe-plan-capture.ts`
- Stabilize plan (first emission)
- Capture `yaml-spec` (choice card) via `pipe-yaml-render`
- Gagasan stageData tersedia di context (model bisa baca)

#### Turn 2-N: Incremental discussion per plan task

**User:** Klik salah satu option di choice card, atau ketik response manual.

**Model:**
1. Untuk setiap plan task (dikerjakan SATU PER SATU):
   a. Present analysis untuk task saat ini — derivasi dari material gagasan
   b. Mark task sebelumnya sebagai `complete` di plan-spec (jika confirmed)
   c. End with **choice card** (`continue_discussion`) — user steer direction
   d. TUNGGU response user sebelum lanjut ke task berikutnya
2. TIDAK BOLEH combine multiple tasks dalam satu response
3. TIDAK BOLEH skip tasks
4. Jika perlu simpan data ke stageData: call `updateStageData`

**Apa yang berbeda dari gagasan:**
- Tidak ada search turn — semua turn bisa include function tools
- Diskusi lebih terfokus — narrowing dari 2-3 opsi ke 1 topik definitif
- Research gap harus eksplisit — bukan hanya "menarik" tapi "belum diteliti secara X"

**Harness:**
- Capture updated plan-spec setiap turn
- Track plan task progression
- No enforcement (masih `continue_discussion`)

#### Turn Final: Semua work tasks complete → Finalize

**Kondisi:** Semua 4 work tasks sudah confirmed oleh user via choice cards.
Topik definitif, angle spesifik, dan research gap sudah disepakati.

**Model:**
1. Present summary: topik definitif yang dipilih, research angle, research gap
2. Emit **FINAL choice card** (`finalize_stage`):
   - "Buat artifak topik?"
   - Clear bahwa ini commit point

**User:** Klik `finalize_stage` option.

**Harness:**
- `choiceInteractionEvent` created
- `resolveChoiceWorkflow` → `finalize_stage` → `ResolvedChoiceWorkflow` with `toolStrategy: "update_create_submit"`
- **Drafting Choice Artifact Enforcer** activates:
  - Forces tool chain: `updateStageData` → `createArtifact` → `submitStageForValidation`
  - `toolChoice` set to `required`

**Model (enforced by harness):**
1. `updateStageData` — save `definitif`, `angleSpesifik`, `researchGap` (+ optional fields)
2. `createArtifact` — artifact content = topik definitif dengan argumentasi
3. `submitStageForValidation` — stage status → `pending_validation`

**Chat output setelah artifact:**
- Brief summary: topik yang dipilih, angle, research gap (BUKAN full artifact content)
- Satu kalimat confirm artifact created
- Satu kalimat arahkan ke artifact panel untuk review
- TIDAK BOLEH duplicate artifact body di chat

#### Validation Phase

**UI:** `PaperValidationPanel` muncul.

**User options:**
- **Approve** → stage `topik` = `approved`, session advance ke stage `outline`
- **Revise** → trigger revision flow (Cross-Stage F)

**Jika Revise:**
- Revision contract berlaku (lihat Cross-Stage F)
- PATH A (no search): `requestRevision` → `updateArtifact` → `submitStageForValidation` — same turn
- PATH B (needs search): search this turn → next turn immediately revision chain
- Artifact saat ini di-inject sebagai "📄 CURRENT ARTIFACT"
- Panel muncul lagi

### Choice Card Count
Minimum: **5 choice cards** sebelum artifact
- 1 per work task (4 work tasks × `continue_discussion`)
- 1 final (`finalize_stage`)
- Bisa lebih jika user minta deeper discussion

### Edge Cases & Guardrails

1. **User minta search baru:** Redirect — "Untuk search lebih dalam, bisa kembali ke gagasan
   atau nanti di tinjauan literatur." Model TIDAK search sendiri di stage ini
2. **User minta ubah ide dasar (bukan topik):** Ini bukan revisi topik — ini revisi gagasan.
   Call `resetToStage({ targetStage: "gagasan" })` langsung, tanpa apologize
3. **Derivasi tanpa material cukup:** Jika gagasan output terlalu thin untuk derive topik
   yang defensible, model harus explicitly state ini dan suggest kembali ke gagasan
4. **Topic framing terlalu broad:** Model harus prefer specific dan measurable framing —
   "Pengaruh X terhadap Y di konteks Z" bukan "Tentang X"
5. **Tool call integrity:** TIDAK BOLEH claim artifact created kecuali benar-benar call tools
6. **Chat output setelah artifact:** Brief summary ONLY. TIDAK duplicate artifact body.
   TIDAK pakai false handoff ("berikut draf-nya") — draft ada di artifact, bukan di chat
7. **CHAIN_COMPLETION fallback:** Sama dengan gagasan — prose sebagai artifact content (Disconnect 3)

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
| Search prevention | Prompt-only ("passive" directive) | No — probabilistic |

### Perbedaan Kunci dengan Stage 1 (Gagasan)

| Aspek | Gagasan | Topik |
|-------|---------|-------|
| Search policy | ACTIVE (dual search) | PASSIVE (derivation only) |
| Input source | User ide mentah + search | Approved gagasan output |
| Turn pertama | Discuss → search next turn | Derive opsi langsung |
| Source tools | inspectSourceDocument, quoteFromSource, searchAcrossSources | TIDAK tersedia |
| Nature | Eksplorasi bebas → converge | Derivasi fokus → narrow |
| Output | Ide + analisis + angle | Topik definitif + gap + argumentasi |
| Enforcement tambahan | — | Search prevention (prompt-only, probabilistic) |

---

## Phase 2 Design Decisions (from context.md Entry 5)

- **D1 (Two-Tier Plan):** Plan menjadi two-tier (context.md 2g). Work tasks = model's domain, display-only. Structural phases (identifikasi → eksplorasi → free zone → tasks complete → verifikasi → artifact) = harness-enforced via `paperToolTracker`.
- **D3 (CHAIN_COMPLETION Abort):** CHAIN_COMPLETION abort (bukan recover). Impact LOW untuk preparatory stages — prose-as-notes masih tolerable, tapi abort tetap berlaku untuk konsistensi lifecycle.
- **D8 (Atomic Create+Link):** `artifacts.create` mutation di-extend untuk atomic link ke `stageData.artifactId` dalam satu transaction.
- **D10 (Validation Recovery):** Validation panel verify artifact existence di DB sebelum render. Error state + retry button jika artifact missing.
