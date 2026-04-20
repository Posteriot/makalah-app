# Canonical Stage Plan and Stage Adaptation

## Ringkasan

Dokumen ini menggantikan asumsi lama tentang `active outline blueprint` yang terlalu dekat dengan ontology outline eksternal. Paradigma barunya: yang aktif di runtime bukan blueprint outline mentah, tetapi `canonical stage plan` hasil kompilasi. Plan ini menjaga agar semua eksekusi tetap memakai stage internal makalahapp, sambil tetap mengakomodasi variasi chapter naming, grouping, dan penekanan dari outline eksternal.

## Detail

- **Nama**: `canonical stage plan`
- **Peran**: Menjadi kontrak operasional runtime setelah outline eksternal dikompilasi.
- **Alur Utama**:
  - Model memilih `outline pattern`.
  - Compiler menghasilkan `canonical stage plan`.
  - Runtime, prompt, dan stage skill membaca plan tersebut.
  - Stage tetap menulis berdasarkan ontology internal, dengan informasi tambahan soal alias, grouping, dan presentation layout.
- **Dependensi**:
  - `outline registry`
  - `outline compiler`
  - `compatibility evaluator`
  - `stage skill`
- **Catatan**:
  - Runtime tidak pernah menulis berdasarkan istilah outline eksternal mentah.

## Skema Plan

```ts
type CanonicalStagePlan = {
  planId: string
  patternId: string

  compatible: boolean
  compatibilityMode: "exact" | "augmented" | "rejected"

  requiredStages: PaperStage[]
  optionalStages: PaperStage[]

  stageAliases: Partial<Record<PaperStage, string[]>>

  stageSections: Partial<Record<PaperStage, {
    displayTitle?: string
    sourceSections: string[]
    mappingType: "exact" | "partial" | "shared"
    notes?: string[]
  }>>

  missingRequiredStages: PaperStage[]
  injectedStages?: PaperStage[]

  incompatibilities: string[]
  compileNotes: string[]
}
```

## Posisi Baru Stage

### Stage tetap canonical

Stage internal tetap menjadi:

- struktur dokumen internal
- unit workflow
- unit validation
- unit persistence

### Outline eksternal hanya mempengaruhi

- display title
- chapter grouping
- alias terminology
- section emphasis
- presentation order

Jadi:

- outline tidak mengganti stage
- outline memperkaya cara stage dipresentasikan

## Adaptasi Operasional

### Kasus 1: exact match

Contoh:

- `Metodologi` -> `metodologi`

Adaptasi:

- runtime normal
- stage skill hanya membaca alias atau note tambahan

### Kasus 2: partial match

Contoh:

- `Latar Belakang` -> bagian dari `pendahuluan`

Adaptasi:

- stage canonical tetap `pendahuluan`
- plan mencatat bahwa source section hanya cover bagian tertentu
- stage skill tahu dia harus melengkapi komponen canonical lain yang masih wajib

### Kasus 3: shared match

Contoh:

- `Hasil dan Pembahasan` -> `hasil` + `diskusi`

Adaptasi:

- kedua stage canonical tetap hidup
- plan mencatat shared source section
- render layer boleh menampilkan satu chapter gabungan, tetapi persistence tetap per stage canonical

### Kasus 4: missing required stage

Contoh:

- pattern eksternal tidak memuat `abstrak`

Adaptasi:

- kalau mode strict: reject
- kalau mode assistive: compiler menginjeksi `abstrak` sebagai required canonical stage yang harus tetap ada

## Implikasi ke Stage Skill

Stage skill menjadi lebih berguna, tapi dengan fungsi yang lebih jelas.

### Stage skill harus membaca

- stage canonical aktif
- alias atau display title dari plan
- source section yang melatarinya
- mapping type
- notes dan compile warnings

### Stage skill tidak boleh membaca

- istilah outline eksternal sebagai pengganti stage internal

### Peran baru stage skill

- operational system prompt untuk stage canonical
- panduan kualitas isi stage
- panduan bagaimana menyesuaikan diri terhadap alias dan grouping dari plan

## Artifact dan Render

### Artifact canonical

Artifact sebaiknya tetap canonical per stage, karena:

- persistence lebih stabil
- revision lifecycle lebih jelas
- compatibility dengan workflow lama lebih aman

### Render composition

Kalau pattern eksternal menggabungkan beberapa stage dalam satu chapter:

- hasil render final bisa menggabungkan beberapa artifact canonical
- tetapi artifact penyimpanan tetap tidak perlu berubah ontology

Ini memerlukan `composition layer`, bukan perubahan ontology stage.

## Stale Propagation

Kalau plan berubah:

- stage canonical yang terdampak harus ditandai stale
- stale bukan berarti stage hilang, tapi perlu reconcile

Tingkat stale yang disarankan:

- `cosmetic`
- `structural`
- `semantic`
- `approval`

## Daftar File Terkait

- `docs/model-led-tool-first/11-outline-kb-architecture.md`
- `docs/model-led-tool-first/12-outline-registry-and-pattern-schema.md`
- `docs/model-led-tool-first/15-outline-compiler-and-canonical-stage-plan.md`
- `docs/model-led-tool-first/16-outline-compatibility-rules.md`
- `docs/model-led-tool-first/06-backend-guard-and-state-machine-contract.md`
- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/ai/paper-stages/**`
- `convex/paperSessions.ts`
