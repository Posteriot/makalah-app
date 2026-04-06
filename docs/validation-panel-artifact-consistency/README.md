# Validation Panel Artifact Consistency Handoff

## Status Awal

- Workspace harus dimulai dari repository bersih pada branch `main`.
- Tidak ada patch aktif dari sesi sebelumnya yang boleh diasumsikan masih berlaku.
- Fokus pekerjaan adalah investigasi dan perbaikan konsistensi lifecycle `updateStageData -> createArtifact/updateArtifact -> submitStageForValidation -> validation panel render`.

## Tujuan

Memastikan pada semua stage paper yang relevan:

1. artifact terbentuk atau diperbarui dengan benar
2. validation panel muncul konsisten tanpa prompt tambahan dari user
3. assistant tidak mengklaim artifact/validation panel jika backend state belum sesuai
4. pola tool calling dan hasil state konsisten antar stage

## Fakta yang Sudah Terbukti

### 1. Validation panel pernah gagal muncul walaupun assistant mengklaim submit sudah terjadi

Kasus yang sudah dilaporkan dengan screenshot:

- `metodologi`
- `judul`
- `kesimpulan`

Pada kasus-kasus ini, terdapat laporan bahwa:

- assistant menyatakan draft/artifact sudah diajukan untuk validasi
- validation panel tidak muncul
- dalam beberapa kasus, panel baru muncul setelah prompt tambahan yang eksplisit

### 2. Ada kasus stage yang berhenti di partial save

Kasus yang sudah dilaporkan dengan screenshot dan log lokal:

- `gagasan`

Fakta dari log lokal yang diberikan:

- request kedua berada pada `stage: 'gagasan'`, `status: 'drafting'`
- ada log `[F1-F6-TEST] updateStageData`
- tidak ada log `createArtifact`
- tidak ada log `submitStageForValidation`

Ini menunjukkan bahwa pada kasus tersebut alur berhenti setelah `updateStageData`.

### 3. Frontend pernah menampilkan validation panel jika backend state/turn tertentu berhasil

Ada bukti screenshot bahwa validation panel dapat muncul pada beberapa turn tertentu setelah prompt tambahan.

Fakta yang dapat diambil:

- rendering panel di frontend pernah berhasil
- kegagalan tidak boleh langsung diasumsikan murni bug UI tanpa verifikasi state backend dan message parts

## Cakupan Stage

Stage aktif paper saat ini didefinisikan di:

- [convex/paperSessions/constants.ts](/Users/eriksupit/Desktop/makalahapp/convex/paperSessions/constants.ts)

Daftar stage:

1. `gagasan`
2. `topik`
3. `outline`
4. `abstrak`
5. `pendahuluan`
6. `tinjauan_literatur`
7. `metodologi`
8. `hasil`
9. `diskusi`
10. `kesimpulan`
11. `pembaruan_abstrak`
12. `daftar_pustaka`
13. `lampiran`
14. `judul`

## Sumber Kontrak yang Wajib Diaudit

### Backend / Route

- [src/app/api/chat/route.ts](/Users/eriksupit/Desktop/makalahapp/src/app/api/chat/route.ts)
- [src/lib/ai/paper-tools.ts](/Users/eriksupit/Desktop/makalahapp/src/lib/ai/paper-tools.ts)
- [convex/paperSessions.ts](/Users/eriksupit/Desktop/makalahapp/convex/paperSessions.ts)
- [convex/artifacts.ts](/Users/eriksupit/Desktop/makalahapp/convex/artifacts.ts)

### Prompt / Stage Instructions

- [src/lib/ai/paper-mode-prompt.ts](/Users/eriksupit/Desktop/makalahapp/src/lib/ai/paper-mode-prompt.ts)
- [src/lib/ai/paper-stages/foundation.ts](/Users/eriksupit/Desktop/makalahapp/src/lib/ai/paper-stages/foundation.ts)
- [src/lib/ai/paper-stages/core.ts](/Users/eriksupit/Desktop/makalahapp/src/lib/ai/paper-stages/core.ts)
- [src/lib/ai/paper-stages/results.ts](/Users/eriksupit/Desktop/makalahapp/src/lib/ai/paper-stages/results.ts)
- [src/lib/ai/paper-stages/finalization.ts](/Users/eriksupit/Desktop/makalahapp/src/lib/ai/paper-stages/finalization.ts)
- [src/lib/chat/choice-request.ts](/Users/eriksupit/Desktop/makalahapp/src/lib/chat/choice-request.ts)

### Frontend / Rendering

- [src/components/chat/ChatWindow.tsx](/Users/eriksupit/Desktop/makalahapp/src/components/chat/ChatWindow.tsx)
- [src/components/paper/PaperValidationPanel.tsx](/Users/eriksupit/Desktop/makalahapp/src/components/paper/PaperValidationPanel.tsx)
- [src/components/chat/ArtifactPanel.tsx](/Users/eriksupit/Desktop/makalahapp/src/components/chat/ArtifactPanel.tsx)

## Pertanyaan Investigasi yang Harus Dijawab dengan Evidence

### A. Artifact lifecycle

Untuk setiap stage yang diuji:

1. Apakah `updateStageData` terpanggil?
2. Apakah `createArtifact` atau `updateArtifact` terpanggil?
3. Apakah `stageData[currentStage].artifactId` benar-benar tersimpan?
4. Apakah `submitStageForValidation` terpanggil?
5. Apakah `paperSessions.submitForValidation` Convex mutation benar-benar dijalankan?
6. Apakah `stageStatus` berubah menjadi `pending_validation`?

