# Makalah AI Design System Reference
Dokumen ini disusun sebagai panduan desain (System Design Doc) bagi pengembangan halaman-halaman Makalah AI ke depannya. Warna dasar gelap tetap didokumentasikan dalam format OKLCH, sementara warna brand utama dicatat dengan nilai logo sumber dan turunan `rgba()` agar asal brand-nya tidak ambigu.

## 1. Design Tokens (Primitif & Semantik)

Sistem warna menggunakan tema gelap (Dark Theme) dengan kontras yang dirancang khusus untuk keterbacaan panjang dan identitas teknologi yang modern. 

### 1.1 Surfaces (Backgrounds)
Digunakan sebagai lapisan hierarki z-index dari yang terdalam (layer 0) hingga permukaan terluar (panel mengambang).
- `--bg` (`oklch(0.154 0.003 248.00)`): Warna background paling dasar (root).
- `--bg-1` (`oklch(0.173 0.004 264.45)`): Warna dasar alternatif (layer 1) / variasi panel gelap.
- `--bg-2` (`oklch(0.196 0.006 271.09)`): Layer permukaan kartu (layer 2) tanpa transparansi.
- `--bg-elev` (`oklch(1 0 0 / 0.03)`): Digunakan untuk memberikan efek pencahayaan pada hover tombol atau elemen interaktif ringan.
- `--bg-panel` (`oklch(0.199 0.007 258.37 / 0.72)`): Digunakan untuk komponen melayang (floating panel/navbar) dengan integrasi filter `backdrop-blur`.

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
- `--brand-green-line` (`rgba(133, 181, 64, 0.30)`): Border *active* berbasis hijau logo.

### 1.4 Accents & Status (Brand Colors)
**Warna Brand Utama: Brand Green**
- `--brand-green` (`#85B540`): CTA utama, status aktif, dan sorotan elemen terpenting. Warna ini diturunkan langsung dari hijau logo Makalah. Dipasangkan dengan `--brand-green-ink (#0B0C0D)` untuk teks di dalamnya agar kontras.
- Variasi brand green: `--brand-green-soft` (`rgba(133, 181, 64, 0.16)`), `--brand-green-glow` (`rgba(133, 181, 64, 0.38)`), `--brand-green-line` (`rgba(133, 181, 64, 0.30)`).

**Warna Pendukung (Secondary Accents):**
Aksen tematik yang digunakan untuk pembeda *tag* atau elemen dekorasi spesifik.
- `--sky` (`oklch(0.876 0.103 213.51)`) & `--sky-soft` (`oklch(0.876 0.103 213.51 / 0.14)`)
- `--brand-orange` (`#F15523`) & `--brand-orange-deep` (`#B93A13`): Aksen hangat dari orange logo untuk trust, verified, completed, pricing highlight, dan kehangatan brand.

Aturan keterbacaan untuk orange dibuat keras: orange dipakai sebagai fill, border, glow, atau tint. Jangan pakai orange pekat sebagai teks di atas dark/hitam, jangan pakai teks orange di atas surface orange, dan jangan pakai teks gelap/hitam di atas fill orange. Elemen orange solid yang membawa teks memakai `--brand-orange-deep` sebagai fill dan `--brand-orange-ink` (`#FFF7F2`) sebagai teks; teks di atas surface dark/orange-soft memakai `--ink` atau `--ink-2`.

**Status Fungsional:**
- `--ok` (`oklch(0.848 0.134 154.85)`): Sukses, tanda cek, status jalan/hijau.
- `--warn` (`oklch(0.856 0.126 75.97)`): Peringatan operasional.

## 2. Tipografi (Typography)

Susunan huruf mengandalkan triptych desain UI modern berbasis `Geist` sebagai preferensi utama berpadu dengan stack sans/mono. Semua tipografi secara default merender dengan fitur OpenType `ss01` dan `cv11`.

- **Display** (`--font-display`): `"Geist", "General Sans", ui-sans-serif, system-ui`. Digunakan untuk judul super besar (`.display`, `h2.sec-title`). Sifatnya padat dan geometris.
- **Body/Sans** (`--font-sans`): `"Geist", "Inter", ui-sans-serif`. Font pembacaan utama (*body paragraph*, antarmuka standar). Line-height proporsional (1.5).
- **Monospace** (`--font-mono`): `"Geist Mono", "JetBrains Mono", ui-monospace`. Untuk indikator code, eyebrow atas judul (`.eyebrow`, `/ REFRASA`), label khusus algoritma (`.mono-label`).

## 3. Sistem Jarak, Area, & Transisi

### 3.1 Border Radius (Kelengkungan Sisi)
Digunakan konsisten sesuai ukuran elemen agar menjaga hirarki "lingkaran anak di dalam lingkaran ayah" *(concentric radii)*.
- `--r-xs` (`4px`): Paling tajam (badge teks mikroskopis, tag mono).
- `--r-sm` (`6px`): Tombol standar & icon box. 
- `--r-md` (`10px`): Container gambar standar, sub-card kecil.
- `--r-lg` (`16px`): Elemen utama UI (*Showcase box*, *Card pricing* tinggi).
- `--r-xl` (`24px`): Bingkai terluar.

### 3.2 Visual Depth (Kotak Bayangan)
Mengandalkan manipulasi z-axis minimalis lewat bayangan panjang:
- `--shadow-1`: Drop shadow pendek dengan semburat *inset* halus (bevel lighting 4%).
- `--shadow-2`: Soft shadow blur tebal 60px (`0 20px 60px rgba(0,0,0,0.45)`) untuk komponen yang sangat mengambang.
- `--shadow-hot`: Glow effect dari warna sekunder untuk indikasi status aktif (*active state* button CTA).

### 3.3 Motion & Transitions
Animasi *reveal* atau *hover* tidak linier. Wajib memakai *easing* kustom berbasis CSS.
- `--ease`: `cubic-bezier(0.16, 1, 0.3, 1)` — Transisi masuk yang responsif, menukik cepat di awal, memelan panjang ke akhir *(snappy arrival)*.

---
*Catatan Penerapan: Saat mereplika atau mengembangkan page baru melalui Tailwind (khususnya v4+), silakan pindahkan token OKLCH ini ke dalam `theme.extend` atau langsung dipasangkan ke dalam CSS variables `:root` / `.dark`.*
