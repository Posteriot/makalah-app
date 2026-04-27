# Makalah AI Design System Reference

Dokumen ini disusun sebagai panduan desain (System Design Doc) bagi pengembangan halaman-halaman Makalah AI ke depannya. Seluruh warna token dicatat dalam format OKLCH agar siap dipindahkan ke Tailwind CSS v4+ tanpa konversi ulang.

## 1. Design Tokens (Primitif & Semantik)

Sistem warna menggunakan tema gelap (Dark Theme) dengan kontras yang dirancang khusus untuk keterbacaan panjang dan identitas teknologi yang modern.

### 1.1 Surfaces (Backgrounds)

Digunakan sebagai lapisan hierarki z-index dari yang terdalam (layer 0) hingga permukaan terluar (panel mengambang).

- `--bg` (`oklch(0.154 0.003 248.00)`): Warna background paling dasar (root).
- `--bg-1` (`oklch(0.173 0.004 264.45)`): Warna dasar alternatif (layer 1) / variasi panel gelap.
- `--bg-2` (`oklch(0.196 0.006 271.09)`): Layer permukaan kartu (layer 2) tanpa transparansi.
- `--bg-elev` (`oklch(1 0 0 / 0.03)`): Digunakan untuk memberikan efek pencahayaan pada hover tombol atau elemen interaktif ringan.
- `--bg-panel` (`oklch(0.1959 0.0062 271.09 / 0.72)`): Digunakan untuk komponen melayang (floating panel/navbar) dengan integrasi filter `backdrop-blur`.

### 1.2 Inks (Teks & Tipografi)

Tingkat opasitas teks dari judul utama hingga teks meta.

- `--ink` (`oklch(0.960 0.005 106.50)`): Putih gading. Teks utama / Heading resolusi tinggi.
- `--ink-2` (`oklch(0.828 0.010 106.61)`): Teks paragraf sekunder / deskripsi panjang.
- `--ink-3` (`oklch(0.631 0.010 106.69)`): Teks tersier (metadata, timestamp, kapitalisasi mono).
- `--ink-4` (`oklch(0.466 0.008 106.70)`): Elemen kontrol de-emphasize, chevron non-aktif, batas kontras bawah.
- `--ink-5` (`oklch(0.347 0.007 106.75)`): Teks paling redup untuk status inaktif yang dalam.

### 1.3 Borders (Garis & Pemisah)

- `--line` (`oklch(1 0 0 / 0.06)`): Border pemisah tipis sangat halus, batas section standar.
- `--line-2` (`oklch(1 0 0 / 0.10)`): Border lebih kontras untuk membatasi UI control atau tombol (button / border-card).
- `--brand-green-line` (`oklch(0.7152 0.1549 128.78 / 0.30)`): Border _active_ berbasis hijau logo.

### 1.4 Accents & Status (Brand Colors)

**Warna Brand Utama: Brand Green**

- `--brand-green` (`oklch(0.7152 0.1549 128.78)`): CTA utama, status aktif, dan sorotan elemen terpenting. Warna ini diturunkan langsung dari hijau logo Makalah. Dipasangkan dengan `--brand-green-ink` (`oklch(0.1536 0.0027 248.00)`) untuk teks di dalamnya agar kontras.
- Variasi brand green: `--brand-green-soft` (`oklch(0.7152 0.1549 128.78 / 0.16)`), `--brand-green-glow` (`oklch(0.7152 0.1549 128.78 / 0.38)`), `--brand-green-line` (`oklch(0.7152 0.1549 128.78 / 0.30)`).

**Warna Pendukung (Secondary Accents):**
Aksen tematik yang digunakan untuk pembeda _tag_ atau elemen dekorasi spesifik.

- `--sky` (`oklch(0.876 0.103 213.51)`) & `--sky-soft` (`oklch(0.876 0.103 213.51 / 0.14)`)
- `--brand-orange` (`oklch(0.6546 0.2006 36.90)`) & `--brand-orange-deep` (`oklch(0.5304 0.1698 36.07)`): Aksen hangat dari orange logo untuk trust, verified, completed, pricing highlight, dan kehangatan brand.

