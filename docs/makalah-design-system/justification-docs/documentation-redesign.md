# Guideline & Kontrol Teknis: Migrasi Documentation Page Redesign

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan **Documentation Page** (Halaman Dokumentasi) ke standar **Makalah-Carbon**. Fokus utama adalah pada kejelasan hirarki informasi, presisi navigasi, dan kepadatan data yang optimal (**Mechanical Grace**).

## 0. Target Migrasi
*   **Target Pages**: `src/app/(marketing)/documentation/page.tsx`
*   **Style Scope**: Migrasi total ke Tailwind utility classes dan sistem token Carbon. Penghapusan inline styles dan class legacy.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **Density Overload**: Halaman dokumentasi diizinkan memiliki kepadatan informasi yang lebih tinggi (`.p-dense`) dibandingkan landing page marketing, guna meningkatkan efisiensi pembacaan data teknis.

### 1.1 Palette Warna (OKLCH - Adaptive Theme)
*Referensi: [justifikasi-warna.md](../docs/justifikasi-warna.md)*
*   **Background Shell**: `bg-background` (Slate 50 / Slate 900).
*   **Sidebar Surface**: `bg-slate-200/30` (Light) / `bg-slate-800/20` (Dark).
*   **Primary Accent**: `amber-500` (Amber 500) untuk elemen aktif dan navigasi terpilih.
*   **Info Blocks**: `sky-500` (Sky 500) untuk kartu informasi (`infoCard`) guna menandakan konten sistem/diagnostik.

### 1.2 Hirarki Tipografi
*Referensi: [typografi.md](../docs/typografi.md)*
*   **Document Headers (H1)**: 
    *   Font: **Geist Mono** (Sejajar dengan standarisasi data teknis).
    *   Weight: `Bold (700)`.
*   **Sidebar Nav & Section Headers**:
    *   Font: **Geist Mono**.
    *   Weight: `Medium (500)`.
    *   Case: `UPPERCASE` (untuk Header Group).
*   **Content Paragraphs**:
    *   Font: **Geist Sans** (`text-narrative`).
    *   Size: `14px`.
*   **Code & Technical Terms**:
    *   Font: **Geist Mono** (`text-interface`).
    *   Background: `bg-slate-950` (Dark Mode style).

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: [shape-layout.md](../docs/shape-layout.md)*
*   **Sidebar Shell**: `.rounded-none` (Kesan menyatu dengan browser border).
*   **Interactive Items (Nav/Search)**: `.rounded-action` (8px).
*   **Info Cards**: `.rounded-shell` (16px).
*   **Grid Alignment**: Wajib snap ke **16-Column Grid** menggunakan pembagian `4-12`.

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Main Wrapper** | `flex min-h-screen` | `grid grid-cols-16 gap-0` | Layout | Snap ke grid 16-kolom (Sidebar: 4, Content: 12). |
| **Sidebar Aside** | `w-64 border-r` | `col-span-4 border-r-hairline`| Layout & Precision | Konsistensi lebar kolom & garis hairline. |
| **Search Input** | `rounded-md border` | `.rounded-action border-main` | Shape | Standar input industri. |
| **Sidebar Links** | `font-hero text-sm` | `.text-interface text-xs` | Typography | Geist Mono untuk interface teknis. |
| **Article Title** | `font-heading text-2xl` | `.text-signal tracking-tight` | Typography | Hirarki sinyal utama. |
| **Info Cards** | `rounded-lg border` | `.rounded-shell border-main` | Shape | Hybrid Radius untuk blok informasi. |
| **Code Snippets** | `rounded bg-muted` | `.text-interface bg-slate-950` | Typography | Standar terminal/IDE. |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Penyelarasan Arsitektur 16-Col
*   **Aksi**: Ganti `flex` pada wrapper utama dengan `grid grid-cols-16`. 
*   **Logic**: 
    - `aside`: `col-span-4`.
    - `main`: `col-span-12`.
*   **Hairline**: Ganti `border-r` standar menjadi `border-r-[0.5px] border-slate-800`.

### Step 2: Refactor Navigasi Sidebar
*   **Aksi**: 
    1. Ganti `font-hero` dengan **Geist Mono**.
    2. Header grup menggunakan `.text-signal` (Uppercase + Bold).
    3. Item navigasi aktif menggunakan aksen `border-l-2 border-amber-500` dan background subtle.

### Step 3: Standarisasi Konten Dokumentasi
*   **Aksi**:
    1. Refactor `renderInline` untuk memastikan tag `strong` menggunakan `.text-narrative font-semibold` dan tag `code` menggunakan `.text-interface bg-slate-950`.
    2. Gunakan `.border-hairline` untuk list item (`li`) jika ada separator.

### Step 4: Refactor Info-Cards & CTA
*   **Aksi**: 
    1. Gunakan `.rounded-shell` (16px) untuk `infoCard`.
    2. `ctaCards` harus mengikuti standar Bento Grid dengan `col-span-6` (di dalam sub-grid content) dan menggunakan `.hover-slash`.

### Step 5: Search Interface Update
*   **Aksi**: 
    1. Hasil pencarian (dropdown/popover) wajib menggunakan `.rounded-md` (8px).
    2. Gunakan `.text-interface` pada teks hasil pencarian untuk kesan diagnostik yang cepat.

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Grid Audit**: Sidebar dan Content sejajar dengan 16-kolom (Split 4:12).
- [ ] **Typo Audit**: Navigasi & Code terpantau menggunakan Geist Mono. Paragraf deskripsi menggunakan Geist Sans.
- [ ] **Radius Audit**: Info cards = 16px. Nav items/Input = 8px.
- [ ] **Border Audit**: Border vertikal pemisah sidebar mengadopsi 0.5px (Hairline).
- [ ] **Color Audit**: Aksen aktif terpantau menggunakan Amber 500, Info Cards menggunakan Sky 500.
- [ ] **Interaction Audit**: Semua tombol navigasi aktif tidak menggunakan `.hover-slash`, hanya tombol CTA di dalam dokumentasi yang menggunakannya.
- [ ] **Search Audit**: Input search menggunakan radius 8px dan tipografi Mono.

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Dokumentasi adalah "Manual Pesawat" untuk AI Agents. Ia harus sangat rapi, berpola Mono pada area kontrol, dan Sans pada area instruksi naratif. Jangan ada dekorasi yang membuang ruang.