### B. Frontend lifecycle

Untuk setiap stage yang diuji:

1. Apakah message `onFinish` memuat tool part `tool-submitStageForValidation` yang sukses?
2. Apakah `optimisticPendingValidation` terset?
3. Apakah subscription paper session mengembalikan `stageStatus === "pending_validation"`?
4. Apakah `PaperValidationPanel` dirender?

### C. Failure classes

Setiap kegagalan harus diklasifikasikan ke salah satu kategori berikut:

1. `partial-save-stall`
   - `updateStageData` sukses
   - `createArtifact/updateArtifact` tidak terjadi
   - `submitStageForValidation` tidak terjadi

2. `artifact-without-submit`
   - artifact sukses dibuat/diperbarui
   - `submitStageForValidation` tidak terjadi atau gagal
   - validation panel tidak muncul

3. `submit-succeeded-but-panel-missing`
   - submit sukses
   - state backend sudah `pending_validation`
   - panel tetap tidak muncul

4. `false-validation-claim`
   - assistant mengklaim validasi/panel sudah ada
   - evidence backend/frontend tidak mendukung klaim tersebut

## Langkah Investigasi

### 1. Audit kontrak kode terlebih dahulu

Untuk setiap stage, catat:

- sumber kontrak prompt
- apakah stage itu secara instruksi memang harus menghasilkan artifact
- apakah stage itu secara instruksi memang harus langsung submit validation
- apakah stage itu memakai choice-card follow-up atau flow langsung

Output yang wajib dibuat:

- matriks stage vs kontrak

### 2. Audit logging yang sudah ada

Cari dan dokumentasikan semua log yang relevan:

- `[F1-F6-TEST] updateStageData`
- `[F1-F6-TEST] createArtifact`
- `[F1-F6-TEST] submitStageForValidation`
- log `submitForValidation` di Convex
- log observability lain di `route.ts`

Output yang wajib dibuat:

- tabel log source vs arti log vs kapan log dipakai

### 3. Reproduksi stage-by-stage di local

Jalankan local dari workspace utama:

```bash
npm run dev
```

Di terminal terpisah:

```bash
npm run convex:dev
```

Untuk setiap stage yang diuji, simpan:

- prompt user / action user
- screenshot sebelum dan sesudah
- log terminal yang relevan
- hasil klasifikasi failure

Stage prioritas awal untuk smoke test:

1. `gagasan`
2. `topik`
3. `metodologi`
4. `hasil`
5. `kesimpulan`
6. `daftar_pustaka`
7. `lampiran`
8. `judul`

Setelah itu lanjut ke stage sisanya:

9. `outline`
10. `abstrak`
11. `pendahuluan`
12. `tinjauan_literatur`
13. `diskusi`
14. `pembaruan_abstrak`

### 4. Audit production behavior hanya dengan evidence yang tersedia

Jika menggunakan screenshot atau log production:

- kutip hanya evidence yang benar-benar ada
- jangan menyimpulkan tanpa log, screenshot, atau state yang bisa dibuktikan

## Kriteria Perbaikan

Perbaikan hanya boleh dianggap selesai jika untuk stage-stage yang diuji:

1. artifact muncul konsisten ketika kontrak stage menuntut artifact
2. validation panel muncul konsisten ketika kontrak stage menuntut validation submit
3. tidak diperlukan prompt tambahan seperti:
   - "munculkan validation panel"
   - "mana?"
   - "artifact tidak muncul"
4. assistant tidak mengeluarkan klaim validasi palsu
5. tidak ada stage yang tertinggal di `drafting` jika artifact dan submit seharusnya sudah selesai

## Kriteria Non-Regresi

Setelah patch:

1. chat biasa non-paper tetap berjalan
2. flow search stage aktif tetap berjalan
3. choice card tetap muncul pada stage yang memang memerlukannya
4. revision flow tidak rusak
5. stage completed tidak menampilkan validation panel baru

## Deliverables Sesi Baru

Sesi baru harus menghasilkan dokumen dan evidence berikut:

1. matriks audit stage lengkap
2. daftar failure class per stage yang sudah diuji
3. daftar root cause yang dibuktikan
4. patch final yang dibatasi oleh evidence
5. daftar file yang diubah
6. hasil test
7. hasil lint
8. hasil build
9. bukti smoke test manual setelah patch

## Format Laporan Hasil

Untuk setiap stage yang diuji, gunakan format berikut:

```md
### Stage: <nama-stage>

- Trigger user:
- Kontrak prompt:
- Tool calls yang terlihat:
- Artifact muncul: Ya/Tidak
- Validation panel muncul: Ya/Tidak
- Stage status akhir yang terverifikasi:
- Failure class:
- Evidence:
  - Screenshot:
  - Log:
  - File/code reference:
```

## Batasan Kerja

1. Jangan menebak root cause tanpa evidence.
2. Jangan membuat patch global tanpa memetakan dampaknya ke semua stage.
3. Jangan menyimpulkan bug frontend tanpa memeriksa backend state dan tool result.
4. Jangan menyimpulkan bug backend tanpa memeriksa kondisi render frontend.
5. Jangan mengklaim selesai sebelum ada evidence smoke test.

## Catatan Penutup

Dokumen ini tidak menetapkan solusi final.

Dokumen ini hanya menetapkan:

- fakta yang sudah ada
- scope investigasi
- sumber kode yang wajib diaudit
- pertanyaan yang harus dijawab dengan evidence
- output yang wajib dikumpulkan
