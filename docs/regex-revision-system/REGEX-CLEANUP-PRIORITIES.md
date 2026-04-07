# Regex Cleanup Priorities for Chat + Paper Session

## Prinsip Utama

Dokumen ini mengikuti prinsip berikut:

- jangan anti-regex secara ideologis
- jadilah anti-regex untuk language understanding
- jadilah pro-deterministic parser untuk format teknis

Artinya:

- regex yang dipakai untuk menebak niat user, konteks percakapan, atau makna bahasa natural harus dipindah keluar dari runtime user-facing
- regex yang dipakai untuk parsing format teknis, sanitization, validation, dan rendering deterministik sebaiknya dipertahankan atau dioptimalkan, bukan dihapus secara membabi buta

## Tujuan Pembersihan

Tujuan cleanup ini bukan menghapus semua regex, tetapi:

1. menghapus regex heuristic yang membuat chat terlihat sempit, kaku, dan kurang cerdas
2. menjaga parser teknis yang stabil tetap deterministik
3. mencegah model dipaksa mengikuti shortcut berbasis kata kunci saat sebenarnya model mampu memahami intent secara semantik
4. memisahkan dengan jelas decision layer vs parser layer

## Aturan Klasifikasi

### Regex yang Harus Dihapus dari Runtime User-Facing

Masuk kategori ini jika regex:

- membaca bahasa manusia untuk menentukan intent
- menentukan mode jawaban dari wording prompt user
- memutuskan apakah sistem harus recall artifact, revise, clarify, atau close
- memutuskan apakah output model dianggap valid atau bocor hanya dari phrasing permukaan
- mengubah persisted content berdasarkan deteksi kalimat natural language

### Regex yang Boleh Dipertahankan

Masuk kategori ini jika regex:

- membersihkan URL, DOI, whitespace, punctuation
- memvalidasi format ID atau token teknis
- parsing citation marker, markdown table separator, atau range angka
- menjadi parser lokal yang hasilnya deterministik
- tidak menebak intent manusia

### Regex yang Perlu Dioptimalkan, Bukan Dihapus Total

Masuk kategori ini jika regex:

- bukan intent classifier, tetapi parsing input semi-terstruktur
- masih cukup berguna, namun punya risiko salah interpretasi pada input liar
- lebih cocok dirapikan dengan helper atau fallback chain daripada diganti model

## Prioritas Cleanup

## Prioritas 0: Bekukan Penambahan Regex Heuristic Baru

Status:

- berlaku segera

Aturan:

- jangan tambah regex baru di runtime user-facing untuk membaca intent user atau maksud output model
- semua kebutuhan baru di decision layer harus lewat structured model judgment

Alasan:

- tanpa freeze, cleanup akan bocor terus oleh patch kecil yang mengulang pola lama

## Prioritas 1: Ganti Regex Decision Layer yang Paling Mengubah Workflow

File:

- `src/lib/ai/completed-session.ts`
- `src/app/api/chat/route.ts`

### 1A. `src/lib/ai/completed-session.ts`

Regex yang harus diganti:

- revision verb detection
- informational pattern
- continue-like prompt
- artifact recall display verb
- artifact/stage target detection
- question-form exclusion
- router-reason retrieval hint
- stage target resolution berbasis regex stage name

Kenapa prioritas tertinggi:

- file ini langsung memengaruhi bagaimana completed session menangani pesan user
- salah klasifikasi di sini berarti salah behavior, bukan sekadar salah tampilan

Pengganti yang direkomendasikan:

- semantic classifier terstruktur dengan output seperti:
  - `handling`
  - `reason`
  - `targetStage`
  - `needsClarification`
  - `confidence`

Contoh enum:

- `short_circuit_closing`
- `allow_normal_ai`
- `server_owned_artifact_recall`
- `clarify`

Catatan penting:

- fallback final harus `clarify` atau `allow_normal_ai`, bukan regex default

### 1B. `src/app/api/chat/route.ts`

Regex yang harus diganti:

- revision-like intent fallback
- leakage detection pada output model
- false validation claim detection
- completed-session corruption guard berbasis phrase
- fallback title extraction dari prose model jika masih mengandalkan pattern teks

Kenapa prioritas tertinggi:

- regex di file ini menyentuh persisted content dan recovery behavior
- efeknya langsung ke UX dan histori chat

Pengganti yang direkomendasikan:

- semantic router / structured verifier yang membaca:
  - `userIntent`
  - `responseIntegrity`
  - `toolChainOutcome`
  - `artifactLifecycleState`
  - `selectedTitle`

Prinsip:

- state workflow harus diputuskan dari structured state + tool result
- model prose jangan diperlakukan sebagai sumber kebenaran utama untuk lifecycle

