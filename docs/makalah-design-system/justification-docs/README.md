# Justification Documents: Protokol Migrasi Makalah-Carbon

Koleksi dokumen p di folder ini berfungsi sebagai **instrumen kontrol teknis** dan rujukan otentik untuk memigrasikan basis kode Makalah App ke standar **Makalah-Carbon (Mechanical Grace)**.

## 1. Apa itu Dokumen Justifikasi?
Dokumen Justifikasi adalah cetak biru (blueprint) teknis yang menjembatani antara desain abstrak (documented standards) dengan implementasi kode nyata. Dokumen ini memastikan bahwa setiap perubahan visual memiliki alasan teknis yang kuat dan sesuai dengan filosofi sistem.

## 2. Tujuan & Kegunaan
*   **Aparatur Kontrol**: Menjadi checklist wajib sebelum dan sesudah implementasi kode.
*   **Integritas Visual**: Menjamin konsistensi antarmuka (e.g. Footer harus punya wibawa yang sama dengan Header).
*   **Auditability**: Memberikan rekam jejak keputusan desain (kenapa warna ini dipilih, kenapa navigasi di kanan, dll).
*   **Automation-Ready**: Memudahkan AI Agent untuk melakukan migrasi dengan presisi tinggi tanpa perlu menebak-nebak (zero-guess).

## 3. Metodologi Pembuatan
Setiap dokumen disusun melalui proses audit 4-tahap:
1.  **Code Study**: Membedah komponen `.tsx` lama untuk mengidentifikasi fungsionalitas dan class legacy.
2.  **Standards Contrasting**: Membandingkan temuan audit dengan dokumen standar Makalah-Carbon (Colors, Typo, Shape).
3.  **Technical Mapping**: Memetakan setiap elemen legacy ke target utility class Carbon yang baru.
4.  **Protocol Drafting**: Menyusun langkah pengerjaan (step-by-step) dan kriteria verifikasi manual/otomatis.

## 4. Penggunaan Template
Gunakan [template.md](./template.md) untuk memulai dokumen baru. 

### Struktur Wajib:
*   **Core Specs**: Nilai OKLCH mentah, spek tipografi, dan unit spacing.
*   **Audit Mapping**: Tabel perbandingan class lama vs baru.
*   **Migration Protocol**: Urutan pengerjaan (Struktur -> Visual -> Content -> Theme).
*   **Verification Checklist**: Daftar audit akhir untuk menjamin status **Pixel-Perfect**.

---
> [!IMPORTANT]
> **No Doc, No Migration**: Dilarang melakukan migrasi visual langsung pada kode sebelum dokumen justifikasi disetujui oleh supervisor/user. Justifikasi adalah jangkar dari Mechanical Grace.