Aturan keterbacaan untuk orange dibuat keras: orange dipakai sebagai fill, border, glow, atau tint. Jangan pakai orange pekat sebagai teks di atas dark/hitam, jangan pakai teks orange di atas surface orange, dan jangan pakai teks gelap/hitam di atas fill orange. Elemen orange solid yang membawa teks memakai `--brand-orange-deep` sebagai fill dan `--brand-orange-ink` (`oklch(0.9810 0.0109 54.50)`) sebagai teks; teks di atas surface dark/orange-soft memakai `--ink` atau `--ink-2`.

**Status Fungsional:**

- `--ok` (`oklch(0.848 0.134 154.85)`): Sukses, tanda cek, status jalan/hijau.
- `--warn` (`oklch(0.856 0.126 75.97)`): Peringatan operasional.

## 2. Tipografi (Typography)

Susunan huruf mengandalkan triptych desain UI modern berbasis `Geist` sebagai preferensi utama berpadu dengan stack sans/mono. Semua tipografi secara default merender dengan fitur OpenType `ss01` dan `cv11`.

- **Display** (`--font-display`): `"Geist", "General Sans", ui-sans-serif, system-ui`. Digunakan untuk judul super besar (`.display`, `h2.sec-title`). Sifatnya padat dan geometris.
- **Body/Sans** (`--font-sans`): `"Geist", "Inter", ui-sans-serif`. Font pembacaan utama (_body paragraph_, antarmuka standar). Line-height proporsional (1.5).
- **Monospace** (`--font-mono`): `"Geist Mono", "JetBrains Mono", ui-monospace`. Untuk indikator code, eyebrow atas judul (`.eyebrow`, `/ REFRASA`), label khusus algoritma (`.mono-label`).

## 3. Sistem Jarak, Area, & Transisi

### 3.1 Border Radius (Kelengkungan Sisi)

Digunakan konsisten sesuai ukuran elemen agar menjaga hirarki "lingkaran anak di dalam lingkaran ayah" _(concentric radii)_.

- `--r-xs` (`4px`): Paling tajam (badge teks mikroskopis, tag mono).
- `--r-sm` (`6px`): Tombol standar & icon box.
- `--r-md` (`10px`): Container gambar standar, sub-card kecil.
- `--r-lg` (`16px`): Elemen utama UI (_Showcase box_, _Card pricing_ tinggi).
- `--r-xl` (`24px`): Bingkai terluar.

### 3.2 Visual Depth (Kotak Bayangan)

Mengandalkan manipulasi z-axis minimalis lewat bayangan panjang:

- `--shadow-1`: Drop shadow pendek dengan semburat _inset_ halus (bevel lighting 4%).
- `--shadow-2`: Soft shadow blur tebal 60px (`0 20px 60px oklch(0 0 0 / 0.45)`) untuk komponen yang sangat mengambang.
- `--shadow-hot`: Glow effect dari warna sekunder untuk indikasi status aktif (_active state_ button CTA).

### 3.3 Motion & Transitions

Animasi _reveal_ atau _hover_ tidak linier. Wajib memakai _easing_ kustom berbasis CSS.

- `--ease`: `cubic-bezier(0.16, 1, 0.3, 1)` — Transisi masuk yang responsif, menukik cepat di awal, memelan panjang ke akhir _(snappy arrival)_.

## 4. Layout Families & Chrome

Mockup Makalah AI tidak memakai satu gaya layout untuk semua halaman. Terdapat 5 keluarga desain utama (Layout Styles) yang berjalan berdampingan dan mendefinisikan struktur halaman, header, footer, serta prioritas interaksi:

### 4.1 Gaya Marketing

Gaya marketing digunakan untuk halaman yang menjelaskan produk, nilai, harga, narasi perusahaan, dan materi publik yang bersifat promosi atau edukasi ringan.

**Contoh halaman:** Home (`#/`), Fitur (`#/features`), Tentang (`#/about`), Pricing (`#/pricing`), FAQ (`#/faq`), dan halaman marketing publik lainnya.