## Prioritas 2: Ganti Regex Heuristic Follow-Up dan Mode Detection

File:

- `src/lib/ai/exact-source-followup.ts`
- `src/lib/ai/web-search/reference-presentation.ts`
- `src/lib/ai/internal-thought-separator.ts`

### 2A. `src/lib/ai/exact-source-followup.ts`

Regex yang harus diganti:

- exact-source intent detection
- non-exact summary detection
- continuation prompt detection
- source mention boundary match berbasis kata

Kenapa:

- ini membaca bahasa user, bukan format teknis
- konteks follow-up pendek sangat rentan salah baca

Pengganti:

- follow-up resolver berbasis semantic JSON:
  - `mode`
  - `matchedSourceId`
  - `needsClarification`
  - `reason`

### 2B. `src/lib/ai/web-search/reference-presentation.ts`

Regex yang harus diganti:

- `inferSearchResponseMode()` yang membaca prompt user untuk menentukan `reference_inventory`

Kenapa:

- ini decision layer yang membaca natural language
- file ini sebelumnya sudah pernah jadi sumber masalah mode presentasi yang terlalu kaku

Pengganti:

- response mode diputuskan oleh semantic router atau explicit user-facing control
- opsi output:
  - `synthesis`
  - `reference_inventory`
  - `mixed`
  - `clarify`

Yang tetap dipertahankan di file ini:

- PDF URL detection
- weak fallback title checks
- tracking param cleanup

### 2C. `src/lib/ai/internal-thought-separator.ts`

Regex yang harus diganti:

- internal-thought preamble detection berbasis phrase seperti `sebentar`, `saya akan cari`, `let me search`

Kenapa:

- itu masih language heuristic
- model bisa mengucapkan phrase serupa sebagai bagian jawaban normal

Pengganti:

- minta model mengeluarkan public answer dan internal/status channel secara terstruktur
- atau gunakan data parts yang dibedakan dari sumbernya, bukan ditebak dari text

Yang tetap dipertahankan:

- regex teknis untuk strip empty `link:` / `url:` line jika memang masih relevan sebagai cleanup

## Prioritas 3: Review Regex Heuristic Non-Critical

File:

- `src/lib/ai/paper-intent-detector.ts`
- `src/lib/ai/curated-trace.ts`
- `src/lib/ai/stage-skill-validator.ts`

### 3A. `src/lib/ai/paper-intent-detector.ts`

Status:

- bukan heavy regex file, tetapi masih heuristic language

Masalah:

- walau bukan regex-heavy, deteksi paper intent masih berbasis keyword matching
- ini tetap menahan fleksibilitas model jika dipakai terlalu awal

Rekomendasi:

- pindahkan ke semantic router
- sisakan hanya normalization teknis jika file masih diperlukan

Prioritas:

- `Medium`

### 3B. `src/lib/ai/curated-trace.ts`

Status:

- regex di sini bukan workflow-critical

Masalah:

- step trace diklasifikasikan dari keyword bucket
- hasilnya bisa misleading

Rekomendasi:

- jika ingin trace lebih akurat, minta model atau orchestrator emit step metadata secara structured
- tidak perlu diubah lebih dulu jika fokus utama adalah kecerdasan chat

Prioritas:

- `Low-Medium`

### 3C. `src/lib/ai/stage-skill-validator.ts`

Status:

- mayoritas regex di sini adalah validator statis

Masalah:

- bisa terlalu kaku terhadap format dokumen skill

Rekomendasi:

- pertahankan sebagai validator teknis untuk sekarang
- optimalkan hanya jika sering false reject saat authoring skill

Prioritas:

- `Low`

## Prioritas 4: Pertahankan Regex Parser Deterministik

File:

- `convex/paperSessions.ts`
- `convex/paperSessions/daftarPustakaCompiler.ts`
- `convex/paperSessions/stageDataWhitelist.ts`
- `src/components/chat/MarkdownRenderer.tsx`
- validator format seperti Convex ID di `ChatWindow` dan `ChatContainer`

### 4A. `convex/paperSessions.ts`

Pertahankan:

- `utm_*` cleanup
- title whitespace normalization
- year extraction
- URL extraction
- trailing punctuation cleanup
- draft prefix cleanup

Kenapa dipertahankan:

- itu parser/normalizer teknis
- deterministic
- murah dan stabil

Yang perlu dioptimalkan:

- `parseCitationString()` adalah parser semi-terstruktur, bukan pure technical validator
- tetap tidak perlu diganti model, tapi bisa dirapikan jadi helper parsing yang lebih eksplisit

Rekomendasi:

- pertahankan regex untuk token extraction
- tambah test jika format citation yang didukung bertambah

### 4B. `convex/paperSessions/daftarPustakaCompiler.ts`

