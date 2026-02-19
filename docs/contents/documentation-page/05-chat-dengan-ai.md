---
doc_id: "S5"
slug: "chat-agent"
title: "Chat dengan AI"
group: "Fitur Utama"
order: 5
icon: "Users"
isPublished: true
status: "final"
lastVerifiedAt: "2026-02-18"
---

# Chat dengan AI

## Ringkasan

Halaman ini menjelaskan cara memakai chat sebagai ruang kerja utama untuk menjalankan workflow 13 tahapan penyusunan paper. Fokusnya bukan sekadar tanya-jawab, tetapi kolaborasi terarah: mulai sesi paper, diskusi per tahap, validasi tahap, lalu lanjut sampai naskah utuh.

## Konten Utama

### Chat adalah Ruang Kerja Utama Workflow 13 Tahap

Di Makalah AI, menu `Chat` adalah tempat seluruh proses penyusunan paper dijalankan.

1. Anda bisa memulai dari chat kosong atau melanjutkan percakapan lama.
2. Saat mode paper aktif, chat terhubung dengan sesi paper, artifak, dan linimasa progres.
3. Setiap keputusan tahap tetap dikunci oleh aksi validasi user, bukan dipindahkan otomatis.

### Cara Memulai Chat agar Workflow 13 Tahap Aktif

Agar sistem langsung masuk ke mode penyusunan paper:

1. Klik menu `Chat` di header.
2. Klik `Percakapan Baru`.
3. Gunakan template `Ayo kolaborasi menyusun paper akademik!` atau tulis niat yang jelas untuk menyusun paper.
4. Setelah intent terdeteksi, sistem memaksa AI memulai sesi paper lebih dulu, baru diskusi lanjut per tahap.

Catatan:
Jika pesan Anda hanya berupa permintaan penjelasan konsep umum (misalnya "apa itu", "pengertian", "contoh"), sistem bisa membaca itu sebagai mode diskusi biasa, bukan langsung mode workflow paper.

### Pola Interaksi yang Efektif per Tahap

Supaya progres tidak berputar-putar, gunakan pola dialog sederhana ini di setiap tahap:

1. Jelaskan target tahap yang ingin Anda capai sekarang.
2. Minta AI merangkum keputusan yang sudah disepakati.
3. Minta AI menuliskan output kerja tahap tersebut di artifak.
4. Periksa hasilnya dulu, lalu putuskan `Revisi` atau `Approve & Lanjut`.

Prinsip kerja sistem di mode paper:

1. AI diarahkan diskusi dulu sebelum drafting penuh.
2. AI menyimpan progres ke tahap aktif (auto-stage), bukan bebas lompat tahap.
3. AI hanya boleh submit validasi ketika user sudah menyatakan setuju.

### Kapan Pakai Revisi dan Kapan Approve

Di akhir tahap, panel validasi muncul sebagai gerbang keputusan user.

1. Pilih `Revisi` jika isi tahap belum sesuai, lalu kirim feedback spesifik.
2. Pilih `Approve & Lanjut` jika isi tahap sudah sesuai.
3. Setelah approve, tahap bergeser ke tahap berikutnya.
4. Selama status masih `pending_validation`, update data tahap diblokir sampai ada keputusan revisi/approve.

### Aturan Edit Pesan dan Rewind

Dalam mode paper, fitur edit pesan sengaja dibatasi agar konteks tahap tidak rusak.

1. Hanya pesan user yang bisa diedit.
2. Edit dibatasi untuk dua pesan user terakhir di tahap aktif.
3. Pesan pada tahap yang sudah disetujui tidak bisa diedit langsung.
4. Untuk revisi tahap yang sudah disetujui, gunakan mekanisme `Rewind`.

### Fitur Chat Pendukung saat Menyusun Paper

Selain kirim pesan biasa, chat menyediakan alat bantu yang relevan untuk workflow:

1. `Stop` untuk menghentikan respons AI yang sedang berjalan.
2. `Regenerate` untuk meminta versi alternatif jawaban.
3. Lampiran file (PDF, DOC/DOCX, XLSX, TXT, gambar) dengan batas ukuran 10MB per file.
4. Panel `Sesi paper` dan `Linimasa progres` untuk melihat posisi kerja dan hasil per tahap.

