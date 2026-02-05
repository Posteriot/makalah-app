# Guideline & Kontrol Teknis: Migrasi About Page Redesign

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan **About Page** (Halaman Tentang) ke standar **Makalah-Carbon**. Migrasi ini bertujuan untuk menegaskan filosofi **Mechanical Grace** melalui kejujuran struktural dan presisi informasi.

## 0. Target Migrasi
*   **Target Components**: 
    *   `src/components/about/ManifestoSection.tsx`
    *   `src/components/about/ProblemsSection.tsx`
    *   `src/components/about/AgentsSection.tsx`
    *   `src/components/about/CareerContactSection.tsx`
    *   `src/components/about/AccordionAbout.tsx`
*   **Target Pages**: `src/app/(marketing)/about/page.tsx`
*   **Style Scope**: Pembersihan legacy styles, standardisasi radius, dan tipografi Mono.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **No Hero Policy**: Sesuai [shape-layout.md](../docs/shape-layout.md), halaman "About" dilarang menggunakan Hero yang ekspansif. Fokus langsung pada konten melalui `ManifestoSection`.

### 1.1 Palette Warna (OKLCH - Adaptive Theme)
*Referensi: [justifikasi-warna.md](../docs/justifikasi-warna.md)*
*   **Background Sections**: `bg-background` (Slate 50 / Slate 900).
*   **Aksen Utama**: `amber-500` (Amber 500) untuk elemen atensi (dot, progress).
*   **Aksen Sekunder**: `emerald-500` (Emerald 500) untuk status "Available" atau validasi.
*   **Internal Borders**: `.border-hairline` (0.5px) untuk sekat antar persoalan/fitur.

### 1.2 Hirarki Tipografi
*Referensi: [typografi.md](../docs/typografi.md)*
*   **Section Headers (H2/H3)**:
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Case: `Default`.
    *   Tracking: `tracking-tight`.
*   **Narrative Body**:
    *   Font: **Geist Sans** (`text-narrative`).
    *   Weight: `Regular (400)`.
*   **Status Badges & Labels (The Signal)**:
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Case: `UPPERCASE`.
    *   Tracking: `tracking-widest`.
    *   Size: `10px`.

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: [shape-layout.md](../docs/shape-layout.md)*
*   **Outer Cards (Bento Items)**: `.rounded-shell` (16px).
*   **Action Buttons/Triggers**: `.rounded-action` (8px) dengan `.hover-slash`.
*   **Padding**: `.p-airy` (24px-32px) untuk landing sections.
*   **Grid alignment**: Wajib snap ke **16-Column Grid**.

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Section Header** | `font-mono text-3xl` | `.text-signal tracking-tight` | Typography | Standarisasi industrial signal. |
| **Bento Cards** | `rounded-lg border-black/20` | `.rounded-shell border-main` | Shape & Surface | Hybrid radius: Shell (16px). |
| **Status Badge** | `rounded-full text-[11px]` | `.rounded-badge text-signal` | Shape & Typo | Geist Mono + Signal Hierarchy. |
| **Icon Container** | `rounded-md bg-brand/10` | `.rounded-action bg-amber-500/10`| Shape & Color | Konsistensi Amber Identity. |
| **Contact Button** | `rounded-lg font-semibold` | `.rounded-action hover-slash` | Interaction | Mechanical signature hover. |
| **Dividers** | `border-t border-black/10` | `.border-hairline` | Precision | Hairline separator (0.5px). |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Penyelarasan Grid (16-Column Snap)
*   **Aksi**: Pastikan wrapper setiap section menggunakan `grid grid-cols-16`.
*   **Manifesto**: Konten Manifesto mengambil `col-span-12` (Triple Block) agar tetap fokus di tengah/kiri.
*   **Bento Grids**: Item di `ProblemsSection` dan `AgentsSection` menggunakan `col-span-8` (Medium Block) pada desktop.

### Step 2: Refactor Manifesto (The Soul)
*   **Aksi**:
    1. Ganti font paragraf narasi ke **Geist Sans** (`text-narrative`).
    2. Ubah trigger button (baca selengkapnya) menjadi `.rounded-action` dengan `.hover-slash`.

### Step 3: Standarisasi Signals (Badges & Tags)
*   **Aksi**:
    1. Ganti `rounded-full` pada badge status agent ke `.rounded-badge` (6px).
    2. Pastikan teks menggunakan font **Mono**, **Bold**, dan **Uppercase**.

### Step 4: Refactor Bento Items & Cards
*   **Aksi**:
    1. Terapkan `.rounded-shell` (16px) pada semua kartu.
    2. Pindahkan warna `brand` ke `amber-500` secara eksplisit melalui token.

### Step 5: Texture & Background Validation
*   **Aksi**: Pastikan `GridPattern` dan `DottedPattern` tetap hadir sebagai basis industrial tapi atur `opacity` agar tidak mengalihkan perhatian dari teks panjang di manifesto.

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Grid Audit**: Semua section snap ke sistem 16-kolom.
- [ ] **Typo Audit**: Narasi manifesto = Sans. Header persoalan = Mono. Label status = Mono Uppercase.
- [ ] **Radius Audit**: Containers = 16px. Interactive elements = 8px.
- [ ] **Color Audit**: Emerald 500 buat "Available", Amber 500 buat branding.
- [ ] **Interaction Audit**: Trigger collapsible dan tombol kontak memiliki efek `.hover-slash`.
- [ ] **Responsive Audit**: Accordion mobile tetap fungsional dengan radius baru.

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: About Page harus "bernaung" di bawah kejujuran fungsional. Jangan gunakan ornamen yang tidak perlu. Biarkan tipografi Mono dan garis hairline yang mendefinisikan estetika "Academic Instruments" di halaman ini.