Pertahankan:

- DOI normalization
- URL normalization
- key normalization
- year extraction
- weak citation detection
- URL-path to title fallback

Kenapa dipertahankan:

- ini area compile dan sanitize bibliografi
- deterministic
- tidak membaca intent manusia

Yang perlu dioptimalkan:

- fungsi helper bisa dipisah lebih tegas antara normalize, derive, dan dedup

### 4C. `convex/paperSessions/stageDataWhitelist.ts`

Pertahankan:

- range format parser `150-250`

Kenapa dipertahankan:

- parser teknis sempit
- pengganti non-regex tidak memberi nilai tambah berarti

### 4D. `src/components/chat/MarkdownRenderer.tsx`

Pertahankan:

- strip inline markdown
- citation marker detection
- table separator detection
- bare URL detection
- line ending normalization

Kenapa dipertahankan:

- ini pekerjaan parser/renderer, bukan language understanding
- renderer harus deterministik, bukan “tergantung pemahaman model”

Yang perlu dioptimalkan:

- jika ada edge case markdown yang makin rumit, pertimbangkan parser markdown lebih penuh
- tetapi jangan pindah ke model intelligence

### 4E. Convex ID / format validator

Pertahankan:

- validasi seperti `^[a-z0-9]{32}$`

Kenapa dipertahankan:

- binary constraint
- deterministic
- model tidak punya keunggulan di sini

## Matriks Keputusan

### Harus Diganti Dulu

- `src/lib/ai/completed-session.ts`
- `src/app/api/chat/route.ts` untuk semua regex heuristic yang membaca user intent atau model prose intent
- `src/lib/ai/exact-source-followup.ts`
- `src/lib/ai/web-search/reference-presentation.ts` untuk `inferSearchResponseMode`
- `src/lib/ai/internal-thought-separator.ts` untuk deteksi internal-thought berbasis wording
- `src/lib/ai/paper-intent-detector.ts` jika masih dipakai sebagai early decision gate

### Dibiarkan Sementara, Bisa Dioptimalkan Nanti

- `src/lib/ai/curated-trace.ts`
- `src/lib/ai/stage-skill-validator.ts`
- `convex/paperSessions.ts` khusus parser citation yang semi-terstruktur

### Dipertahankan

- `convex/paperSessions.ts` untuk URL/year/title cleanup
- `convex/paperSessions/daftarPustakaCompiler.ts`
- `convex/paperSessions/stageDataWhitelist.ts`
- `src/components/chat/MarkdownRenderer.tsx`
- `src/components/chat/ChatWindow.tsx` untuk Convex ID validation
- `src/components/chat/ChatContainer.tsx` untuk Convex ID validation

## Strategi Implementasi yang Direkomendasikan

## Tahap 1

- buat unified semantic router untuk concern berikut:
  - paper start intent
  - completed session handling
  - artifact recall
  - exact-source follow-up
  - reference presentation mode
  - clarify vs proceed decision

Output minimum:

- `intent`
- `subIntent`
- `targetStage`
- `targetSourceId`
- `responseMode`
- `needsClarification`
- `confidence`
- `reason`

## Tahap 2

- pindahkan call path runtime ke structured output tersebut
- ubah fallback dari regex menjadi:
  - `clarify`
  - `allow_normal_ai`
  - `state-based guard`

## Tahap 3

- hapus regex heuristic lama setelah parity test lulus
- simpan observability, tetapi baca dari structured decision dan tool outcome, bukan phrase matching

## Tahap 4

- audit parser semi-terstruktur seperti citation parsing
- rapikan jika perlu
- jangan sentuh parser yang sudah jelas dan stabil hanya demi “nol regex”

## Guardrails Agar Chat Tidak Makin Bodoh

1. Jangan ganti regex heuristic dengan prompt bebas tanpa schema.
2. Gunakan JSON / enum sempit agar model tetap bebas memahami bahasa, tapi hasilnya terstruktur.
3. Gunakan `clarify` sebagai outcome resmi saat ambigu.
4. Jangan ambil lifecycle state dari prose model jika state sudah tersedia dari tool result atau Convex state.
5. Jangan kirim parser/rendering teknis ke model.

## Kesimpulan

Rekomendasi cleanup yang sehat adalah:

- hapus regex dari semua area yang membaca bahasa manusia untuk mengambil keputusan runtime
- pertahankan regex di area parser teknis yang deterministik
- optimalkan parser semi-terstruktur seperlunya, bukan dengan pendekatan anti-regex total

Kalimat kerjanya:

- anti-regex untuk language understanding
- pro-deterministic parser untuk format teknis
- state workflow harus ditentukan oleh semantic JSON + runtime guard, bukan kata kunci
