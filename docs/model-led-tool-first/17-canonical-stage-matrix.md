# Canonical Stage Matrix

## Ringkasan

Dokumen ini mengunci matriks operasional untuk `canonical stages` makalahapp. Fokusnya adalah menjawab tiga hal untuk setiap stage: apakah stage ini `required` atau `optional`, apakah dia boleh `folded` di render, dan apa posisi operasionalnya dalam runtime. Matriks ini dipakai sebagai landasan untuk `outline compiler`, `canonical stage plan`, prompt, verification, dan compatibility checks.

## Detail

- **Nama**: `canonical stage matrix`
- **Peran**: Menjadi referensi final untuk status `required / optional / foldable` setiap stage canonical.
- **Alur Utama**:
  - Runtime memakai ontology stage canonical yang stabil.
  - Compiler mengecek pattern outline eksternal terhadap ontology ini.
  - Render layer boleh melakukan grouping/folding hanya pada stage yang diizinkan.
- **Dependensi**:
  - `15-outline-compiler-and-canonical-stage-plan.md`
  - `16-outline-compatibility-rules.md`
  - `19-required-stage-governance.md`
- **Catatan**:
  - `search referensi` bukan stage canonical.
  - `outline` tetap canonical karena runtime butuh artefak struktur internal yang stabil.

## Canonical Stage Set

```ts
type PaperStage =
  | "gagasan"
  | "topik"
  | "outline"
  | "pendahuluan"
  | "tinjauan_literatur"
  | "metodologi"
  | "hasil"
  | "diskusi"
  | "kesimpulan"
  | "abstrak"
  | "daftar_pustaka"
  | "lampiran"
  | "judul"
```

## Matriks

| Stage | Category | Runtime Status | Required | Foldable in Render | Notes |
| --- | --- | --- | --- | --- | --- |
| `gagasan` | foundation | explicit | yes | no | Fondasi awal ide paper |
| `topik` | foundation | explicit | yes | no | Formulasi topik final sebelum outline compile |
| `outline` | body-structure | explicit | yes | no | Menyimpan hasil compile ke canonical stage plan |
| `pendahuluan` | body | explicit | yes | no | Stage canonical inti |
| `tinjauan_literatur` | body | explicit | yes | yes | Boleh folded ke `pendahuluan` di render |
| `metodologi` | body | explicit | yes | no | Stage canonical inti |
| `hasil` | body | explicit | yes | yes | Boleh shared/folded dengan `diskusi` di render |
| `diskusi` | body | explicit | yes | yes | Boleh shared/folded dengan `hasil` di render |
| `kesimpulan` | body | explicit | yes | no | Stage canonical inti |
| `abstrak` | finalization | explicit | yes | no | Finalization-oriented, tetap canonical |
| `daftar_pustaka` | finalization | explicit | yes | no | Finalization-oriented, tetap canonical |
| `lampiran` | finalization | explicit | no | yes | Optional, boleh tidak muncul |
| `judul` | finalization | explicit | yes | no | Finalization-oriented, tetap canonical |

## Interpretasi Matriks

### `required = yes`

Artinya:

- stage harus ada di ontology runtime
- compiler harus memastikan stage tersebut terwakili
- kalau pattern eksternal tidak mencakup stage ini, compiler harus:
  - menolak, atau
  - mengaugment secara eksplisit

### `foldable in render = yes`

Artinya:

- stage tetap ada di runtime
- stage boleh tidak tampil sebagai chapter/section terpisah di presentasi final
- render layer boleh menggabungkannya dengan stage lain atau memindahkannya ke chapter lain

### `explicit`

Artinya:

- runtime selalu melacak stage ini sebagai unit workflow, persistence, revision, dan audit

## Stage Categories

### Foundation

- `gagasan`
- `topik`

Sifat:

- wajib
- tidak boleh folded
- harus selesai sebelum compile outline

### Body-structure

- `outline`

Sifat:

- wajib
- menjadi artefak struktur internal
- tidak boleh folded

### Body

- `pendahuluan`
- `tinjauan_literatur`
- `metodologi`
- `hasil`
- `diskusi`
- `kesimpulan`

Sifat:

- inti isi paper
- beberapa bisa folded di render, tetapi tetap canonical di runtime

### Finalization

- `abstrak`
- `daftar_pustaka`
- `lampiran`
- `judul`

Sifat:

- tetap canonical
- biasanya matang lebih akhir
- `lampiran` optional

## Daftar File Terkait

- `docs/model-led-tool-first/15-outline-compiler-and-canonical-stage-plan.md`
- `docs/model-led-tool-first/16-outline-compatibility-rules.md`
- `docs/model-led-tool-first/19-required-stage-governance.md`
- `docs/model-led-tool-first/06-backend-guard-and-state-machine-contract.md`
