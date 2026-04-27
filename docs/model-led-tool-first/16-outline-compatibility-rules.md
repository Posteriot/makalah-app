# Outline Compatibility Rules

## Ringkasan

Dokumen ini menetapkan aturan compatibility antara `outline pattern` eksternal dan `canonical stages` internal makalahapp. Tujuannya adalah memastikan setiap pattern outline yang dipakai model benar-benar bisa diterjemahkan ke runtime tanpa memalsukan makna stage. Dokumen ini menjadi aturan bersama untuk `outline compiler`, prompt, dan review arsitektur.

## Detail

- **Nama**: `outline compatibility rules`
- **Peran**: Menentukan kapan pattern outline bisa diterima, di-augment, atau ditolak.
- **Alur Utama**:
  - Compiler memeriksa tiap source section.
  - Compiler menentukan mapping type.
  - Compiler memeriksa required internal stages.
  - Compiler memeriksa status foldable dan explicit dari stage canonical.
  - Compiler memutuskan `exact`, `augmented`, atau `rejected`.
- **Dependensi**:
  - `outline registry`
  - `outline compiler`
  - `17-canonical-stage-matrix.md`
  - `18-compiler-rules-per-stage.md`
  - `19-required-stage-governance.md`
- **Catatan**:
  - Rule ini harus dianggap sebagai semantic contract, bukan saran prompt biasa.

## Mapping Types

### 1. Exact

Definisi:

- satu source section map langsung ke satu canonical stage dengan makna yang sama

Contoh:

- `Metodologi` -> `metodologi`
- `Kesimpulan` -> `kesimpulan`

### 2. Partial

Definisi:

- source section hanya mencakup sebagian dari canonical stage

Contoh:

- `Latar Belakang` -> bagian dari `pendahuluan`
- `Penutup` -> bagian dari `kesimpulan`

Aturan:

- canonical stage tetap harus dianggap lebih besar dari source section
- prompt dan stage skill harus melengkapi bagian canonical lain yang masih wajib

### 3. Shared

Definisi:

- satu source section mencakup lebih dari satu canonical stage

Contoh:

- `Hasil dan Pembahasan` -> `hasil` + `diskusi`

Aturan:

- runtime tidak membuat stage baru
- source section menjadi alias presentasi, bukan ontology baru

### 4. Unmapped

Definisi:

- source section tidak punya padanan yang aman ke canonical stage

Contoh:

- istilah lokal yang terlalu spesifik tanpa padanan internal
- section administratif yang tidak relevan terhadap workflow internal

Aturan:

- compiler harus menandai secara eksplisit
- pattern bisa tetap dipakai hanya jika bagian unmapped tidak merusak required stages

## Required Internal Stages

Canonical runtime harus punya daftar stage internal yang dianggap wajib.

Final canonical stage set:

- `gagasan`
- `topik`
- `outline`
- `pendahuluan`
- `tinjauan_literatur`
- `metodologi`
- `hasil`
- `diskusi`
- `kesimpulan`
- `abstrak`
- `daftar_pustaka`
- `lampiran`
- `judul`

Required canonical stages for outline compatibility:

- `outline`
- `pendahuluan`
- `tinjauan_literatur`
- `metodologi`
- `hasil`
- `diskusi`
- `kesimpulan`
- `abstrak`
- `daftar_pustaka`
- `judul`

Catatan:

- `gagasan` dan `topik` adalah prerequisite foundation, bukan hasil compile dari pattern eksternal
- `lampiran` tetap canonical, tetapi optional
- `tinjauan_literatur` required di runtime, tetapi boleh folded di render

## Compatibility Outcomes

### Exact

Syarat:

- required stages tercakup
- tidak ada unmapped critical section
- tidak ada semantic conflict besar
- folding yang terjadi tetap kompatibel dengan runtime canonical

### Augmented

Syarat:

- pattern berguna, tetapi ada required stage internal yang hilang
- compiler bisa menginjeksi stage canonical yang kurang tanpa mengubah makna pattern secara fatal

Contoh:

- source pattern tidak punya `abstrak`
- compiler menambah `abstrak` sebagai canonical stage wajib
- source pattern melipat literature context ke `pendahuluan`
- compiler tetap mempertahankan `tinjauan_literatur` sebagai stage canonical folded atau injected

### Rejected

Syarat:

- conflict terlalu besar
- terminology tidak bisa diterjemahkan secara aman
- terlalu banyak required stage hilang
- pattern menuntut ontology runtime yang berbeda

## Rule Penting

### Rule 1

External section title tidak boleh langsung menjadi stage runtime tanpa compile step.

### Rule 2

Kalau source section hanya partial terhadap stage canonical, runtime tetap harus memproses stage canonical penuh.

### Rule 3

Kalau source section shared terhadap beberapa stage canonical, persistence tetap canonical per stage.

### Rule 4

Kalau stage wajib internal hilang dari pattern, compiler harus:

- reject, atau
- augment secara eksplisit

### Rule 5

Augmentation harus selalu dicatat di `compileNotes` dan `injectedStages`.

### Rule 6

Prompt tidak boleh mengabaikan incompatibility yang sudah dinyatakan compiler.

### Rule 7

`tinjauan_literatur`, `hasil`, dan `diskusi` boleh folded atau shared di render, tetapi tidak boleh hilang dari runtime canonical.

### Rule 8

`abstrak`, `daftar_pustaka`, dan `judul` tetap canonical meskipun sering matang di fase finalization.

### Rule 9

`outline` selalu canonical dan selalu berasal dari hasil compile internal, bukan dari exact source section eksternal.

## Contoh Konflik

### Kasus: `Latar Belakang` menggantikan `Abstrak`

Status:

- incompatible

Alasan:

- `latar belakang` bukan alias dari `abstrak`
- itu dua fungsi akademik yang berbeda

Tindakan:

- reject atau augment `abstrak`

### Kasus: `Hasil dan Pembahasan`

Status:

- compatible via shared mapping

Alasan:

- dapat dipetakan ke `hasil` + `diskusi`

Tindakan:

- accepted dengan `shared` mapping

### Kasus: `Pendahuluan` tanpa `Tinjauan Literatur` terpisah

Status:

- compatible via folded or augmented mapping

Alasan:

- literature context mungkin folded ke `pendahuluan`
- tetapi `tinjauan_literatur` canonical tetap hidup di runtime

Tindakan:

- compiler menandai `tinjauan_literatur` sebagai `folded` atau mengaugment catatan canonical yang diperlukan

### Kasus: pattern tidak menyebut `judul`

Status:

- biasanya `augmented`

Alasan:

- `judul` adalah canonical finalization stage internal
- pattern outline eksternal tidak selalu menuliskannya sebagai section

Tindakan:

- compiler mempertahankan `judul` sebagai stage canonical internal

## Daftar File Terkait

- `docs/model-led-tool-first/10-outline-kb-overview.md`
- `docs/model-led-tool-first/12-outline-registry-and-pattern-schema.md`
- `docs/model-led-tool-first/13-active-outline-blueprint-and-stage-adaptation.md`
- `docs/model-led-tool-first/15-outline-compiler-and-canonical-stage-plan.md`
- `docs/model-led-tool-first/17-canonical-stage-matrix.md`
- `docs/model-led-tool-first/18-compiler-rules-per-stage.md`
- `docs/model-led-tool-first/19-required-stage-governance.md`
- `docs/model-led-tool-first/06-backend-guard-and-state-machine-contract.md`
