# Bahasa Visual & Protokol Interaksi - Makalah-Carbon

Dokumen ini mendefinisikan standar aset visual dan perilaku interaktif untuk menjamin konsistensi **Mechanical Grace** di seluruh platform.

## 1. Iconography System (The Instruments)

Kita menggunakan **[Iconoir](https://iconoir.com)** sebagai pustaka ikon standar. Ikon diperlakukan sebagai instrumen teknis yang geometris dan presisi, bukan ilustrasi dekoratif.

### 1.1 Spesifikasi Teknis
- **Resources**: [Website Reference](https://iconoir.com) \| [GitHub Repository](https://github.com/iconoir-icons/iconoir)
- **Stroke Width**: Konsisten di `1.5px` (Standard) atau `2px` (High Contrast). Dilarang menggunakan ikon solid kecuali untuk status aktif yang mendesak.
- **Sizing Scale**:
    - **Micro (12px)**: Badge, inline status, micro-metadata.
    - **Interface (16px)**: **Default**. Sidebar, buttons, form icons, chat actions.
    - **Display (24px)**: Header section, bento headers, hero features.
- **Package**: Gunakan `iconoir-react` untuk implementasi di Next.js.
- **Scaling Rule**: Jika navigasi diciutkan (collapsed), gunakan ukuran `20px` untuk menjaga *visibility*.

### 1.2 Warna Ikon
- **Neutral**: `Slate-400 / 500` (De-emphasized).
- **Active**: `Amber-500` atau `Foreground`.
- **System**: Mengikuti [Signal Theory](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-design-system/MANIFESTO.md) (Emerald/Sky/Rose).

---

## 2. Industrial Textures (The Material)

Tekstur digunakan untuk memberikan kedalaman visual (depth) tanpa mengganggu keterbacaan data.

| Tipe | Visual | Penggunaan / Konteks |
| :--- | :--- | :--- |
| **Grid Pattern** | Garis kotak 48px | Area luas yang kosong (Latar belakang dashboard/chat). |
| **Dotted Pattern** | Titik-titik mikro | Area diagnostik, panel AI, atau "Machine Thinking" state. |
| **Diagonal Stripes**| Garis miring `/ / /` | Tombol aktif (hover), status Warning, atau area premium/PRO. |

---

## 3. Protokol Interaksi (Micro-Interactions)

Interaksi di Makalah App harus terasa "Inertial but Precise"—tidak lembek, tapi memiliki bobot mekanis.

### 3.1 Motion & Durations
- **Instant (50ms)**: Feedback hover sederhana.
- **Fast (150ms)**: Transisi elemen kecil (toggle, dropdown).
- **Standard (250ms)**: Pembukaan modal, ekspansi sidebar (pake `ease-out`).
- **Mechanical Easing**: Hindari `bounce` yang berlebihan. Gunakan `cubic-bezier(0.4, 0, 0.2, 1)`.

### 3.2 Hover Effects
- **Action Elements**: `.hover-slash` dipakai untuk aksi **premium/khusus** (mis. command palette). Tombol utama standar boleh memakai **hover solid** tanpa slash, selama kontras tetap tinggi.
- **Data Rows**: Gunakan *subtle tint* `bg-slate-50/5` dengan hairline border yang sedikit menebal atau berganti warna ke `Amber`.

---

## 4. Feedback & Empty States

AI System harus selalu memberikan umpan balik ketika memproses atau tidak menemukan data.

- **Thinking State**: Gunakan **Skeleton Loader** dengan pola **Diagonal Stripes** yang beranimasi lambat (pulse).
- **Empty State**: Gunakan ikon **Micro** (12px) di tengah area luas dengan font Mono: `[E_04_NO_DATA_FOUND]`. Hindari ilustrasi kartun yang terlalu ramai.
- **Validation**: Berikan "vibrasi" visual (border flash) saat AI berhasil memvalidasi sebuah tahap paper.

---
> [!TIP]
> **Pro Protokol**: Anggaplah setiap klik sebagai perpindahan gigi pada mesin presisi. Harus ada umpan balik visual yang tegas tapi tidak mengganggu alur kerja kognitif pengguna.

## 5. Resources & References
- **Official Website**: [iconoir.com](https://iconoir.com)
- **GitHub Repository**: [github.com/iconoir-icons/iconoir](https://github.com/iconoir-icons/iconoir)
- **Documentation**: [iconoir.com/docs](https://iconoir.com/docs/introduction)
