# Guideline & Kontrol Teknis: Migrasi Blog Page Redesign

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan **Blog Page** (Halaman Wawasan) ke standar **Makalah-Carbon**. Migrasi ini memastikan penyampaian informasi wawasan akademik tetap presisi, industrial, dan memiliki kepadatan informasi yang terjaga (**Mechanical Grace**).

## 0. Target Migrasi
*   **Target Pages**: `src/app/(marketing)/blog/page.tsx`
*   **Style Scope**: Pembersihan total class `hero-vivid`, `hero-section`, dan standardisasi bento card serta tipografi.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **Vivid to Carbon Transition**: Hilangkan class `hero-vivid` dan `hero-grid-thin`. Ganti dengan `GridPattern` dan `DottedPattern` yang snap ke container 16-kolom.

### 1.1 Palette Warna (OKLCH - Adaptive Theme)
*Referensi: [justifikasi-warna.md](../docs/justifikasi-warna.md)*
*   **Background Shell**: `bg-background` (Slate 50 / Slate 900).
*   **Card Surfaces**: `bg-card/30` dengan border `slate-800` (Dark Mode).
*   **Primary Accent**: `amber-500` (Amber 500) untuk link "Baca Selengkapnya" dan elemen branding.
*   **Categories**: `text-amber-500` (Signal Color).

### 1.2 Hirarki Tipografi
*Referensi: [typografi.md](../docs/typografi.md)*
*   **Main Hero Heading (H1)**: 
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Tracking: `tracking-tighter`.
*   **Post Titles (The Signal)**:
    *   Font: **Geist Sans**.
    *   Weight: `Bold (600)`.
    *   Size: `xl` - `2xl`.
*   **Categories & Meta Data**:
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Case: `UPPERCASE`.
    *   Tracking: `tracking-widest`.
    *   Size: `10px`.
*   **Narrative Excerpts**:
    *   Font: **Geist Sans** (`text-narrative`).
    *   Size: `sm` (14px).

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: [shape-layout.md](../docs/shape-layout.md)*
*   **Blog Cards (Bento)**: `.rounded-shell` (16px).
*   **Search & Buttons**: `.rounded-action` (8px) dengan `.hover-slash`.
*   **Internal Borders**: `.border-hairline` (0.5px) untuk pemisah antara thumbnail dan konten kartu.
*   **Grid Alignment**: Wajib snap ke **16-Column Grid**.

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Wrapper** | `hero-section hero-vivid` | `py-airy border-b-hairline bg-background` | Layout | Pembersihan legacy vivid visual. |
| **Hero Heading** | `hero-heading` | `.text-signal tracking-tighter` | Typography | Geist Mono Heading. |
| **Search Input** | `rounded-2xl` | `.rounded-action border-main` | Shape | Standar input industri (8px). |
| **Post Card Shell**| `rounded-2xl` | `.rounded-shell border-main` | Shape | Hybrid Radius Shell (16px). |
| **Category Tag** | `uppercase tracking-[0.2em]`| `.text-signal tracking-widest` | Typography | Geist Mono Signal style. |
| **Newsletter Card**| `rounded-2xl p-10` | `.rounded-shell border-hairline` | Shape & Precision | Konsistensi shell radius. |
| **Action Link** | `hover:gap-3 transition-all` | `.hover-slash` | Interaction | Mechanical signature hover. |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Penyelarasan Grid (16-Column Snap)
*   **Aksi**: Pastikan main container menggunakan `grid grid-cols-16`. 
*   **Featured Post**: Mengambil `col-span-16` dengan flex-row pada desktop.
*   **Blog Grid**: Setiap item mengambil `col-span-16` (mobile), `col-span-8` (tablet), atau `col-span-5/6` (desktop) sesuai layout 16-col.

### Step 2: Refactor Hero & Search
*   **Aksi**: 
    1. Ganti background gradien dengan `GridPattern` (z-0).
    2. Ubah `Input` search menjadi `.rounded-action` (8px). 
    3. Heading H1 wajib menggunakan **Geist Mono** untuk menegaskan identitas "Economic/Academic Data".

### Step 3: Standarisasi Blog Cards
*   **Aksi**:
    1. Ganti `rounded-2xl` dengan `.rounded-shell` (16px).
    2. Tambahkan `.border-hairline` (0.5px) pada separator antara metadata (date/author) dan isi post.
    3. Metadata (Date, Read Time) menggunakan **Geist Mono** regular.

### Step 4: Refactor Newsletter Section
*   **Aksi**: 
    1. Samakan gaya Newsletter dengan `CareerContactSection` (Background subtle, border hairline).
    2. Tombol "Gabung" menggunakan `.rounded-action` (8px) dan wajib memiliki efek `.hover-slash`.

### Step 5: Grayscale & Highlight Logic
*   **Aksi**: Pertahankan logic `grayscale` pada thumbnail yang bertransformasi ke warna saat hovered, karena ini masuk dalam protokol **Informational Density** (Visual silence before focus).

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Grid Audit**: Layout artikel sejajar dengan sistem 16-kolom.
- [ ] **Typo Audit**: Heading utama & Sinyal (Category) = Mono. Deskripsi = Sans.
- [ ] **Radius Audit**: Kartu Blog = 16px. Search & Buttons = 8px.
- [ ] **Border Audit**: Border antar blok konten dan divider internal menggunakan hairline 0.5px.
- [ ] **Color Audit**: Semua elemen brand warna Amber 500.
- [ ] **Interaction Audit**: Tombol Newsletter dan Link baca selengkapnya memiliki efek `.hover-slash`.
- [ ] **Data Audit**: Tanggal dan Waktu baca menggunakan Geist Mono.

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Halaman blog adalah repositori ilmu. Ia harus terasa bersih seperti jurnal riset tapi tetap memiliki sentuhan industri modern. Geist Mono pada heading memberikan kesan "Archive Discovery" yang kuat.
