# Incremental Runtime Test Checklist

Checklist manual verification untuk fitur incremental save agent harness pada paper mode.
Dokumen ini fokus ke 3 area paling riskan:

1. Incremental save berjalan benar di `gagasan` dan `topik`
2. Exact-source routing tetap menang penuh
3. Failover primary ke fallback tidak reuse incremental state lama

## Scope

Feature yang diuji:

- `saveStageDraft`
- `buildIncrementalSavePrepareStep()`
- hard-gate `draftSaveGate`
- exact-source priority
- fallback safety saat primary gagal

File runtime utama:

- `src/app/api/chat/route.ts`
- `src/lib/ai/paper-tools.ts`
- `src/lib/ai/incremental-save-harness.ts`
- `src/lib/ai/paper-mode-prompt.ts`

## Preflight

Pastikan sebelum test:

- Dev server jalan
- Convex dev jalan
- Lo pakai branch worktree `feature/plan-task-queue-components`
- Console server bisa dilihat
- UI empty state paper mode bisa diakses
- Lo bisa melihat tool call trace atau minimal console output server
- Entry flow dimulai dari UI, bukan dari prompt chat biasa

## Entry Flow Yang Dipakai

Untuk seluruh checklist ini, anggap session dimulai dari paper mode lewat empty state UI.

Langkah awal yang dipakai:

1. Buka UI empty state paper mode.
2. Klik CTA `Mulai Penyusunan Paper`.
3. Pastikan session paper aktif dan stage awal berada di `gagasan`.
4. Baru lanjut kirim prompt test di skenario-skenario berikutnya.

Referensi screenshot UI entry:

- `.worktrees/plan-task-queue-components/screenshots/Screen Shot 2026-03-30 at 21.45.42.png`

Command referensi:

```bash
npm run dev
npm run convex:dev
```

## Evidence Yang Wajib Dicatat

Capture evidence berikut untuk tiap skenario:

- prompt user yang dikirim
- tool yang terpanggil
- log server yang relevan
- perubahan progress card
- perubahan `stageData` yang terlihat di UI atau debug panel
- apakah ada artifact baru
- apakah ada submit validation

Log penting yang dicari:

- `[IncrementalSave] targetField=...`
- `[IncrementalSave] Disabled for fallback provider — avoiding stale config reuse`
- log failover provider

## Result Template

Gunakan format ini per skenario:

```text
Scenario:
Prompt:
Expected:
Observed:
Pass/Fail:
Notes:
```

## Scenario 1: Incremental Save Normal di `gagasan`

Tujuan:

- memastikan incremental save aktif hanya setelah search selesai
- memastikan urutan field `ideKasar -> analisis -> angle`
- memastikan tidak ada auto-submit

Langkah:

1. Mulai dari entry flow UI di atas sampai stage `gagasan` aktif.
2. Kirim prompt: `Gue mau bikin paper soal AI di pendidikan tinggi Indonesia.`
3. Lanjutkan dengan prompt: `Cari 3 referensi awal yang relevan dulu.`
4. Setelah search selesai, cek apakah `referensiAwal` terisi dan progress jadi `1/4`.
5. Kirim prompt diskusi: `Fokus gue ke kampus swasta dan adaptive learning.`
6. Cek apakah tool yang terpanggil adalah `saveStageDraft` dan target field `ideKasar`.
7. Cek apakah progress jadi `2/4`.
8. Kirim satu prompt lanjutan untuk mendorong analisis.
9. Cek apakah target field berikutnya `analisis` dan progress jadi `3/4`.
10. Kirim satu prompt lanjutan untuk mendorong penajaman angle.
11. Cek apakah target field berikutnya `angle` dan progress jadi `4/4`.
12. Pastikan belum ada `submitStageForValidation`.

Expected:

- search turn hanya mengisi `referensiAwal`
- turn incremental memanggil `saveStageDraft`
- urutan field tepat
- progress naik bertahap
- tidak ada auto-submit

Fail sign:

- `saveStageDraft` muncul saat turn search
- progress lompat bulk
- field urutan salah
- `submitStageForValidation` terpanggil otomatis

## Scenario 2: Mature Save Tetap Manual

Tujuan:

- memastikan setelah `4/4`, model tetap kembali ke flow mature save biasa

Langkah:

1. Lanjutkan dari akhir Scenario 1.
2. Kirim prompt yang mengarah ke finalisasi gagasan.
3. Cek apakah model memakai `updateStageData` dan `createArtifact`, bukan `saveStageDraft`.
4. Jangan beri konfirmasi approve dulu.
5. Pastikan `submitStageForValidation` belum terpanggil.
6. Baru kirim konfirmasi eksplisit dari user.
7. Cek apakah `submitStageForValidation` baru terpanggil setelah konfirmasi itu.

Expected:

- mature save tetap lewat `updateStageData`
- artifact dibuat pada turn finalisasi
- submit tetap user-initiated

Fail sign:

- `saveStageDraft` masih dipakai setelah semua field lengkap
- submit terjadi tanpa konfirmasi eksplisit

## Scenario 3: Exact-Source Harus Menang Penuh

Tujuan:

- memastikan exact-source routing mematikan incremental config, gate, dan system note

