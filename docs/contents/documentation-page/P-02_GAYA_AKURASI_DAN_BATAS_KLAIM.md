# P-02 - Aturan Gaya Bahasa, Akurasi Teknis, dan Batas Klaim

Dokumen ini mengunci aturan editorial agar konten dokumentasi akurat dan patuh pada implementasi kode saat ini.

## 1) Aturan Gaya Bahasa

Gaya penulisan:

- Gunakan Bahasa Indonesia formal-praktis.
- Gunakan sapaan `Anda` untuk user akhir.
- Gunakan kalimat pendek dan langsung ke poin.
- Pertahankan istilah teknis English bila belum ada padanan yang presisi.

Hindari:

- Slang.
- Kalimat terlalu promosi.
- Istilah yang ambigu atau multitafsir.

## 2) Aturan Akurasi Teknis (Wajib)

Prinsip utama:

1. Source of truth adalah kode repository (`src/`, `convex/`).
2. Referensi non-kode hanya referensi tambahan.
3. Semua klaim teknis harus punya bukti path kode.

Checklist verifikasi minimal sebelum status `final`:

1. Route/URL yang disebut benar-benar ada.
2. Nama fitur sesuai implementasi saat ini.
3. Batasan sistem (limit, tipe file, alur auth, workflow) sesuai kode terbaru.
4. Klaim keamanan/privasi tidak melebihi bukti teknis yang ada.

## 3) Batas Klaim (Claim Boundary)

Klaim yang diperbolehkan:

- "Saat ini mendukung..."
- "Berdasarkan implementasi saat ini..."
- "Dapat berubah mengikuti pembaruan sistem..."

Klaim yang dilarang:

- "100% aman"
- "Tidak pernah gagal"
- "Pasti sesuai semua regulasi"
- Klaim legal absolut tanpa dokumen/legal review resmi

Aturan tambahan untuk keamanan dan privasi:

- Gunakan frasa "ringkasan operasional", bukan dokumen hukum final.
- Jika ada area belum pasti, tulis eksplisit sebagai batasan.

## 4) Aturan Penanganan Konflik Sumber

Jika ada konflik antara:

- kode vs dokumen lama
- kode vs catatan justifikasi eksternal

maka yang dipakai adalah kode. Dokumen non-kode harus:

1. diverifikasi,
2. diaudit,
3. diperbarui agar compliant dengan kode.

## 5) Aturan Status Dokumen

Definisi status frontmatter:

- `draft`: disusun agent, belum direvisi user.
- `reviewed`: sudah direvisi user, menunggu finalisasi.
- `final`: sudah difinalisasi agent berdasarkan revisi user.

## 6) Format Bukti di Dalam Dokumen

Setiap file konten wajib punya bagian:

- `## Rujukan Kode (Wajib)`

Format minimal:

- `- src/path/file.tsx:line - alasan relevansi`
- `- convex/path/file.ts:line - alasan relevansi`

Jika belum ada bukti cukup:

- Jangan finalize.
- Tulis item terbuka di `## Catatan Verifikasi`.