## Rujukan Kode (Wajib)

- `src/components/layout/header/GlobalHeader.tsx:39` - Menu `Chat` tersedia di header utama.
- `src/app/chat/page.tsx:4` - Route `/chat` sebagai titik masuk chat baru.
- `src/app/chat/[conversationId]/page.tsx:9` - Route percakapan spesifik.
- `src/components/chat/ChatSidebar.tsx:169` - Tombol `Percakapan Baru` di sidebar.
- `src/components/chat/messages/TemplateGrid.tsx:19` - Template pemicu paper mode tersedia.
- `src/components/chat/ChatWindow.tsx:534` - Template dikirim sebagai pesan user.
- `src/lib/ai/paper-intent-detector.ts:155` - Deteksi intent penulisan paper.
- `src/app/api/chat/route.ts:254` - Saat intent terdeteksi tanpa session aktif, reminder workflow disuntikkan.
- `src/lib/ai/paper-workflow-reminder.ts:23` - Instruksi wajib panggil `startPaperSession` lebih dulu.
- `src/lib/ai/paper-tools.ts:18` - Tool `startPaperSession`.
- `src/lib/ai/paper-tools.ts:75` - Tool `updateStageData` auto-stage (mengikuti tahap aktif).
- `src/lib/ai/paper-tools.ts:180` - Tool `submitStageForValidation`.
- `src/lib/ai/paper-mode-prompt.ts:145` - Aturan diskusi dulu sebelum drafting.
- `src/lib/ai/paper-mode-prompt.ts:153` - Submit validasi hanya setelah konfirmasi eksplisit user.
- `convex/paperSessions.ts:597` - Backend menolak update bila stage tidak sesuai tahap aktif.
- `convex/paperSessions.ts:601` - Backend menolak update saat status `pending_validation`.
- `convex/paperSessions.ts:811` - Submit tahap ke status validasi user.
- `convex/paperSessions.ts:848` - Approve tahap untuk lanjut ke tahap berikutnya.
- `src/components/paper/PaperValidationPanel.tsx:127` - Aksi `Revisi` pada panel validasi.
- `src/components/paper/PaperValidationPanel.tsx:140` - Aksi `Approve & Lanjut` pada panel validasi.
- `src/lib/utils/paperPermissions.ts:150` - Aturan edit pesan di paper mode.
- `src/lib/utils/paperPermissions.ts:186` - Batas edit maksimal dua turn terakhir.
- `src/components/chat/ChatInput.tsx:92` - Tombol `Stop`.
- `src/components/chat/ChatWindow.tsx:422` - Aksi `regenerate`.
- `src/components/chat/FileUploadButton.tsx:27` - Validasi tipe file lampiran.
- `src/components/chat/FileUploadButton.tsx:38` - Batas ukuran file 10MB.
- `src/components/chat/shell/ActivityBar.tsx:175` - Menu `Sesi paper`.
- `src/components/chat/shell/ActivityBar.tsx:180` - Menu `Linimasa progres`.

## Catatan Verifikasi

- [x] Alur dijelaskan dari perspektif user (klik menu/tombol), bukan route developer.
- [x] Klaim aktivasi workflow disandarkan pada intent detector + reminder + `startPaperSession`.
- [x] Klaim validasi tahap disandarkan pada panel `Revisi`/`Approve & Lanjut` dan guard backend.
- [x] Klaim edit pesan dibatasi sesuai aturan paper mode yang aktif di kode.
- [x] Klaim lampiran file mengikuti tipe dan batas ukuran aktual.
- [x] Batas klaim dijaga: tidak ada klaim absolut seperti "pasti benar" atau "100% aman".

## Riwayat Revisi

- Draft:
  - Tanggal: 2026-02-18
  - Ringkasan perubahan: Menyusun draft menu `Chat dengan AI` dengan fokus pemakaian chat untuk menjalankan workflow 13 tahapan penyusunan paper secara kolaboratif.
- Revisi User:
  - Tanggal:
  - Catatan revisi dari user:
- Final:
  - Tanggal:
  - Ringkasan finalisasi:
