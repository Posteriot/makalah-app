# Unified Prompts, Skills, and Instructions Docs

## Tujuan

Folder ini berisi dokumen kerja untuk audit, boundary, konsep target, dan rencana migrasi prompt architecture ke `src/agent/`.

README ini dipakai sebagai index urutan baca supaya implementasi tidak mulai dari dokumen yang salah.

## Urutan Baca yang Disarankan

### 1. Decision anchor

Baca dulu:

- `2026-04-08-decision-record-final-migration-boundaries-v1.md`

Fungsi:

- menetapkan boundary final migrasi,
- menentukan apa yang masuk `src/agent/`,
- menentukan apa yang tetap di DB atau tetap lokal,
- menjadi sumber keputusan final jika ada konflik interpretasi antar dokumen lain.

### 2. Baseline kondisi saat ini

Baca setelah itu:

- `2026-04-08-as-is-state-unified-prompts-skills-instructions.md`

Fungsi:

- memetakan keadaan runtime saat ini,
- menunjukkan ownership, coupling, dan source of truth,
- menjelaskan kenapa migrasi ini bukan sekadar pindah file.

### 3. Klasifikasi surface

Baca berikutnya:

- `2026-04-08-prompt-surface-classification-matrix-v1.md`

Fungsi:

- mengklasifikasikan prompt surfaces,
- memberi status `move asset now`, `extract contract first`, `wrap with adapter`, `keep local`, dan `keep in DB`.

### 4. Konsep target

Baca berikutnya:

- `2026-04-08-unified-target-concept-prompts-skills-instructions-v1.md`

Fungsi:

- menjelaskan bentuk arsitektur target,
- menetapkan peran `prompts`, `skills`, `adapters`, `compose`, `contracts`, dan `registry`.

### 5. Proposal migrasi bertahap

Baca berikutnya:

- `2026-04-08-staged-migration-proposal-prompt-surfaces-v1.md`

Fungsi:

- menerjemahkan klasifikasi menjadi phase implementasi,
- menentukan urutan kerja yang aman,
- membedakan asset pure dari surface hybrid.

### 6. Checklist implementasi

Baca terakhir sebelum mulai eksekusi:

- `2026-04-08-implementation-checklist-src-agent-migration-v1.md`

Fungsi:

- menjadi checklist kerja implementasi,
- menjadi checklist verification dan parity,
- menjadi definition of done untuk migrasi.

## Ringkasan Peran Dokumen

- `decision-record`: keputusan final
- `as-is-state`: peta kondisi sekarang
- `classification-matrix`: klasifikasi semua surface
- `unified-target-concept`: bentuk arsitektur target
- `staged-migration-proposal`: rencana migrasi bertahap
- `implementation-checklist`: checklist eksekusi dan verifikasi

## Current Canonical Set

### Authoritative

- `2026-04-08-decision-record-final-migration-boundaries-v1.md`
  Fungsi: source of truth untuk boundary final migrasi dan aturan interpretasi.
- `2026-04-08-implementation-checklist-src-agent-migration-v1.md`
  Fungsi: source of truth untuk urutan eksekusi, verification, dan definition of done.

### Supporting Reference

- `2026-04-08-as-is-state-unified-prompts-skills-instructions.md`
  Fungsi: baseline kondisi runtime dan coupling saat ini.
- `2026-04-08-prompt-surface-classification-matrix-v1.md`
  Fungsi: klasifikasi surface per status migrasi.
- `2026-04-08-unified-target-concept-prompts-skills-instructions-v1.md`
  Fungsi: gambaran bentuk arsitektur target.
- `2026-04-08-staged-migration-proposal-prompt-surfaces-v1.md`
  Fungsi: penjabaran phase migrasi berdasarkan classification matrix.

Aturan:

- kalau ada konflik, dokumen `Authoritative` menang,
- dokumen `Supporting Reference` dipakai untuk konteks, alasan, dan detail penjabaran.

## Aturan Pakai

1. Kalau ada konflik interpretasi, ikuti `decision-record`.
2. Jangan mulai implementasi dari checklist tanpa membaca `decision-record` dan `as-is-state`.
3. Jangan menurunkan ulang boundary migrasi dari nol selama decision-record belum diubah.

## Status

- Folder owner: migrasi `src/agent/`
- Decision anchor aktif: `2026-04-08-decision-record-final-migration-boundaries-v1.md`
