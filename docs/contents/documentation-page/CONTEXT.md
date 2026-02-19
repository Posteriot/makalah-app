# Konteks Tugas Dokumentasi Halaman `/documentation`

Dokumen ini adalah pengingat kerja untuk penyusunan ulang konten halaman dokumentasi Makalah AI.
Tujuan utamanya: menjaga akurasi, mencegah halusinasi, dan memastikan semua konten patuh pada implementasi kode terbaru.

## Mandat Utama (Wajib Dipatuhi)

1. Pusat kebenaran (source of truth) adalah **kode** di repository ini, terutama area `src/` dan `convex/`.
2. Dokumen lain di luar kode (termasuk dokumen justifikasi dari user) adalah **referensi tambahan**, bukan sumber kebenaran utama.
3. Setiap klaim dari referensi tambahan **wajib diverifikasi** ke kode.
4. Jika referensi tambahan tidak sesuai kode, konten harus diaudit dan diperbarui agar **compliant** dengan kode.

## Ruang Lingkup Konten

Konten markdown disusun di folder:

- `docs/contents/documentation-page`

Target menu saat ini:

1. Selamat Datang
2. Memulai
3. Panduan Cepat
4. Konsep Dasar
5. Chat dengan AI
6. Workflow 13 Tahapan Penyusunan
7. Keamanan Data
8. Kebijakan Privasi (Komprehensif)
9. Refrasa

Jika ada penambahan menu dari user, ruang lingkup akan diperbarui.

## Metode Kerja Per Dokumen (3 Fase)

Setiap dokumen konten wajib melalui urutan ini:

1. Draft oleh agent
2. Revisi/koreksi oleh user
3. Finalisasi oleh agent berdasarkan revisi user

Tidak boleh loncat fase.

## Checklist Pemandu Utama (ID)

1. `P-01` Kunci format standar file markdown. (Selesai)
2. `P-02` Kunci aturan gaya bahasa dan akurasi teknis. (Selesai)
3. `P-03` Buat template markdown semua menu. (Selesai)
4. `S1-D` sampai `S9-F` Proses draft -> revisi -> finalisasi untuk 9 menu.
5. `I-01` Final check konsistensi antar menu.
6. `I-02` Siapkan paket siap ingest ke database/CMS (tanpa publish dulu).

## Aturan Validasi Klaim Konten

1. Tiap poin teknis harus punya jejak bukti di kode (file/path yang relevan).
2. Hindari istilah normatif berlebihan jika implementasi aktual belum mendukung.
3. Jika ada ketidakpastian, tandai sebagai asumsi sementara lalu verifikasi.
4. Jangan menulis klaim “sudah ada” bila belum ditemukan bukti implementasi.

## Protokol Anti-Halusinasi (Saat Konteks Penuh)

Jika konteks percakapan menipis atau penuh, lakukan ini sebelum menulis konten lanjutan:

1. Baca ulang dokumen ini terlebih dulu.
2. Re-validasi klaim ke kode aktif (`src/`, `convex/`) dengan pencarian langsung.
3. Cocokkan lagi dengan checklist ID yang sedang dikerjakan.
4. Lanjutkan penulisan hanya berdasarkan hasil verifikasi terbaru.

Dokumen ini berfungsi sebagai justifikasi proses dan pengingat operasional agar kualitas konten tetap konsisten, akurat, dan selaras dengan kode.