**Karakter layout:**

- Menggunakan global header marketing dengan logo, navigasi utama, CTA masuk, dan mobile menu.
- Menggunakan global footer marketing berisi kelompok link produk, sumber daya, perusahaan, legal, dan wordmark besar.
- Section disusun sebagai halaman editorial/landing page dengan ritme visual yang ekspresif.
- Memanfaatkan pola 2 kolom untuk memisahkan hirarki: kolom kiri untuk narasi utama, kanan untuk konten pendamping.

### 4.2 Gaya Shell

Gaya shell digunakan untuk halaman yang terasa seperti _workspace_ atau area operasional. Layout ini tidak mengikuti struktur _landing page_, karena fokusnya adalah navigasi internal, penyelesaian tugas interaktif, dan pembacaan panjang berkelanjutan.

**Contoh halaman:** Dokumentasi (`#/documentation`), Lapor Masalah (`#/report-issue`), dan Chat (`#/chat`).

**Karakter layout:**

- Tidak menggunakan global header atau global footer marketing standar.
- Navigasi utama dan kontrol sering diintegrasikan ke dalam sidebar/panel kiri.
- Area konten (sebelah kanan) menyatu sebagai _workspace_ utama, didukung footer khusus shell yang lebih ringkas.
- Memiliki perilaku khusus pada _mobile_ (contoh: pemanggilan _sidebar_ via tombol ringkas).

### 4.3 Gaya Blog

Gaya blog dirancang spesifik untuk kebutuhan konsumsi artikel dan editorial.

**Contoh halaman:** Halaman Daftar Blog (`#/blog`), Artikel Tunggal (`#/blog/[slug]`).

**Karakter layout:**

- Struktur header sering difokuskan untuk navigasi kategori atau judul artikel.
- Secara visual mengutamakan kenyamanan baca jarak panjang (tipografi dan line-height optimal).
- Menggunakan layout _grid/card_ untuk daftar artikel dan layout _single-column_ sentral (atau dilengkapi _table of contents_ di sisi) untuk bacaan artikel.

### 4.4 Gaya Policy (Kebijakan)

Gaya policy secara spesifik membungkus halaman-halaman legalitas dan kebijakan yang memerlukan kesan serius, baku, dan jelas.

**Contoh halaman:** Privacy (`#/privacy`), Security (`#/security`), Terms (`#/terms`).

**Karakter layout:**

- Berbasis struktur dokumen teks panjang (_document-based layout_).
- Desain minimalis tanpa ornamen berlebih untuk mempertahankan nuansa formal dan fokus penuh pada teks hukum.
- Dilengkapi navigasi seksi teks / sidebar khusus untuk pindah antar pasal atau poin regulasi dengan cepat.

### 4.5 Gaya Dashboard

Gaya dashboard ditujukan untuk manajemen akun, admin panel, ai ops, content management system, user setting, atau.

**Status:** Belum ada implementasi (nanti saja).

**Karakter layout:**

- Akan didesain untuk merender data kompleks (tabel, metrik), panel kontrol pengaturan, form manajemen, dan visualisasi pemakaian (_billing/usage_).

### 4.6 Konsekuensi Header & Footer

Tidak semua halaman boleh diasumsikan memakai global header dan global footer. Pemilihan lapisan bingkai (chrome) harus disesuaikan dengan keluarga layout di atas:

- **Gaya Marketing** wajib memakai `GlobalHeaderMock` dan `FooterMock`.
- **Gaya Shell** menggunakan header/sidebar khusus yang terintegrasi di dalam _workspace_ dan footer shell minimalis.
- **Gaya Blog** dan **Policy** dapat menggunakan kombinasi header spesifik (untuk konten/navigasi cepat) dengan footer standar atau minimal.

---

_Catatan Penerapan: Saat mereplika atau mengembangkan page baru melalui Tailwind (khususnya v4+), silakan pindahkan token OKLCH ini ke dalam `theme.extend` atau langsung dipasangkan ke dalam CSS variables `:root` / `.dark`._
