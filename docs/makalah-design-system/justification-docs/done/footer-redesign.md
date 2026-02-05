# Guideline & Kontrol Teknis: Migrasi Footer Redesign

Dokumen ini adalah panduan teknis komprehensif untuk memigrasikan komponen Footer ke standar **Makalah-Carbon**. Dokumen ini menjamin harmoni visual antara Header dan Footer di bawah filosofi **Mechanical Grace**.

## 0. Target Migrasi
*   **Target Components**: `src/components/layout/footer/Footer.tsx`
*   **Target Pages**: Seluruh page marketing/landing.
*   **Style Scope**: Migrasi total ke Tailwind utility classes.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **CSS Mandate**: Hilangkan seluruh Custom CSS legacy dan ganti dengan **Tailwind CSS Utility Classes**. Seluruh pattern `DiagonalStripes` dan layouting wajib menggunakan abstraksi Tailwind/Carbon.

Penerapan token desain harus merujuk pada nilai teknis absolut berikut.

### 1.1 Palette Warna (OKLCH - Adaptive Theme)
*Referensi: [justifikasi-warna.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/justifikasi-warna.md)*
*   **Light Mode Surface**: `oklch(.984 .003 247.858)` (Slate 50).
*   **Dark Mode Surface**: `oklch(.208 .042 265.755)` (Slate 900).
*   **Adaptive Text**: 
    *   Primary: `oklch(0.15 0 0)` (Light) / `oklch(0.95 0 0)` (Dark).
    *   Muted: `oklch(.554 .046 257.417)` (Slate 500).
*   **Internal Borders**: Gunakan `.border-hairline` (0.5px) menggunakan token `Slate 200` atau `Slate 800`.

### 1.2 Hirarki Tipografi
*Referensi: [typografi.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/typografi.md)*
*   **Footer Headers (The Signal)**: 
    *   Font: **Geist Mono**.
    *   Weight: `Bold (700)`.
    *   Case: `UPPERCASE`.
    *   Tracking: `tracking-widest` (0.1em).
    *   Size: `12px`.
*   **Nav Links (The Voice)**:
    *   Font: **Geist Sans**.
    *   Weight: `Medium (500)`.
    *   Size: `14px`.
*   **Copyright & Legal (The Interface)**:
    *   Font: **Geist Mono**.
    *   Weight: `Regular (400)`.
    *   Size: `12px`.

### 1.3 Shape, Border & Spacing (Mechanical Breath)
*Referensi: [shape-layout.md](file:///Users/eriksupit/Desktop/makalahapp/.development/makalah-carbon-design-system/docs/shape-layout.md)*
*   **Spacing Units**: `.p-airy` (24px - 32px) untuk padding vertikal. `.gap-comfort` (16px) untuk link groups.
*   **Grid alignment**: Wajib snap ke **16-Column Grid** (`max-w-7xl` atau sejajar dengan Header).

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Footer Wrapper** | `bg-[#f8f8f8]` | `bg-background` | Color Token | Penyelarasan ke Slate 50/900. |
| **Inner Container**| `max-w-[1200px]` | `grid grid-cols-16 gap-comfort` | Layout | Migrasi ke 16-Column Snap. |
| **Section Headers**| `font-normal uppercase` | `.text-signal` | Typography | Geist Mono + Signal Hierarchy. |
| **Navigation Links**| `text-muted-foreground`| `.text-narrative` | Typography | Geist Sans (Voice) untuk navigasi. |
| **Bottom Separator**| `border-t border-black`| `.border-hairline` | Border Precision | Hairline separator (0.5px). |
| **Copyright Text** | `text-xs` | `.text-interface` | Typography | Geist Mono untuk data interface. |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Reformasi Grid (16-Column Snap)
*   **Aksi**: Ganti `flex` pada container utama dengan `grid grid-cols-16`.
*   **Snap Points (Desktop)**:
    *   `col-span-4`: Brand Logo & Mission statement.
    *   `col-span-12`: Link Groups (Resources, Company, Legal) diatur modular (e.g., masing-masing `col-span-4` di dalam sub-grid atau flex-end).

### Step 2: Standarisasi Tipografi & Signal
*   **Headers**: Ubah tag `h4` menggunakan `.text-signal`. Pastikan font-family berubah ke **Geist Mono**.
*   **Links**: Gunakan **Geist Sans** dengan hover transition `250ms`.
*   **Copyright Area**: Pastikan semua teks di baris paling bawah menggunakan font **Geist Mono** (`.text-interface`).

### Step 3: Refactor Interaction & Ikon
*   **Icons**: Pastikan menggunakan `iconoir-react`. Gunakan ukuran `.icon-interface` (16px-20px).
*   **Social Links**: Terapkan transisi halus tanpa pergerakan transform yang kasar (`hover:-translate-y-0.5` diizinkan jika dikehendaki, tapi lebih baik fokus pada perubahan warna/opacity teknis).

### Step 4: Industrial Texture Integration
*   **DiagonalStripes**: Pertahankan komponen ini. Atur `opacity` ke `0.4` untuk kesan lebih teknis dan minimal.

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Grid Audit**: Content footer sejajar sempurna dengan grid 16-kolom landing page.
- [ ] **Typo Audit**: Header section = Mono. Link Navigasi = Sans. Copyright = Mono.
- [ ] **Border Audit**: Separator bawah menggunakan `.border-hairline` (0.5px).
- [ ] **Color Audit**: Warna background dan teks menggunakan token OKLCH Slate Trinity.
- [ ] **Contrast Audit**: Pastikan teks `Slate 500` ke atas tetap kontras di Dark Mode.
- [ ] **Icon Audit**: Kerapihan stroke ikon Iconoir (1.5px).

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Footer jangan sampai terasa "berat". Gunakan spacing yang lega (`p-airy`) dan garis yang tipis (`hairline`) untuk menjaga kesan instrument ilmiah yang presisi.
