# Compiler Rules Per Stage

## Ringkasan

Dokumen ini menurunkan `canonical stage matrix` ke rule compiler yang lebih operasional. Tujuannya adalah memberi aturan per stage tentang bagaimana `outline compiler` harus memperlakukan setiap stage canonical saat membaca pattern outline eksternal. Dengan dokumen ini, compile step tidak lagi bergantung pada intuisi umum, tetapi pada rule yang eksplisit per stage.

## Detail

- **Nama**: `compiler rules per stage`
- **Peran**: Menjadi rulebook untuk `outline compiler` saat membangun `canonical stage plan`.
- **Alur Utama**:
  - Compiler membaca pattern eksternal.
  - Compiler mengevaluasi tiap stage canonical satu per satu.
  - Compiler menentukan `exact / partial / shared / folded / injected / missing`.
  - Compiler memutuskan accept, augment, atau reject.
- **Dependensi**:
  - `17-canonical-stage-matrix.md`
  - `15-outline-compiler-and-canonical-stage-plan.md`
  - `16-outline-compatibility-rules.md`
  - `19-required-stage-governance.md`
- **Catatan**:
  - Rule ini harus dipandang sebagai semantic compiler rules, bukan sekadar panduan prompt.

## Global Compiler Rules

1. `gagasan` dan `topik` harus sudah selesai sebelum compile dimulai.
2. Compiler selalu bekerja terhadap ontology stage canonical, bukan istilah outline eksternal mentah.
3. Jika source section tidak punya padanan yang aman, tandai sebagai `unmapped`.
4. Jika stage canonical required hilang, gunakan mode:
   - `strict` -> reject
   - `assistive` -> augment
5. Folding hanya mempengaruhi render/presentation layout, bukan keberadaan stage di runtime.

## Rule Per Stage

### `gagasan`

- Tidak berasal dari pattern outline eksternal.
- Harus sudah tersedia sebelum compile.
- Jika belum selesai, compiler tidak boleh jalan.

### `topik`

- Tidak berasal dari pattern outline eksternal.
- Harus sudah tersedia sebelum compile.
- Jika belum selesai, compiler tidak boleh jalan.

### `outline`

- Selalu dihasilkan internal oleh compiler.
- Tidak bergantung pada exact source section eksternal.
- Wajib selalu ada sebagai canonical stage.

### `pendahuluan`

- Wajib ada.
- Boleh exact dari `Pendahuluan` atau `Introduction`.
- Boleh partial dari section seperti `Latar Belakang`, `Rumusan Masalah`, `Tujuan Penelitian`.
- Tidak boleh dianggap sama dengan `abstrak`.
- Jika pattern hanya memberi partial parts, compiler harus tetap membangun stage canonical `pendahuluan` penuh.

### `tinjauan_literatur`

- Required di runtime, tetapi boleh folded di render.
- Exact jika ada section seperti `Tinjauan Pustaka` atau `Literature Review`.
- Partial atau folded jika literature context dilebur ke `Pendahuluan`.
- Jika folded, compiler harus tetap menandai stage ini hidup di runtime dengan status render `folded`.

### `metodologi`

- Wajib ada.
- Exact jika source section jelas `Metodologi` atau `Methods`.
- Boleh partial jika source section mengandung campuran teori+metode, tetapi hasil canonical tetap harus punya `metodologi`.
- Tidak boleh hilang hanya karena digabung ke chapter lain di source.

### `hasil`

- Wajib ada.
- Exact jika ada section `Hasil` atau `Results`.
- Shared jika source punya `Hasil dan Pembahasan`.
- Kalau shared, compiler harus tetap membuat `hasil` dan `diskusi` sebagai dua stage canonical terpisah.

### `diskusi`

- Wajib ada.
- Exact jika ada section `Diskusi` atau `Discussion`.
- Shared jika source punya `Hasil dan Pembahasan`.
- Tidak boleh hilang hanya karena sumber eksternal tidak memisahkan diskusi sebagai chapter sendiri.

### `kesimpulan`

- Wajib ada.
- Exact jika ada `Kesimpulan` atau `Conclusion`.
- Partial jika source memakai `Penutup`, `Closing`, atau bagian penutup gabungan.
- Jika partial, compiler tetap harus membentuk canonical `kesimpulan` utuh.

### `abstrak`

- Wajib ada.
- Exact jika source punya `Abstrak` atau `Abstract`.
- Tidak boleh dipetakan dari `Latar Belakang`, `Pendahuluan`, atau `Penutup`.
- Jika source tidak punya abstrak:
  - `strict` -> reject
  - `assistive` -> inject `abstrak`

### `daftar_pustaka`

- Wajib ada.
- Exact jika source punya `Daftar Pustaka`, `References`, atau `Bibliography`.
- Tidak boleh dianggap implied hanya karena source mengutip referensi di body.
- Jika source tidak punya section explicit:
  - `strict` -> reject
  - `assistive` -> inject `daftar_pustaka`

### `lampiran`

- Optional.
- Exact jika source punya `Lampiran` atau `Appendix`.
- Jika tidak ada, tidak perlu inject.
- Boleh folded atau absent di render.

### `judul`

- Wajib ada di runtime.
- Boleh tidak muncul sebagai section sumber di pattern outline eksternal.
- Secara umum lebih aman dianggap `assistive canonical stage` yang selalu tersedia internal.
- Jika source pattern tidak menyebut judul, compiler cukup mencatat bahwa stage ini canonical dan finalization-oriented.

## Stage Outcome Types

Untuk setiap stage compiler sebaiknya menghasilkan salah satu status:

- `exact`
- `partial`
- `shared`
- `folded`
- `injected`
- `missing`
- `unmapped`

`folded` dipakai ketika stage canonical tetap ada tetapi representasinya digabung ke section lain dalam presentasi.

## Contoh Khusus

### Pattern: `Latar Belakang`, `Metode`, `Hasil dan Pembahasan`, `Penutup`

Expected compiler result:

- `pendahuluan` -> `partial`
- `tinjauan_literatur` -> `folded` atau `injected`, tergantung mode dan ontology final
- `metodologi` -> `exact`
- `hasil` -> `shared`
- `diskusi` -> `shared`
- `kesimpulan` -> `partial`
- `abstrak` -> `injected` atau `missing`
- `daftar_pustaka` -> `injected` atau `missing`
- `judul` -> canonical internal, usually `injected-by-runtime`

## Daftar File Terkait

- `docs/model-led-tool-first/17-canonical-stage-matrix.md`
- `docs/model-led-tool-first/15-outline-compiler-and-canonical-stage-plan.md`
- `docs/model-led-tool-first/16-outline-compatibility-rules.md`
- `docs/model-led-tool-first/19-required-stage-governance.md`
