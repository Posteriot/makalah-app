# Outline Knowledge Base vs Base Model-Led Tool-First

## Ringkasan

Dokumen ini membandingkan dua lapisan desain yang sekarang ada di folder ini. Track pertama adalah `base model-led tool-first`, yang fokus pada penipisan harness, pemindahan domain actions ke tools, dan penguatan backend guard. Track kedua adalah `outline knowledge base`, yang kini diposisikan ulang sebagai `external structural reference` yang harus dikompilasi ke `canonical stages`. Dokumen ini penting supaya dua perubahan besar ini tidak tercampur: refactor boundary runtime dan enrichment struktur outline.

## Detail

- **Nama**: perbandingan `base model-led` vs `outline knowledge base`
- **Peran**: Menjelaskan mana yang menjadi fondasi runtime dan mana yang menjadi extension struktural.
- **Alur Utama**:
  - `base model-led` memperbaiki boundary runtime.
  - `outline knowledge base` memperluas variasi struktur akademik tanpa mengubah ontology runtime.
- **Dependensi**:
  - Dokumen `00-09`.
  - Dokumen `10-16`.
- **Catatan**:
  - Outline knowledge base tidak menggantikan refactor harness.
  - Outline knowledge base juga tidak menggantikan stage canonical.
  - Extension ini hanya aman kalau selalu berujung ke `canonical stage plan`.

## Perbandingan Fokus

| Area | Base Model-Led Tool-First | Outline Knowledge Base |
| --- | --- | --- |
| Masalah utama | Model terlalu diarahkan harness/policy | Struktur akademik sumber eksternal beragam |
| Tujuan utama | Pindahkan domain actions ke tools | Manfaatkan variasi outline tanpa merusak stage canonical |
| Fokus lapisan | Control plane, tools, backend guard | External patterns, compiler, canonical stage plan |
| Objek inti | Domain tools | Outline patterns |
| Objek baru penting | `getStageCapabilities` | `compileOutlineToCanonicalPlan` |
| Risiko utama | Policy choreography masih tersisa | Outline eksternal bertabrakan dengan stage internal |

## Apa yang Tetap Sama

Pada kedua model:

- harness tetap ada
- backend guard tetap keras
- verification tetap penting
- model menjadi decision maker domain
- prompt tidak boleh jadi state machine tersembunyi
- runtime tetap bekerja memakai ontology internal

## Apa yang Baru karena Outline Knowledge Base

Tambahan baru:

- `outline registry`
- `outline wiki`
- `outline compiler`
- `canonical stage plan`
- `compatibility evaluator`
- `composition layer`

Perubahan konseptual:

- outline eksternal tidak lagi dianggap sebagai blueprint runtime langsung
- semua variasi struktur harus melalui compile step
- stage canonical tetap menjadi representasi struktur dokumen internal

## Risiko Kalau Hanya Ambil Salah Satunya

### Hanya refactor model-led tanpa outline knowledge base

Hasil:

- model lebih bebas memilih tools
- tetapi struktur akademik tetap cenderung default atau hardcoded

Risiko:

- fleksibilitas akademik terbatas

### Hanya tambah outline knowledge base tanpa refactor model-led

Hasil:

- model punya referensi outline yang lebih kaya
- tetapi runtime tetap terpenjara policy

Risiko:

- outline adaptif tidak bisa dimanfaatkan dengan natural

### Outline KB tanpa compile ke canonical stages

Hasil:

- model bisa memilih outline eksternal langsung

Risiko:

- terminology tabrakan
- workflow ambiguity
- validation dan persistence menjadi tidak jujur

## Rekomendasi Integrasi

### Urutan terbaik

1. rapikan runtime ke arah `model-led tool-first`
2. bangun `outline registry`
3. bangun `outline compiler`
4. pakai `canonical stage plan` di prompt dan stage skill

Kenapa urutan ini terbaik:

- boundary runtime lebih jelas dulu
- tool surface lebih sehat dulu
- baru extension outline masuk dalam bentuk yang kompatibel

## Keputusan Desain yang Disarankan

Yang dijadikan fondasi:

- dokumen `00-09`

Yang dijadikan extension:

- dokumen `10-16`

Artinya:

- `outline knowledge base` adalah extension architecture
- `canonical stages` tetap menjadi kernel runtime

## Daftar File Terkait

- `docs/model-led-tool-first/00-glossary-and-principles.md`
- `docs/model-led-tool-first/03-control-plane-vs-domain-actions-mapping.md`
- `docs/model-led-tool-first/05-domain-tools-catalog.md`
- `docs/model-led-tool-first/08-design-doc.md`
- `docs/model-led-tool-first/10-outline-kb-overview.md`
- `docs/model-led-tool-first/11-outline-kb-architecture.md`
- `docs/model-led-tool-first/12-outline-registry-and-pattern-schema.md`
- `docs/model-led-tool-first/13-active-outline-blueprint-and-stage-adaptation.md`
- `docs/model-led-tool-first/15-outline-compiler-and-canonical-stage-plan.md`
- `docs/model-led-tool-first/16-outline-compatibility-rules.md`
- `docs/model-led-tool-first/llm-wiky-andrej-karpathy.md`
