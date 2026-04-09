# Decision Record: Final Migration Boundaries

## Tujuan

Dokumen ini menetapkan boundary final untuk migrasi prompt, skill, hardcoded instructions, dan managed mirror ke arsitektur target `src/agent/`.

Fungsi dokumen ini adalah menjadi keputusan kerja yang stabil supaya implementasi berikutnya tidak mengulang debat dasar tentang:

- apa yang masuk `src/agent/` repo-managed layer,
- apa yang tetap canonical di DB,
- apa yang hanya boleh hidup sebagai mirror export,
- apa yang tetap lokal,
- apa yang harus dipecah dulu sebelum dipindah.

Dokumen ini harus dibaca konsisten dengan:

- `docs/unified-prompts-skills-instructions/2026-04-08-unified-target-concept-prompts-skills-instructions-v1.md`
- `docs/unified-prompts-skills-instructions/2026-04-09-mirror-architecture-db-admin-agent-managed-runtime-v2.md`

## Keputusan Inti

Keputusan finalnya adalah:

**`src/agent/` dipakai sebagai pusat contracts, prompt assets, skills, adapters, registry, compose layer, dan managed mirror boundary, tetapi tidak menjadi tempat semua file yang kebetulan mengandung string instruksi dan tidak menjadi source of truth baru untuk content yang memang DB-managed.**

Artinya:

- source of truth DB-managed tetap di DB,
- prompt assets yang pure boleh dipindah,
- surface hybrid harus masuk jalur `extract contract first`,
- managed mirror boleh hidup di `src/agent/managed/`, tetapi tidak menjadi authority runtime,
- utility prompts, verification prompts, dan migration assets tetap di domainnya masing-masing.

## Boundary Final

### 1. Masuk `src/agent/` sekarang

Kategori ini memakai status `move asset now`.

Contoh:

- fallback stage instructions,
- paper workflow reminder,
- search retriever prompt,
- search user augmentation hints,
- search compose phase directive,
- web search quality skill,
- choice card YAML prompt,
- exact-source rules strings,
- source provenance rules,
- compaction prompts,
- inline runtime notes yang cukup bersih seperti search router prompt dan attachment note.

Aturan:

- yang dipindah adalah asset text atau skill file-based,
- caller boleh tetap lokal sementara,
- behavior runtime tidak boleh berubah.

### 2. Masuk `src/agent/`, tapi harus dipecah dulu

Kategori ini memakai status `extract contract first`.

Contoh:

- `src/lib/ai/chat-config.ts` untuk fallback prompt yang masih bercampur dengan alert logging,
- `src/lib/ai/paper-mode-prompt.ts`,
- `src/lib/ai/search-results-context.ts`,
- `src/lib/chat/choice-request.ts`,
- `src/lib/ai/paper-tools.ts`,
- `src/app/api/chat/route.ts` untuk tool descriptions inline,
- `src/lib/refrasa/prompt-builder.ts`.

Aturan:

- jangan pindahkan seluruh file apa adanya,
- pisahkan dulu `text contract` dari runtime logic,
- hanya hasil ekstraksi contract yang masuk ke `src/agent/prompts/` atau `src/agent/compose/`,
- validation, heuristics, query logic, execute contract, dan resolver behavior tetap di domain yang tepat.

### 3. Tetap canonical di DB, akses runtime dibungkus adapter

Kategori ini memakai status `wrap with adapter`.

Contoh:

- global active system prompt,
- active stage skills,
- active style constitutions.

Aturan:

- source of truth tetap di Convex,
- adapter harus tipis,
- adapter tidak boleh membuat fallback liar,
- adapter tidak boleh membuat shadow state atau source of truth baru.

### 4. Boleh punya managed mirror export di `src/agent/managed/`

Kategori ini memakai status `export mirror`.

Scope awal yang diputuskan eksplisit:

- `system prompts`,
- `stage skills`.

Aturan:

- mirror hanya berisi exported snapshot dari content canonical di DB,
- mirror dipakai untuk diff git, audit, dokumentasi, dan explicit sync,
- mirror tidak menjadi authority runtime,
- mirror tidak boleh diperlakukan sebagai persistence source baru,
- sync pipeline `system prompts` dan `stage skills` harus dipisah karena model datanya berbeda.

Catatan:

- `system prompts` punya version chain + `isActive`,
- `stage skills` punya catalog row + per-version lifecycle `draft/published/active/archived`,
- jangan samakan dua model ini dalam satu importer generik.

### 5. Tetap lokal

Kategori ini memakai status `keep local`.

Contoh:

- title generation prompt,
- OCR extraction instruction,
- admin provider validation prompt,
- admin model compatibility verification prompts,
- completed-session domain copy,
- exact-source followup heuristics,
- attachment health classifier.

Aturan:

- jangan dipaksa masuk `src/agent/`,
- cukup didokumentasikan dalam inventaris,
- kalau perlu rapikan, rapikan di domain lokalnya sendiri.

### 6. Tetap di jalur migrations atau ops

Kategori ini memakai status `keep in DB`.

Contoh:

- system prompt seed template,
- system prompt deployment or update templates,
- stage skill migration templates.

Aturan:

- tetap di `convex/migrations/`,
- tidak diregistrasikan sebagai runtime prompt asset utama,
- diperlakukan sebagai histori dan artefak operasional.

## Aturan Implementasi yang Tidak Boleh Dilanggar

1. Jangan buat dual source of truth baru.
2. Jangan memindahkan DB-managed content ke file static sebagai authority baru.
3. Jangan memindahkan surface hybrid tanpa pemisahan contract.
4. Jangan menjadikan `src/agent/` dump folder baru.
5. Jangan menjadikan `src/agent/managed/` authority runtime.
6. Jangan menyamakan lifecycle `system prompt` dengan lifecycle `stage skill`.
7. Jangan mengubah precedence runtime tanpa verification parity.

## Aturan Verification

Migrasi tidak boleh dianggap selesai hanya karena:

- lint lolos,
- typecheck lolos,
- import path sudah pindah,
- file mirror baru sudah muncul.

Migrasi baru dianggap valid jika:

- parity behavior tetap sama,
- urutan message stack tetap konsisten,
- tool description contract tetap memberi sequencing yang sama,
- search compose precedence tetap sama,
- stage skill resolution dan fallback behavior tetap sama,
- managed mirror tidak mengubah authority runtime,
- sync `system prompts` dan `stage skills` menjaga model data masing-masing.

## Non-Goals

Hal-hal berikut bukan tujuan migrasi ini:

- memindahkan semua prompt di repo ke `src/agent/`,
- menghapus DB sebagai source of truth operasional,
- menjadikan file mirror sebagai authority baru,
- meratakan semua subdomain prompt menjadi satu builder raksasa,
- menggabungkan utility prompts dengan agent prompt architecture,
- mengubah behavior user-facing hanya demi kerapian folder.

## Rekomendasi Kerja Final

Urutan kerja final yang harus diikuti:

1. pindahkan asset yang pure,
2. bungkus DB-managed surface dengan adapter,
3. tetapkan boundary managed mirror untuk `system prompts` dan `stage skills`,
4. pecah surface hybrid menjadi contract text dan runtime logic,
5. pusatkan composition dan precedence,
6. verifikasi parity sebelum lanjut ke phase berikutnya.

## Status Keputusan

- Tanggal: 8 April 2026
- Status: accepted
- Berlaku untuk: seluruh pekerjaan migrasi `src/agent/` yang berasal dari dokumen seri `unified-prompts-skills-instructions`

## Kesimpulan

Kalimat keputusan yang harus dipakai sebagai pegangan implementasi adalah:

**migrasi ini adalah pemusatan arsitektur prompt yang berbasis ownership, contracts, composition, dan managed mirror boundary, bukan sekadar operasi pindah file.**
