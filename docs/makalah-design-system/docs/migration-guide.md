# Panduan Migrasi: Menuju Mechanical Grace

Dokumen ini adalah protokol operasional untuk memindahkan Makalah App dari *legacy styling* ke standar **Mechanical Grace**. Fokus utama kita adalah **Safety First** (Keamanan) dan **Incremental Clarity** (Kejelasan Bertahap).

## 1. Persiapan & Prosedur Keamanan (The Safety Net)

Sebelum memulai migrasi pada file `src/`, wajib melakukan prosedur berikut:

### 1.1 Pencadangan (Backup System)
1.  Buat direktori baru: `src/styles/legacy/`.
2.  Salin `src/app/globals.css` ke `src/styles/legacy/globals-legacy.bak.css`.
3.  Jangan hapus file asli sampai migrasi 100% selesai dan terverifikasi.

### 1.2 Lingkungan Paralel
- Kita tidak akan langsung merombak `globals.css` secara total.
- Gunakan **CSS Scope** dengan class `.grace-mode` pada elemen root (misalnya di `layout.tsx` khusus untuk halaman yang sedang di-migrasi) untuk mengaktifkan styling baru secara parsial.

---

## 2. Roadmap Migrasi Bertahap (The Roadmap)

Dilarang melakukan migrasi sekaligus. Ikuti urutan prioritas ini:

### Fase 1: Foundation Injection (Low Risk)
- **Action**: Masukkan semua variabel CSS baru (tokens) dari [global-css.md](./global-css.md) ke dalam blok `@theme` di `globals.css`. Pastikan variabel Dark Mode juga terinjeksi sempurna.
- **Sync**: Sesuaikan styling **Clerk Auth** (jika ada) via `appearance` prop atau CSS overrides agar selaras dengan palet Slate/Amber.
- **Goal**: Memberikan akses ke "cat" baru (Amber, Emerald, Mono font) tanpa mengubah tampilan elemen yang sudah ada.

### Fase 2: Global Shell (Medium Risk)
- **Action**: Migrasi **Header** dan **Sidebar**.
- **Change**: Ganti ikon Lucide ke **Iconoir**, terapkan `.text-interface` (Mono) pada metadata, dan terapkan standard radius pada container.

### Fase 3: Page-by-Page Migration (High Reward)
Migrasi halaman dengan urutan kompleksitas rendah ke tinggi:
1.  **Auth & Landing**: Struktur sederhana, risiko rendah.
2.  **Dashboard & Subscription**: Pengerjaan grid dan tabel data (Geist Mono tabular nums).
3.  **AI Chat Workspace**: Pengerjaan layout 16-kolom, Zero-Chrome, dan modul Refrasa/Paper.

---

## 3. Protokol Implementasi (The Protocol)

Setiap Agent AI atau Developer yang mengerjakan migrasi wajib mematuhi aturan ini:

1.  **Strict Token Usage**: Dilarang menggunakan nilai heksadesimal atau class Tailwind generik (misal: `rounded-xl`). Harus menggunakan variabel yang sudah di-map (misal: `rounded-shell`).
2.  **Iconoir Replacement**: Hapus `lucide-react` dan ganti dengan ikon yang setara dari `iconoir-react`.
3.  **Mono for Precision**: Semua angka, harga, label status, dan metadata teknis wajib menggunakan font Mono.
4.  **Hairline Check**: Periksa setiap divider. Pastikan menggunakan `border-hairline` (0.5px).
5.  **UI Component Audit**: Saat migrasi halaman, periksa file terkait di `src/components/ui/`. Jika ada hardcoded warna atau radius, pindahkan ke variabel standar.
6.  **Responsive Integrity**: Verifikasi layout menggunakan sistem **16-Column Grid** sesuai [shape-layout.md](./shape-layout.md). Pastikan tidak ada konten yang terpotong di breakpoint `lg` atau `xl`.

---

## 4. Verifikasi & Rollback (The Fail-Safe)

### 4.1 Kriteria Lulus Audit
- [ ] Tidak ada elemen yang menggunakan `rounded` selain skala yang ditentukan di `shape-layout.md`.
- [ ] Semua ikon menggunakan Iconoir.
- [ ] Angka statistik dan harga menggunakan Geist Mono.
- [ ] Header/Footer global tidak muncul di area Chat Workspace.

### 4.2 Prosedur Rollback
Jika terjadi *visual breakage* yang parah:
1.  Hapus class `.grace-mode` dari komponen bermasalah.
2.  Kembalikan impor ikon ke Lucide untuk sementara.
3.  Rujuk kembali ke `src/styles/legacy/globals-legacy.bak.css` untuk melihat nilai parameter lama.

---

## 5. Migration Tracker

Gunakan tabel ini untuk memantau progres transisi ke standar Mechanical Grace.

| Layer / Module | Scope / Page | Status | PIC | Tanggal |
| :--- | :--- | :--- | :--- | :--- |
| **Foundation** | CSS Variables (global-css.md) | ⏳ Pending | - | - |
| **Global Shell** | Main Navigation Bar (Global) | ⏳ Pending | - | - |
| | Sidebar Navigation (Dashboard) | ⏳ Pending | - | - |
| | Mini Footer (Chat Workspace) | ⏳ Pending | - | - |
| | Standard Footer (Marketing/Main) | ⏳ Pending | - | - |
| **Marketing** | Home Page / Hero Section | ⏳ Pending | - | - |
| | Pricing & Tiers Page | ⏳ Pending | - | - |
| | About & Story Page | ⏳ Pending | - | - |
| | Blog & Documentation Hub | ⏳ Pending | - | - |
| **Auth** | Login / Register / Verify | ⏳ Pending | - | - |
| **Onboarding** | Get Started Flow (Steps) | ⏳ Pending | - | - |
| | Checkout & Payment Selection | ⏳ Pending | - | - |
| **Dashboard** | Papers Grid (Main Library) | ⏳ Pending | - | - |
| | Settings & Security Modal | ⏳ Pending | - | - |
| | Subscription Overview & Billing | ⏳ Pending | - | - |
| **AI Workspace** | Chat Interface Shell | ⏳ Pending | - | - |
| | Artifact Content (Document View) | ⏳ Pending | - | - |
| | Refrasa (Comparison Dialog) | ⏳ Pending | - | - |
| | Paper Generation Management | ⏳ Pending | - | - |
| **Admin** | Admin Dashboard Interface | ⏳ Pending | - | - |

---

## 6. Common Pitfalls (Jebakan Umum)

Hindari kesalahan berikut yang sering terjadi selama transisi visual:

1.  **"Ghost" Rounded Corners**: Menggunakan utility `rounded` tanpa `-shell` atau `-action`. Hasilnya, radius elemen tidak konsisten dengan grid industrial.
2.  **Lucide-Iconoir Mixture**: Meninggalkan ikon Lucide di area yang sudah dimigrasi. Pastikan audit total per halaman.
3.  **Font-Sans for Numbers**: Lupa menerapkan `font-mono` pada angka harga atau kuota. Ini merusak keterbacaan data yang butuh presisi.
4.  **Header Leakage**: Membiarkan Global Header muncul di halaman `/chat/*`. Ini melanggar aturan arsitektur [shape-layout.md](./shape-layout.md).
5.  **Dashed Border Misuse**: Menggunakan `border-ai` (dashed) pada elemen manual yang bukan buatan sistem AI.

---
> [!IMPORTANT]
> **Mechanical Grace** bukan sekadar kosmetik, tapi penyelarasan fungsi. Jika migrasi menghambat keterbacaan atau fungsi, segera laporkan.
