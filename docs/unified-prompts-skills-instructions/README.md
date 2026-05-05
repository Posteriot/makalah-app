# Unified Prompts, Skills, and Instructions Docs

## Tujuan

Folder ini berisi seri dokumen kerja untuk:

- memetakan kondisi prompt architecture saat ini,
- menetapkan boundary final migrasi,
- mendefinisikan target arsitektur `src/agent/`,
- memisahkan boundary managed mirror untuk content DB-managed,
- memberi matrix, checklist, dan acuan implementasi yang konsisten.

README ini adalah **index canonical** untuk urutan baca, status tiap dokumen, dan aturan interpretasi antar dokumen.

## Prinsip Baca

Seri dokumen ini sekarang harus dibaca dengan pemisahan tegas antara:

1. **current state**
2. **target architecture**
3. **migration boundary dan execution**
4. **mirror architecture untuk DB-managed content**

Kalau empat hal itu dicampur, hasilnya pasti rancu.

## Urutan Baca yang Disarankan

### 1. Baseline current state

Baca dulu:

- `2026-04-08-as-is-state-unified-prompts-skills-instructions.md`

Fungsi:

- memetakan kondisi codebase saat ini,
- menjelaskan runtime flow dan ownership yang benar-benar ada sekarang,
- menunjukkan tegangan arsitektural yang nyata,
- memberi delta yang jelas ke arah target tanpa menyamar sebagai dokumen desain.

Catatan:

- dokumen ini harus compliant ke codebase aktual,
- dokumen ini **bukan** dokumen target.

### 2. Decision anchor

Baca berikutnya:

- `2026-04-08-decision-record-final-migration-boundaries-v1.md`

Fungsi:

- menetapkan boundary final migrasi,
- menentukan apa yang masuk `src/agent/` repo-managed layer,
- menentukan apa yang tetap canonical di DB,
- menentukan apa yang hanya boleh hidup sebagai managed mirror export,
- menjadi anchor keputusan jika ada konflik interpretasi.

### 3. Classification matrix

Baca berikutnya:

- `2026-04-08-prompt-surface-classification-matrix-v1.md`

Fungsi:

- mengklasifikasikan prompt surfaces per ownership dan migration status,
- membedakan `move asset now`, `extract contract first`, `wrap with adapter`, `export mirror`, `keep local`, dan `keep in DB`,
- menjadi jembatan antara current state dan checklist implementasi.

### 4. Target architecture

Baca berikutnya:

- `2026-04-08-unified-target-concept-prompts-skills-instructions-v1.md`

Fungsi:

- menjelaskan bentuk target `src/agent/`,
- memisahkan `src/agent/managed/` dari `src/agent/` repo-managed layer,
- menetapkan peran `prompts`, `skills`, `adapters`, `compose`, `contracts`, `registry`, dan sync boundary.

### 5. Managed mirror architecture

Baca berikutnya:

- `2026-04-09-mirror-architecture-db-admin-agent-managed-runtime-v2.md`

Fungsi:

- menjadi anchor khusus untuk mirror `DB <-> admin panel <-> src/agent/managed <-> runtime`,
- memisahkan model `system prompts` vs `stage skills`,
- menetapkan bahwa DB tetap canonical operational source,
- menetapkan bahwa mirror file bukan authority runtime.

Catatan:

- dokumen ini melengkapi target concept,
- dokumen ini **bukan** pengganti dokumen target `src/agent/` secara keseluruhan.

### 6. Implementation checklist

Baca terakhir sebelum eksekusi:

- `2026-04-08-implementation-checklist-src-agent-migration-v1.md`

Fungsi:

- menjadi checklist implementasi dan verification,
- memecah pekerjaan per phase,
- memasukkan jalur `export mirror`,
- menjaga separation antara runtime adapter work dan managed mirror work.

## Status Dokumen

### Authoritative sekarang

- `2026-04-08-as-is-state-unified-prompts-skills-instructions.md`
  Fungsi: canonical current-state baseline.
- `2026-04-08-decision-record-final-migration-boundaries-v1.md`
  Fungsi: canonical decision anchor untuk migration boundary.
- `2026-04-08-prompt-surface-classification-matrix-v1.md`
  Fungsi: canonical klasifikasi surface dan status migrasi.
