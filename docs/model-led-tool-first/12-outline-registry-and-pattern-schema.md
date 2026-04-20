# Outline Registry and Pattern Schema

## Ringkasan

Dokumen ini menjelaskan bentuk `outline registry` yang dibutuhkan supaya outline custom tetap fleksibel tanpa mengubah ontology runtime makalahapp. Registry ini menyimpan `external structural patterns`, bukan daftar workflow baru. Setiap pattern menyimpan `section tree`, `applicability`, `rules`, `constraints`, dan data yang dibutuhkan agar `outline compiler` bisa menerjemahkannya ke `canonical stages`.

## Detail

- **Nama**: `outline registry`
- **Peran**: Menjadi katalog pattern struktur eksternal yang akan dikompilasi ke plan canonical.
- **Alur Utama**:
  - Model membaca `index.md`.
  - Model memilih beberapa candidate pattern.
  - Model membaca halaman markdown pattern yang relevan.
  - Model memilih satu pattern terbaik.
  - `outline compiler` mengubah pattern itu menjadi `canonical stage plan`.
- **Dependensi**:
  - Knowledge base markdown wiki.
  - `retrieveOutlinePatterns`.
  - `compareOutlinePatterns`.
  - `compileOutlineToCanonicalPlan`.
- **Catatan**:
  - Menambah outline baru berarti menambah `pattern`, bukan menambah workflow state machine baru.
  - Runtime tidak pernah memakai pattern registry mentah secara langsung.

## Registry vs Canonical Runtime

### Registry bukan:

- daftar stage baru
- daftar prompt baru per kampus
- daftar state machine baru
- vocabulary runtime

### Registry adalah:

- katalog pattern struktur dokumen eksternal
- metadata applicability
- evidence/provenance pattern
- data yang cukup untuk compile ke stage canonical

## Skema Inti

```ts
type OutlinePattern = {
  id: string
  name: string
  summary: string

  applicability: {
    country?: string[]
    institutionTypes?: string[]
    degreeLevels?: string[]
    disciplines?: string[]
    documentTypes?: string[]
    methodBias?: Array<"quantitative" | "qualitative" | "mixed" | "flexible">
    writingStyle?: Array<"chapter-based" | "imrad" | "hybrid">
    evidenceStyle?: Array<"conceptual" | "empirical" | "literature-review" | "mixed">
  }

  provenance: {
    type: "official-guideline" | "sample-derived" | "wiki-synthesized"
    confidence: "high" | "medium" | "low"
  }

  sourceRefs: Array<{
    sourceId: string
    title: string
    note?: string
  }>

  sectionTree: OutlineSection[]

  mappingHints?: MappingHint[]

  humanReadableRules: string[]
  machineConstraints: MachineConstraint[]
}

type OutlineSection = {
  id: string
  title: string
  description?: string
  required: boolean
  order: number
  children?: OutlineSection[]
}

type MappingHint = {
  sourceSectionId: string
  canonicalStage: PaperStage | null
  mappingType: "exact" | "partial" | "shared" | "unmapped"
  rationale?: string
}

type MachineConstraint =
  | { type: "shared_section"; sourceSectionId: string; stages: PaperStage[] }
  | { type: "requires_required_stage"; stage: PaperStage }
  | { type: "folds_into_stage"; sourceSectionId: string; stage: PaperStage }
  | { type: "disallow_direct_runtime_use"; reason: string }
```

## Kenapa `mappingHints` Diperlukan

Registry tidak cukup hanya menyimpan section tree dan metadata bebas. Compiler butuh clue tentang:

- apakah `Latar Belakang` lebih dekat ke `pendahuluan`
- apakah `Hasil dan Pembahasan` harus dibagi ke `hasil + diskusi`
- apakah `Penutup` kemungkinan besar partial ke `kesimpulan`
- apakah ada section yang memang tidak punya padanan langsung

Tanpa `mappingHints`, terlalu banyak beban reasoning jatuh ke model setiap kali compile berlangsung.

