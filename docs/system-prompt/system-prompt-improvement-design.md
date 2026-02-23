# System Prompt Improvement Design

## 1. Ringkasan

Dokumen ini mendesain perbaikan system prompt agar contract di prompt aktif sinkron dengan contract tool aktual, menjaga kualitas citation pada artifact, dan menambahkan mekanisme drift detection di layer operasional.

Desain ini menggunakan pendekatan 3 lapis:

1. Prompt Contract Alignment (instruction layer).
2. Runtime Enforcement (execution layer).
3. Drift Monitoring (observability layer).

Catatan penting:

1. Dokumen ini tidak membahas histori migration.
2. Strict cleanliness (penghapusan prompt lama) dilakukan setelah prompt baru lolos verifikasi.

## 2. Problem Statement

Masalah yang harus diselesaikan:

1. Prompt aktif masih menyebut signature lama `updateStageData({ stage, data })`.
2. Tool aktual sudah auto-stage dan tidak menerima input `stage`.
3. Policy `SOURCES DAN SITASI ARTIFACT` belum selalu hadir di prompt aktif runtime.

Dampak utama:

1. Contract drift antara instruction vs tool schema.
2. Potensi artifact tanpa `sources` pada kasus berbasis web reference.
3. Penurunan konsistensi citation rendering di artifact viewer.

## 3. Tujuan dan Non-Tujuan

### 3.1 Tujuan

1. Menyatukan contract prompt aktif dengan tool contract aktual.
2. Menjadikan aturan sources artifact sebagai policy eksplisit.
3. Menegakkan validasi `sources` di server layer saat kondisi menuntut.
4. Menambahkan deteksi drift agar dev/admin cepat tahu jika prompt keluar dari contract target.

### 3.2 Non-Tujuan

1. Tidak merombak paper workflow 13 tahap.
2. Tidak mengubah billing logic.
3. Tidak mengubah arsitektur provider selection Gateway vs OpenRouter.

## 4. Prinsip Desain

1. Database-driven prompt tetap dipertahankan.
2. Instruction wajib sinkron dengan executable contract.
3. Guard penting tidak hanya di prompt, tetapi juga di runtime.
4. Monitoring harus actionable dan terlihat di Admin Panel.
5. Perubahan harus reversible dengan rollback cepat.

## 5. Desain Solusi

## 5.1 Prompt Contract Alignment

Perubahan pada prompt aktif:

1. Ganti instruksi lama `updateStageData({ stage, data })` menjadi format auto-stage.
2. Tambahkan section policy `SOURCES DAN SITASI ARTIFACT` yang menjelaskan:
   - kapan `sources` wajib disertakan,
   - sumber `sources` dari `AVAILABLE_WEB_SOURCES`,
   - dampak jika `sources` tidak dikirim.

Expected behavior:

1. Model tidak lagi diarahkan ke contract lama.
2. Model memiliki policy eksplisit citation-aware artifact.

## 5.2 Runtime Enforcement untuk Artifact Sources

Tambahkan guard di tool handler `createArtifact` dan `updateArtifact` pada Chat API.

Rule enforcement:

1. Jika web sources tersedia untuk conversation (indikator `hasRecentSourcesInDb` true), lalu artifact call tidak menyertakan `sources`, maka request ditolak dengan error terstruktur.
2. Jika web sources tidak tersedia, artifact tetap boleh tanpa `sources`.

Expected behavior:

1. Citation integrity tidak bergantung penuh pada kepatuhan prompt.
2. Kasus artifact berbasis web data tanpa sources dapat diproteksi deterministic.

## 5.3 Drift Monitoring

Tambahkan drift checks terhadap prompt aktif:

1. Check signature lama: apakah masih ada string `updateStageData({ stage, data })`.
2. Check policy sources: apakah section `SOURCES DAN SITASI ARTIFACT` tersedia.

Jika drift terdeteksi:

1. Buat warning alert di `systemAlerts`.
2. Tampilkan indikator di `SystemHealthPanel`.

Expected behavior:

1. Drift prompt dapat diketahui sebelum menjadi incident user-facing.

## 5.4 Verification Gate

Prompt baru dianggap lolos jika:

1. Prompt aktif tidak lagi memuat signature lama.
2. Prompt aktif memuat policy sources.
3. Flow artifact dengan web sources gagal jika `sources` kosong.
4. Flow artifact tanpa web sources tetap berjalan normal.

## 5.5 Strict Cleanliness (Post-Verification)

Kebijakan strict cleanliness dilakukan setelah semua gate lolos:

1. Prompt baru aktif dan tervalidasi.
2. Prompt chain lama yang tidak dipakai lagi dapat dihapus.
3. Penghapusan dilakukan terkontrol dengan bukti verifikasi tersimpan.

## 6. Dampak Arsitektural

Komponen yang terdampak:

1. Prompt content operational di Convex (`systemPrompts` active record).
2. Chat API artifact tool handling.
3. System health observability.

Tidak ada dampak pada:

1. Schema utama paper session.
2. Auth flow.
3. Billing tier enforcement.

## 7. Risiko dan Mitigasi

Risiko:

1. False positive enforcement untuk artifact non-web.
2. Alert noise jika drift check terlalu agresif.
3. Kesalahan manual saat update prompt content di Admin Panel.

Mitigasi:

1. Gunakan condition berbasis availability web sources, bukan unconditional block.
2. Alert type khusus drift dengan severity `warning`.
3. Gunakan checklist verifikasi prompt sebelum activate.

## 8. Rollback Strategy

Rollback order:

1. Re-activate prompt versi sebelumnya dari Admin Panel.
2. Nonaktifkan enforcement branch jika dibungkus feature flag atau fallback conditional.
3. Clear alert yang bersifat informatif setelah kondisi stabil.

## 9. Kriteria Sukses

1. Tidak ada lagi mismatch contract di prompt aktif.
2. Citation completeness untuk artifact berbasis web reference meningkat.
3. Drift detection aktif dan terbaca di admin monitoring.
4. Strict cleanliness dapat dieksekusi aman setelah verifikasi lolos.