- `2026-04-08-unified-target-concept-prompts-skills-instructions-v1.md`
  Fungsi: canonical target concept untuk `src/agent/`.
- `2026-04-09-mirror-architecture-db-admin-agent-managed-runtime-v2.md`
  Fungsi: canonical mirror boundary untuk DB-managed content.
- `2026-04-08-implementation-checklist-src-agent-migration-v1.md`
  Fungsi: canonical execution checklist.

### Supporting tetapi bukan anchor utama

- `2026-04-08-staged-migration-proposal-prompt-surfaces-v1.md`
  Fungsi: referensi proposal phase migrasi.
  Catatan: jangan jadikan dokumen ini anchor interpretasi kalau wording-nya bertabrakan dengan decision record, matrix, checklist, atau mirror `v2`.

### Superseded

- `2026-04-09-mirror-architecture-db-admin-agent-managed-runtime-v1.md`
  Fungsi: jejak audit dan versi awal sebelum koreksi.
  Catatan: jangan dipakai sebagai acuan implementasi utama. Pakai `v2`.

## Aturan Interpretasi

Jangan baca seri ini dengan satu ranking linear untuk semua kasus. Gunakan aturan berikut sesuai jenis pertanyaannya.

### A. Untuk pertanyaan current-state

Urutan acuan:

1. codebase aktual
2. `2026-04-08-as-is-state-unified-prompts-skills-instructions.md`
3. dokumen lain hanya sebagai konteks

### B. Untuk pertanyaan boundary final migrasi

Urutan acuan:

1. `2026-04-08-decision-record-final-migration-boundaries-v1.md`
2. `2026-04-09-mirror-architecture-db-admin-agent-managed-runtime-v2.md` untuk boundary managed mirror
3. `2026-04-08-prompt-surface-classification-matrix-v1.md`
4. `2026-04-08-unified-target-concept-prompts-skills-instructions-v1.md`
5. `2026-04-08-implementation-checklist-src-agent-migration-v1.md`

### C. Untuk pertanyaan execution dan verification

Urutan acuan:

1. `2026-04-08-implementation-checklist-src-agent-migration-v1.md`
2. `2026-04-08-decision-record-final-migration-boundaries-v1.md`
3. `2026-04-09-mirror-architecture-db-admin-agent-managed-runtime-v2.md`
4. `2026-04-08-prompt-surface-classification-matrix-v1.md`

Catatan penting:

- `as-is-state` tidak boleh dipakai untuk menimpa target design,
- checklist tidak boleh dipakai untuk menimpa boundary,
- mirror `v2` tidak boleh dipakai untuk menulis ulang current-state seolah sudah terimplementasi,
- proposal migrasi tidak boleh dipakai untuk menimpa dokumen yang lebih baru dan lebih authoritative,
- dokumen superseded hanya berguna sebagai jejak audit.

## Ringkasan Peran Tiap Dokumen

- `as-is-state`: snapshot kondisi saat ini + tegangan arsitektural + delta ke target
- `decision-record`: boundary final migrasi
- `classification-matrix`: klasifikasi surface per ownership dan status
- `unified-target-concept`: bentuk arsitektur target `src/agent/`
- `mirror-architecture-v2`: boundary khusus mirror untuk content DB-managed
- `implementation-checklist`: checklist kerja dan verifikasi
- `staged-migration-proposal`: referensi proposal phase, bukan anchor utama
- `mirror-architecture-v1`: versi lama yang sudah disupersede

## Aturan Pakai

1. Jangan mulai implementasi dari checklist tanpa membaca `as-is-state`, `decision-record`, dan `mirror-architecture-v2`.
2. Jangan menyamakan `src/agent/managed/` dengan source of truth runtime.
3. Jangan menyamakan model `system prompts` dengan model `stage skills`.
4. Jangan memaksa `style constitutions` ikut scope mirror awal kalau belum ada keputusan eksplisit baru.
5. Jangan turunkan ulang boundary migrasi dari nol selama decision record belum berubah.

## Status Folder

- Folder owner: seri dokumen migrasi prompt architecture dan managed mirror `src/agent/`
- Current decision anchor: `2026-04-08-decision-record-final-migration-boundaries-v1.md`
- Current mirror anchor: `2026-04-09-mirror-architecture-db-admin-agent-managed-runtime-v2.md`
