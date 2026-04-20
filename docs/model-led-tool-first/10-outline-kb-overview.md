# Outline Knowledge Base Overview

## Ringkasan

Dokumen ini menjelaskan posisi baru `outline knowledge base` dalam arsitektur makalahapp. Inti paradigmannya sekarang lebih ketat: dokumen outline dari knowledge base tidak boleh dipakai mentah-mentah sebagai struktur runtime. Outline knowledge base adalah `external structural reference` yang harus dibaca model, lalu dikompilasi ke `canonical stage plan` yang tetap memakai ontology stage internal makalahapp. Dengan cara ini, variasi outline kampus/negara tetap bisa dimanfaatkan, tetapi runtime tidak kehilangan konsistensi karena semua eksekusi tetap berjalan di atas `canonical stages`.

## Detail

- **Nama**: `outline knowledge base`
- **Peran**: Menyediakan referensi struktur akademik eksternal sebelum model menyusun `canonical stage plan`.
- **Alur Utama**:
  - User dan model menyelesaikan `gagasan`.
  - Model melakukan `search referensi`.
  - User dan model menyelesaikan `topik`.
  - Model membaca `outline knowledge base` melalui `index.md` dan halaman pattern yang relevan.
  - Sistem mengompilasi pattern yang dipilih ke `canonical stage plan`.
  - Runtime dan stage skill hanya bekerja memakai `canonical stage plan`, bukan terminologi outline eksternal mentah.
- **Dependensi**:
  - Dokumen `LLM Wiki` sebagai pola knowledge base markdown yang dipelihara model.
  - Dokumen `03-control-plane-vs-domain-actions-mapping.md`.
  - Dokumen `05-domain-tools-catalog.md`.
  - Dokumen `08-design-doc.md`.
  - Dokumen `15-outline-compiler-and-canonical-stage-plan.md`.
- **Catatan**:
  - `outline knowledge base` bukan raw RAG folder.
  - Markdown yang dibaca model sebaiknya adalah `compiled wiki layer`, bukan hanya kumpulan template mentah.
  - Outline knowledge base tidak menentukan ontology runtime; dia hanya memberi bahan referensi untuk compiler.

## Perubahan Paradigma

### Paradigma lama yang sekarang ditolak

- outline eksternal dapat menjadi struktur aktif runtime
- stage menyesuaikan diri langsung ke istilah outline
- `active outline blueprint` dapat hidup sejajar dengan ontology stage internal

Masalah:

- istilah outline bisa bertabrakan dengan stage canonical
- workflow, validation, dan persistence jadi ambigu
- model bisa salah menganggap section eksternal sebagai stage internal

### Paradigma baru yang dipakai

- outline eksternal dibaca sebagai referensi
- compiler menerjemahkan outline ke stage canonical
- runtime hanya memahami `canonical stages`

Formula yang benar:

`outline KB -> compiler/normalizer -> canonical stage plan -> runtime`

## Tiga Layer Outline Knowledge Base

### 1. Raw sources

Isi:

- panduan kampus
- contoh outline skripsi/tesis
- pedoman jurnal
- aturan metodologi per institusi

Sifat:

- immutable
- source of truth
- dipakai untuk ingest, verifikasi, atau audit

### 2. Outline wiki

Isi:

- ringkasan pattern outline
- perbandingan antar gaya outline
- constraint wajib
- pengecualian
- variasi kampus/negara/metode
- rekomendasi penggunaan

Sifat:

- markdown yang dipelihara model
- dibaca model sebelum memilih pattern outline
- tetap berada pada level external schema, belum menjadi bahasa runtime

### 3. Schema

Isi:

- aturan ingest dokumen outline baru
- aturan memelihara index dan log
- aturan memilih pattern outline
- aturan kompilasi ke canonical stages

Sifat:

- operational doctrine untuk model maintainer

## Prinsip Utama

1. Outline harus fleksibel, tapi tidak boleh mengubah ontology runtime secara langsung.
2. Semua outline dari knowledge base harus dikompilasi ke `canonical stages`.
3. Stage internal makalahapp tetap menjadi satu-satunya bahasa runtime.
4. Model boleh memilih pattern outline, tetapi tidak boleh langsung menjalankan runtime memakai istilah pattern eksternal.
5. Kalau pattern outline tidak compatible, compiler harus menolak atau mengaugment pattern tersebut secara eksplisit.

## Posisi Stage

Dengan paradigma ini:

- `stage` tetap menjadi representasi canonical struktur dokumen internal
- `outline KB` menyediakan variasi presentasi, pengelompokan, dan penekanan
- compiler menyelaraskan variasi tersebut ke stage canonical

Contoh:

- `Hasil dan Pembahasan` dari sumber eksternal tidak menjadi stage baru
- compiler memetakannya ke stage canonical `hasil` + `diskusi`

## Hubungan dengan Model-Led Tool-First

- `model-led` tetap berlaku:
  - model memilih pattern outline
  - model memilih kapan membaca knowledge base
  - model memilih kapan meminta kompilasi
- `tool-first` tetap berlaku:
  - retrieve, compare, dan compile outline dilakukan lewat tool eksplisit
- `backend guard` tetap berlaku:
  - legality workflow dan status stage tetap ditentukan oleh canonical runtime

## Daftar File Terkait

- `docs/model-led-tool-first/llm-wiky-andrej-karpathy.md`
- `docs/model-led-tool-first/03-control-plane-vs-domain-actions-mapping.md`
- `docs/model-led-tool-first/05-domain-tools-catalog.md`
- `docs/model-led-tool-first/08-design-doc.md`
- `docs/model-led-tool-first/15-outline-compiler-and-canonical-stage-plan.md`
- `docs/model-led-tool-first/16-outline-compatibility-rules.md`