## Kenapa `machineConstraints` Diperlukan

Kalau `rules` dan `constraints` hanya berupa string bebas:

- sistem sulit memvalidasi
- sulit membandingkan pattern
- sulit menjalankan compatibility checks secara konsisten

Jadi registry harus punya dua lapisan:

- `humanReadableRules` untuk penjelasan
- `machineConstraints` untuk evaluasi dan compile

## Contoh Pattern

### Pattern A: Indonesia chapter-based klasik

```yaml
id: idn-s1-classic
name: Indonesia S1 Classic Chapters
applicability:
  country: [indonesia]
  degreeLevels: [s1]
  writingStyle: [chapter-based]
provenance:
  type: official-guideline
  confidence: high
sectionTree:
  - id: intro
    title: Pendahuluan
  - id: litreview
    title: Tinjauan Pustaka
  - id: method
    title: Metodologi
  - id: results
    title: Hasil
  - id: discussion
    title: Diskusi
  - id: conclusion
    title: Kesimpulan
mappingHints:
  - sourceSectionId: intro
    canonicalStage: pendahuluan
    mappingType: exact
  - sourceSectionId: litreview
    canonicalStage: tinjauan_literatur
    mappingType: exact
```

### Pattern B: merged results discussion

```yaml
id: idn-merged-results-discussion
name: Indonesia Merged Results Discussion
applicability:
  country: [indonesia]
  writingStyle: [hybrid]
provenance:
  type: sample-derived
  confidence: medium
sectionTree:
  - id: intro
    title: Pendahuluan
  - id: litreview
    title: Tinjauan Pustaka
  - id: method
    title: Metodologi
  - id: results_discussion
    title: Hasil dan Pembahasan
mappingHints:
  - sourceSectionId: results_discussion
    canonicalStage: hasil
    mappingType: shared
  - sourceSectionId: results_discussion
    canonicalStage: diskusi
    mappingType: shared
machineConstraints:
  - type: shared_section
    sourceSectionId: results_discussion
    stages: [hasil, diskusi]
```

### Pattern C: incompatible partial source

```yaml
id: external-narrative-minimal
name: Narrative Minimal Structure
provenance:
  type: wiki-synthesized
  confidence: low
sectionTree:
  - id: background
    title: Latar Belakang
  - id: methods
    title: Metode
  - id: closing
    title: Penutup
mappingHints:
  - sourceSectionId: background
    canonicalStage: pendahuluan
    mappingType: partial
  - sourceSectionId: methods
    canonicalStage: metodologi
    mappingType: exact
  - sourceSectionId: closing
    canonicalStage: kesimpulan
    mappingType: partial
machineConstraints:
  - type: requires_required_stage
    stage: abstrak
  - type: requires_required_stage
    stage: daftar_pustaka
```

Pattern seperti ini tidak bisa dipakai mentah; compiler harus menolak atau mengaugment.

## Registry Operations

### Ingest pattern

Flow:

- tambah raw source markdown
- model memperbarui wiki page pattern terkait
- model memperbarui `index.md`
- model menambahkan atau merevisi metadata pattern
- model atau operator meninjau `mappingHints` dan provenance

### Retrieve pattern

Flow:

- model membaca `index.md`
- memilih 2-4 candidate pattern
- membaca halaman candidate
- menentukan pattern terbaik

### Compile pattern

Flow:

- compiler membaca `mappingHints`
- compiler mengevaluasi `machineConstraints`
- compiler menghasilkan `canonical stage plan`

## Daftar File Terkait

- `docs/model-led-tool-first/llm-wiky-andrej-karpathy.md`
- `docs/model-led-tool-first/10-outline-kb-overview.md`
- `docs/model-led-tool-first/11-outline-kb-architecture.md`
- `docs/model-led-tool-first/15-outline-compiler-and-canonical-stage-plan.md`
- `docs/model-led-tool-first/16-outline-compatibility-rules.md`
- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/ai/paper-stages/**`
