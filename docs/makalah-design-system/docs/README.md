# Makalah-Carbon Design System (Mechanical Grace)

Selamat datang di titik masuk utama untuk sistem desain Makalah App. Direktori ini dirancang khusus untuk menjadi **Konteks Utama** bagi Agent AI maupun Developer dalam melakukan migrasi visual dari standar generik ke standar **Mechanical Grace**.

## 1. Misi & Filosofi
Proyek ini bertujuan untuk mengubah Makalah App menjadi instrumen riset yang presisi, industrial, dan efisien. Kita menyebut estetika ini sebagai **"Mechanical Grace"**—keindahan yang lahir dari presisi mekanis dan kejujuran fungsional.

### Pilar Utama:
- **Trinity Approach**: Logic (shadcn) + Identity (Carbon Tokens) + Delivery (Tailwind v4).
- **Hybrid Radius**: Kontras shell premium (16px) vs core data tajam (0px).
- **Information Density**: Penggunaan Hairline (0.5px) dan tipografi Geist Mono untuk data.

---

## 2. Peta Jalan Dokumen (Index of Truth)

Gunakan tabel di bawah ini untuk mencari aturan spesifik sebelum melakukan modifikasi kode:

| No | Dokumen | Peruntukan Utama |
| :--- | :--- | :--- |
| 1 | **[MANIFESTO.md](docs/MANIFESTO.md)** | Ruh dan prinsip utama "Mechanical Grace" & Trinity Approach. |
| 2 | **(MIGRATED)** `src/app/globals.css` | Konfigurasi variabel CSS & Tailwind v4 `@theme`. |
| 3 | **[typografi.md](docs/typografi.md)** | Hirarki font Geist Sans & Mono serta standar data teknis. |
| 4 | **[justifikasi-warna.md](docs/justifikasi-warna.md)** | Standar palet warna (Amber, Emerald, Sky, Slate). |
| 5 | **[shape-layout.md](docs/shape-layout.md)** | Aturan radius (Hybrid), border hairline, & 16-col grid. |
| 6 | **[bahasa-visual.md](docs/bahasa-visual.md)** | Standar Ikon (**Iconoir**), Tekstur Industrial, & Motion. |
| 7 | **[komponen-standar.md](docs/komponen-standar.md)** | **Blueprint Visual**: Auth, Dashboard, Settings, Billing. |
| 8 | **[ai-elements.md](docs/ai-elements.md)** | **Master AI Blueprint**: Chat, Refrasa, Paper Management. |
| 9 | **[class-naming-convention.md](docs/class-naming-convention.md)** | Standar penamaan class Tailwind & State interaksi. |
| 10 | **[migration-guide.md](docs/migration-guide.md)** | Protokol Keamanan & Roadmap Migrasi Bertahap. |

---

## 3. Instruksi Khusus untuk Agent AI (Migration Mode)

Jika Anda adalah Agent yang bertugas melakukan migrasi visual, ikuti protokol ini:

1.  **Read Manifesto First**: Pahami konsep `Mechanical Grace` sebelum menyentuh file `src/`.
2.  **Verify Tokens**: Pastikan variabel CSS yang Anda gunakan sudah terdaftar di `src/app/globals.css`.
3.  **Strict Mono Rule**: Gunakan `Geist Mono` (`.text-interface`) untuk semua data teknis, angka, dan metadata. Jangan tebak-tebak.
4.  **Hairline Protocol**: Gunakan `border-hairline` (0.5px) untuk pemisah internal dalam modul.
5.  **Layout Snap**: Untuk area Chat, pastikan mengikuti blueprint `16-Column Grid` di `shape-layout.md`.
6.  **shadcn Usage**: Komponen shadcn akan otomatis menggunakan tema ini karena variabel dasar (`--background`, `--primary`, dll) sudah di-map di `src/app/globals.css`.

---

## 4. External References

- **Icon Library**: [Iconoir Official](https://iconoir.com) \| [Iconoir GitHub](https://github.com/iconoir-icons/iconoir)
- **Base Framework**: [Next.js](https://nextjs.org) \| [shadcn/ui](https://ui.shadcn.com)
- **Design Inspiration**: [Carbon Design System](https://carbondesignsystem.com)

---
