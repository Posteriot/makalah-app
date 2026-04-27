# Tailwind CSS v4: Mechanical Grace Design System

Makalah AI menggunakan **Tailwind CSS v4** sebagai mesin pengiriman gaya (*style delivery engine*) utama. Desain aplikasi mengikuti filosofi **Mechanical Grace**, yang menggabungkan estetika industrial teknis dengan kehalusan interaksi modern.

## 1. Arsitektur Desain "Trinity Approach"

Sistem desain Makalah AI dibangun di atas tiga pilar utama:
1. **Identity**: Menggunakan token kustom **Makalah-Carbon** yang didefinisikan dalam modul CSS global.
2. **Structure**: Memanfaatkan komponen **shadcn/ui** untuk blok bangunan antarmuka.
3. **Delivery**: Ditenagai oleh **Tailwind CSS v4** untuk fleksibilitas dan performa maksimal.

## 2. Palet Warna OKLCH

Untuk memastikan akurasi warna dan aksesibilitas yang konsisten di semua layar, Makalah AI menggunakan ruang warna **OKLCH**.

- **Slate (True Neutral)**: Digunakan untuk latar belakang dan elemen struktural guna menghindari bias warna.
- **Amber (Primary Brand)**: Warna oranye khas Makalah yang melambangkan energi dan kreativitas.
- **Sky (Info/AI)**: Digunakan untuk elemen yang berkaitan dengan identitas AI dan proses *thinking*.
- **Emerald/Teal (Success)**: Digunakan untuk indikator keberhasilan dan status "Ready".
- **Rose (Destructive)**: Digunakan untuk tindakan berbahaya atau status error.

## 3. Sistem Tokenisasi & Variabel CSS

Sistem ini memetakan variabel CSS asli ke dalam utilitas Tailwind, memungkinkan perubahan tema yang sinkron antara komponen kustom dan library pihak ketiga.

- **Theme Inline**: Seluruh variabel warna, radius, dan spasi didefinisikan di dalam blok `@theme inline` pada `globals.css`.
- **Custom Variants**: Menggunakan `@custom-variant dark` untuk mendukung mode gelap yang elegan dengan kontrol tingkat tinggi.
- **Hybrid Radius Scale**: Menggunakan skala radius yang bervariasi—mulai dari `radius-xs` (2px) untuk elemen data yang padat hingga `radius-xl` (16px) untuk kartu kontainer premium.

## 4. Tipografi & Spasi (Compact UI)

Makalah AI mengoptimalkan tata letak untuk kepadatan informasi yang tinggi namun tetap nyaman dibaca.

- **Font Families**: Menggunakan **Geist** sebagai font sans-serif utama untuk UI dan **Geist Mono** untuk elemen teknis, kode, dan sitasi.
- **Smaller Scale**: Skala font dimulai dari `xs` (8px) untuk label kecil, memberikan kesan "pro-tools" pada aplikasi.
- **Base Spacing Unit**: Menggunakan unit dasar `0.25rem` (4px), memungkinkan pengaturan jarak yang sangat presisi pada dashboard dan panel chat.

## 5. Komponen Visual Khas

- **Bento Cards**: Pola kartu bento untuk dashboard dengan perbatasan halus (*border-hairline*).
- **Dot Bullets**: Indikator status berwarna cerah (seperti titik merah "Live") untuk memberikan kesan reaktif.
- **Mechanical Gradients**: Penggunaan gradien halus yang meniru pencahayaan industrial.

---
**Rujukan Kode:**
- [src/app/globals.css](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/app/globals.css): Definisi master palet warna OKLCH, pemetaan tema `@theme inline`, dan sistem desain Makalah-Carbon.
- [package.json](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/package.json): Memastikan penggunaan `tailwindcss` versi 4.
