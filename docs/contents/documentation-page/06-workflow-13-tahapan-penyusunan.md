---
doc_id: "S6"
slug: "workflow"
title: "Workflow 13 Tahapan Penyusunan"
group: "Fitur Utama"
order: 6
icon: "Settings"
isPublished: true
status: "final"
lastVerifiedAt: "2026-02-18"
---

# Workflow 13 Tahapan Penyusunan

## Ringkasan

Workflow 13 tahapan membantu Anda menyusun paper secara bertahap, dari ide awal sampai judul final. Anda tidak perlu menulis semuanya sekaligus. Saat mode paper aktif, sistem secara desain menjaga obrolan tetap kembali ke jalur penyusunan paper, lalu Anda memutuskan apakah tahap tersebut lanjut atau perlu revisi.

## Konten Utama

### Apa Itu Workflow 13 Tahapan

Workflow ini adalah alur kerja resmi di mode penulisan paper Makalah AI. Setiap sesi paper berjalan berurutan dari tahap 1 sampai tahap 13. Jika tahap terakhir sudah disetujui, sesi berubah menjadi selesai.

### Kenapa Obrolan Tetap Fokus Jadi Paper

Bagian ini adalah nilai utama Makalah AI.

1. Saat mode paper aktif, agent selalu diberi instruksi khusus untuk tetap bekerja di tahap aktif.
2. Agent tidak boleh loncat tahap sebelum status tahap berubah di database.
3. Tool penyimpanan data tahap otomatis mengikuti tahap aktif, jadi agent tidak bisa memilih tahap sembarangan.
4. Backend menolak update jika tahap yang dikirim tidak sama dengan tahap aktif.
5. Anda tetap pegang kontrol lewat tombol `Approve & Lanjut` dan `Revisi`.

Dengan pola ini, user bisa tetap terpandu menyusun paper, tanpa obrolan melebar jauh dari konteks utama.

### Prinsip Kolaborasi Human-in-the-Loop

Workflow ini dirancang untuk menjaga tujuan utama user: menghasilkan paper yang berkualitas, bukan sekadar cepat jadi.

Di Makalah AI, agent berperan sebagai:

- Juru tulis: membantu menuangkan hasil diskusi ke bentuk tulisan akademik.
- Mitra cari dan olah data: membantu mencari referensi, merangkum temuan, dan merapikan bahan.
- Kawan diskusi: mengajak klarifikasi, mempertajam ide, dan mengecek arah argumen.
- Penimbang: memberi pertimbangan plus-minus sebelum user memutuskan langkah berikutnya.

Artinya, user tetap perlu aktif memberi arahan, review, dan persetujuan tiap tahap. Paper akhir adalah hasil kolaborasi user + AI, bukan paper yang sepenuhnya dibuatkan AI tanpa keterlibatan user.

### Urutan 13 Tahapan

1. Gagasan Paper
2. Penentuan Topik
3. Menyusun Outline
4. Penyusunan Abstrak
5. Pendahuluan
6. Tinjauan Literatur
7. Metodologi
8. Hasil Penelitian
9. Diskusi
10. Kesimpulan
11. Daftar Pustaka
12. Lampiran
13. Pemilihan Judul

### Cara Kerja di Setiap Tahap

1. Anda berdiskusi dengan AI pada tahap yang sedang aktif.
2. AI menyimpan progres tahap.
3. AI submit tahap ke status menunggu validasi.
4. Anda memilih `Approve & Lanjut` atau `Revisi`.
5. Jika Anda approve, sistem pindah ke tahap berikutnya.

Catatan penting:

- Tahap tidak bisa diproses ke approve jika ringkasan belum terisi.
- Saat approve, sistem juga mengecek agar konten tidak terlalu jauh melewati budget outline (jika budget outline tersedia).

### Fitur Pendukung Agar Alur Tetap Terkontrol

- Rewind: Anda bisa mundur maksimal 2 tahap ke belakang.
- Edit pesan: di mode paper, hanya pesan user yang bisa diedit, dan hanya sampai 2 pesan user terakhir pada tahap aktif.
- Web search per tahap dibagi dua mode.
- Tahap aktif search: Gagasan, Topik, Pendahuluan, Tinjauan Literatur, Metodologi, Diskusi.
- Tahap pasif search: Outline, Abstrak, Hasil, Kesimpulan, Daftar Pustaka, Lampiran, Judul.
- Saat ada hasil web search, referensi disimpan otomatis ke data tahap aktif.

