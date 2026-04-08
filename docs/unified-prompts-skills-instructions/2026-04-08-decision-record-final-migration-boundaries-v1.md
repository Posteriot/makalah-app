# Decision Record: Final Migration Boundaries

## Tujuan

Dokumen ini menetapkan boundary final untuk migrasi prompt, skill, dan hardcoded instructions ke `src/agent/`.

Fungsi dokumen ini adalah menjadi keputusan kerja yang stabil supaya implementasi berikutnya tidak mengulang debat dasar tentang:

- apa yang masuk `src/agent/`,
- apa yang tetap di DB,
- apa yang tetap lokal,
- apa yang harus dipecah dulu sebelum dipindah.

## Keputusan Inti

Keputusan finalnya adalah:

**`src/agent/` dipakai sebagai pusat contracts, prompt assets, skills, adapters, registry, dan compose layer, tetapi tidak menjadi tempat semua file yang kebetulan mengandung string instruksi.**

Artinya:

- source of truth DB-managed tetap di DB,
- prompt assets yang pure boleh dipindah,
- surface hybrid harus masuk jalur `extract contract first`,
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

- yang dipindah adalah asset text atau skill,
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
- validation, heuristics, query logic, dan execute contract tetap di domain yang tepat.

### 3. Tetap di DB, aksesnya dibungkus adapter

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

### 4. Tetap lokal

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

### 5. Tetap di jalur migrations atau ops

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
2. Jangan memindahkan DB-managed content ke file static.
3. Jangan memindahkan surface hybrid tanpa pemisahan contract.
4. Jangan menjadikan `src/agent/` dump folder baru.
5. Jangan mengubah precedence runtime tanpa verification parity.

## Aturan Verification

Migrasi tidak boleh dianggap selesai hanya karena:

- lint lolos,
- typecheck lolos,
- import path sudah pindah.

Migrasi baru dianggap valid jika:

- parity behavior tetap sama,
- urutan message stack tetap konsisten,
- tool description contract tetap memberi sequencing yang sama,
- search compose precedence tetap sama,
- stage skill resolution dan fallback behavior tetap sama.

## Non-Goals

Hal-hal berikut bukan tujuan migrasi ini:

- memindahkan semua prompt di repo ke `src/agent/`,
- menghapus DB sebagai source of truth operasional,
- meratakan semua subdomain prompt menjadi satu builder raksasa,
- menggabungkan utility prompts dengan agent prompt architecture,
- mengubah behavior user-facing hanya demi kerapian folder.

## Rekomendasi Kerja Final

Urutan kerja final yang harus diikuti:

1. pindahkan asset yang pure,
2. bungkus DB-managed surface dengan adapter,
3. pecah surface hybrid menjadi contract text dan runtime logic,
4. pusatkan composition dan precedence,
5. verifikasi parity sebelum lanjut ke phase berikutnya.

## Status Keputusan

- Tanggal: 8 April 2026
- Status: accepted
- Berlaku untuk: seluruh pekerjaan migrasi `src/agent/` yang berasal dari dokumen seri `unified-prompts-skills-instructions`

## Kesimpulan

Kalimat keputusan yang harus dipakai sebagai pegangan implementasi adalah:

**migrasi ini adalah pemusatan arsitektur prompt yang berbasis ownership, contracts, dan composition, bukan sekadar operasi pindah file.**
