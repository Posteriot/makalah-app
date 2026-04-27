# Required Stage Governance

## Ringkasan

Dokumen ini menetapkan governance untuk daftar `required stages for outline compatibility`. Fokusnya adalah menjawab satu pertanyaan yang sangat penting untuk arsitektur `outline knowledge base`: siapa yang berhak menentukan stage mana yang wajib ada dalam `canonical stage plan`, atas dasar apa keputusan itu diambil, dan bagaimana perubahan daftar stage wajib mempengaruhi compiler, compatibility outcomes, prompt, dan verification. Tujuannya adalah mencegah daftar `required stages` berubah diam-diam lewat prompt, preference model, atau kebiasaan outline tertentu.

## Detail

- **Nama**: `required stage governance`
- **Peran**: Menjadi aturan pengambilan keputusan atas daftar `required stages`.
- **Alur Utama**:
  - Tentukan ontology stage canonical.
  - Tentukan stage mana yang `required`, `optional`, atau `foldable`.
  - Gunakan keputusan ini sebagai input resmi untuk compiler dan compatibility rules.
  - Jika daftar berubah, lakukan update terkoordinasi ke dokumen, compiler, prompt, verification, dan tests.
- **Dependensi**:
  - `17-canonical-stage-matrix.md`
  - `18-compiler-rules-per-stage.md`
  - `16-outline-compatibility-rules.md`
- **Catatan**:
  - Keputusan ini tidak boleh tersebar di banyak file tanpa sumber kebenaran tunggal.

## Prinsip Governance

### 1. Required stage adalah keputusan produk + arsitektur, bukan keputusan prompt

Daftar `required stages` tidak boleh ditentukan oleh:

- prompt stage tertentu
- preference model
- pattern outline eksternal
- kebiasaan satu kampus tertentu

Daftar ini harus diperlakukan sebagai:

- keputusan desain produk
- keputusan ontology runtime
- kontrak arsitektur

### 2. Outline knowledge base tidak menentukan stage wajib

Pattern outline eksternal hanya memberi referensi struktur.

Dia tidak berwenang:

- menghapus stage canonical wajib
- menurunkan stage wajib menjadi optional
- mengubah ontology runtime

Kalau pattern bertabrakan, compiler yang harus:

- mengaugment, atau
- reject

### 3. Compiler wajib tunduk ke matriks canonical

`outline compiler` tidak boleh punya definisi sendiri tentang stage wajib.

Sumber kebenaran yang benar:

1. ontology canonical stages
2. canonical stage matrix
3. compatibility rules

## Siapa yang Menentukan Daftar Required Stages

### Otoritas utama

Daftar `required stages` harus ditentukan oleh:

- keputusan desain sistem makalahapp
- berdasarkan kebutuhan dokumen final yang ingin dijamin oleh produk

Secara praktik, keputusan ini harus hidup di dokumen arsitektur dan kemudian diturunkan ke kode.

### Otoritas turunan

Setelah keputusan dibuat, komponen berikut wajib mengikutinya:

- `outline compiler`
- `compatibility evaluator`
- `prompt doctrine`
- `verification rules`
- `render/composition layer`

### Yang tidak boleh menentukan sendiri

- stage skill
- individual tool wrappers
- one-off migration scripts
- knowledge base pattern pages

## Kriteria Menentukan Stage Itu Required

Sebuah stage canonical layak menjadi `required` kalau memenuhi paling tidak satu dari kondisi berikut:

### A. Stage itu bagian wajib dari kontrak produk

Contoh:

- `outline`
- `pendahuluan`
- `metodologi`
- `hasil`
- `diskusi`
- `kesimpulan`

### B. Stage itu dibutuhkan untuk kejujuran workflow dan audit

Contoh:

- `outline` harus ada karena runtime butuh artefak struktur internal
- `judul` harus ada karena final paper butuh identitas judul final

### C. Stage itu dibutuhkan untuk verifikasi dan render akhir

Contoh:

- `abstrak`
- `daftar_pustaka`

### D. Stage itu bukan sekadar presentational alias

Contoh:

- `hasil` dan `diskusi` boleh digabung di render, tetapi tetap dua stage canonical yang berbeda karena fungsi semantiknya berbeda

## Kriteria Menentukan Stage Itu Optional

Stage canonical bisa `optional` kalau:

- ketiadaannya tidak membuat kontrak produk inti rusak
- dia tidak wajib untuk semua paper
- dia tidak dibutuhkan untuk menjaga honesty dari compile/runtime

Contoh saat ini:

- `lampiran`

## Kriteria Menentukan Stage Itu Foldable

Stage boleh `foldable` kalau:

- dia tetap dibutuhkan di runtime
- tapi representasinya tidak harus muncul sebagai chapter/section terpisah di render final

Contoh:

- `tinjauan_literatur`
- `hasil`
- `diskusi`

## Daftar Current Decisions

Berdasarkan dokumen saat ini:

### Required canonical stages

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

### Foundation prerequisites

- `gagasan`
- `topik`

### Optional canonical stages

- `lampiran`

### Required but foldable

- `tinjauan_literatur`
- `hasil`
- `diskusi`

## Dampak Kalau Daftar Required Stages Berubah

Kalau satu stage dipindah dari `required` ke `optional`, atau sebaliknya, dampaknya tidak kecil.

Area yang harus ikut diubah:

1. `17-canonical-stage-matrix.md`
2. `18-compiler-rules-per-stage.md`
3. `16-outline-compatibility-rules.md`
4. `15-outline-compiler-and-canonical-stage-plan.md`
5. prompt doctrine
6. verification logic
7. tests untuk compiler dan compatibility

Jadi perubahan daftar ini harus diperlakukan sebagai perubahan arsitektur, bukan tweak kecil.

## Change Control Rule

Kalau ingin mengubah daftar `required stages`, lakukan urutan ini:

1. Ubah dokumen governance ini.
2. Ubah canonical stage matrix.
3. Ubah compiler rules per stage.
4. Ubah compatibility rules.
5. Ubah design doc/implementation plan bila perlu.
6. Baru turunkan ke kode.

## Rekomendasi Terbaik Saat Ini

Dengan konteks makalahapp sekarang, rekomendasi terbaik tetap:

- pertahankan `outline`, `pendahuluan`, `tinjauan_literatur`, `metodologi`, `hasil`, `diskusi`, `kesimpulan`, `abstrak`, `daftar_pustaka`, dan `judul` sebagai `required canonical stages`
- pertahankan `lampiran` sebagai optional
- perlakukan `gagasan` dan `topik` sebagai foundation prerequisites, bukan hasil compile

Alasan:

- keputusan ini paling stabil untuk compiler
- paling jujur terhadap ontology runtime
- masih cukup fleksibel untuk pattern outline eksternal yang beragam

## Daftar File Terkait

- `docs/model-led-tool-first/16-outline-compatibility-rules.md`
- `docs/model-led-tool-first/17-canonical-stage-matrix.md`
- `docs/model-led-tool-first/18-compiler-rules-per-stage.md`
- `docs/model-led-tool-first/15-outline-compiler-and-canonical-stage-plan.md`
- `docs/model-led-tool-first/08-design-doc.md`