Langkah:

1. Gunakan session yang sudah punya source dari search sebelumnya.
2. Kirim exact follow-up prompt:
   `Dari sumber yang tadi, kutipkan bagian yang menjelaskan adaptive learning di konteks kampus.`
3. Cek tool yang terpanggil.
4. Cek progress card sebelum dan sesudah request.
5. Cek apakah ada log `[IncrementalSave] targetField=...`.

Expected:

- tool yang aktif `inspectSourceDocument`
- tidak ada `saveStageDraft`
- tidak ada perubahan progress
- tidak ada log incremental aktif

Fail sign:

- request exact-source tetap memunculkan incremental log
- `saveStageDraft` ikut terpanggil
- progress berubah padahal user cuma minta inspect exact source

## Scenario 4: Hard-Gate `saveStageDraft`

Tujuan:

- memastikan `saveStageDraft` tidak bisa mutate state di luar incremental mode

Langkah:

1. Uji sebelum search selesai.
2. Kirim prompt provokatif:
   `Panggil saveStageDraft sekarang untuk ideKasar.`
3. Ulangi juga saat exact-source follow-up.
4. Ulangi juga di stage non-supported seperti `outline`.
5. Cek hasil tool call dan progress card.

Expected:

- jika tool sampai terpanggil, hasilnya error:
  `saveStageDraft is only available during incremental save mode.`
- tidak ada perubahan `stageData`
- progress tidak berubah

Fail sign:

- tool sukses jalan di luar incremental mode
- progress naik di luar flow harness

## Scenario 5: Incremental Save di `topik`

Tujuan:

- memastikan scope `v1` benar untuk `topik`
- memastikan auto-persist reference field tetap tidak disentuh `saveStageDraft`

Langkah:

1. Approve `gagasan` sampai masuk stage `topik`.
2. Jika perlu, lakukan search untuk mengisi `referensiPendukung`.
3. Lanjutkan diskusi topik.
4. Cek urutan field incremental:
   `definitif -> angleSpesifik -> argumentasiKebaruan -> researchGap`
5. Cek bahwa `referensiPendukung` tidak pernah lewat `saveStageDraft`.

Expected:

- incremental aktif di `topik`
- urutan field sesuai allowlist
- `referensiPendukung` tetap auto-persist, bukan draft-save

Fail sign:

- stage `topik` tidak dapat incremental
- `referensiPendukung` ikut dipaksa via `saveStageDraft`
- urutan field tidak sesuai

## Scenario 6: Stage Di Luar Scope V1

Tujuan:

- memastikan stage selain `gagasan/topik` tidak mendapat incremental behavior

Langkah:

1. Masuk ke stage `outline` atau stage lain setelah `topik`.
2. Kirim prompt diskusi biasa.
3. Cek tool yang terpanggil dan progress behavior.

Expected:

- tidak ada `saveStageDraft`
- progress hanya berubah lewat flow biasa
- prompt model tetap pakai `updateStageData()` setelah diskusi mature

Fail sign:

- `saveStageDraft` aktif di stage non-supported
- ada log incremental di stage non-supported

## Scenario 7: Failover Non-Incremental

Tujuan:

- memastikan fallback tidak membawa state incremental saat request memang non-incremental

Setup:

- buat primary provider gagal secara sengaja di environment test

Langkah:

1. Jalankan request non-paper atau paper request yang tidak eligible incremental.
2. Trigger failover.
3. Cek log server dan tool path fallback.

Expected:

- fallback tetap menjawab
- tidak ada `saveStageDraft`
- tidak ada incremental system note
- gate tetap off

Fail sign:

- fallback memanggil `saveStageDraft` padahal request non-incremental

## Scenario 8: Failover Saat Incremental Eligible

Tujuan:

- memastikan fallback tidak reuse config incremental lama jika primary gagal

Setup:

- kondisi request harus eligible incremental
- primary provider harus gagal di request tersebut

Langkah:

1. Masuk ke kondisi `gagasan` atau `topik` yang siap incremental.
2. Trigger request yang seharusnya memanggil `saveStageDraft`.
3. Paksa primary gagal.
4. Cek log fallback dan perubahan progress.

Expected:

- ada log disable incremental untuk fallback
- fallback tidak reuse `incrementalSaveConfig`
- tidak ada double-save field yang sama
- progress tidak naik dua kali untuk satu request

Fail sign:

- field yang sama tersimpan dua kali
- fallback tetap inject incremental note
- fallback tetap memanggil `saveStageDraft`

## Quick Pass Criteria

Runtime test bisa dianggap lolos jika semua kondisi ini benar:

- `gagasan` incremental berjalan `1/4 -> 2/4 -> 3/4 -> 4/4`
- `topik` incremental berjalan sesuai allowlist
- exact-source tidak pernah memicu incremental
- hard-gate selalu blok `saveStageDraft` di luar mode incremental
- fallback tidak pernah reuse incremental state lama
- submit tetap hanya karena intent user

## File Terkait

- `src/app/api/chat/route.ts`
- `src/lib/ai/paper-tools.ts`
- `src/lib/ai/incremental-save-harness.ts`
- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/paper/task-derivation.ts`
