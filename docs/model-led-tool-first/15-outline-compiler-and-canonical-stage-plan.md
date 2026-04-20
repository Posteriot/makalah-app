# Outline Compiler and Canonical Stage Plan

## Ringkasan

Dokumen ini mendefinisikan komponen baru yang sekarang menjadi pusat arsitektur `outline knowledge base`: `outline compiler`. Compiler bertugas membaca pattern outline eksternal dari knowledge base dan menerjemahkannya ke `canonical stage plan` yang sepenuhnya kompatibel dengan runtime makalahapp. Ini adalah lapisan yang mencegah tabrakan antara terminologi outline eksternal dan ontology stage internal.

## Detail

- **Nama**: `outline compiler`
- **Peran**: Menerjemahkan external outline schema menjadi `canonical stage plan`.
- **Alur Utama**:
  - Ambil `outline pattern` terpilih.
  - Baca `mappingHints`, `machineConstraints`, dan `sectionTree`.
  - Petakan section sumber ke stage canonical.
  - Tentukan `exact`, `partial`, `shared`, atau `unmapped`.
  - Nilai compatibility.
  - Hasilkan `canonical stage plan`.
- **Dependensi**:
  - `outline registry`
  - `compatibility rules`
  - daftar `canonical stages`
- **Catatan**:
  - Runtime tidak boleh dilewati tanpa compile step ini.

## Input Compiler

```ts
type OutlineCompilerInput = {
  pattern: OutlinePattern
  canonicalStages: PaperStage[]
  mode: "strict" | "assistive"
}
```

## Output Compiler

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

## Tugas Compiler

### 1. Normalize terminology

Contoh:

- `Latar Belakang` tidak boleh menjadi stage runtime baru
- compiler harus mengenalinya sebagai bagian dari `pendahuluan`

### 2. Detect section relationships

Contoh:

- `Hasil dan Pembahasan` harus dipecah sebagai `shared` antara `hasil` dan `diskusi`

### 3. Check required internal stages

Contoh:

- pattern eksternal mungkin tidak mencantumkan `abstrak`
- compiler harus mendeteksi ini sebagai missing required stage

### 4. Decide compatibility mode

- `exact`: semua stage canonical terwakili secara aman
- `augmented`: pattern boleh dipakai, tapi compiler harus menambahkan stage canonical yang hilang
- `rejected`: pattern terlalu bertabrakan dan tidak layak dipakai

## Strict vs Assistive

### Strict

- pattern yang tidak mencakup stage wajib ditolak
- lebih aman
- lebih kaku

### Assistive

- pattern boleh dipakai, tetapi compiler menambahkan stage canonical yang hilang
- lebih praktis
- harus audit-friendly

Rekomendasi terbaik:

- `assistive but auditable`

Artinya:

- augmentation boleh dilakukan
- tetapi `injectedStages` dan `compileNotes` harus selalu terlihat

## Contoh Compile

### Input external pattern

```yaml
sections:
  - Latar Belakang
  - Metode
  - Hasil dan Pembahasan
  - Penutup
```

### Output canonical plan

```yaml
compatible: true
compatibilityMode: augmented
requiredStages:
  - abstrak
  - pendahuluan
  - metodologi
  - hasil
  - diskusi
  - kesimpulan
  - daftar_pustaka
missingRequiredStages:
  - abstrak
  - daftar_pustaka
injectedStages:
  - abstrak
  - daftar_pustaka
stageSections:
  pendahuluan:
    sourceSections: [Latar Belakang]
    mappingType: partial
  metodologi:
    sourceSections: [Metode]
    mappingType: exact
  hasil:
    sourceSections: [Hasil dan Pembahasan]
    mappingType: shared
  diskusi:
    sourceSections: [Hasil dan Pembahasan]
    mappingType: shared
  kesimpulan:
    sourceSections: [Penutup]
    mappingType: partial
```

## Kenapa Compiler Wajib

Tanpa compiler:

- model bisa langsung mengadopsi istilah outline eksternal ke runtime
- stage bisa kehilangan makna canonical
- prompt dan state machine akan saling tabrak
- audit trail jadi tidak jujur

Dengan compiler:

- semua variasi eksternal diselaraskan dulu
- runtime tetap satu bahasa

## Daftar File Terkait

- `docs/model-led-tool-first/10-outline-kb-overview.md`
- `docs/model-led-tool-first/11-outline-kb-architecture.md`
- `docs/model-led-tool-first/12-outline-registry-and-pattern-schema.md`
- `docs/model-led-tool-first/16-outline-compatibility-rules.md`
- `docs/model-led-tool-first/06-backend-guard-and-state-machine-contract.md`
