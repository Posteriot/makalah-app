# Panduan Typografi - Makalah-Carbon

Dokumen ini mendefinisikan standar hirarki, font-weight, dan tata aturan penulisan untuk Makalah App agar selaras dengan estetika **Mechanical Grace**.

## 1. Font Family

Kita menggunakan dua pilar font untuk membedakan antara antarmuka pengguna dan data diagnostik:

1.  **Geist Sans**: Font utama untuk seluruh elemen UI, navigasi, dan konten naratif.
2.  **Geist Mono**: Khusus untuk data teknis, angka, kode, input terminal, dan metadata.

## 2. Font Weight Reference

Menggunakan spektrum penuh dari Geist family untuk kontrol hirarki yang presisi:

| Name | Weight | Penggunaan Utama |
| :--- | :--- | :--- |
| **Thin** | `100` | Headline raksasa (dekoratif/subtle). |
| **UltraLight** | `200` | Sub-headline elegan. |
| **Light** | `300` | Body text ringan / De-emphasized text. |
| **Regular** | `400` | **Standard**: Body text, paragraf, input text. |
| **Medium** | `500` | Modul title, primary nav links. |
| **SemiBold** | `600` | Heading kecil, button text. |
| **Bold** | `700` | **Key**: Main Headings, Branding, Alert titles. |
| **Black** | `900` | Ultra-emphasis / Hero text. |

## 3. Hirarki Visual (Typographic Scale)

| Level | Size | Weight | Case | Konteks |
| :--- | :--- | :--- | :--- | :--- |
| **Display / H1** | `24px+` | **Bold (700)** | Default | Judul halaman utama, Page Hero. |
| **H2 / Section** | `18px` | **SemiBold (600)** | Default | Judul modul dashboard / Bento. |
| **H3 / Card** | `14px` | **Medium (500)** | Default | Judul dalam card atau panel. |
| **Subheading** | `14px` | **Regular (400)** | Default | Deskripsi pendek di bawah judul. |
| **Body** | `12px` | **Regular (400)** | Default | Konten utama, chat bubble, artikel. |
| **Label / Meta** | `10px` | **Bold (700)** | **UPPERCASE** | Badge, status indicator, table header. |
| **Small / Footer** | `8px` | **Medium (500)** | Default | Legal text, micro-metadata. |

## 4. Tata Aturan Penulisan (Placement Rules)

### 4.1 Headings & Titles
- **Alignment**: Selalu rata kiri (*left-aligned*) sesuai grid 16-kolom.
- **Tracking**: Gunakan `tracking-tight` (-0.025em) untuk H1/H2 agar terlihat lebih padat dan "industrial".

### 4.2 Labels & Badges (Signal Text)
- Mengacu pada rujukan **Factory.ai**, semua label kategori (misal: "VISION", "PRODUCT", "NEW") wajib menggunakan **Bold**, **Uppercase**, dan **Extra Letter Spacing** (`tracking-widest`).
- Gunakan **Geist Mono** untuk label yang bersifat fungsional/sistem.

### 4.3 Form & Input
- **Label Input**: Berada di atas input field, menggunakan weight **SemiBold (600)** ukuran **10px**.
- **Input Text**: Menggunakan **Geist Sans/Mono Regular (400)** ukuran **12px**.
- **Placeholder**: Menggunakan **Geist Sans Light (300)** dengan warna Slate-400.

### 4.4 Data & Technical Numbers
- Semua angka (harga, statistik, ID, jam/waktu) **WAJIB** menggunakan **Geist Mono** untuk menjamin keterbacaan baris yang sejajar (*tabular lining*).

---
> [!TIP]
> **Mechanical Grace Hint**: Jika teks berfungsi sebagai "Sinyal" (Status, Kategori, Metadata), gunakan **Mono + Uppercase**. Jika teks bersifat "Dialog" (Pesan User, Narasi), gunakan **Sans + Sentence case**.