### Kapan Sesi Dianggap Selesai

Sesi dianggap selesai setelah tahap 13 (`judul`) disetujui dan status sesi menjadi `completed`.

### Kapan Dokumen Bisa Diekspor

Export Word/PDF hanya bisa dilakukan saat sesi sudah `completed`.

## Rujukan Kode (Wajib)

- `convex/paperSessions/constants.ts:1` - Urutan 13 tahap workflow.
- `convex/paperSessions/constants.ts:45` - Label resmi nama setiap tahap.
- `convex/paperSessions.ts:585` - Mutation update data tahap.
- `convex/paperSessions.ts:596` - Update ditolak jika stage bukan stage aktif.
- `convex/paperSessions.ts:601` - Update ditolak saat status `pending_validation`.
- `convex/paperSessions.ts:811` - Submit tahap ke `pending_validation` dan guard ringkasan wajib.
- `convex/paperSessions.ts:848` - Approval tahap dan perpindahan ke tahap berikutnya.
- `convex/paperSessions.ts:904` - Validasi budget outline pada proses approve.
- `convex/paperSessions.ts:977` - Revisi tahap mengubah status ke `revision`.
- `convex/paperSessions.ts:1251` - Batas rewind maksimal 2 tahap.
- `src/components/paper/PaperStageProgress.tsx:35` - Rewind limit di UI (2 tahap).
- `src/components/paper/PaperValidationPanel.tsx:90` - Panel validasi tahap + aksi `Approve & Lanjut` dan `Revisi`.
- `src/lib/ai/paper-mode-prompt.ts:141` - Prompt mode paper aktif di setiap turn.
- `src/lib/ai/paper-mode-prompt.ts:145` - Agent diwajibkan diskusi dulu sebelum drafting.
- `src/lib/ai/paper-mode-prompt.ts:146` - Draft harus mengikuti konteks yang disepakati bersama user.
- `src/lib/ai/paper-mode-prompt.ts:154` - Instruksi agar agent tidak loncat tahap.
- `src/lib/ai/paper-tools.ts:107` - Parameter stage di tool dihapus untuk mencegah salah tahap.
- `src/lib/ai/paper-tools.ts:133` - Tool auto-ambil stage aktif dari session.
- `src/lib/ai/paper-stages/foundation.ts:123` - Instruksi eksplisit bahwa proses ini kolaborasi, bukan generate sekali jadi.
- `src/lib/ai/paper-stages/foundation.ts:132` - Lanjut tahap berikutnya tetap butuh aksi user (`Approve & Lanjut`).
- `src/lib/utils/paperPermissions.ts:168` - Hanya pesan user yang bisa diedit di mode paper.
- `src/lib/utils/paperPermissions.ts:186` - Batas edit 2 pesan user terakhir.
- `src/app/api/chat/route.ts:279` - Daftar tahap active/passive web search.
- `convex/paperSessions.ts:716` - Mutation auto-persist referensi search ke stage data.
- `src/app/api/chat/route.ts:1746` - Pemanggilan auto-persist referensi pada path primary.
- `src/app/api/chat/route.ts:2058` - Pemanggilan auto-persist referensi pada path fallback.
- `src/lib/export/validation.ts:49` - Export hanya valid jika sesi sudah `completed`.

## Catatan Verifikasi

- [x] Nama tahap dan urutan tahap sesuai konstanta kode.
- [x] Alur approve/revisi sesuai mutation backend.
- [x] Batas rewind sesuai backend dan UI.
- [x] Batas edit pesan di mode paper sesuai utility permission.
- [x] Kebijakan active/passive web search sesuai route chat.
- [x] Aturan export hanya untuk sesi `completed`.
- [x] Klaim ditulis dengan bahasa awam dan tidak melebihi bukti implementasi.

## Riwayat Revisi

- Draft:
  - Tanggal: 2026-02-18
  - Ringkasan perubahan: Menyusun draft awal menu S6 dengan istilah awam, berbasis workflow 13 tahapan yang sesuai kode aktif.
- Revisi User:
  - Tanggal:
  - Catatan revisi dari user:
- Final:
  - Tanggal:
  - Ringkasan finalisasi:
